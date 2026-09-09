import Link from 'next/link';

import { fr } from '@/content/fr';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-accent text-sm font-medium">{fr.site.tagline}</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance">
        {fr.pages.home.title}
      </h1>
      <p className="text-muted mt-4 max-w-xl">{fr.pages.home.subtitle}</p>

      <div className="mt-8 flex gap-4">
        <Link
          href="/boutique"
          className="bg-foreground text-background rounded-md px-5 py-2.5 text-sm font-medium"
        >
          {fr.pages.home.ctaShop}
        </Link>
        <Link
          href="/configurateur"
          className="border-border hover:border-accent hover:text-accent rounded-md border px-5 py-2.5 text-sm font-medium"
        >
          {fr.pages.home.ctaConfigurator}
        </Link>
      </div>
    </section>
  );
}
