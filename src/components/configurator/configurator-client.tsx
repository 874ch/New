'use client';

import { useLayoutEffect, useState } from 'react';

import { ConfiguratorPanel } from '@/components/configurator/ui/configurator-panel';
import { CAMERA_VIEW_NAMES, KeyboardScene } from '@/components/configurator/scene/keyboard-scene';
import type { CameraView } from '@/components/configurator/scene/keyboard-scene';
import { fr } from '@/content/fr';
import { useConfiguratorStore } from '@/lib/configurator/store';
import type { ConfiguratorCatalog } from '@/lib/configurator/types';
import { cx } from '@/lib/cx';

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

function ViewButtons({
  value,
  onChange,
}: {
  value: CameraView;
  onChange: (view: CameraView) => void;
}) {
  return (
    <div
      role="group"
      aria-label={fr.pages.configurator.views.label}
      className="border-border bg-surface/90 absolute top-4 left-4 flex gap-1 rounded-md border p-1 backdrop-blur"
    >
      {CAMERA_VIEW_NAMES.map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onChange(view)}
          aria-pressed={view === value}
          className={cx(
            'rounded px-2 py-1 text-xs transition-colors',
            view === value ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
          )}
        >
          {fr.pages.configurator.views[view]}
        </button>
      ))}
    </div>
  );
}

export function ConfiguratorClient({ catalog }: { catalog: ConfiguratorCatalog }) {
  const [view, setView] = useState<CameraView>('trois_quarts');
  // Ce composant n'est jamais rendu côté serveur (chargé avec ssr: false),
  // la sonde WebGL peut donc se faire dès l'initialisation de l'état.
  const [webglAvailable] = useState(supportsWebGL);

  const initialize = useConfiguratorStore((state) => state.initialize);
  const isReady = useConfiguratorStore((state) => state.layoutSlug === catalog.layout.slug);

  useLayoutEffect(() => {
    initialize(catalog.layout, {
      chassisSku: catalog.chassis[0]?.sku,
      switchSku: catalog.switches[0]?.sku,
      keycapSku: catalog.keycaps[0]?.sku,
    });
  }, [initialize, catalog]);

  return (
    <div className="grid lg:h-[calc(100vh-8.5rem)] lg:grid-cols-[1fr_22rem]">
      <div className="bg-background relative h-[55vh] lg:h-full">
        {!webglAvailable ? (
          <p className="text-muted flex h-full items-center justify-center p-8 text-center text-sm">
            {fr.pages.configurator.noWebgl}
          </p>
        ) : (
          isReady && (
            <>
              <KeyboardScene catalog={catalog} view={view} />
              <ViewButtons value={view} onChange={setView} />
            </>
          )
        )}
      </div>

      <div className="overflow-y-auto">
        <ConfiguratorPanel catalog={catalog} />
      </div>
    </div>
  );
}
