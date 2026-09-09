import type { Metadata } from 'next';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';

export const metadata: Metadata = {
  title: fr.pages.errors.notFound.title,
};

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.errors.notFound.title}</h1>
      <p className="text-muted mt-2 max-w-md">{fr.pages.errors.notFound.description}</p>
      <Button href="/" className="mt-6">
        {fr.pages.errors.notFound.backHome}
      </Button>
    </Container>
  );
}
