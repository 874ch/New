import Stripe from 'stripe';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

let cachedClient: Stripe | undefined;

/**
 * Instanciation paresseuse : si on créait le client au chargement du module,
 * la simple navigation vers /panier (qui importe la Server Action de
 * paiement) planterait tant que STRIPE_SECRET_KEY n'est pas configurée.
 * Pas de `apiVersion` explicite : le SDK épingle déjà la version avec
 * laquelle il a été publié.
 */
export function getStripeClient(): Stripe {
  cachedClient ??= new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  return cachedClient;
}

export function requireStripeWebhookSecret(): string {
  return requireEnv('STRIPE_WEBHOOK_SECRET');
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}
