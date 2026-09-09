'use client';

import { useMemo } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { CHASSIS_MARGIN } from '@/components/configurator/scene/geometry';
import { useConfiguratorStore } from '@/lib/configurator/store';
import type { ComponentOption, ConfiguratorCatalog } from '@/lib/configurator/types';

/**
 * Vue de dessus 2D — pas un lot de consolation pour navigateurs sans WebGL :
 * une reproduction complète du configurateur (palette, peinture, remplissage
 * rapide, prix restent dans `ConfiguratorPanel`, inchangé). C'est aussi la
 * vue d'assistance tactile prévue en Phase 7 (ARCHITECTURE.md §9.5) — mêmes
 * coordonnées `x/y/widthU/heightU` que la scène 3D, juste projetées en SVG
 * plutôt qu'en géométrie Three.js.
 *
 * C'est également l'alternative accessible au canvas 3D (masqué aux
 * lecteurs d'écran par `configurator-client.tsx`) : chaque touche est un
 * vrai élément focusable au clavier, avec un libellé décrivant son état —
 * pas seulement une forme cliquable à la souris.
 */

const GAP = 0.06;
const EMPTY_FILL = '#c4c4c9';

function optionMap(options: readonly ComponentOption[]): Map<string, ComponentOption> {
  return new Map(options.map((option) => [option.sku, option]));
}

export function KeyboardTopView({ catalog }: { catalog: ConfiguratorCatalog }) {
  const step = useConfiguratorStore((state) => state.step);
  const keys = useConfiguratorStore((state) => state.keys);
  const chassisSku = useConfiguratorStore((state) => state.chassisSku);
  const hoveredKey = useConfiguratorStore((state) => state.hoveredKey);
  const setHoveredKey = useConfiguratorStore((state) => state.setHoveredKey);
  const paintKey = useConfiguratorStore((state) => state.paintKey);
  const clearKey = useConfiguratorStore((state) => state.clearKey);

  const switchOptions = useMemo(() => optionMap(catalog.switches), [catalog.switches]);
  const keycapOptions = useMemo(() => optionMap(catalog.keycaps), [catalog.keycaps]);
  const chassisColor = catalog.chassis.find((option) => option.sku === chassisSku)?.swatchHex;

  const paintable = step === 'switches' || step === 'keycaps';
  const colorField = step === 'keycaps' || step === 'summary' ? 'keycapSku' : 'switchSku';
  const activeOptions = colorField === 'keycapSku' ? keycapOptions : switchOptions;
  const pieceLabel = colorField === 'keycapSku' ? 'keycap' : 'switch';

  const { widthU, heightU } = catalog.layout;
  const viewW = widthU + 2 * CHASSIS_MARGIN;
  const viewH = heightU + 2 * CHASSIS_MARGIN;

  const paint = (code: string, remove: boolean) => {
    if (!paintable) return;
    if (remove) {
      clearKey(code);
    } else {
      paintKey(code);
    }
  };

  const handleClick = (event: MouseEvent<SVGRectElement>, code: string) => {
    paint(code, event.shiftKey);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGRectElement>, code: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    paint(code, event.shiftKey);
  };

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      className="h-full w-full touch-none select-none"
      role="group"
      aria-label="Vue de dessus du clavier"
    >
      <rect x={0} y={0} width={viewW} height={viewH} rx={0.4} fill={chassisColor ?? '#d4d4d8'} />
      <rect
        x={CHASSIS_MARGIN - 0.08}
        y={CHASSIS_MARGIN - 0.08}
        width={widthU + 0.16}
        height={heightU + 0.16}
        rx={0.12}
        fill="rgb(0 0 0 / 0.15)"
      />

      {catalog.layout.keys.map((key) => {
        const assignment = keys[key.code];
        const sku = assignment?.[colorField] ?? null;
        const option = sku ? activeOptions.get(sku) : undefined;
        const fill = option?.swatchHex ?? EMPTY_FILL;
        const isHovered = hoveredKey === key.code;

        const label = paintable
          ? `Touche ${key.label} — ${option ? `${pieceLabel} ${option.name} posé` : `aucun ${pieceLabel} posé`}`
          : `Touche ${key.label}`;

        return (
          <rect
            key={key.code}
            x={key.x + CHASSIS_MARGIN + GAP / 2}
            y={key.y + CHASSIS_MARGIN + GAP / 2}
            width={key.widthU - GAP}
            height={key.heightU - GAP}
            rx={0.08}
            fill={fill}
            stroke={isHovered ? '#ffffff' : 'rgb(0 0 0 / 0.25)'}
            strokeWidth={isHovered ? 0.035 : 0.012}
            style={{ cursor: paintable ? 'pointer' : 'default', outline: 'none' }}
            role="button"
            tabIndex={paintable ? 0 : -1}
            aria-label={label}
            aria-pressed={paintable ? sku !== null : undefined}
            onClick={(event) => handleClick(event, key.code)}
            onKeyDown={(event) => handleKeyDown(event, key.code)}
            onMouseEnter={() => paintable && setHoveredKey(key.code)}
            onMouseLeave={() => paintable && setHoveredKey(null)}
            onFocus={() => paintable && setHoveredKey(key.code)}
            onBlur={() => paintable && setHoveredKey(null)}
          >
            <title>{label}</title>
          </rect>
        );
      })}
    </svg>
  );
}
