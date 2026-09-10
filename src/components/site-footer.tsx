import Link from 'next/link';

import { fr } from '@/content/fr';

const legalLinks = [
  { href: '/mentions-legales', label: fr.pages.legal.nav.mentionsLegales },
  { href: '/cgv', label: fr.pages.legal.nav.cgv },
  { href: '/confidentialite', label: fr.pages.legal.nav.confidentialite },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="text-muted mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm">
        <span>
          © {new Date().getFullYear()} {fr.site.name}
        </span>
        <nav aria-label="Liens légaux" className="flex flex-wrap gap-4">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
