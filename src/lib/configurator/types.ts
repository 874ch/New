import type { ComponentKind, KeyCode, Sku } from '@/lib/pricing';

/** Une position de touche du layout, telle qu'elle sort de la base. */
export interface LayoutKeyData {
  code: KeyCode;
  label: string;
  row: number;
  col: number;
  /** Coordonnées en unités de touche (1u = une touche standard), origine en haut à gauche. */
  x: number;
  y: number;
  widthU: number;
  heightU: number;
}

export interface LayoutData {
  slug: string;
  name: string;
  keyCount: number;
  widthU: number;
  heightU: number;
  keys: readonly LayoutKeyData[];
}

/** Une pièce sélectionnable dans une palette du configurateur. */
export interface ComponentOption {
  sku: Sku;
  kind: ComponentKind;
  name: string;
  unitPriceCents: number;
  /** Couleur d'affichage (3D et pastille de palette). */
  swatchHex: string;
}

export interface ConfiguratorCatalog {
  layout: LayoutData;
  chassis: readonly ComponentOption[];
  switches: readonly ComponentOption[];
  keycaps: readonly ComponentOption[];
}

export const CONFIGURATOR_STEPS = ['chassis', 'switches', 'keycaps', 'summary'] as const;
export type ConfiguratorStep = (typeof CONFIGURATOR_STEPS)[number];
