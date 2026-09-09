import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Price } from '@/components/ui/price';
import { fr } from '@/content/fr';
import { db } from '@/lib/db';
import type { OrderItemSnapshot } from '@/lib/orders/snapshot';

export const metadata: Metadata = {
  title: fr.pages.admin.orders.detailTitle,
  robots: { index: false, follow: false },
};

interface AdminOrderPageProps {
  params: Promise<{ id: string }>;
}

interface StoredAddress {
  name?: string;
  address?: {
    line1?: string | null;
    line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderPageProps) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    notFound();
  }

  const shipping = order.shippingAddress as StoredAddress | null;

  return (
    <div>
      <Link href="/admin" className="text-muted hover:text-accent text-sm">
        ← {fr.pages.admin.orders.backToList}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {fr.pages.admin.orders.detailTitle} — {order.number}
      </h1>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">{fr.pages.admin.orders.columns.date}</dt>
          <dd>{order.createdAt.toLocaleString('fr-FR')}</dd>
        </div>
        <div>
          <dt className="text-muted">{fr.pages.admin.orders.columns.email}</dt>
          <dd>{order.email}</dd>
        </div>
        <div>
          <dt className="text-muted">{fr.pages.admin.orders.columns.status}</dt>
          <dd>{order.status}</dd>
        </div>
        <div>
          <dt className="text-muted">{fr.pages.admin.orders.columns.total}</dt>
          <dd>
            <Price cents={order.totalCents} />
          </dd>
        </div>
      </dl>

      {shipping?.address && (
        <div className="mt-6">
          <h2 className="font-medium">{fr.pages.admin.orders.shippingAddress}</h2>
          <p className="text-muted mt-1 text-sm">
            {shipping.name}
            <br />
            {shipping.address.line1} {shipping.address.line2}
            <br />
            {shipping.address.postal_code} {shipping.address.city}
            <br />
            {shipping.address.country}
          </p>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {order.items.map((item) => {
          const snapshot = item.snapshot as unknown as OrderItemSnapshot;
          return (
            <div key={item.id} className="border-border rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {item.quantity} × {snapshot.label} ({snapshot.sku})
                </p>
                <Price cents={item.lineTotalCents} />
              </div>

              {snapshot.bom && snapshot.bom.length > 0 && (
                <div className="mt-3">
                  <p className="text-muted text-xs font-medium tracking-wide uppercase">
                    {fr.pages.admin.orders.billOfMaterials}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {snapshot.bom.map((line) => (
                      <li key={line.sku} className="flex justify-between">
                        <span>
                          {line.quantity}× {line.name}
                        </span>
                        <Price cents={line.lineTotalCents} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
