import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/legal-page';
import { fr } from '@/content/fr';

export const metadata: Metadata = {
  title: fr.pages.legal.confidentialite.title,
  description: fr.site.tagline,
};

export default function ConfidentialitePage() {
  const { title, sections } = fr.pages.legal.confidentialite;
  return <LegalPage title={title} sections={sections} />;
}
