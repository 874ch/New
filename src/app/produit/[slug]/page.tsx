import Link from 'next/link';
import type { Metadata } from 'next';

import { fr } from '@/content/fr';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/boutique" className="text-muted hover:text-accent text-sm">
        ← {fr.pages.product.backToShop}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Produit : {slug}</h1>
      <p className="text-muted mt-4">{fr.pages.shop.empty}</p>
    </section>
  );
}
