import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { cartInclude } from '@/lib/cart';
import { priceCartLines } from '@/lib/cart-pricing';
import { db } from '@/lib/db';
import { sendOrderConfirmationEmail } from '@/lib/email';
import type { OrderItemSnapshot } from '@/lib/orders/snapshot';
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

  // Chiffrage serveur au moment de la commande, comme à la création de la
  // session : le montant enregistré ne vient jamais du client.
  const itemById = new Map(cart.items.map((item) => [item.id, item]));
  const pricedLines = await priceCartLines(cart.items);

  const orderItemsData = pricedLines.map((line) => {
    const item = itemById.get(line.itemId);
    const snapshot: OrderItemSnapshot = {
      kind: item?.kind ?? 'STANDARD',
      label: line.label,
      sku: item?.variant?.sku ?? item?.buildId ?? 'N/A',
      bom: line.bom,
      assemblyPlan: line.assemblyPlan,
      layoutName: line.layoutName,
    };

    return {
      kind: item?.kind ?? 'STANDARD',
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      lineTotalCents: line.lineTotalCents,
      variantId: item?.variantId ?? null,
      buildId: item?.buildId ?? null,
      snapshot: toJson(snapshot),
    };
  });

  const subtotalCents = orderItemsData.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const shippingCents = 0;
  const totalCents = subtotalCents + shippingCents;
  const vatRateBp = 2000;
  const vatCents = totalCents - Math.round(totalCents / (1 + vatRateBp / 10_000));

  // Vérification défensive (§6.5 ARCHITECTURE.md) : le panier a pu changer
  // entre la création de la session et la livraison du webhook. On enregistre
  // la commande dans tous les cas (l'argent a déjà été encaissé), mais un
  // écart doit être visible pour une vérification manuelle avant fabrication —
  // bloquer automatiquement la fabrication demanderait un statut de commande
  // dédié, non implémenté à ce jour (cf. §13).
  if (typeof session.amount_total === 'number' && session.amount_total !== totalCents) {
    console.error(
      `Écart de montant sur la session ${session.id} : Stripe a encaissé ${session.amount_total}, ` +
        `le panier vaut ${totalCents} au moment du webhook. Commande enregistrée, vérification manuelle requise.`,
    );
  }

  const shippingDetails = session.collected_information?.shipping_details;
  const shippingAddress = shippingDetails
    ? { name: shippingDetails.name, address: shippingDetails.address }
    : { name: session.customer_details?.name, address: session.customer_details?.address };

  const orderNumber = generateOrderNumber();
  const email = session.customer_details?.email ?? '';

  try {
    await db.$transaction(async (tx) => {
      // Réclame l'event en premier : une contrainte unique sur l'id fait
      // échouer cette création si une livraison concurrente du même event
      // Stripe l'a déjà traité, ce qui protège contre la commande en double.
      await tx.processedStripeEvent.create({ data: { id: eventId, type: eventType } });

      await tx.order.create({
        data: {
          number: orderNumber,
          status: 'PAID',
          email,
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

  if (email) {
    await sendOrderConfirmationEmail({ email, number: orderNumber, totalCents });
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
