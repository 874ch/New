import 'dotenv/config';

import { hashPassword } from '../src/lib/auth/password';
import { db } from '../src/lib/db';

/**
 * Données de démonstration pour la Phase 1 : un layout de 80 touches et le
 * catalogue de pièces du cas de test canonique (voir ARCHITECTURE.md §4.5).
 * Idempotent (upsert) : peut être rejoué sans dupliquer.
 *
 * La géométrie du layout est une disposition « Compact 80 » générique
 * (inspirée d'un TKL sans bloc navigation complet), suffisante pour peupler
 * la base et la vue de dessus 2D. Elle sera affinée en Phase 4 au contact du
 * rendu 3D réel — le nombre de touches (80) et les codes ne changeront pas.
 */

interface KeySpec {
  code: string;
  label: string;
  row: number;
  col: number;
  x: number;
  y: number;
  widthU: number;
  heightU: number;
}

function buildRow(params: {
  row: number;
  y: number;
  startX: number;
  codeStart: number;
  specs: readonly { label: string; widthU?: number; gapBefore?: number }[];
}): { keys: KeySpec[]; endX: number; nextCode: number } {
  const keys: KeySpec[] = [];
  let x = params.startX;
  let codeNumber = params.codeStart;

  params.specs.forEach((spec, col) => {
    x += spec.gapBefore ?? 0;
    const widthU = spec.widthU ?? 1;
    keys.push({
      code: `K${String(codeNumber).padStart(2, '0')}`,
      label: spec.label,
      row: params.row,
      col,
      x,
      y: params.y,
      widthU,
      heightU: 1,
    });
    x += widthU;
    codeNumber += 1;
  });

  return { keys, endX: x, nextCode: codeNumber };
}

function buildCompact80Layout(): KeySpec[] {
  let nextCode = 1;
  const keys: KeySpec[] = [];

  const functionRow = buildRow({
    row: 0,
    y: 0,
    startX: 0,
    codeStart: nextCode,
    specs: [
      { label: 'Échap' },
      { label: 'F1', gapBefore: 0.5 },
      { label: 'F2' },
      { label: 'F3' },
      { label: 'F4' },
      { label: 'F5', gapBefore: 0.25 },
      { label: 'F6' },
      { label: 'F7' },
      { label: 'F8' },
      { label: 'F9', gapBefore: 0.25 },
      { label: 'F10' },
      { label: 'F11' },
      { label: 'F12' },
    ],
  });
  keys.push(...functionRow.keys);
  nextCode = functionRow.nextCode;
  const mainBlockWidth = functionRow.endX; // 14u — sert de référence pour les rangées suivantes

  const numberRow = buildRow({
    row: 1,
    y: 1,
    startX: 0,
    codeStart: nextCode,
    specs: [
      { label: '²' },
      { label: '1' },
      { label: '2' },
      { label: '3' },
      { label: '4' },
      { label: '5' },
      { label: '6' },
      { label: '7' },
      { label: '8' },
      { label: '9' },
      { label: '0' },
      { label: '°' },
      { label: '+' },
      { label: 'Retour arrière', widthU: 2 },
    ],
  });
  keys.push(...numberRow.keys);
  nextCode = numberRow.nextCode;

  const qwertyRow = buildRow({
    row: 2,
    y: 2,
    startX: 0,
    codeStart: nextCode,
    specs: [
      { label: 'Tab', widthU: 1.5 },
      { label: 'A' },
      { label: 'Z' },
      { label: 'E' },
      { label: 'R' },
      { label: 'T' },
      { label: 'Y' },
      { label: 'U' },
      { label: 'I' },
      { label: 'O' },
      { label: 'P' },
      { label: '^' },
      { label: '$' },
      { label: '*', widthU: 1.5 },
    ],
  });
  keys.push(...qwertyRow.keys);
  nextCode = qwertyRow.nextCode;

  const homeRow = buildRow({
    row: 3,
    y: 3,
    startX: 0,
    codeStart: nextCode,
    specs: [
      { label: 'Verr. Maj.', widthU: 1.75 },
      { label: 'Q' },
      { label: 'S' },
      { label: 'D' },
      { label: 'F' },
      { label: 'G' },
      { label: 'H' },
      { label: 'J' },
      { label: 'K' },
      { label: 'L' },
      { label: 'M' },
      { label: 'ù' },
      { label: 'Entrée', widthU: 2.25 },
    ],
  });
  keys.push(...homeRow.keys);
  nextCode = homeRow.nextCode;

  const shiftRow = buildRow({
    row: 4,
    y: 4,
    startX: 0,
    codeStart: nextCode,
    specs: [
      { label: 'Maj. gauche', widthU: 2.25 },
      { label: 'W' },
      { label: 'X' },
      { label: 'C' },
      { label: 'V' },
      { label: 'B' },
      { label: 'N' },
      { label: ',' },
      { label: ';' },
      { label: ':' },
      { label: '!' },
      { label: 'Maj. droite', widthU: 1.75 },
    ],
  });
  keys.push(...shiftRow.keys);
  nextCode = shiftRow.nextCode;

  const bottomRow = buildRow({
    row: 5,
    y: 5,
    startX: 0,
    codeStart: nextCode,
    specs: [
      { label: 'Ctrl gauche', widthU: 1.25 },
      { label: 'Win', widthU: 1.25 },
      { label: 'Alt', widthU: 1.25 },
      { label: 'Espace', widthU: 6.25 },
      { label: 'AltGr', widthU: 1.25 },
      { label: 'Fn', widthU: 1.25 },
      { label: 'Ctrl droit', widthU: 1.25 },
    ],
  });
  keys.push(...bottomRow.keys);
  nextCode = bottomRow.nextCode;

  const navGap = 0.5;
  const navCluster = buildRow({
    row: 1,
    y: 1,
    startX: mainBlockWidth + navGap,
    codeStart: nextCode,
    specs: [{ label: 'Suppr.' }, { label: 'Origine' }, { label: 'Fin' }],
  });
  keys.push(...navCluster.keys);
  nextCode = navCluster.nextCode;

  const arrowUp = buildRow({
    row: 4,
    y: 4,
    startX: mainBlockWidth + navGap + 1,
    codeStart: nextCode,
    specs: [{ label: '↑' }],
  });
  keys.push(...arrowUp.keys);
  nextCode = arrowUp.nextCode;

  const arrowRow = buildRow({
    row: 5,
    y: 5,
    startX: mainBlockWidth + navGap,
    codeStart: nextCode,
    specs: [{ label: '←' }, { label: '↓' }, { label: '→' }],
  });
  keys.push(...arrowRow.keys);

  return keys;
}

async function main(): Promise<void> {
  const keys = buildCompact80Layout();
  if (keys.length !== 80) {
    throw new Error(`Le layout « compact-80 » doit avoir 80 touches, en a ${keys.length}`);
  }

  const widthU = Math.max(...keys.map((k) => k.x + k.widthU));
  const heightU = Math.max(...keys.map((k) => k.y + k.heightU));

  const layout = await db.layout.upsert({
    where: { slug: 'compact-80' },
    create: { slug: 'compact-80', name: 'Compact 80', keyCount: 80, widthU, heightU },
    update: { keyCount: 80, widthU, heightU },
  });

  for (const key of keys) {
    await db.layoutKey.upsert({
      where: { layoutId_code: { layoutId: layout.id, code: key.code } },
      create: { layoutId: layout.id, ...key },
      update: { ...key },
    });
  }

  await db.component.upsert({
    where: { sku: 'CHS-BLANC' },
    create: {
      sku: 'CHS-BLANC',
      kind: 'CHASSIS',
      name: 'Châssis blanc',
      slug: 'chassis-blanc',
      unitPriceCents: 11_000,
      swatchHex: '#F5F5F0',
      layoutId: layout.id,
    },
    update: { unitPriceCents: 11_000, layoutId: layout.id },
  });

  await db.component.upsert({
    where: { sku: 'CHS-NOIR' },
    create: {
      sku: 'CHS-NOIR',
      kind: 'CHASSIS',
      name: 'Châssis noir',
      slug: 'chassis-noir',
      unitPriceCents: 10_000,
      swatchHex: '#1A1A1A',
      layoutId: layout.id,
    },
    update: { unitPriceCents: 10_000, layoutId: layout.id },
  });

  await db.component.upsert({
    where: { sku: 'SW-OUTEMU-PEACH-V3' },
    create: {
      sku: 'SW-OUTEMU-PEACH-V3',
      kind: 'SWITCH',
      name: 'Outemu Peach V3',
      slug: 'switch-outemu-peach-v3',
      unitPriceCents: 200,
      swatchHex: '#F7B99C',
    },
    update: { unitPriceCents: 200, swatchHex: '#F7B99C' },
  });

  await db.component.upsert({
    where: { sku: 'SW-KTT-KANG-WHITE-V3' },
    create: {
      sku: 'SW-KTT-KANG-WHITE-V3',
      kind: 'SWITCH',
      name: 'KTT Kang White V3',
      slug: 'switch-ktt-kang-white-v3',
      unitPriceCents: 150,
      swatchHex: '#F2F0EA',
    },
    update: { unitPriceCents: 150, swatchHex: '#F2F0EA' },
  });

  await db.component.upsert({
    where: { sku: 'KC-BLANC' },
    create: {
      sku: 'KC-BLANC',
      kind: 'KEYCAP',
      name: 'Keycap blanche',
      slug: 'keycap-blanche',
      unitPriceCents: 70,
      swatchHex: '#F5F5F0',
    },
    update: { unitPriceCents: 70 },
  });

  await db.component.upsert({
    where: { sku: 'KC-NOIR' },
    create: {
      sku: 'KC-NOIR',
      kind: 'KEYCAP',
      name: 'Keycap noire',
      slug: 'keycap-noire',
      unitPriceCents: 50,
      swatchHex: '#1A1A1A',
    },
    update: { unitPriceCents: 50 },
  });

  await db.component.upsert({
    where: { sku: 'CBL-USBC-TRESSE' },
    create: {
      sku: 'CBL-USBC-TRESSE',
      kind: 'CABLE',
      name: 'Câble USB-C tressé',
      slug: 'cable-usbc-tresse',
      unitPriceCents: 2_500,
    },
    update: { unitPriceCents: 2_500 },
  });

  // Catalogue « tout fait » (Phase 2) : chaque variante porte un `buildTemplate`
  // au format du moteur de prix (src/lib/pricing/types.ts), pour que l'admin
  // puisse fabriquer une commande standard exactement comme un build custom.
  const keyCodes = keys.map((k) => k.code);

  const uniformBuildTemplate = (chassisSku: string, switchSku: string, keycapSku: string) => ({
    version: 1,
    layoutSlug: 'compact-80',
    chassisSku,
    keys: Object.fromEntries(keyCodes.map((code) => [code, { switchSku, keycapSku }])),
  });

  // Reprend exactement le mix du cas de test canonique (305 €, cf. ARCHITECTURE.md §4.5).
  const signatureBuildTemplate = (chassisSku: string) => ({
    version: 1,
    layoutSlug: 'compact-80',
    chassisSku,
    keys: Object.fromEntries(
      keyCodes.map((code, index) => [
        code,
        index < 50
          ? { switchSku: 'SW-OUTEMU-PEACH-V3', keycapSku: 'KC-BLANC' }
          : { switchSku: 'SW-KTT-KANG-WHITE-V3', keycapSku: 'KC-NOIR' },
      ]),
    ),
  });

  const compact80Product = await db.product.upsert({
    where: { slug: 'compact-80' },
    create: {
      slug: 'compact-80',
      name: 'Clavier Compact 80',
      description:
        'Le Compact 80 assemblé et réglé pour vous : châssis, switches et keycaps déjà choisis. Envie de composer votre propre mix, touche par touche ? Direction le configurateur.',
      images: [],
      sortOrder: 0,
    },
    update: {},
  });

  const standardVariants = [
    {
      sku: 'STD-C80-BLANC-PEACH',
      name: 'Blanc — Outemu Peach V3',
      unitPriceCents: 24_900,
      stockQty: 12,
      buildTemplate: uniformBuildTemplate('CHS-BLANC', 'SW-OUTEMU-PEACH-V3', 'KC-BLANC'),
    },
    {
      sku: 'STD-C80-NOIR-KANG',
      name: 'Noir — KTT Kang White V3',
      unitPriceCents: 23_900,
      stockQty: 9,
      buildTemplate: uniformBuildTemplate('CHS-NOIR', 'SW-KTT-KANG-WHITE-V3', 'KC-NOIR'),
    },
    {
      sku: 'STD-C80-SIGNATURE',
      name: 'Bicolore Signature',
      unitPriceCents: 30_500,
      stockQty: 5,
      buildTemplate: signatureBuildTemplate('CHS-BLANC'),
    },
  ] as const;

  for (const variant of standardVariants) {
    await db.productVariant.upsert({
      where: { sku: variant.sku },
      create: { productId: compact80Product.id, ...variant },
      update: { ...variant, productId: compact80Product.id },
    });
  }

  // Bootstrap du premier compte admin — pas d'inscription publique pour le
  // back-office. N'agit que si les deux variables sont renseignées, pour ne
  // jamais committer un mot de passe en dur.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await db.adminUser.upsert({
      where: { email: adminEmail },
      create: { email: adminEmail, passwordHash: hashPassword(adminPassword) },
      update: {},
    });
  }

  console.log(
    `Seed OK — layout « ${layout.name} » (${keys.length} touches), 7 pièces au catalogue, ` +
      `1 produit tout fait (${standardVariants.length} variantes)` +
      `${adminEmail && adminPassword ? `, compte admin « ${adminEmail} »` : ''}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
