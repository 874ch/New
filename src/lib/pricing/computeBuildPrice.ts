import type {
  Build,
  CatalogEntry,
  ComponentKind,
  PriceBreakdown,
  PriceLine,
  PriceTable,
  Sku,
} from './types';

/** Ordre d'affichage des lignes : châssis, puis switches, puis keycaps, puis le reste. */
const KIND_ORDER: readonly ComponentKind[] = ['CHASSIS', 'SWITCH', 'KEYCAP', 'CABLE', 'ACCESSORY'];

export class UnknownSkuError extends Error {
  constructor(readonly sku: Sku) {
    super(`Référence inconnue au catalogue : « ${sku} »`);
    this.name = 'UnknownSkuError';
  }
}

export class WrongComponentKindError extends Error {
  constructor(
    readonly sku: Sku,
    readonly expected: readonly ComponentKind[],
    readonly actual: ComponentKind,
  ) {
    super(`« ${sku} » est de type ${actual}, or on attend ici : ${expected.join(' ou ')}`);
    this.name = 'WrongComponentKindError';
  }
}

export class InvalidQuantityError extends Error {
  constructor(
    readonly sku: Sku,
    readonly quantity: number,
  ) {
    super(`Quantité invalide pour « ${sku} » : ${quantity}`);
    this.name = 'InvalidQuantityError';
  }
}

/** Construit une table de prix à partir d'une liste de pièces du catalogue. */
export function toPriceTable(entries: readonly CatalogEntry[]): PriceTable {
  return new Map(entries.map((entry) => [entry.sku, entry]));
}

/**
 * Prix d'un build = somme des (prix unitaire × quantité posée), point final.
 * Pas de palier, pas de base + delta, pas de remise : une addition pure.
 *
 * Tout est en centimes entiers : `0.7 * 50` vaut 34.999999999999996 en
 * flottant, `70 * 50` vaut exactement 3500.
 *
 * Un build partiel (touches encore vides) est valide et ne compte que ce qui
 * est posé — c'est ce qui alimente le prix affiché en direct pendant la
 * configuration.
 *
 * @throws UnknownSkuError si une pièce du build n'existe pas au catalogue
 * @throws WrongComponentKindError si une pièce est posée dans un emplacement
 *   qui ne lui correspond pas (poser une keycap à 0,50 € en tant que switch)
 * @throws InvalidQuantityError si la quantité d'un extra n'est pas un entier > 0
 */
export function computeBuildPrice(build: Build, priceTable: PriceTable): PriceBreakdown {
  const tally = new Map<Sku, { entry: CatalogEntry; quantity: number }>();

  const add = (sku: Sku, allowed: readonly ComponentKind[], quantity: number): void => {
    const entry = priceTable.get(sku);
    if (entry === undefined) throw new UnknownSkuError(sku);
    if (!allowed.includes(entry.kind)) {
      throw new WrongComponentKindError(sku, allowed, entry.kind);
    }

    const seen = tally.get(sku);
    if (seen === undefined) tally.set(sku, { entry, quantity });
    else seen.quantity += quantity;
  };

  add(build.chassisSku, ['CHASSIS'], 1);

  for (const assignment of Object.values(build.keys)) {
    if (assignment.switchSku !== null) add(assignment.switchSku, ['SWITCH'], 1);
    if (assignment.keycapSku !== null) add(assignment.keycapSku, ['KEYCAP'], 1);
  }

  for (const extra of build.extras ?? []) {
    // Seule quantité qui vienne directement de l'utilisateur et qui multiplie
    // un prix : elle est vérifiée ici en plus de la validation d'API.
    if (!Number.isSafeInteger(extra.quantity) || extra.quantity <= 0) {
      throw new InvalidQuantityError(extra.sku, extra.quantity);
    }
    add(extra.sku, ['CABLE', 'ACCESSORY'], extra.quantity);
  }

  const lines: PriceLine[] = [...tally.values()]
    .map(({ entry, quantity }) => ({
      sku: entry.sku,
      kind: entry.kind,
      name: entry.name,
      unitPriceCents: entry.unitPriceCents,
      quantity,
      lineTotalCents: entry.unitPriceCents * quantity,
    }))
    .sort(compareLines);

  return {
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
  };
}

function compareLines(a: PriceLine, b: PriceLine): number {
  const byKind = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
  if (byKind !== 0) return byKind;
  if (a.quantity !== b.quantity) return b.quantity - a.quantity;
  // Comparaison brute plutôt que localeCompare : l'ordre doit être identique
  // sur le client et sur le serveur, quel que soit l'ICU embarqué.
  return a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0;
}
