import type { Metadata } from 'next';

import { CartLineRow } from '@/components/shop/cart-line-row';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Price } from '@/components/ui/price';
import { fr } from '@/content/fr';
import { getCart } from '@/lib/cart';
import { priceCartLines, sumLines } from '@/lib/cart-pricing';
import { createCheckoutSessionAction } from '@/lib/checkout-actions';

export const metadata: Metadata = {
  title: fr.pages.cart.title,
};

export default async function CartPage() {
  const cart = await getCart();
  // Le panier affiche déjà les prix du catalogue courant, ceux-là mêmes qui
  // seront facturés : aucun total mémorisé n'est réutilisé.
  const lines = cart ? await priceCartLines(cart.items) : [];

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.cart.title}</h1>

      {lines.length === 0 ? (
        <div className="mt-4">
          <p className="text-muted">{fr.pages.cart.empty}</p>
          <Button href="/boutique" variant="outline" className="mt-4">
            {fr.pages.cart.browseShop}
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <ul className="divide-border divide-y">
            {lines.map((line) => (
              <CartLineRow
                key={line.itemId}
                line={{
                  id: line.itemId,
                  label: line.label,
                  unitPriceCents: line.unitPriceCents,
                  quantity: line.quantity,
                }}
              />
            ))}
          </ul>

          <div className="border-border h-fit rounded-lg border p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{fr.pages.cart.total}</span>
              <Price cents={sumLines(lines)} className="text-lg font-semibold" />
            </div>

            <form action={createCheckoutSessionAction} className="mt-6">
              <Button type="submit" className="w-full">
                {fr.pages.cart.checkout}
              </Button>
            </form>
          </div>
        </div>
      )}
    </Container>
  );
}
