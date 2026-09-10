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

function UndoRedoButtons() {
  const undo = useConfiguratorStore((state) => state.undo);
  const redo = useConfiguratorStore((state) => state.redo);
  const canUndo = useConfiguratorStore((state) => state.past.length > 0);
  const canRedo = useConfiguratorStore((state) => state.future.length > 0);

  return (
    <div
      role="group"
      aria-label={fr.pages.configurator.history.label}
      className="border-border bg-surface/90 flex gap-1 rounded-md border p-1 backdrop-blur"
    >
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        aria-label={fr.pages.configurator.history.undo}
        title={fr.pages.configurator.history.undo}
        className="text-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <polyline
            points="4 8 4 14 10 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 18.5A9 9 0 1 0 8.6 5.6L4 10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        aria-label={fr.pages.configurator.history.redo}
        title={fr.pages.configurator.history.redo}
        className="text-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <polyline
            points="20 8 20 14 14 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.5 18.5A9 9 0 1 1 15.4 5.6L20 10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
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
      className="border-border bg-surface/90 flex gap-1 rounded-md border p-1 backdrop-blur"
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
      <div className="bg-background relative aspect-[4/3] max-h-[55vh] w-full lg:aspect-auto lg:h-full lg:max-h-none">
        {isReady && (
          <>
            {showScene ? (
              <>
                <p className="sr-only">{fr.pages.configurator.a11y.sceneHidden}</p>
                <div aria-hidden="true" className="h-full w-full">
                  <KeyboardScene catalog={catalog} view={cameraView} />
                </div>
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

            <div className="absolute top-16 right-4 flex flex-col items-end gap-2 sm:top-4">
              <UndoRedoButtons />
              {webglAvailable && <RenderModeToggle value={renderMode} onChange={setRenderMode} />}
            </div>
          </>
        )}
      </div>

      <div className="overflow-y-auto">
        <ConfiguratorPanel catalog={catalog} />
      </div>
    </div>
  );
}
