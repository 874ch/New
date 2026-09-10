export const CONSENT_COOKIE = 'cookie_consent';
export const CONSENT_EVENT = 'cookie-consent-change';
export type ConsentStatus = 'accepted' | 'declined';

const CONSENT_TTL_DAYS = 180;

/**
 * Lu et écrit côté client uniquement (`document.cookie`, pas `httpOnly`) :
 * un `cookies()` serveur dans le layout racine rendrait tout le site
 * dynamique, puisqu'il est lu sur chaque page. Rien de sensible ici — au
 * pire un visiteur modifie son propre choix de consentement via les
 * DevTools, ce qui reste son choix à faire.
 */
export function readConsent(): ConsentStatus | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return value === 'accepted' || value === 'declined' ? value : null;
}

export function writeConsent(status: ConsentStatus): void {
  const maxAge = CONSENT_TTL_DAYS * 24 * 60 * 60;
  document.cookie = `${CONSENT_COOKIE}=${status}; path=/; max-age=${maxAge}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: status }));
}

/** Pour `useSyncExternalStore` : s'abonne aux changements de consentement. */
export function subscribeConsent(callback: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

/** Snapshot serveur : aucun cookie n'est lisible pendant le rendu SSR. */
export function getServerConsentSnapshot(): ConsentStatus | null {
  return null;
}
