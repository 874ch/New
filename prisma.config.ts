import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Utilisé par le CLI Prisma (migrate, studio, seed) — pas par l'application.
 *
 * `datasource.url` pointe vers DIRECT_URL : les migrations ont besoin d'une
 * connexion directe, sans pooler transactionnel (verrous d'avisory locks,
 * requêtes préparées). Le runtime applicatif utilise DATABASE_URL (poolée)
 * via l'adapter défini dans src/lib/db.ts.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
