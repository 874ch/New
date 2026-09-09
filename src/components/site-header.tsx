import Link from 'next/link';

import { MobileNav } from '@/components/mobile-nav';
import { fr } from '@/content/fr';

const links = [
  { href: '/boutique', label: fr.nav.shop },
  { href: '/configurateur', label: fr.nav.configurator },
] as const;

export function SiteHeader() {
  return (
    <header className="border-border bg-surface relative border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {fr.site.name}
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-6 text-sm md:flex"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-foreground hover:text-accent">
              {link.label}
            </Link>
          ))}
          <Link
            href="/panier"
            className="border-border hover:border-accent hover:text-accent rounded-md border px-3 py-1.5"
          >
            {fr.nav.cart}
          </Link>
        </nav>

        <MobileNav />
      </div>
    </header>
  );
}
