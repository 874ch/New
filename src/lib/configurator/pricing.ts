import type { ConfiguratorCatalog } from '@/lib/configurator/types';
import { toPriceTable } from '@/lib/pricing';
import type { Build, KeyAssignment, KeyCode, PriceTable, Sku } from '@/lib/pricing';

/**
 * Table de prix dérivée du catalogue servi au configurateur.
 *
 * C'est la même table que celle du moteur de prix serveur, construite à
 * partir des mêmes lignes de catalogue : l'affichage en direct et le montant
 * facturé ne peuvent pas diverger tant que les deux partent de la base.
 */
export function catalogPriceTable(catalog: ConfiguratorCatalog): PriceTable {
  return toPriceTable([...catalog.chassis, ...catalog.switches, ...catalog.keycaps]);
}

export interface BuildCompleteness {
  total: number;
  complete: number;
  missingSwitch: number;
  missingKeycap: number;
  isComplete: boolean;
}

/** Une position n'est vendable que si elle porte un switch **et** une keycap. */
export function checkCompleteness(
  keyCodes: readonly KeyCode[],
  keys: Readonly<Record<KeyCode, KeyAssignment>>,
): BuildCompleteness {
  let complete = 0;
  let missingSwitch = 0;
  let missingKeycap = 0;

  for (const code of keyCodes) {
    const assignment = keys[code];
    const hasSwitch = Boolean(assignment?.switchSku);
    const hasKeycap = Boolean(assignment?.keycapSku);

    if (!hasSwitch) missingSwitch += 1;
    if (!hasKeycap) missingKeycap += 1;
    if (hasSwitch && hasKeycap) complete += 1;
  }

  const total = keyCodes.length;
  return {
    total,
    complete,
    missingSwitch,
    missingKeycap,
    isComplete: total > 0 && complete === total,
  };
}

export function makeBuild(
  layoutSlug: string,
  chassisSku: Sku,
  keys: Readonly<Record<KeyCode, KeyAssignment>>,
): Build {
  return { version: 1, layoutSlug, chassisSku, keys };
}
