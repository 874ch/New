import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Utilisé par le CLI Prisma (migrate, studio, seed) — pas par l'application.
 *
 * `datasource.url` pointe vers une connexion directe : les migrations ont
 * besoin d'une connexion sans pooler transactionnel (advisory locks,
 * requêtes préparées). Le runtime applicatif utilise DATABASE_URL (poolée)
 * via l'adapter défini dans src/lib/db.ts.
 *
 * DATABASE_URL_UNPOOLED est le nom donné par l'intégration Postgres de
 * Vercel (Neon) — DIRECT_URL reste le nom canonique du projet (§6.6
 * ARCHITECTURE.md) et prime s'il est défini.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
