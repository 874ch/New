'use client';

import { useMemo } from 'react';
import type { MouseEvent } from 'react';

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
 */

const GAP = 0.06;
const EMPTY_FILL = '#c4c4c9';

function colorMap(options: readonly ComponentOption[]): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option.sku, option.swatchHex]));
}

export function KeyboardTopView({ catalog }: { catalog: ConfiguratorCatalog }) {
  const step = useConfiguratorStore((state) => state.step);
  const keys = useConfiguratorStore((state) => state.keys);
  const chassisSku = useConfiguratorStore((state) => state.chassisSku);
  const hoveredKey = useConfiguratorStore((state) => state.hoveredKey);
  const setHoveredKey = useConfiguratorStore((state) => state.setHoveredKey);
  const paintKey = useConfiguratorStore((state) => state.paintKey);
  const clearKey = useConfiguratorStore((state) => state.clearKey);

  const switchColors = useMemo(() => colorMap(catalog.switches), [catalog.switches]);
  const keycapColors = useMemo(() => colorMap(catalog.keycaps), [catalog.keycaps]);
  const chassisColor = catalog.chassis.find((option) => option.sku === chassisSku)?.swatchHex;

  const paintable = step === 'switches' || step === 'keycaps';
  const colorField = step === 'keycaps' || step === 'summary' ? 'keycapSku' : 'switchSku';
  const activeColors = colorField === 'keycapSku' ? keycapColors : switchColors;

  const { widthU, heightU } = catalog.layout;
  const viewW = widthU + 2 * CHASSIS_MARGIN;
  const viewH = heightU + 2 * CHASSIS_MARGIN;

  const handleClick = (event: MouseEvent<SVGRectElement>, code: string) => {
    if (!paintable) return;
    if (event.shiftKey) {
      clearKey(code);
    } else {
      paintKey(code);
    }
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
        const fill = (sku && activeColors[sku]) || EMPTY_FILL;
        const isHovered = hoveredKey === key.code;

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
            style={{ cursor: paintable ? 'pointer' : 'default' }}
            onClick={(event) => handleClick(event, key.code)}
            onMouseEnter={() => paintable && setHoveredKey(key.code)}
            onMouseLeave={() => paintable && setHoveredKey(null)}
          >
            <title>{key.label}</title>
          </rect>
        );
      })}
    </svg>
  );
}
