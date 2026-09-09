import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';

import { db } from '@/lib/db';

export const CART_COOKIE = 'cart_token';
export const CART_TTL_DAYS = 30;

/** Panier avec tout ce qu'il faut pour l'afficher et le facturer. */
export function cartInclude() {
  return {
    items: {
      include: {
        variant: { include: { product: true } },
        build: true,
      },
      orderBy: { id: 'asc' as const },
    },
  };
}

/**
 * Lecture seule : les Server Components peuvent lire les cookies mais pas en
 * écrire. La création du panier (et donc la pose du cookie) n'a lieu que
 * dans une Server Action, cf. `cart-actions.ts`.
 */
export async function getCart() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const cart = await db.cart.findUnique({
    where: { token },
    include: cartInclude(),
  });

  if (!cart || cart.expiresAt < new Date()) {
    return null;
  }

  return cart;
}

/**
 * Retourne le panier courant, en le créant au besoin.
 * Pose un cookie : à n'appeler que depuis une Server Action ou un Route
 * Handler, les Server Components ne peuvent pas écrire de cookie.
 */
export async function getOrCreateCartId(): Promise<string> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;

  if (token) {
    const existing = await db.cart.findUnique({ where: { token } });
    if (existing && existing.expiresAt > new Date()) {
      return existing.id;
    }
  }

  const newToken = randomUUID();
  const expiresAt = new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
  const cart = await db.cart.create({ data: { token: newToken, expiresAt } });

  store.set(CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });

  return cart.id;
}

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof getCart>>>;
export type CartItemWithRelations = CartWithItems['items'][number];

/**
 * Libellé d'affichage d'une ligne de panier.
 * Le prix, lui, n'est jamais lu ici : il est rechiffré depuis le catalogue
 * par `priceCartLines` (cf. src/lib/cart-pricing.ts).
 */
export function cartItemLabel(item: CartItemWithRelations): string {
  if (item.kind === 'STANDARD' && item.variant) {
    return `${item.variant.product.name} — ${item.variant.name}`;
  }
  return 'Clavier configuré sur mesure';
}
