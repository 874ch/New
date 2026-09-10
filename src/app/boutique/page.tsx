import type { Metadata } from 'next';

import { ProductCard } from '@/components/shop/product-card';
import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: fr.pages.shop.title,
  description: fr.pages.shop.metaDescription,
};

export const revalidate = 60;

export default async function ShopPage() {
  const products = await db.product.findMany({
    where: { active: true, variants: { some: { active: true } } },
    orderBy: { sortOrder: 'asc' },
    include: {
      variants: {
        where: { active: true },
        orderBy: { unitPriceCents: 'asc' },
        select: { unitPriceCents: true, stockQty: true },
      },
    },
  });

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.shop.title}</h1>

      {products.length === 0 ? (
        <p className="text-muted mt-4">{fr.pages.shop.empty}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </Container>
  );
}
