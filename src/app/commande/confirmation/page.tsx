import type { Metadata } from 'next';
import Link from 'next/link';

import { AutoRefresh } from '@/components/shop/auto-refresh';
import { Container } from '@/components/ui/container';
import { Price } from '@/components/ui/price';
import { fr } from '@/content/fr';
import { db } from '@/lib/db';
import type { OrderItemSnapshot } from '@/lib/orders/snapshot';

export const metadata: Metadata = {
  title: fr.pages.orderConfirmation.title,
};

interface OrderConfirmationPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function OrderConfirmationPage({ searchParams }: OrderConfirmationPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <Container className="py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          {fr.pages.orderConfirmation.title}
        </h1>
        <p className="text-muted mt-4">{fr.pages.orderConfirmation.noSession}</p>
        <Link href="/boutique" className="text-accent mt-4 inline-block text-sm">
          {fr.pages.cart.browseShop}
        </Link>
      </Container>
    );
  }

  const order = await db.order.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: { items: true },
  });

  if (!order) {
    return (
      <Container className="py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          {fr.pages.orderConfirmation.title}
        </h1>
        <p className="text-muted mt-4">{fr.pages.orderConfirmation.pending}</p>
        <AutoRefresh />
      </Container>
    );
  }

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.orderConfirmation.title}</h1>
      <p className="text-muted mt-2 text-sm">
        {fr.pages.orderConfirmation.orderNumber} <strong>{order.number}</strong>
      </p>

      <ul className="divide-border mt-8 divide-y">
        {order.items.map((item) => {
          const snapshot = item.snapshot as unknown as OrderItemSnapshot;
          return (
            <li key={item.id} className="flex items-center justify-between py-3 text-sm">
              <span>
                {item.quantity} × {snapshot.label}
              </span>
              <Price cents={item.lineTotalCents} />
            </li>
          );
        })}
      </ul>

      <div className="border-border mt-4 flex items-center justify-between border-t pt-4 font-medium">
        <span>{fr.pages.cart.total}</span>
        <Price cents={order.totalCents} />
      </div>

      <p className="text-muted mt-8 text-sm">
        {fr.pages.orderConfirmation.emailNotice(order.email)}
      </p>
    </Container>
  );
}
