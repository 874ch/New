'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { CART_COOKIE, CART_TTL_DAYS, getCart } from '@/lib/cart';
import { db } from '@/lib/db';

async function getOrCreateCartId(): Promise<string> {
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

export async function addStandardVariantToCart(variantSku: string, quantity = 1): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantité invalide');
  }

  const variant = await db.productVariant.findUnique({ where: { sku: variantSku } });
  if (!variant || !variant.active) {
    throw new Error('Variante indisponible');
  }

  const cartId = await getOrCreateCartId();

  const existing = await db.cartItem.findFirst({
    where: { cartId, kind: 'STANDARD', variantId: variant.id },
  });

  if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await db.cartItem.create({
      data: { cartId, kind: 'STANDARD', variantId: variant.id, quantity },
    });
  }

  revalidatePath('/panier');
}

/** Retrouve la ligne, à condition qu'elle appartienne au panier courant. */
async function findOwnCartItem(itemId: string) {
  const cart = await getCart();
  if (!cart) {
    return null;
  }
  return cart.items.find((item) => item.id === itemId) ?? null;
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
  const item = await findOwnCartItem(itemId);
  if (!item) {
    return;
  }

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
  } else {
    await db.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }

  revalidatePath('/panier');
}

export async function removeCartItem(itemId: string): Promise<void> {
  const item = await findOwnCartItem(itemId);
  if (!item) {
    return;
  }

  await db.cartItem.delete({ where: { id: item.id } });
  revalidatePath('/panier');
}
