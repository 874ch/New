'use client';

import { fr } from '@/content/fr';
import { formatPriceCents } from '@/lib/pricing';
import type { ComponentOption } from '@/lib/configurator/types';
import { cx } from '@/lib/cx';

/**
 * Palette de types : le bouton sélectionné est le « pinceau » posé au clic
 * suivant sur une touche.
 */
export function Palette({
  options,
  selectedSku,
  onSelect,
  label,
}: {
  options: readonly ComponentOption[];
  selectedSku: string | null;
  onSelect: (sku: string) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="text-muted text-xs font-medium tracking-wide uppercase">{label}</legend>
      <div className="mt-3 space-y-2">
        {options.map((option) => {
          const isSelected = option.sku === selectedSku;
          return (
            <button
              key={option.sku}
              type="button"
              onClick={() => onSelect(option.sku)}
              aria-pressed={isSelected}
              className={cx(
                'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                isSelected
                  ? 'border-accent ring-accent/30 ring-2'
                  : 'border-border hover:border-accent',
              )}
            >
              <span
                aria-hidden="true"
                className="border-border h-6 w-6 shrink-0 rounded-full border"
                style={{ backgroundColor: option.swatchHex }}
              />
              <span className="flex-1">{option.name}</span>
              <span className="text-muted text-xs tabular-nums">
                {formatPriceCents(option.unitPriceCents)}
                {fr.pages.configurator.perUnit}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
