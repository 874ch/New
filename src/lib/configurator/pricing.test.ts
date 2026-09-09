import { describe, expect, it } from 'vitest';

import { catalogPriceTable, checkCompleteness, makeBuild } from './pricing';
import type { ConfiguratorCatalog, LayoutKeyData } from './types';
import { computeBuildPrice, formatPriceCents } from '@/lib/pricing';
import type { KeyAssignment, KeyCode } from '@/lib/pricing';

const keyCode = (index: number): KeyCode => `K${String(index).padStart(2, '0')}`;

const KEYS: LayoutKeyData[] = Array.from({ length: 80 }, (_, index) => ({
  code: keyCode(index + 1),
  label: `T${index + 1}`,
  row: Math.floor(index / 14),
  col: index % 14,
  x: index % 14,
  y: Math.floor(index / 14),
  widthU: 1,
  heightU: 1,
}));

/** Mêmes valeurs que le seed (prisma/seed.ts) : c'est ce que sert la base. */
const CATALOG: ConfiguratorCatalog = {
  layout: {
    slug: 'compact-80',
    name: 'Compact 80',
    keyCount: 80,
    widthU: 14,
    heightU: 6,
    keys: KEYS,
  },
  chassis: [
    {
      sku: 'CHS-BLANC',
      kind: 'CHASSIS',
      name: 'Châssis blanc',
      unitPriceCents: 11_000,
      swatchHex: '#F5F5F0',
    },
    {
      sku: 'CHS-NOIR',
      kind: 'CHASSIS',
      name: 'Châssis noir',
      unitPriceCents: 10_000,
      swatchHex: '#1A1A1A',
    },
  ],
  switches: [
    {
      sku: 'SW-OUTEMU-PEACH-V3',
      kind: 'SWITCH',
      name: 'Outemu Peach V3',
      unitPriceCents: 200,
      swatchHex: '#F7B99C',
    },
    {
      sku: 'SW-KTT-KANG-WHITE-V3',
      kind: 'SWITCH',
      name: 'KTT Kang White V3',
      unitPriceCents: 150,
      swatchHex: '#F2F0EA',
    },
  ],
  keycaps: [
    {
      sku: 'KC-BLANC',
      kind: 'KEYCAP',
      name: 'Keycap blanche',
      unitPriceCents: 70,
      swatchHex: '#F5F5F0',
    },
    {
      sku: 'KC-NOIR',
      kind: 'KEYCAP',
      name: 'Keycap noire',
      unitPriceCents: 50,
      swatchHex: '#1A1A1A',
    },
  ],
};

const KEY_CODES = KEYS.map((key) => key.code);

/** Le build de référence du brief, tel qu'un client le poserait dans le configurateur. */
function buildCanonique(): Record<KeyCode, KeyAssignment> {
  const keys: Record<KeyCode, KeyAssignment> = {};
  KEY_CODES.forEach((code, index) => {
    keys[code] =
      index < 50
        ? { switchSku: 'SW-OUTEMU-PEACH-V3', keycapSku: 'KC-BLANC' }
        : { switchSku: 'SW-KTT-KANG-WHITE-V3', keycapSku: 'KC-NOIR' };
  });
  return keys;
}

describe('prix live du configurateur', () => {
  it('le catalogue servi au configurateur chiffre le build canonique à 305,00 €', () => {
    const table = catalogPriceTable(CATALOG);
    const build = makeBuild('compact-80', 'CHS-BLANC', buildCanonique());

    const { totalCents } = computeBuildPrice(build, table);

    expect(totalCents).toBe(30_500);
    expect(formatPriceCents(totalCents).replace(/\s/gu, ' ')).toBe('305,00 €');
  });

  it('chiffre un build partiel pendant que le client construit', () => {
    const table = catalogPriceTable(CATALOG);
    const keys: Record<KeyCode, KeyAssignment> = {};
    for (const code of KEY_CODES) keys[code] = { switchSku: null, keycapSku: null };
    keys[keyCode(1)] = { switchSku: 'SW-OUTEMU-PEACH-V3', keycapSku: 'KC-BLANC' };

    const build = makeBuild('compact-80', 'CHS-BLANC', keys);

    expect(computeBuildPrice(build, table).totalCents).toBe(11_000 + 200 + 70);
  });
});

describe('complétude avant ajout au panier', () => {
  it('accepte un build dont les 80 positions portent switch et keycap', () => {
    const result = checkCompleteness(KEY_CODES, buildCanonique());

    expect(result).toStrictEqual({
      total: 80,
      complete: 80,
      missingSwitch: 0,
      missingKeycap: 0,
      isComplete: true,
    });
  });

  it('refuse un build auquel il manque une keycap', () => {
    const keys = buildCanonique();
    keys[keyCode(7)] = { switchSku: 'SW-OUTEMU-PEACH-V3', keycapSku: null };

    const result = checkCompleteness(KEY_CODES, keys);

    expect(result.isComplete).toBe(false);
    expect(result.missingKeycap).toBe(1);
    expect(result.complete).toBe(79);
  });

  it('compte les positions vides des deux côtés', () => {
    const keys: Record<KeyCode, KeyAssignment> = {};
    for (const code of KEY_CODES) keys[code] = { switchSku: null, keycapSku: null };

    const result = checkCompleteness(KEY_CODES, keys);

    expect(result.isComplete).toBe(false);
    expect(result.missingSwitch).toBe(80);
    expect(result.missingKeycap).toBe(80);
  });
});
