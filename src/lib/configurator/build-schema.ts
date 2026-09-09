import { z } from 'zod';

/**
 * Contrat de validation du build reçu du navigateur.
 *
 * Le configurateur est du code client : tout ce qui en sort est une entrée
 * non fiable. Ce schéma ne valide que la *forme* — l'existence des SKU, leur
 * nature et le prix restent l'affaire du moteur de prix et de la base.
 */

const skuSchema = z.string().min(1).max(64);
const keyCodeSchema = z.string().min(1).max(16);

/** Garde-fou de taille : aucun layout réel n'approche cette borne. */
const MAX_KEYS = 200;

export const buildSchema = z.object({
  version: z.literal(1),
  layoutSlug: z.string().min(1).max(64),
  chassisSku: skuSchema,
  keys: z
    .record(
      keyCodeSchema,
      z.object({
        switchSku: skuSchema.nullable(),
        keycapSku: skuSchema.nullable(),
      }),
    )
    .refine((keys) => Object.keys(keys).length <= MAX_KEYS, {
      message: 'Trop de positions dans le build',
    }),
  extras: z
    .array(z.object({ sku: skuSchema, quantity: z.number().int().positive().max(50) }))
    .max(20)
    .optional(),
});

export type ValidatedBuild = z.infer<typeof buildSchema>;
