'use client';

import Script from 'next/script';
import { useSyncExternalStore } from 'react';

import { getServerConsentSnapshot, readConsent, subscribeConsent } from '@/lib/consent';

/**
 * Script de Vercel Web Analytics chargé à la main (sans le paquet
 * `@vercel/analytics`, dont la dépendance optionnelle sur SvelteKit entre en
 * conflit avec les autres peer dependencies du projet) : `/_vercel/insights/script.js`
 * est servi par la plateforme Vercel une fois le site déployé et n'existe pas
 * ailleurs, où cette balise ne fait donc rien.
 *
 * Composant client, comme `CookieBanner` : lit `document.cookie` via
 * `useSyncExternalStore` plutôt que `cookies()` côté serveur pour ne pas
 * rendre tout le site dynamique, et démarre sans recharger la page si le
 * visiteur vient d'accepter dans le bandeau.
 */
export function Analytics() {
  const status = useSyncExternalStore(subscribeConsent, readConsent, getServerConsentSnapshot);

  if (status !== 'accepted') {
    return null;
  }

  return <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />;
}
