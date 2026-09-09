'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { fr } from '@/content/fr';

/**
 * Le webhook Stripe peut arriver un peu après la redirection de succès :
 * on rafraîchit la page (Server Component) jusqu'à ce que la commande soit
 * visible, plutôt que de laisser un message figé.
 */
export function AutoRefresh({
  intervalMs = 2000,
  maxAttempts = 15,
}: {
  intervalMs?: number;
  maxAttempts?: number;
}) {
  const router = useRouter();
  const attempts = useRef(0);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > maxAttempts) {
        clearInterval(id);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, intervalMs);

    return () => clearInterval(id);
  }, [router, intervalMs, maxAttempts]);

  if (!gaveUp) {
    return null;
  }

  return <p className="text-muted mt-4 text-sm">{fr.pages.orderConfirmation.delayed}</p>;
}
