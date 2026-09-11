'use client';

import { useEffect, useMemo } from 'react';
import type { BufferGeometry } from 'three';

import { KeyInstances } from '@/components/configurator/scene/key-instances';
import { KeyLabels } from '@/components/configurator/scene/key-labels';
import {
  BOTTOM_SHELL_HEIGHT,
  CASE_DESIGN_HEIGHT_U,
  CASE_DESIGN_WIDTH_U,
  CHASSIS_KNOB_MARGIN,
  CHASSIS_KNOB_RADIUS,
  CHASSIS_MARGIN,
  LEVELS,
  PLATE_THICKNESS,
  SWITCH_STEM_HEIGHT,
  TOP_SHELL_HEIGHT,
  createBottomShellGeometry,
  createChassisKnobGeometry,
  createChassisPlateGeometry,
  createKeycapGeometry,
  createSlotGeometry,
  createSwitchHousingGeometry,
  createSwitchStemGeometry,
  createTopShellGeometry,
} from '@/components/configurator/scene/geometry';
import { relativeLuminance } from '@/lib/color';
import { useConfiguratorStore } from '@/lib/configurator/store';
import type { ConfiguratorCatalog, LayoutKeyData } from '@/lib/configurator/types';

const SWITCH_HOUSING_COLOR = '#2b2115';
const EMPTY_SLOT_COLOR = '#8a7a63';
const LABEL_LIGHT = '#f5ede1';
const LABEL_DARK = 'rgba(43, 33, 21, 0.55)';

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
    catalog.chassis.find((option) => option.sku === chassisSku)?.swatchHex ?? '#ddcfb4';
  // Le châssis peut être clair ou sombre : une étiquette à couleur fixe
  // deviendrait illisible sur l'un des deux (même logique que `strokeFor`
  // en vue 2D).
  const plateLabelColor = relativeLuminance(chassisColor) < 0.4 ? LABEL_LIGHT : LABEL_DARK;

  const switchColors = useMemo(() => colorMap(catalog.switches), [catalog.switches]);
  const keycapColors = useMemo(() => colorMap(catalog.keycaps), [catalog.keycaps]);

  // La plaque, la coque haute et la coque basse sont taillées dans Blender
  // pour le layout compact-80 (17,5 × 6 u) — pas des géométries paramétriques
  // comme le reste. Un layout d'une autre taille rendrait un boîtier mal
  // ajusté plutôt que de planter ; ça vaut un avertissement en développement
  // plutôt qu'un échec silencieux.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (
      Math.abs(layout.widthU - CASE_DESIGN_WIDTH_U) > 1e-6 ||
      Math.abs(layout.heightU - CASE_DESIGN_HEIGHT_U) > 1e-6
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[KeyboardModel] Le boîtier Blender (plaque/coque haute/coque basse) a été taillé pour un ` +
          `layout de ${CASE_DESIGN_WIDTH_U}×${CASE_DESIGN_HEIGHT_U}u, mais "${layout.slug}" mesure ` +
          `${layout.widthU}×${layout.heightU}u. Le boîtier affiché ne correspondra pas exactement — ` +
          `voir le commentaire d'en-tête de geometry.ts.`,
      );
    }
  }, [layout.slug, layout.widthU, layout.heightU]);

  const plateGeometry = useDisposable(useMemo(() => createChassisPlateGeometry(), []));
  const topShellGeometry = useDisposable(useMemo(() => createTopShellGeometry(), []));
  const bottomShellGeometry = useDisposable(useMemo(() => createBottomShellGeometry(), []));
  const slotGeometry = useDisposable(useMemo(() => createSlotGeometry(), []));
  const housingGeometry = useDisposable(useMemo(() => createSwitchHousingGeometry(), []));
  const stemGeometry = useDisposable(useMemo(() => createSwitchStemGeometry(), []));
  const knobGeometry = useDisposable(useMemo(() => createChassisKnobGeometry(), []));

  /** Coin arrière-droit de la coque haute : X vers la droite, Z vers l'avant (§9 geometry.ts). */
  const knobPosition = useMemo((): [number, number, number] => {
    const halfWidth = layout.widthU / 2 + CHASSIS_MARGIN;
    const halfDepth = layout.heightU / 2 + CHASSIS_MARGIN;
    return [
      halfWidth - CHASSIS_KNOB_RADIUS - CHASSIS_KNOB_MARGIN,
      TOP_SHELL_HEIGHT,
      -halfDepth + CHASSIS_KNOB_RADIUS + CHASSIS_KNOB_MARGIN,
    ];
  }, [layout.widthU, layout.heightU]);

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
      <mesh geometry={plateGeometry} position={[0, -PLATE_THICKNESS, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={chassisColor} roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh geometry={topShellGeometry} receiveShadow castShadow>
        <meshStandardMaterial color={chassisColor} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh geometry={bottomShellGeometry} position={[0, -BOTTOM_SHELL_HEIGHT, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={chassisColor} roughness={0.4} metalness={0.65} />
      </mesh>
      <mesh geometry={knobGeometry} position={knobPosition} receiveShadow castShadow>
        <meshStandardMaterial color={chassisColor} roughness={0.3} metalness={0.75} />
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
        {/* Repères de touches sur le fond du châssis : pour ne pas poser un
            switch à l'aveugle. Recouverts naturellement par le boîtier dès
            qu'une position est assignée. */}
        <KeyLabels
          keys={layout.keys}
          layout={layout}
          y={LEVELS.plateTop + 0.005}
          onlyWithField={null}
          colorBySku={{}}
          baseColor={plateLabelColor}
          maxFontPx={22}
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
        {/* Une fois posé, la lettre reste visible en petit au-dessus de la
            tige, dans la couleur du switch — confirmation visuelle rapide. */}
        <KeyLabels
          keys={layout.keys}
          layout={layout}
          y={LEVELS.stemBottom + SWITCH_STEM_HEIGHT + 0.01}
          onlyWithField="switchSku"
          colorBySku={switchColors}
          baseColor={SWITCH_HOUSING_COLOR}
          maxFontPx={13}
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
            baseColor="#e8dcc8"
            colorBySku={keycapColors}
            roughness={0.55}
            interactive={step === 'keycaps'}
          />
        ))}
      </group>
    </group>
  );
}
