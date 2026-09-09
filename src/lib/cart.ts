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

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof getCart>>>;
export type CartItemWithRelations = CartWithItems['items'][number];

/** Prix unitaire d'une ligne de panier, quelle que soit sa nature. */
export function cartItemUnitPriceCents(item: CartItemWithRelations): number {
  return item.kind === 'STANDARD'
    ? (item.variant?.unitPriceCents ?? 0)
    : (item.build?.totalCents ?? 0);
}

/** Libellé d'affichage d'une ligne de panier. */
export function cartItemLabel(item: CartItemWithRelations): string {
  if (item.kind === 'STANDARD' && item.variant) {
    return `${item.variant.product.name} — ${item.variant.name}`;
  }
  return 'Configuration personnalisée';
}

export function cartTotalCents(cart: Pick<CartWithItems, 'items'>): number {
  return cart.items.reduce((sum, item) => sum + cartItemUnitPriceCents(item) * item.quantity, 0);
}
