'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { fr } from '@/content/fr';
import { cx } from '@/lib/cx';

export interface VariantOption {
  sku: string;
  name: string;
  unitPriceCents: number;
  stockQty: number | null;
}

export function VariantPicker({ variants }: { variants: readonly VariantOption[] }) {
  const [selectedSku, setSelectedSku] = useState(variants[0]?.sku);
  const selected = variants.find((v) => v.sku === selectedSku);

  if (!selected) {
    return null;
  }

  return (
    <div>
      <p className="text-3xl font-semibold">
        <Price cents={selected.unitPriceCents} />
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">{fr.pages.product.variantLabel}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {variants.map((variant) => (
            <button
              key={variant.sku}
              type="button"
              onClick={() => setSelectedSku(variant.sku)}
              aria-pressed={variant.sku === selected.sku}
              className={cx(
                'rounded-md border px-3 py-2 text-sm transition-colors',
                variant.sku === selected.sku
                  ? 'border-accent text-accent'
                  : 'border-border hover:border-accent hover:text-accent',
              )}
            >
              {variant.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-8">
        <Button type="button" disabled>
          {fr.pages.product.addToCart}
        </Button>
        <p className="text-muted mt-2 text-xs">{fr.pages.product.cartComingSoon}</p>
      </div>
    </div>
  );
}
