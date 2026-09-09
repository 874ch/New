'use server';

import { redirect } from 'next/navigation';

import { cartItemLabel, cartItemUnitPriceCents, getCart } from '@/lib/cart';
import { getStripeClient, siteUrl } from '@/lib/stripe';

/**
 * Crée la session Stripe Checkout à partir du panier en base — jamais à
 * partir d'un total envoyé par le client — puis redirige vers la page de
 * paiement hébergée par Stripe.
 */
export async function createCheckoutSessionAction(): Promise<void> {
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    redirect('/panier');
  }

  const lineItems = cart.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: cartItemUnitPriceCents(item),
      product_data: { name: cartItemLabel(item) },
    },
  }));

  // Biens physiques expédiés en France (ARCHITECTURE.md §1 — marché principal) :
  // on collecte systématiquement l'adresse de livraison et un téléphone pour le transporteur.
  const session = await getStripeClient().checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    shipping_address_collection: { allowed_countries: ['FR'] },
    phone_number_collection: { enabled: true },
    success_url: `${siteUrl()}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/panier`,
    metadata: { cartId: cart.id },
  });

  if (!session.url) {
    throw new Error('Stripe n’a pas renvoyé d’URL de paiement');
  }

  redirect(session.url);
}
