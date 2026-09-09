import { checkCompleteness } from '@/lib/configurator/pricing';
import { db } from '@/lib/db';
import { computeBuildPrice, toPriceTable } from '@/lib/pricing';
import type { Build, PriceBreakdown } from '@/lib/pricing';

/**
 * Chiffrage serveur d'un build : c'est cette valeur, et jamais un total
 * envoyé par le navigateur, qui sert à facturer (ARCHITECTURE.md §4).
 */

export class BuildValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildValidationError';
  }
}

export interface PricedBuild {
  layoutId: string;
  chassisId: string;
  breakdown: PriceBreakdown;
  /** Positions du layout, dans l'ordre, avec l'identifiant des pièces posées. */
  assignments: {
    layoutKeyId: string;
    keyCode: string;
    switchId: string;
    keycapId: string;
  }[];
}

/**
 * Vérifie qu'un build correspond bien au layout servi, qu'il est complet, et
 * le chiffre depuis la base. Lève `BuildValidationError` sinon.
 */
export async function resolveAndPriceBuild(build: Build): Promise<PricedBuild> {
  const layout = await db.layout.findUnique({
    where: { slug: build.layoutSlug },
    include: { keys: true },
  });

  if (!layout) {
    throw new BuildValidationError('Layout inconnu');
  }

  const layoutKeyByCode = new Map(layout.keys.map((key) => [key.code, key]));
  const buildCodes = Object.keys(build.keys);

  if (buildCodes.length !== layout.keys.length) {
    throw new BuildValidationError('Le build ne couvre pas exactement les positions du layout');
  }
  for (const code of buildCodes) {
    if (!layoutKeyByCode.has(code)) {
      throw new BuildValidationError(`Position inconnue dans ce layout : ${code}`);
    }
  }

  const completeness = checkCompleteness(
    layout.keys.map((key) => key.code),
    build.keys,
  );
  if (!completeness.isComplete) {
    throw new BuildValidationError(
      `Build incomplet : ${completeness.total - completeness.complete} position(s) sans switch ou sans keycap`,
    );
  }

  const components = await db.component.findMany({ where: { active: true } });
  const componentBySku = new Map(components.map((component) => [component.sku, component]));

  // Chiffrage par le moteur partagé : il refuse les SKU inconnus et les
  // pièces posées au mauvais endroit.
  const breakdown = computeBuildPrice(build, toPriceTable(components));

  const chassis = componentBySku.get(build.chassisSku);
  if (!chassis) {
    throw new BuildValidationError('Châssis inconnu');
  }

  const assignments = layout.keys.map((key) => {
    const assignment = build.keys[key.code];
    const switchComponent = assignment?.switchSku
      ? componentBySku.get(assignment.switchSku)
      : undefined;
    const keycapComponent = assignment?.keycapSku
      ? componentBySku.get(assignment.keycapSku)
      : undefined;

    if (!switchComponent || !keycapComponent) {
      throw new BuildValidationError(`Pièce inconnue sur la position ${key.code}`);
    }

    return {
      layoutKeyId: key.id,
      keyCode: key.code,
      switchId: switchComponent.id,
      keycapId: keycapComponent.id,
    };
  });

  return { layoutId: layout.id, chassisId: chassis.id, breakdown, assignments };
}

/** Persiste le build et ses assignations, prêt pour la fabrication. */
export async function persistBuild(priced: PricedBuild): Promise<string> {
  const created = await db.build.create({
    data: {
      layoutId: priced.layoutId,
      chassisId: priced.chassisId,
      totalCents: priced.breakdown.totalCents,
      assignments: { create: priced.assignments },
    },
  });

  return created.id;
}
