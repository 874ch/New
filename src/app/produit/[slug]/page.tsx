import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { VariantPicker } from '@/components/shop/variant-picker';
import { Container } from '@/components/ui/container';
import { KeyboardGlyph } from '@/components/ui/keyboard-glyph';
import { fr } from '@/content/fr';
import { db } from '@/lib/db';

export const revalidate = 60;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, active: true },
    include: {
      variants: {
        where: { active: true },
        orderBy: { unitPriceCents: 'asc' },
      },
    },
  });
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return { title: slug };
  }
  return {
    title: product.name,
    description: product.description,
    openGraph: { title: product.name, description: product.description },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <Container className="py-16">
      <Link href="/boutique" className="text-muted hover:text-accent text-sm">
        ← {fr.pages.product.backToShop}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <KeyboardGlyph className="aspect-square rounded-lg" />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="text-muted mt-2">{product.description}</p>

          {product.variants.length > 0 ? (
            <div className="mt-6">
              <VariantPicker variants={product.variants} />
            </div>
          ) : (
            <p className="text-muted mt-6">{fr.pages.product.unavailable}</p>
          )}
        </div>
      </div>
    </Container>
  );
}
