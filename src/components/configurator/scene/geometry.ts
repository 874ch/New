import { BufferAttribute, BufferGeometry, ExtrudeGeometry, Shape } from 'three';

import {
  GEOM_CHASSIS_KNOB,
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
 * La plaque de montage et le cadre du châssis restent procéduraux
 * (ExtrudeGeometry) : leurs dimensions dépendent du layout choisi en base
 * (largeur/profondeur variables), alors qu'un GLB est un maillage figé — les
 * garder procéduraux garantit un contour exact à n'importe quelle taille. La
 * plaque perce désormais un trou par position de touche (style plaque de
 * switch CNC), calculé depuis les vraies coordonnées du layout — toujours
 * procédural, pour la même raison. La molette rotative décorative, elle, a
 * une taille fixe indépendante du layout : c'est un modèle Blender comme les
 * autres, posé une fois dans un coin du châssis.
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
export const PLATE_THICKNESS = 0.16;
export const CHASSIS_MARGIN = 0.55;
export const CHASSIS_RIM_HEIGHT = 0.34;
export const CHASSIS_KNOB_RADIUS = 0.62;
export const CHASSIS_KNOB_HEIGHT = 0.44;
/** Marge entre le bord du cadre et la molette, dans le coin arrière-droit. */
export const CHASSIS_KNOB_MARGIN = 0.12;

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

function roundedRectShape(width: number, depth: number, radius: number, cx = 0, cz = 0): Shape {
  const w = width / 2;
  const d = depth / 2;
  const r = Math.min(radius, w, d);
  const shape = new Shape();

  shape.moveTo(cx - w + r, cz - d);
  shape.lineTo(cx + w - r, cz - d);
  shape.quadraticCurveTo(cx + w, cz - d, cx + w, cz - d + r);
  shape.lineTo(cx + w, cz + d - r);
  shape.quadraticCurveTo(cx + w, cz + d, cx + w - r, cz + d);
  shape.lineTo(cx - w + r, cz + d);
  shape.quadraticCurveTo(cx - w, cz + d, cx - w, cz + d - r);
  shape.lineTo(cx - w, cz - d + r);
  shape.quadraticCurveTo(cx - w, cz - d, cx - w + r, cz - d);

  return shape;
}

interface HoleOptions {
  width: number;
  depth: number;
  radius?: number;
  /** Centre du trou, par défaut (0, 0). */
  x?: number;
  z?: number;
}

interface SlabOptions {
  width: number;
  depth: number;
  height: number;
  radius?: number;
  bevel?: number;
  bevelSegments?: number;
  curveSegments?: number;
  /** Trous rectangulaires (cadre du châssis, ou un par position de touche pour la plaque). */
  holes?: readonly HoleOptions[];
}

/**
 * Dalle arrondie extrudée sur Y, base à Y = 0.
 * Le biseau d'ExtrudeGeometry déborde du contour : on le compense pour que
 * les dimensions demandées soient les dimensions finales.
 */
function createSlabGeometry({
  width,
  depth,
  height,
  radius = 0.08,
  bevel = 0.02,
  bevelSegments = 2,
  curveSegments = 3,
  holes,
}: SlabOptions): BufferGeometry {
  const b = Math.min(bevel, height / 2 - 0.001, width / 2 - 0.001, depth / 2 - 0.001);
  const shape = roundedRectShape(width - 2 * b, depth - 2 * b, Math.max(radius - b, 0.005));

  if (holes) {
    for (const hole of holes) {
      const holeShape = roundedRectShape(
        hole.width,
        hole.depth,
        hole.radius ?? 0.05,
        hole.x ?? 0,
        hole.z ?? 0,
      );
      shape.holes.push(holeShape);
    }
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: height - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments,
    curveSegments,
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

/** Position d'une touche, juste ce qu'il faut pour percer son trou dans la plaque. */
interface KeyPositionLike {
  x: number;
  y: number;
  widthU: number;
  heightU: number;
}

/**
 * Plaque de montage : le plateau sur lequel reposent les switches, percé d'un
 * trou par position de touche (comme une vraie plaque CNC), pas un plateau
 * plein. Le trou est calculé depuis les vraies coordonnées du layout, avec la
 * même conversion « origine en haut à gauche → centrée » que
 * `keyScenePosition` dans key-instances.tsx : les deux doivent rester en
 * phase, sinon les trous ne tombent plus sous les switches.
 */
export function createChassisPlateGeometry(
  keys: readonly KeyPositionLike[],
  widthU: number,
  depthU: number,
): BufferGeometry {
  const holes = keys.map((key) => ({
    width: SWITCH_HOUSING_SIZE,
    depth: SWITCH_HOUSING_SIZE,
    radius: 0.07,
    x: key.x + key.widthU / 2 - widthU / 2,
    z: key.y + key.heightU / 2 - depthU / 2,
  }));

  const geometry = createSlabGeometry({
    width: widthU + 2 * CHASSIS_MARGIN,
    depth: depthU + 2 * CHASSIS_MARGIN,
    height: PLATE_THICKNESS,
    radius: 0.3,
    bevel: 0.03,
    bevelSegments: 3,
    curveSegments: 4,
    holes,
  });
  geometry.translate(0, -PLATE_THICKNESS, 0);
  return geometry;
}

/** Cadre du châssis : le rebord qui entoure la zone des touches, chanfreins nets façon CNC. */
export function createChassisRimGeometry(widthU: number, depthU: number): BufferGeometry {
  return createSlabGeometry({
    width: widthU + 2 * CHASSIS_MARGIN,
    depth: depthU + 2 * CHASSIS_MARGIN,
    height: CHASSIS_RIM_HEIGHT,
    radius: 0.3,
    bevel: 0.045,
    bevelSegments: 4,
    curveSegments: 4,
    holes: [{ width: widthU + 0.12, depth: depthU + 0.12, radius: 0.08 }],
  });
}

/**
 * Molette rotative décorative posée dans le coin arrière-droit du cadre —
 * purement esthétique, aucune fonction dans le configurateur aujourd'hui.
 * Taille fixe (modèle Blender), contrairement à la plaque et au cadre : elle
 * ne dépend pas des dimensions du layout, seule sa position en dépend.
 */
export function createChassisKnobGeometry(): BufferGeometry {
  return buildGeometryFromData(GEOM_CHASSIS_KNOB);
}
