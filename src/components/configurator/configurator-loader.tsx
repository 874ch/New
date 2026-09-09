'use client';

import dynamic from 'next/dynamic';

import { fr } from '@/content/fr';
import type { ConfiguratorCatalog } from '@/lib/configurator/types';

/**
 * Three.js ne part dans aucun autre bundle que celui-ci, et ne s'exécute que
 * dans le navigateur : WebGL n'existe pas au rendu serveur.
 */
const ConfiguratorClient = dynamic(
  () => import('@/components/configurator/configurator-client').then((m) => m.ConfiguratorClient),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted flex h-[55vh] items-center justify-center text-sm lg:h-[calc(100vh-8.5rem)]">
        {fr.pages.configurator.loading}
      </div>
    ),
  },
);

export function ConfiguratorLoader({ catalog }: { catalog: ConfiguratorCatalog }) {
  return <ConfiguratorClient catalog={catalog} />;
}
