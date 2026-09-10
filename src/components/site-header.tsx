import Link from 'next/link';

import { MobileNav } from '@/components/mobile-nav';
import { fr } from '@/content/fr';

const links = [
  { href: '/boutique', label: fr.nav.shop },
  { href: '/configurateur', label: fr.nav.configurator },
] as const;

function CartLink() {
  return (
    <Link
      href="/panier"
      aria-label={fr.nav.cart}
      className="border-border hover:border-accent hover:text-accent flex h-9 w-9 items-center justify-center rounded-md border"
    >
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
        <path
          d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.8h8.2a2 2 0 0 0 2-1.8L21 8H6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="20" r="1" fill="currentColor" />
        <circle cx="17" cy="20" r="1" fill="currentColor" />
      </svg>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-border bg-surface relative border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {fr.site.name}
        </Link>

        <div className="flex items-center gap-3">
          <nav
            aria-label="Navigation principale"
            className="hidden items-center gap-6 text-sm md:flex"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-foreground hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <CartLink />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
