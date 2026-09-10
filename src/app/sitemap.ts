import type { MetadataRoute } from 'next';

import { db } from '@/lib/db';
import { siteUrl } from '@/lib/stripe';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await db.product.findMany({
    where: { active: true },
    select: { slug: true },
  });

  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/boutique`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/configurateur`, changeFrequency: 'monthly', priority: 0.9 },
    ...products.map(({ slug }) => ({
      url: `${base}/produit/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    { url: `${base}/mentions-legales`, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${base}/cgv`, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${base}/confidentialite`, changeFrequency: 'yearly' as const, priority: 0.3 },
  ];
}
