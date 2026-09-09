'use client';

import { useEffect, useMemo } from 'react';
import type { BufferGeometry } from 'three';

import { KeyInstances } from '@/components/configurator/scene/key-instances';
import {
  LEVELS,
  createChassisPlateGeometry,
  createChassisRimGeometry,
  createKeycapGeometry,
  createSlotGeometry,
  createSwitchHousingGeometry,
  createSwitchStemGeometry,
} from '@/components/configurator/scene/geometry';
import { useConfiguratorStore } from '@/lib/configurator/store';
import type { ConfiguratorCatalog, LayoutKeyData } from '@/lib/configurator/types';

const SWITCH_HOUSING_COLOR = '#2b2b30';
const EMPTY_SLOT_COLOR = '#8b8b92';

function colorMap(options: readonly { sku: string; swatchHex: string }[]): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option.sku, option.swatchHex]));
}

/** Libère les géométries quand elles changent ou au démontage (mémoire GPU). */
function useDisposable<T extends BufferGeometry | readonly BufferGeometry[]>(value: T): T {
  useEffect(() => {
    return () => {
      if (Array.isArray(value)) {
        for (const geometry of value as readonly BufferGeometry[]) geometry.dispose();
      } else {
        (value as BufferGeometry).dispose();
      }
    };
  }, [value]);
  return value;
}

export function KeyboardModel({ catalog }: { catalog: ConfiguratorCatalog }) {
  const { layout } = catalog;
  const step = useConfiguratorStore((state) => state.step);
  const chassisSku = useConfiguratorStore((state) => state.chassisSku);

  const showSwitches = step !== 'chassis';
  const showKeycaps = step === 'keycaps' || step === 'summary';
  // Les emplacements vides restent affichés (sauf au récapitulatif) : ils
  // montrent ce qui n'est pas encore assigné et donnent une cible cliquable
  // aux positions nues, à toutes les étapes de peinture.
  const showSlots = step !== 'summary';
  const canPaint = step === 'switches' || step === 'keycaps';

  const chassisColor =
    catalog.chassis.find((option) => option.sku === chassisSku)?.swatchHex ?? '#d4d4d8';

  const switchColors = useMemo(() => colorMap(catalog.switches), [catalog.switches]);
  const keycapColors = useMemo(() => colorMap(catalog.keycaps), [catalog.keycaps]);

  const plateGeometry = useDisposable(
    useMemo(
      () => createChassisPlateGeometry(layout.widthU, layout.heightU),
      [layout.widthU, layout.heightU],
    ),
  );
  const rimGeometry = useDisposable(
    useMemo(
      () => createChassisRimGeometry(layout.widthU, layout.heightU),
      [layout.widthU, layout.heightU],
    ),
  );
  const slotGeometry = useDisposable(useMemo(() => createSlotGeometry(), []));
  const housingGeometry = useDisposable(useMemo(() => createSwitchHousingGeometry(), []));
  const stemGeometry = useDisposable(useMemo(() => createSwitchStemGeometry(), []));

  /**
   * Les keycaps sont groupées par largeur : une géométrie par largeur permet
   * de garder les chanfreins nets (une seule géométrie mise à l'échelle
   * étirerait les bords de la barre d'espace), tout en restant à ~6 draw calls
   * pour 80 touches.
   */
  const keycapGroups = useMemo(() => {
    const groups = new Map<number, LayoutKeyData[]>();
    for (const key of layout.keys) {
      const width = Math.round(key.widthU * 100) / 100;
      const bucket = groups.get(width);
      if (bucket) {
        bucket.push(key);
      } else {
        groups.set(width, [key]);
      }
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([widthU, keys]) => ({ widthU, keys, geometry: createKeycapGeometry(widthU) }));
  }, [layout.keys]);

  useDisposable(useMemo(() => keycapGroups.map((group) => group.geometry), [keycapGroups]));

  return (
    <group>
      <mesh geometry={plateGeometry} receiveShadow castShadow>
        <meshStandardMaterial color={chassisColor} roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh geometry={rimGeometry} receiveShadow castShadow>
        <meshStandardMaterial color={chassisColor} roughness={0.35} metalness={0.7} />
      </mesh>

      <group visible={showSlots}>
        <KeyInstances
          keys={layout.keys}
          layout={layout}
          geometry={slotGeometry}
          y={LEVELS.plateTop}
          visibilityField={null}
          colorField={null}
          baseColor={EMPTY_SLOT_COLOR}
          colorBySku={{}}
          roughness={0.9}
          opacity={0.55}
          interactive={canPaint}
        />
      </group>

      <group visible={showSwitches}>
        <KeyInstances
          keys={layout.keys}
          layout={layout}
          geometry={housingGeometry}
          y={LEVELS.switchBottom}
          visibilityField="switchSku"
          colorField={null}
          baseColor={SWITCH_HOUSING_COLOR}
          colorBySku={{}}
          roughness={0.75}
          interactive={canPaint}
        />
        <KeyInstances
          keys={layout.keys}
          layout={layout}
          geometry={stemGeometry}
          y={LEVELS.stemBottom}
          visibilityField="switchSku"
          colorField="switchSku"
          baseColor={SWITCH_HOUSING_COLOR}
          colorBySku={switchColors}
          roughness={0.5}
        />
      </group>

      <group visible={showKeycaps}>
        {keycapGroups.map((group) => (
          <KeyInstances
            key={group.widthU}
            keys={group.keys}
            layout={layout}
            geometry={group.geometry}
            y={LEVELS.keycapBottom}
            visibilityField="keycapSku"
            colorField="keycapSku"
            baseColor="#e4e4e7"
            colorBySku={keycapColors}
            roughness={0.55}
            interactive={step === 'keycaps'}
          />
        ))}
      </group>
    </group>
  );
}
