'use client';

import dynamic from 'next/dynamic';

import { KeyboardGlyph } from '@/components/ui/keyboard-glyph';
import type { ConfiguratorCatalog } from '@/lib/configurator/types';

/** Reproduit la mise en page finale pour éviter tout saut de layout à l'arrivée du bundle 3D. */
function ConfiguratorSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement du configurateur"
      className="grid animate-pulse lg:h-[calc(100vh-8.5rem)] lg:grid-cols-[1fr_22rem]"
    >
      <div className="bg-background flex aspect-[4/3] max-h-[55vh] w-full items-center justify-center p-12 lg:aspect-auto lg:h-full lg:max-h-none">
        <KeyboardGlyph className="aspect-[2/1] w-full max-w-2xl rounded-lg" />
      </div>
      <div className="border-border space-y-6 border-l p-6">
        <div className="bg-border h-9 rounded-md" />
        <div className="bg-border h-4 w-3/4 rounded" />
        <div className="space-y-2">
          <div className="bg-border h-11 rounded-md" />
          <div className="bg-border h-11 rounded-md" />
        </div>
        <div className="bg-border h-1.5 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Three.js ne part dans aucun autre bundle que celui-ci, et ne s'exécute que
 * dans le navigateur : WebGL n'existe pas au rendu serveur.
 */
const ConfiguratorClient = dynamic(
  () => import('@/components/configurator/configurator-client').then((m) => m.ConfiguratorClient),
  { ssr: false, loading: ConfiguratorSkeleton },
);

export function ConfiguratorLoader({ catalog }: { catalog: ConfiguratorCatalog }) {
  return <ConfiguratorClient catalog={catalog} />;
}
