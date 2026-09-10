import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/legal-page';
import { fr } from '@/content/fr';

export const metadata: Metadata = {
  title: fr.pages.legal.mentionsLegales.title,
  description: fr.site.tagline,
};

export default function MentionsLegalesPage() {
  const { title, sections } = fr.pages.legal.mentionsLegales;
  return <LegalPage title={title} sections={sections} />;
}
