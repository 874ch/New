import { cartItemLabel } from '@/lib/cart';
import type { CartItemWithRelations } from '@/lib/cart';
import { db } from '@/lib/db';
import { computeBuildPrice, toPriceTable } from '@/lib/pricing';
import type { Build, KeyAssignment, KeyCode, PriceLine, PriceTable, Sku } from '@/lib/pricing';

/**
 * Chiffrage serveur d'un panier, juste avant de facturer.
 *
 * Un build en base porte bien un `totalCents`, mais il a été figé au moment
 * de l'ajout au panier : si le catalogue a bougé depuis, c'est le prix
 * d'aujourd'hui qui doit être facturé. On repart donc des assignations
 * persistées et de la table de prix courante — jamais d'un total transmis
 * par le client, ni d'un total mémorisé.
 */

/** Ce qui va sur chaque position, pour l'atelier. */
export type AssemblyPlan = Record<KeyCode, { switch: string; keycap: string }>;

export interface PricedCartLine {
  itemId: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  /** Nomenclature agrégée (« 50× Outemu Peach V3 »). */
  bom?: readonly PriceLine[];
  /** Plan de montage position par position. */
  assemblyPlan?: AssemblyPlan;
  layoutName?: string;
}

interface CatalogContext {
  priceTable: PriceTable;
  nameBySku: ReadonlyMap<Sku, string>;
}

async function loadCatalogContext(): Promise<CatalogContext> {
  const components = await db.component.findMany({ where: { active: true } });
  return {
    priceTable: toPriceTable(components),
    nameBySku: new Map(components.map((component) => [component.sku, component.name])),
  };
}

/** Chiffre un build et en tire la nomenclature et le plan de montage. */
function describeBuild(build: Build, catalog: CatalogContext) {
  const breakdown = computeBuildPrice(build, catalog.priceTable);

  const assemblyPlan: AssemblyPlan = {};
  for (const [code, assignment] of Object.entries(build.keys)) {
    if (!assignment.switchSku || !assignment.keycapSku) continue;
    assemblyPlan[code] = {
      switch: catalog.nameBySku.get(assignment.switchSku) ?? assignment.switchSku,
      keycap: catalog.nameBySku.get(assignment.keycapSku) ?? assignment.keycapSku,
    };
  }

  return { breakdown, assemblyPlan };
}

/** Reconstitue le `Build` d'une ligne personnalisée depuis ses assignations persistées. */
async function loadPersistedBuild(buildId: string): Promise<{ build: Build; layoutName: string }> {
  const stored = await db.build.findUnique({
    where: { id: buildId },
    include: {
      layout: true,
      chassis: true,
      assignments: { include: { switch: true, keycap: true } },
      extras: { include: { component: true } },
    },
  });

  if (!stored) {
    throw new Error(`Build introuvable : ${buildId}`);
  }

  const keys: Record<KeyCode, KeyAssignment> = {};
  for (const assignment of stored.assignments) {
    keys[assignment.keyCode] = {
      switchSku: assignment.switch.sku,
      keycapSku: assignment.keycap.sku,
    };
  }

  return {
    layoutName: stored.layout.name,
    build: {
      version: 1,
      layoutSlug: stored.layout.slug,
      chassisSku: stored.chassis.sku,
      keys,
      extras: stored.extras.map((extra) => ({
        sku: extra.component.sku,
        quantity: extra.quantity,
      })),
    },
  };
}

/** Rechiffre toutes les lignes du panier depuis la base. */
export async function priceCartLines(
  items: readonly CartItemWithRelations[],
): Promise<PricedCartLine[]> {
  const catalog = await loadCatalogContext();
  const lines: PricedCartLine[] = [];

  for (const item of items) {
    const label = cartItemLabel(item);

    if (item.kind === 'CUSTOM_BUILD') {
      if (!item.buildId) {
        throw new Error(`Ligne personnalisée sans build : ${item.id}`);
      }

      const { build, layoutName } = await loadPersistedBuild(item.buildId);
      const { breakdown, assemblyPlan } = describeBuild(build, catalog);

      lines.push({
        itemId: item.id,
        label,
        quantity: item.quantity,
        unitPriceCents: breakdown.totalCents,
        lineTotalCents: breakdown.totalCents * item.quantity,
        bom: breakdown.lines,
        assemblyPlan,
        layoutName,
      });
      continue;
    }

    // Produit standard : le prix de référence est celui de la variante en base.
    const variant = item.variantId
      ? await db.productVariant.findUnique({ where: { id: item.variantId } })
      : null;

    if (!variant || !variant.active) {
      throw new Error(`Variante indisponible pour la ligne ${item.id}`);
    }

    const line: PricedCartLine = {
      itemId: item.id,
      label,
      quantity: item.quantity,
      unitPriceCents: variant.unitPriceCents,
      lineTotalCents: variant.unitPriceCents * item.quantity,
    };

    // Une variante toute faite porte un gabarit de build : l'atelier assemble
    // un clavier standard exactement comme un clavier configuré.
    if (variant.buildTemplate) {
      try {
        const { breakdown, assemblyPlan } = describeBuild(
          variant.buildTemplate as unknown as Build,
          catalog,
        );
        line.bom = breakdown.lines;
        line.assemblyPlan = assemblyPlan;
      } catch (error) {
        console.error('Gabarit de build illisible pour la variante', variant.sku, error);
      }
    }

    lines.push(line);
  }

  return lines;
}

export function sumLines(lines: readonly PricedCartLine[]): number {
  return lines.reduce((total, line) => total + line.lineTotalCents, 0);
}
