import type { Metadata } from 'next';

import { ConfiguratorLoader } from '@/components/configurator/configurator-loader';
import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';
import type { ComponentOption, ConfiguratorCatalog } from '@/lib/configurator/types';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: fr.pages.configurator.title,
  description: fr.pages.configurator.intro,
};

export const revalidate = 60;

/** Couleur de repli quand une pièce du catalogue n'a pas de teinte définie. */
const FALLBACK_SWATCH: Record<string, string> = {
  CHASSIS: '#d4d4d8',
  SWITCH: '#e4e4e7',
  KEYCAP: '#e4e4e7',
};

function toOption(component: {
  sku: string;
  kind: string;
  name: string;
  unitPriceCents: number;
  swatchHex: string | null;
}): ComponentOption {
  return {
    sku: component.sku,
    kind: component.kind as ComponentOption['kind'],
    name: component.name,
    unitPriceCents: component.unitPriceCents,
    swatchHex: component.swatchHex ?? FALLBACK_SWATCH[component.kind] ?? '#e4e4e7',
  };
}

async function loadCatalog(): Promise<ConfiguratorCatalog | null> {
  const layout = await db.layout.findFirst({
    where: { slug: 'compact-80' },
    include: { keys: { orderBy: [{ row: 'asc' }, { col: 'asc' }] } },
  });

  if (!layout || layout.keys.length === 0) return null;

  const components = await db.component.findMany({
    where: { active: true, kind: { in: ['CHASSIS', 'SWITCH', 'KEYCAP'] } },
    orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { unitPriceCents: 'asc' }],
  });

  const chassis = components.filter((c) => c.kind === 'CHASSIS').map(toOption);
  const switches = components.filter((c) => c.kind === 'SWITCH').map(toOption);
  const keycaps = components.filter((c) => c.kind === 'KEYCAP').map(toOption);

  if (chassis.length === 0 || switches.length === 0 || keycaps.length === 0) return null;

  return {
    layout: {
      slug: layout.slug,
      name: layout.name,
      keyCount: layout.keyCount,
      widthU: layout.widthU,
      heightU: layout.heightU,
      keys: layout.keys.map((key) => ({
        code: key.code,
        label: key.label,
        row: key.row,
        col: key.col,
        x: key.x,
        y: key.y,
        widthU: key.widthU,
        heightU: key.heightU,
      })),
    },
    chassis,
    switches,
    keycaps,
  };
}

export default async function ConfiguratorPage() {
  const catalog = await loadCatalog();

  if (!catalog) {
    return (
      <Container className="py-16">
        <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.configurator.title}</h1>
        <p className="text-muted mt-4">{fr.pages.shop.empty}</p>
      </Container>
    );
  }

  return (
    <>
      <Container className="pt-8 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{fr.pages.configurator.title}</h1>
        <p className="text-muted mt-1 text-sm">{fr.pages.configurator.intro}</p>
      </Container>
      <ConfiguratorLoader catalog={catalog} />
    </>
  );
}
