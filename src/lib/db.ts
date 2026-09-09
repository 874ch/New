import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';

/**
 * Connexion applicative : toujours DATABASE_URL (poolée), jamais DIRECT_URL
 * qui est réservée aux migrations (cf. prisma.config.ts).
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

declare global {
  // `var` est requis ici : c'est la seule déclaration reconnue par `declare global`.
  var __prisma: PrismaClient | undefined;
}

// En dev, Next.js recharge les modules à chaud à chaque changement : sans ce
// cache sur `global`, chaque rechargement ouvrirait une nouvelle connexion
// jusqu'à épuiser le pool Postgres.
export const db: PrismaClient = globalThis.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = db;
}
