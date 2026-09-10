import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/legal-page';
import { fr } from '@/content/fr';

export const metadata: Metadata = {
  title: fr.pages.legal.cgv.title,
  description: fr.site.tagline,
};

export default function CgvPage() {
  const { title, sections } = fr.pages.legal.cgv;
  return <LegalPage title={title} sections={sections} />;
}
