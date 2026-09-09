import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { cartInclude, cartItemLabel, cartItemUnitPriceCents } from '@/lib/cart';
import { db } from '@/lib/db';
import type { OrderItemSnapshot } from '@/lib/orders/snapshot';
import { computeBuildPrice, toPriceTable } from '@/lib/pricing';
import type { Build } from '@/lib/pricing';
import { getStripeClient, requireStripeWebhookSecret } from '@/lib/stripe';
import type { Prisma } from '@/generated/prisma/client';

// Le webhook doit lire le corps brut pour vérifier la signature Stripe.
export const runtime = 'nodejs';

/** Copie structurelle en JSON pur — Stripe et nos types internes ne portent pas d'index signature. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function toNullableJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined || value === null ? undefined : toJson(value);
}

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `CMD-${date}-${suffix}`;
}

/** Best-effort : une nomenclature illisible ne doit jamais faire échouer la commande. */
async function computeBomSafely(buildTemplate: unknown): Promise<OrderItemSnapshot['bom']> {
  if (!buildTemplate) {
    return undefined;
  }
  try {
    const components = await db.component.findMany({ where: { active: true } });
    const priceTable = toPriceTable(components);
    return computeBuildPrice(buildTemplate as Build, priceTable).lines;
  } catch (error) {
    console.error('Nomenclature illisible pour un buildTemplate', error);
    return undefined;
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
  eventType: string,
): Promise<void> {
  const cartId = session.metadata?.cartId;
  if (!cartId) {
    console.error('checkout.session.completed sans cartId en métadonnées', session.id);
    return;
  }

  const cart = await db.cart.findUnique({ where: { id: cartId }, include: cartInclude() });
  if (!cart || cart.items.length === 0) {
    console.error('Panier introuvable ou vide pour la session', session.id);
    return;
  }

  const orderItemsData = await Promise.all(
    cart.items.map(async (item) => {
      const unitPriceCents = cartItemUnitPriceCents(item);
      const snapshot: OrderItemSnapshot = {
        kind: item.kind,
        label: cartItemLabel(item),
        sku: item.variant?.sku ?? item.buildId ?? 'N/A',
        bom: await computeBomSafely(item.variant?.buildTemplate ?? null),
      };

      return {
        kind: item.kind,
        quantity: item.quantity,
        unitPriceCents,
        lineTotalCents: unitPriceCents * item.quantity,
        variantId: item.variantId,
        buildId: item.buildId,
        snapshot: toJson(snapshot),
      };
    }),
  );

  const subtotalCents = orderItemsData.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const shippingCents = 0;
  const totalCents = subtotalCents + shippingCents;
  const vatRateBp = 2000;
  const vatCents = totalCents - Math.round(totalCents / (1 + vatRateBp / 10_000));

  const shippingDetails = session.collected_information?.shipping_details;
  const shippingAddress = shippingDetails
    ? { name: shippingDetails.name, address: shippingDetails.address }
    : { name: session.customer_details?.name, address: session.customer_details?.address };

  try {
    await db.$transaction(async (tx) => {
      // Réclame l'event en premier : une contrainte unique sur l'id fait
      // échouer cette création si une livraison concurrente du même event
      // Stripe l'a déjà traité, ce qui protège contre la commande en double.
      await tx.processedStripeEvent.create({ data: { id: eventId, type: eventType } });

      await tx.order.create({
        data: {
          number: generateOrderNumber(),
          status: 'PAID',
          email: session.customer_details?.email ?? '',
          phone: session.customer_details?.phone ?? undefined,
          shippingAddress: toJson(shippingAddress),
          billingAddress: toNullableJson(session.customer_details?.address),
          subtotalCents,
          shippingCents,
          totalCents,
          vatRateBp,
          vatCents,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          paidAt: new Date(),
          items: { create: orderItemsData },
        },
      });

      await tx.cart.delete({ where: { id: cart.id } });
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      // Event déjà traité par une autre livraison — rien à faire.
      return;
    }
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      requireStripeWebhookSecret(),
    );
  } catch (error) {
    console.error('Signature Stripe invalide', error);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object, event.id, event.type);
  }

  return NextResponse.json({ received: true });
}
