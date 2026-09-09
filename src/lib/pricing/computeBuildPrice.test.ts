import { describe, expect, it } from 'vitest';

import {
  computeBuildPrice,
  InvalidQuantityError,
  toPriceTable,
  UnknownSkuError,
  WrongComponentKindError,
} from './computeBuildPrice';
import { formatPriceCents } from './formatPrice';
import type { Build, CatalogEntry, KeyAssignment, KeyCode } from './types';

const CATALOGUE: readonly CatalogEntry[] = [
  { sku: 'CHS-BLANC', kind: 'CHASSIS', name: 'Châssis blanc', unitPriceCents: 11_000 },
  { sku: 'CHS-NOIR', kind: 'CHASSIS', name: 'Châssis noir', unitPriceCents: 10_000 },
  { sku: 'SW-OUTEMU-PEACH-V3', kind: 'SWITCH', name: 'Outemu Peach V3', unitPriceCents: 200 },
  { sku: 'SW-KTT-KANG-WHITE-V3', kind: 'SWITCH', name: 'KTT Kang White V3', unitPriceCents: 150 },
  { sku: 'KC-BLANC', kind: 'KEYCAP', name: 'Keycap blanche', unitPriceCents: 70 },
  { sku: 'KC-NOIR', kind: 'KEYCAP', name: 'Keycap noire', unitPriceCents: 50 },
  { sku: 'CBL-USBC-TRESSE', kind: 'CABLE', name: 'Câble USB-C tressé', unitPriceCents: 2_500 },
];

const PRIX = toPriceTable(CATALOGUE);

const keyCode = (index: number): KeyCode => `K${String(index).padStart(2, '0')}`;

function buildFromAssignments(
  assignments: readonly KeyAssignment[],
  chassisSku = 'CHS-BLANC',
): Build {
  const keys: Record<KeyCode, KeyAssignment> = {};
  assignments.forEach((assignment, index) => {
    keys[keyCode(index + 1)] = assignment;
  });
  return { version: 1, layoutSlug: 'compact-80', chassisSku, keys };
}

/**
 * Le build de référence du brief : châssis blanc, 50 Outemu Peach V3 sous
 * keycaps blanches, 30 KTT Kang White V3 sous keycaps noires.
 */
function buildCanonique(chassisSku = 'CHS-BLANC'): Build {
  const assignments: KeyAssignment[] = [
    ...Array.from({ length: 50 }, () => ({
      switchSku: 'SW-OUTEMU-PEACH-V3',
      keycapSku: 'KC-BLANC',
    })),
    ...Array.from({ length: 30 }, () => ({
      switchSku: 'SW-KTT-KANG-WHITE-V3',
      keycapSku: 'KC-NOIR',
    })),
  ];
  return buildFromAssignments(assignments, chassisSku);
}

describe('cas de test canonique — 305 €', () => {
  it('tombe exactement à 305,00 €', () => {
    expect(computeBuildPrice(buildCanonique(), PRIX).totalCents).toBe(30_500);
  });

  it('détaille la nomenclature ligne par ligne', () => {
    const { lines } = computeBuildPrice(buildCanonique(), PRIX);

    expect(lines.map((l) => [l.sku, l.quantity, l.lineTotalCents] as const)).toStrictEqual([
      ['CHS-BLANC', 1, 11_000],
      ['SW-OUTEMU-PEACH-V3', 50, 10_000],
      ['SW-KTT-KANG-WHITE-V3', 30, 4_500],
      ['KC-BLANC', 50, 3_500],
      ['KC-NOIR', 30, 1_500],
    ]);
  });

  it('affiche « 305,00 € »', () => {
    const { totalCents } = computeBuildPrice(buildCanonique(), PRIX);
    // Intl insère une espace insécable étroite avant le symbole.
    expect(formatPriceCents(totalCents).replace(/\s/gu, ' ')).toBe('305,00 €');
  });

  it('le total est toujours la somme des lignes', () => {
    const { lines, totalCents } = computeBuildPrice(buildCanonique(), PRIX);
    expect(lines.reduce((sum, l) => sum + l.lineTotalCents, 0)).toBe(totalCents);
  });
});

describe('addition pure', () => {
  it('le châssis noir retire exactement ses 10 € de différence (pas de base + delta)', () => {
    expect(computeBuildPrice(buildCanonique('CHS-NOIR'), PRIX).totalCents).toBe(29_500);
  });

  it('ne fait aucune remise sur la quantité', () => {
    const une = computeBuildPrice(
      buildFromAssignments([{ switchSku: 'SW-OUTEMU-PEACH-V3', keycapSku: 'KC-BLANC' }]),
      PRIX,
    );
    const cent = computeBuildPrice(
      buildFromAssignments(
        Array.from({ length: 100 }, () => ({
          switchSku: 'SW-OUTEMU-PEACH-V3',
          keycapSku: 'KC-BLANC',
        })),
      ),
      PRIX,
    );

    expect(une.totalCents).toBe(11_000 + 200 + 70);
    expect(cent.totalCents).toBe(11_000 + 100 * (200 + 70));
  });

  it('reste exact là où les flottants dérivent (0,70 € × 50)', () => {
    const { lines } = computeBuildPrice(buildCanonique(), PRIX);
    const keycaps = lines.find((l) => l.sku === 'KC-BLANC');

    // 0.7 * 50 === 34.999999999999996 en flottant.
    expect(keycaps?.lineTotalCents).toBe(3_500);
    expect(Number.isInteger(keycaps?.lineTotalCents)).toBe(true);
  });
});

describe('build partiel (prix affiché en direct)', () => {
  it('ne compte que les pièces déjà posées', () => {
    const build = buildFromAssignments([
      { switchSku: 'SW-OUTEMU-PEACH-V3', keycapSku: 'KC-BLANC' },
      { switchSku: 'SW-OUTEMU-PEACH-V3', keycapSku: null },
      { switchSku: null, keycapSku: null },
    ]);

    expect(computeBuildPrice(build, PRIX).totalCents).toBe(11_000 + 2 * 200 + 70);
  });

  it('un châssis seul vaut le prix du châssis', () => {
    expect(computeBuildPrice(buildFromAssignments([]), PRIX).totalCents).toBe(11_000);
  });
});

describe('extras', () => {
  it('additionne les extras avec leur quantité', () => {
    const build: Build = {
      ...buildCanonique(),
      extras: [{ sku: 'CBL-USBC-TRESSE', quantity: 2 }],
    };

    expect(computeBuildPrice(build, PRIX).totalCents).toBe(30_500 + 2 * 2_500);
  });

  it('refuse une quantité nulle, négative ou fractionnaire', () => {
    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      const build: Build = {
        ...buildCanonique(),
        extras: [{ sku: 'CBL-USBC-TRESSE', quantity }],
      };
      expect(() => computeBuildPrice(build, PRIX)).toThrow(InvalidQuantityError);
    }
  });
});

describe('garde-fous sur un build venu du client', () => {
  it('rejette un SKU absent du catalogue', () => {
    const build = buildFromAssignments([{ switchSku: 'SW-GRATUIT-LOL', keycapSku: 'KC-BLANC' }]);
    expect(() => computeBuildPrice(build, PRIX)).toThrow(UnknownSkuError);
  });

  it("rejette une keycap posée à la place d'un switch", () => {
    const build = buildFromAssignments([{ switchSku: 'KC-NOIR', keycapSku: 'KC-NOIR' }]);
    expect(() => computeBuildPrice(build, PRIX)).toThrow(WrongComponentKindError);
  });

  it("rejette un châssis qui n'en est pas un", () => {
    expect(() => computeBuildPrice(buildFromAssignments([], 'KC-NOIR'), PRIX)).toThrow(
      WrongComponentKindError,
    );
  });

  it('ne se laisse pas berner par « __proto__ » comme SKU', () => {
    const build = buildFromAssignments([{ switchSku: '__proto__', keycapSku: 'KC-BLANC' }]);
    expect(() => computeBuildPrice(build, PRIX)).toThrow(UnknownSkuError);
  });
});

describe('déterminisme', () => {
  it("produit le même détail quel que soit l'ordre de saisie des touches", () => {
    const ordre = computeBuildPrice(buildCanonique(), PRIX);

    const inverse = buildFromAssignments([
      ...Array.from({ length: 30 }, () => ({
        switchSku: 'SW-KTT-KANG-WHITE-V3',
        keycapSku: 'KC-NOIR',
      })),
      ...Array.from({ length: 50 }, () => ({
        switchSku: 'SW-OUTEMU-PEACH-V3',
        keycapSku: 'KC-BLANC',
      })),
    ]);

    expect(computeBuildPrice(inverse, PRIX)).toStrictEqual(ordre);
  });
});
