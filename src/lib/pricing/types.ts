/**
 * Types du moteur de prix.
 *
 * Ce module est volontairement sans dépendance (ni Prisma, ni React) : il est
 * importé tel quel par le client (affichage du prix en direct dans le
 * configurateur) et par le serveur (recalcul faisant foi avant paiement).
 */

/** Référence catalogue stable et lisible, ex. « SW-OUTEMU-PEACH-V3 ». */
export type Sku = string;

/** Code d'une position de touche dans un layout, ex. « K042 ». */
export type KeyCode = string;

export type ComponentKind = 'CHASSIS' | 'SWITCH' | 'KEYCAP' | 'CABLE' | 'ACCESSORY';

/** Une entrée de la table de prix : une pièce et son prix unitaire. */
export interface CatalogEntry {
  sku: Sku;
  kind: ComponentKind;
  name: string;
  /** Prix unitaire TTC en centimes d'euro. Toujours un entier, jamais un flottant. */
  unitPriceCents: number;
}

/**
 * Table de prix indexée par SKU.
 *
 * C'est une Map et non un objet simple : les SKU d'un build proviennent du
 * client, et sur un objet `table['__proto__']` renverrait Object.prototype
 * au lieu de `undefined`, ce qui contournerait le contrôle de SKU inconnu.
 */
export type PriceTable = ReadonlyMap<Sku, CatalogEntry>;

/**
 * Ce qui est posé sur une position de touche.
 * `null` = pas encore assigné : le configurateur affiche un prix en direct
 * pendant que le client construit, donc un build partiel doit être chiffrable.
 */
export interface KeyAssignment {
  switchSku: Sku | null;
  keycapSku: Sku | null;
}

/** Pièce hors touches attachée au build (câble, sacoche, repose-poignets…). */
export interface BuildExtra {
  sku: Sku;
  quantity: number;
}

/**
 * Build sérialisable — le contrat d'échange entre le configurateur, le panier
 * et le serveur. Voir ARCHITECTURE.md §5.
 */
export interface Build {
  version: 1;
  layoutSlug: string;
  chassisSku: Sku;
  keys: Readonly<Record<KeyCode, KeyAssignment>>;
  extras?: readonly BuildExtra[];
}

/** Une ligne du détail de prix : une pièce, sa quantité, son sous-total. */
export interface PriceLine {
  sku: Sku;
  kind: ComponentKind;
  name: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

/**
 * Résultat du calcul. `lines` sert aussi de nomenclature de fabrication
 * (« 50× Outemu Peach V3 ») dans le back-office.
 */
export interface PriceBreakdown {
  lines: readonly PriceLine[];
  totalCents: number;
}
