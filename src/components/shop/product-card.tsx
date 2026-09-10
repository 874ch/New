import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { KeyboardGlyph } from '@/components/ui/keyboard-glyph';
import { Price } from '@/components/ui/price';
import { fr } from '@/content/fr';

export interface ProductCardData {
  slug: string;
  name: string;
  description: string;
  variants: readonly { unitPriceCents: number; stockQty: number | null }[];
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const fromCents = Math.min(...product.variants.map((v) => v.unitPriceCents));
  const totalStock = product.variants.reduce((sum, v) => sum + (v.stockQty ?? 0), 0);

  const badge =
    totalStock > 0 && totalStock < 10
      ? fr.pages.shop.limitedStock
      : product.variants.length > 1
        ? fr.pages.shop.variantsCount(product.variants.length)
        : null;

  return (
    <Link href={`/produit/${product.slug}`} className="group block">
      <Card className="group-hover:border-accent overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        <KeyboardGlyph className="aspect-[4/3]" />
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-medium">{product.name}</h2>
            {badge && <Badge tone={totalStock < 10 ? 'accent' : 'neutral'}>{badge}</Badge>}
          </div>
          <p className="text-muted line-clamp-2 text-sm">{product.description}</p>
          <p className="text-sm">
            {fr.pages.shop.fromPrice} <Price cents={fromCents} className="font-semibold" />
          </p>
        </div>
      </Card>
    </Link>
  );
}
