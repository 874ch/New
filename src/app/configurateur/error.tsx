'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';

export default function ConfiguratorError({
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
      <h1 className="text-2xl font-semibold tracking-tight">
        {fr.pages.errors.configurator.title}
      </h1>
      <p className="text-muted mt-2 max-w-md">{fr.pages.errors.configurator.description}</p>
      <Button onClick={reset} className="mt-6">
        {fr.pages.errors.configurator.retry}
      </Button>
    </Container>
  );
}
