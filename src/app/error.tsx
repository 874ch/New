'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';

export default function ErrorBoundary({
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
    <Container className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.errors.generic.title}</h1>
      <p className="text-muted mt-2 max-w-md">{fr.pages.errors.generic.description}</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>{fr.pages.errors.generic.retry}</Button>
        <Button href="/" variant="outline">
          {fr.pages.errors.generic.backHome}
        </Button>
      </div>
    </Container>
  );
}
