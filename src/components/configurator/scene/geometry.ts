import { BufferAttribute, BufferGeometry, ExtrudeGeometry, Shape } from 'three';

import {
  GEOM_BOTTOM_SHELL,
  GEOM_CHASSIS_KNOB,
  GEOM_CHASSIS_PLATE,
  GEOM_KEYCAP_1U,
  GEOM_KEYCAP_1_25U,
  GEOM_KEYCAP_1_5U,
  GEOM_KEYCAP_1_75U,
  GEOM_KEYCAP_2U,
  GEOM_KEYCAP_2_25U,
  GEOM_KEYCAP_6_25U,
  GEOM_SLOT,
  GEOM_SWITCH_HOUSING,
  GEOM_SWITCH_STEM,
  GEOM_TOP_SHELL,
  type PieceGeometryData,
} from '@/components/configurator/scene/geometry-data.generated';

/**
 * Géométries du clavier.
 *
 * Keycaps, boîtier/tige de switch et emplacement vide viennent de vrais
 * modèles Blender (`assets/blender/keyboard-parts.blend`), sculptés à la main
 * (biseaux nets, dish réaliste, tige en croix façon MX) puis exportés en GLB
 * et extraits une fois pour toutes en tableaux typés par
 * `scripts/extract-geometry-data.mjs` — voir
 * `src/components/configurator/scene/geometry-data.generated.ts`.
 *
 * Ce détour (GLB → extraction hors ligne → tableaux embarqués) plutôt qu'un
 * chargement GLTFLoader au runtime est volontaire : les fonctions ci-dessous
 * doivent rester synchrones (retourner un BufferGeometry directement, pas une
 * Promise) pour que rien d'autre dans le pipeline n'ait à changer, alors que
 * GLTFLoader est intrinsèquement asynchrone. L'extraction utilise le même
 * GLTFLoader que celui qu'utiliserait le navigateur — pas de parseur maison,
 * pas de risque de divergence sur la conversion d'axes ou la triangulation.
 *
 * Plaque de montage, coque haute et coque basse viennent elles aussi de
 * `assets/blender/keyboard-case.blend` (boîtier gasket-mount 75 %, inspiré du
 * MonsGeek M1 V3 — chanfreins CNC, plaque à 80 découpes réelles). Contrairement
 * aux keycaps/switches, ce ne sont **pas** des pièces génériques réutilisables
 * à n'importe quelle taille de layout : elles sont taillées sur mesure pour
 * le layout « compact-80 » actuel (`CASE_DESIGN_WIDTH_U`/`CASE_DESIGN_HEIGHT_U`
 * ci-dessous, 17,5 × 6 u + `CHASSIS_MARGIN`), exactement comme un vrai boîtier
 * usiné CNC est taillé pour un PCB précis — pas un rectangle générique qu'on
 * étire. Si le layout change de dimensions un jour, ces trois pièces doivent
 * être remodélisées (voir `KeyboardModel` pour l'avertissement de
 * développement qui le signale). La molette rotative décorative a une taille
 * fixe indépendante du layout — seule sa position en dépend.
 *
 * Unités : 1 = un pas de touche (19,05 mm dans la réalité).
 * Repère : X vers la droite, Z vers l'avant (rangée 0 au fond), Y vers le haut.
 */

/** Jeu entre deux keycaps voisines (0,06u ≈ 1,1 mm). */
const KEYCAP_GAP = 0.06;
/** Rétrécissement du dessus de la keycap, en absolu (≈ 2,4 mm par côté). */
const KEYCAP_TAPER = 0.125;

export const KEYCAP_HEIGHT = 0.5;
export const SWITCH_HOUSING_SIZE = 0.74;
export const SWITCH_HOUSING_HEIGHT = 0.3;
export const SWITCH_STEM_HEIGHT = 0.14;
export const CHASSIS_MARGIN = 0.55;
export const CHASSIS_KNOB_RADIUS = 0.62;
export const CHASSIS_KNOB_HEIGHT = 0.44;
/** Marge entre le bord de la coque haute et la molette, dans le coin arrière-droit. */
export const CHASSIS_KNOB_MARGIN = 0.12;

/**
 * Dimensions du layout pour lequel le boîtier (plaque, coque haute, coque
 * basse) a été modélisé dans Blender — le layout « compact-80 » actuel
 * (17,5 × 6 u, vérifié depuis `prisma/seed.ts`). Sert uniquement à avertir en
 * développement si le layout chargé ne correspond plus à ce pour quoi le
 * boîtier a été taillé (voir `KeyboardModel`) ; ne pilote aucune géométrie.
 */
export const CASE_DESIGN_WIDTH_U = 17.5;
export const CASE_DESIGN_HEIGHT_U = 6;

/** Épaisseur de la plaque de montage (modèle Blender, ~1,5 mm). */
export const PLATE_THICKNESS = 0.08;
/** Hauteur de la coque haute, du plan de la plaque jusqu'au sommet du biseau. */
export const TOP_SHELL_HEIGHT = 0.434;
/** Hauteur de la coque basse, du sol jusqu'au plan de la plaque. */
export const BOTTOM_SHELL_HEIGHT = 1.3;

/** Y de la base de chaque étage, plaque de montage à Y = 0. */
export const LEVELS = {
  plateTop: 0,
  switchBottom: 0,
  stemBottom: SWITCH_HOUSING_HEIGHT,
  keycapBottom: SWITCH_HOUSING_HEIGHT + 0.02,
} as const;

/** Construit un BufferGeometry à partir des tableaux extraits d'un GLB. */
function buildGeometryFromData(data: PieceGeometryData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.position.slice(), 3));
  geometry.setAttribute('normal', new BufferAttribute(data.normal.slice(), 3));
  geometry.setIndex(new BufferAttribute(data.index.slice(), 1));
  return geometry;
}

/** Une géométrie de keycap Blender par largeur distincte du layout (§9 ARCHITECTURE.md). */
const KEYCAP_GEOMETRY_BY_WIDTH: Readonly<Record<string, PieceGeometryData>> = {
  '1': GEOM_KEYCAP_1U,
  '1.25': GEOM_KEYCAP_1_25U,
  '1.5': GEOM_KEYCAP_1_5U,
  '1.75': GEOM_KEYCAP_1_75U,
  '2': GEOM_KEYCAP_2U,
  '2.25': GEOM_KEYCAP_2_25U,
  '6.25': GEOM_KEYCAP_6_25U,
};

function roundedRectShape(width: number, depth: number, radius: number): Shape {
  const w = width / 2;
  const d = depth / 2;
  const r = Math.min(radius, w, d);
  const shape = new Shape();

  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r);
  shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r);
  shape.quadraticCurveTo(-w, -d, -w + r, -d);

  return shape;
}

interface SlabOptions {
  width: number;
  depth: number;
  height: number;
  radius?: number;
  bevel?: number;
}

/**
 * Dalle arrondie extrudée sur Y, base à Y = 0.
 * Le biseau d'ExtrudeGeometry déborde du contour : on le compense pour que
 * les dimensions demandées soient les dimensions finales.
 */
function createSlabGeometry({ width, depth, height, radius = 0.08, bevel = 0.02 }: SlabOptions): BufferGeometry {
  const b = Math.min(bevel, height / 2 - 0.001, width / 2 - 0.001, depth / 2 - 0.001);
  const shape = roundedRectShape(width - 2 * b, depth - 2 * b, Math.max(radius - b, 0.005));

  const geometry = new ExtrudeGeometry(shape, {
    depth: height - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: 2,
    curveSegments: 3,
  });

  // ExtrudeGeometry travaille dans le plan XY et extrude sur Z : on bascule
  // pour que l'épaisseur soit sur Y, puis on ramène la base à Y = 0.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, b, 0);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Repli procédural : keycap générique (dalle arrondie rétrécie en absolu) pour
 * toute largeur/hauteur qui ne correspond à aucun modèle Blender sculpté à la
 * main (§9 ARCHITECTURE.md ne liste que 7 largeurs). Garantit qu'un layout
 * futur avec une largeur inédite reste rendu correctement plutôt que de
 * planter ou de tomber sur une géométrie manquante.
 */
function createKeycapGeometryProcedural(widthU: number, heightU: number): BufferGeometry {
  const width = widthU - KEYCAP_GAP;
  const depth = heightU - KEYCAP_GAP;

  const geometry = createSlabGeometry({
    width,
    depth,
    height: KEYCAP_HEIGHT,
    radius: 0.09,
    bevel: 0.025,
  });

  const position = geometry.attributes.position;
  if (!position) return geometry;

  const taperX = Math.min(KEYCAP_TAPER, width / 2 - 0.05);
  const taperZ = Math.min(KEYCAP_TAPER, depth / 2 - 0.05);

  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    const t = Math.min(Math.max(y / KEYCAP_HEIGHT, 0), 1);
    if (t <= 0) continue;

    const x = position.getX(i);
    const z = position.getZ(i);
    position.setX(i, Math.sign(x) * Math.max(Math.abs(x) - taperX * t, 0));
    position.setZ(i, Math.sign(z) * Math.max(Math.abs(z) - taperZ * t, 0));
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Keycap : modèle Blender sculpté à la main par largeur (dish réaliste,
 * biseaux nets, croix de fixation façon MX à l'intérieur de la coque creuse).
 * Le rétrécissement du dessus reste absolu et non proportionnel — sur une
 * barre d'espace, les flancs restent aussi inclinés que sur une touche 1u,
 * comme en vrai.
 */
export function createKeycapGeometry(widthU: number, heightU = 1): BufferGeometry {
  if (heightU === 1) {
    const key = String(Math.round(widthU * 100) / 100);
    const data = KEYCAP_GEOMETRY_BY_WIDTH[key];
    if (data) return buildGeometryFromData(data);
  }
  return createKeycapGeometryProcedural(widthU, heightU);
}

/** Boîtier du switch : la partie sombre qui dépasse de la plaque. */
export function createSwitchHousingGeometry(): BufferGeometry {
  return buildGeometryFromData(GEOM_SWITCH_HOUSING);
}

/** Tige du switch : la pièce colorée qui identifie le type, en croix façon MX. */
export function createSwitchStemGeometry(): BufferGeometry {
  return buildGeometryFromData(GEOM_SWITCH_STEM);
}

/** Emplacement vide : plaque fine qui matérialise une position non assignée. */
export function createSlotGeometry(): BufferGeometry {
  return buildGeometryFromData(GEOM_SLOT);
}

/**
 * Plaque de montage : modèle Blender, 80 découpes réelles (une par position
 * du layout compact-80, footprint switch 14×14 mm) percées directement dans
 * le modèle plutôt qu'en code — voir le commentaire d'en-tête du fichier sur
 * pourquoi cette pièce n'est plus paramétrique. Base à Y = 0 comme les autres
 * pièces Blender ; `keyboard-model.tsx` la translate de `-PLATE_THICKNESS`
 * pour amener sa face supérieure au niveau Y = 0 (`LEVELS.plateTop`).
 */
export function createChassisPlateGeometry(): BufferGeometry {
  return buildGeometryFromData(GEOM_CHASSIS_PLATE);
}

/**
 * Coque haute : le cadre biseauté façon CNC qui entoure la zone des touches,
 * inspiré d'un boîtier gasket-mount 75 % (MonsGeek M1 V3). Base à Y = 0,
 * posée directement au niveau de la plaque.
 */
export function createTopShellGeometry(): BufferGeometry {
  return buildGeometryFromData(GEOM_TOP_SHELL);
}

/**
 * Coque basse : le corps du boîtier sous la plaque, jusqu'au sol. Base à
 * Y = 0 ; `keyboard-model.tsx` la translate de `-BOTTOM_SHELL_HEIGHT` pour
 * que son sommet touche le niveau de la plaque.
 */
export function createBottomShellGeometry(): BufferGeometry {
  return buildGeometryFromData(GEOM_BOTTOM_SHELL);
}

/**
 * Molette rotative décorative posée dans le coin arrière-droit de la coque
 * haute — purement esthétique, aucune fonction dans le configurateur
 * aujourd'hui. Taille fixe, contrairement au reste du boîtier : elle ne
 * dépend pas des dimensions du layout, seule sa position en dépend.
 */
export function createChassisKnobGeometry(): BufferGeometry {
  return buildGeometryFromData(GEOM_CHASSIS_KNOB);
}
