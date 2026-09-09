import type { Metadata } from 'next';

import { fr } from '@/content/fr';

export const metadata: Metadata = {
  title: fr.pages.admin.title,
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.admin.title}</h1>
      <p className="text-muted mt-4">{fr.pages.admin.comingSoon}</p>
    </section>
  );
}
