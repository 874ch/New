'use server';

import { revalidatePath } from 'next/cache';

import { getOrCreateCartId } from '@/lib/cart';
import { buildSchema } from '@/lib/configurator/build-schema';
import {
  BuildValidationError,
  persistBuild,
  resolveAndPriceBuild,
} from '@/lib/configurator/build-server';
import { db } from '@/lib/db';
import { UnknownSkuError, WrongComponentKindError } from '@/lib/pricing';

export type AddBuildResult = { ok: true; totalCents: number } | { ok: false; error: string };

/**
 * Ajoute au panier un clavier configuré.
 *
 * Le total affiché pendant la configuration n'est qu'indicatif : ici, le
 * build est revalidé contre le layout en base puis rechiffré à partir des
 * prix catalogue. C'est ce montant-là qui est persisté.
 */
export async function addCustomBuildToCart(rawBuild: unknown): Promise<AddBuildResult> {
  const parsed = buildSchema.safeParse(rawBuild);
  if (!parsed.success) {
    return { ok: false, error: 'Configuration invalide.' };
  }

  try {
    const priced = await resolveAndPriceBuild(parsed.data);
    const buildId = await persistBuild(priced);
    const cartId = await getOrCreateCartId();

    await db.cartItem.create({
      data: { cartId, kind: 'CUSTOM_BUILD', buildId, quantity: 1 },
    });

    revalidatePath('/panier');
    return { ok: true, totalCents: priced.breakdown.totalCents };
  } catch (error) {
    if (
      error instanceof BuildValidationError ||
      error instanceof UnknownSkuError ||
      error instanceof WrongComponentKindError
    ) {
      return { ok: false, error: error.message };
    }
    console.error('Ajout au panier du build personnalisé', error);
    return { ok: false, error: 'Une erreur est survenue, réessayez.' };
  }
}
