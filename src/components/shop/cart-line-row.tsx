'use client';

import { useTransition } from 'react';

import { Price } from '@/components/ui/price';
import { fr } from '@/content/fr';
import { removeCartItem, updateCartItemQuantity } from '@/lib/cart-actions';

export interface CartLine {
  id: string;
  label: string;
  unitPriceCents: number;
  quantity: number;
}

export function CartLineRow({ line }: { line: CartLine }) {
  const [isPending, startTransition] = useTransition();

  const setQuantity = (quantity: number) => {
    startTransition(() => updateCartItemQuantity(line.id, quantity));
  };

  const remove = () => {
    startTransition(() => removeCartItem(line.id));
  };

  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="font-medium">{line.label}</p>
        <p className="text-muted text-sm">
          <Price cents={line.unitPriceCents} /> / unité
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="border-border flex items-center rounded-md border">
          <button
            type="button"
            className="px-2 py-1 disabled:opacity-50"
            disabled={isPending}
            onClick={() => setQuantity(line.quantity - 1)}
            aria-label={`Diminuer la quantité — ${line.label}`}
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{line.quantity}</span>
          <button
            type="button"
            className="px-2 py-1 disabled:opacity-50"
            disabled={isPending}
            onClick={() => setQuantity(line.quantity + 1)}
            aria-label={`Augmenter la quantité — ${line.label}`}
          >
            +
          </button>
        </div>

        <p className="w-20 text-right font-medium">
          <Price cents={line.unitPriceCents * line.quantity} />
        </p>

        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className="text-muted hover:text-danger text-sm disabled:opacity-50"
        >
          {fr.pages.cart.remove}
        </button>
      </div>
    </li>
  );
}
