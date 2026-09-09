import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/ui/price';
import { fr } from '@/content/fr';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: fr.pages.admin.orders.title,
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Paiement en attente',
  PAID: 'Payée',
  IN_PRODUCTION: 'En fabrication',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  PAYMENT_FAILED: 'Paiement échoué',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
};

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.admin.orders.title}</h1>

      {orders.length === 0 ? (
        <p className="text-muted mt-4">{fr.pages.admin.orders.empty}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted border-border border-b">
                <th className="py-2 pr-4 font-medium">{fr.pages.admin.orders.columns.number}</th>
                <th className="py-2 pr-4 font-medium">{fr.pages.admin.orders.columns.date}</th>
                <th className="py-2 pr-4 font-medium">{fr.pages.admin.orders.columns.email}</th>
                <th className="py-2 pr-4 font-medium">{fr.pages.admin.orders.columns.status}</th>
                <th className="py-2 text-right font-medium">
                  {fr.pages.admin.orders.columns.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-border border-b last:border-0">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/commandes/${order.id}`} className="text-accent">
                      {order.number}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{order.createdAt.toLocaleDateString('fr-FR')}</td>
                  <td className="py-3 pr-4">{order.email}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={order.status === 'PAID' ? 'accent' : 'neutral'}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">
                    <Price cents={order.totalCents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
