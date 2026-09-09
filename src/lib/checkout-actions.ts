'use server';

import { redirect } from 'next/navigation';

import { getCart } from '@/lib/cart';
import { priceCartLines } from '@/lib/cart-pricing';
import { getStripeClient, siteUrl } from '@/lib/stripe';

/**
 * Crée la session Stripe Checkout à partir du panier en base — chaque ligne
 * étant rechiffrée depuis le catalogue au moment du paiement, jamais depuis
 * un total transmis par le client — puis redirige vers la page de paiement
 * hébergée par Stripe.
 */
export async function createCheckoutSessionAction(): Promise<void> {
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    redirect('/panier');
  }

  const lines = await priceCartLines(cart.items);

  const lineItems = lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: line.unitPriceCents,
      product_data: { name: line.label },
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
