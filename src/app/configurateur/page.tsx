import type { Metadata } from 'next';

import { fr } from '@/content/fr';

export const metadata: Metadata = {
  title: fr.pages.configurator.title,
};

export default function ConfiguratorPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.configurator.title}</h1>
      <p className="text-muted mt-4">{fr.pages.configurator.comingSoon}</p>
    </section>
  );
}
