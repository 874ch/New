'use client';

import { useLayoutEffect, useState } from 'react';

import { ConfiguratorPanel } from '@/components/configurator/ui/configurator-panel';
import { CAMERA_VIEW_NAMES, KeyboardScene } from '@/components/configurator/scene/keyboard-scene';
import type { CameraView } from '@/components/configurator/scene/keyboard-scene';
import { KeyboardTopView } from '@/components/configurator/topview/keyboard-top-view';
import { fr } from '@/content/fr';
import { useConfiguratorStore } from '@/lib/configurator/store';
import type { ConfiguratorCatalog } from '@/lib/configurator/types';
import { cx } from '@/lib/cx';

type RenderMode = '3d' | '2d';

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

function RenderModeToggle({
  value,
  onChange,
}: {
  value: RenderMode;
  onChange: (mode: RenderMode) => void;
}) {
  const modes: RenderMode[] = ['3d', '2d'];
  return (
    <div
      role="group"
      aria-label={fr.pages.configurator.renderMode.label}
      className="border-border bg-surface/90 absolute top-4 right-4 flex gap-1 rounded-md border p-1 backdrop-blur"
    >
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={value === mode}
          className={cx(
            'rounded px-2 py-1 text-xs transition-colors',
            value === mode ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
          )}
        >
          {fr.pages.configurator.renderMode[mode]}
        </button>
      ))}
    </div>
  );
}

export function ConfiguratorClient({ catalog }: { catalog: ConfiguratorCatalog }) {
  const [cameraView, setCameraView] = useState<CameraView>('trois_quarts');
  // Ce composant n'est jamais rendu côté serveur (chargé avec ssr: false),
  // la sonde WebGL peut donc se faire dès l'initialisation de l'état.
  const [webglAvailable] = useState(supportsWebGL);
  const [renderMode, setRenderMode] = useState<RenderMode>(webglAvailable ? '3d' : '2d');

  const initialize = useConfiguratorStore((state) => state.initialize);
  const isReady = useConfiguratorStore((state) => state.layoutSlug === catalog.layout.slug);

  useLayoutEffect(() => {
    initialize(catalog.layout, {
      chassisSku: catalog.chassis[0]?.sku,
      switchSku: catalog.switches[0]?.sku,
      keycapSku: catalog.keycaps[0]?.sku,
    });
  }, [initialize, catalog]);

  const showScene = renderMode === '3d' && webglAvailable;

  return (
    <div className="grid lg:h-[calc(100vh-8.5rem)] lg:grid-cols-[1fr_22rem]">
      <div className="bg-background relative h-[55vh] lg:h-full">
        {isReady && (
          <>
            {showScene ? (
              <>
                <KeyboardScene catalog={catalog} view={cameraView} />
                <ViewButtons value={cameraView} onChange={setCameraView} />
              </>
            ) : (
              <div className="flex h-full flex-col gap-3 p-6">
                {!webglAvailable && (
                  <p className="text-muted text-center text-xs">
                    {fr.pages.configurator.webglUnavailableNotice}
                  </p>
                )}
                <div className="min-h-0 flex-1">
                  <KeyboardTopView catalog={catalog} />
                </div>
              </div>
            )}

            {webglAvailable && <RenderModeToggle value={renderMode} onChange={setRenderMode} />}
          </>
        )}
      </div>

      <div className="overflow-y-auto">
        <ConfiguratorPanel catalog={catalog} />
      </div>
    </div>
  );
}
