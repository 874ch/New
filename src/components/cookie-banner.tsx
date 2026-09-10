'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { fr } from '@/content/fr';
import {
  getServerConsentSnapshot,
  readConsent,
  subscribeConsent,
  writeConsent,
} from '@/lib/consent';

/**
 * Composant client : le choix se lit dans `document.cookie` via
 * `useSyncExternalStore`, jamais via `cookies()` côté serveur — sinon le
 * layout racine, qui englobe toutes les pages, deviendrait entièrement
 * dynamique rien que pour ce bandeau (voir `src/lib/consent.ts`).
 * `getServerConsentSnapshot` renvoie toujours `null` : le bandeau peut donc
 * apparaître un instant après l'hydratation plutôt que d'être déjà dans le
 * HTML servi, le temps que React resynchronise avec la vraie valeur du
 * cookie — comportement normal de ce hook, pas un bug.
 */
export function CookieBanner() {
  const status = useSyncExternalStore(subscribeConsent, readConsent, getServerConsentSnapshot);

  if (status !== null) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={fr.cookies.bannerLabel}
      className="border-border bg-surface fixed inset-x-0 bottom-0 z-50 border-t"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <p className="text-muted max-w-2xl text-xs sm:text-sm">
          {fr.cookies.message}{' '}
          <Link href="/confidentialite" className="hover:text-foreground underline">
            {fr.cookies.learnMore}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => writeConsent('declined')}
          >
            {fr.cookies.decline}
          </Button>
          <Button type="button" size="sm" onClick={() => writeConsent('accepted')}>
            {fr.cookies.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
