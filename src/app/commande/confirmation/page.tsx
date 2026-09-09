import type { Metadata } from 'next';

import { fr } from '@/content/fr';

export const metadata: Metadata = {
  title: fr.pages.orderConfirmation.title,
};

export default function OrderConfirmationPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.orderConfirmation.title}</h1>
      <p className="text-muted mt-4">{fr.pages.orderConfirmation.pending}</p>
    </section>
  );
}
