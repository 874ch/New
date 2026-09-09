'use client';

import Link from 'next/link';
import { useState } from 'react';

import { fr } from '@/content/fr';

const links = [
  { href: '/boutique', label: fr.nav.shop },
  { href: '/configurateur', label: fr.nav.configurator },
  { href: '/panier', label: fr.nav.cart },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        className="border-border flex h-9 w-9 items-center justify-center rounded-md border"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
          {open ? (
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="border-border bg-surface absolute inset-x-0 top-full border-b px-6 py-4"
        >
          <nav aria-label="Navigation mobile" className="flex flex-col gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-foreground hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
