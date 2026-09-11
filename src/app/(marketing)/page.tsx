import Link from 'next/link';

import { HeroKeyScene } from '@/components/marketing/hero-key-scene';
import { ProductCard } from '@/components/shop/product-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';
import { db } from '@/lib/db';

export const revalidate = 60;

export default async function HomePage() {
  const featured = await db.product.findFirst({
    where: { active: true, variants: { some: { active: true } } },
    orderBy: { sortOrder: 'asc' },
    include: {
      variants: {
        where: { active: true },
        select: { unitPriceCents: true, stockQty: true },
      },
    },
  });

  return (
    <>
      <Container className="grid items-center gap-12 py-24 lg:grid-cols-2">
        <div>
          <p className="text-accent text-sm font-medium">{fr.site.tagline}</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance">
            {fr.pages.home.title}
          </h1>
          <p className="text-muted mt-4 max-w-xl">{fr.pages.home.subtitle}</p>

          <div className="mt-8 flex gap-4">
            <Button href="/boutique">{fr.pages.home.ctaShop}</Button>
            <Button href="/configurateur" variant="outline">
              {fr.pages.home.ctaConfigurator}
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <HeroKeyScene />
        </div>
      </Container>

      <Container className="grid gap-6 pb-24 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-medium">{fr.pages.home.featureShop.title}</h2>
          <p className="text-muted mt-2 text-sm">{fr.pages.home.featureShop.description}</p>
          <Link href="/boutique" className="text-accent mt-4 inline-block text-sm">
            {fr.pages.home.featureShop.cta} →
          </Link>
        </Card>
        <Card className="p-6">
          <h2 className="font-medium">{fr.pages.home.featureConfigurator.title}</h2>
          <p className="text-muted mt-2 text-sm">{fr.pages.home.featureConfigurator.description}</p>
          <Link href="/configurateur" className="text-accent mt-4 inline-block text-sm">
            {fr.pages.home.featureConfigurator.cta} →
          </Link>
        </Card>
      </Container>

      {featured && (
        <Container className="pb-24">
          <h2 className="text-lg font-medium">{fr.pages.home.featured}</h2>
          <div className="mt-4 max-w-sm">
            <ProductCard product={featured} />
          </div>
        </Container>
      )}
    </>
  );
}
