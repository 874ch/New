'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { fr } from '@/content/fr';
import { addStandardVariantToCart } from '@/lib/cart-actions';
import { cx } from '@/lib/cx';
import { useToastStore } from '@/lib/toast';

export interface VariantOption {
  sku: string;
  name: string;
  unitPriceCents: number;
  stockQty: number | null;
}

type AddState = 'idle' | 'added' | 'error';

export function VariantPicker({ variants }: { variants: readonly VariantOption[] }) {
  const [selectedSku, setSelectedSku] = useState(variants[0]?.sku);
  const [addState, setAddState] = useState<AddState>('idle');
  const [isPending, startTransition] = useTransition();
  const selected = variants.find((v) => v.sku === selectedSku);

  if (!selected) {
    return null;
  }

  const handleAddToCart = () => {
    const sku = selected.sku;
    startTransition(async () => {
      try {
        await addStandardVariantToCart(sku);
        setAddState('added');
        useToastStore.getState().show(fr.pages.product.addedToCart);
      } catch {
        setAddState('error');
      }
    });
  };

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
              onClick={() => {
                setSelectedSku(variant.sku);
                setAddState('idle');
              }}
              aria-pressed={variant.sku === selected.sku}
              className={cx(
                'rounded-md border px-3 py-2 text-sm font-medium transition-all active:scale-[0.98]',
                variant.sku === selected.sku
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border hover:border-accent hover:text-accent',
              )}
            >
              {variant.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-8">
        <Button type="button" onClick={handleAddToCart} disabled={isPending}>
          {isPending ? fr.pages.product.adding : fr.pages.product.addToCart}
        </Button>

        {addState === 'added' && (
          <p className="mt-2 text-sm">
            {fr.pages.product.addedToCart}{' '}
            <Link href="/panier" className="text-accent">
              {fr.pages.product.viewCart}
            </Link>
          </p>
        )}
        {addState === 'error' && (
          <p className="text-danger mt-2 text-sm">{fr.pages.product.addError}</p>
        )}
      </div>
    </div>
  );
}
