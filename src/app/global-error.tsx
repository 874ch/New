'use client';

import { useEffect } from 'react';

import { fr } from '@/content/fr';

/**
 * Filet de dernier recours : une erreur ici vient du root layout lui-même
 * (ex. `next/font`), donc ce fichier doit fournir son propre <html>/<body> —
 * aucun composant du design system n'est garanti disponible.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{fr.pages.errors.global.title}</h1>
        <p style={{ marginTop: '0.5rem', color: '#71717a', maxWidth: '28rem' }}>
          {fr.pages.errors.global.description}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '1.5rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.375rem',
            background: '#18181b',
            color: '#fafaf9',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {fr.pages.errors.global.retry}
        </button>
      </body>
    </html>
  );
}
