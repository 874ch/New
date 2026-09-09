import { ExtrudeGeometry, Shape } from 'three';
import type { BufferGeometry } from 'three';

/**
 * Géométries procédurales du clavier.
 *
 * Aucun asset GLB n'existe pour ce produit (et `img2threejs`, cité au brief,
 * n'existe pas sur npm) : les pièces sont générées en code. Pour un clavier
 * c'est le bon choix — ce sont des formes régulières, la géométrie pèse
 * quelques kilo-octets au lieu d'un GLB à télécharger, et l'échelle reste
 * exacte. Brancher un vrai GLB plus tard ne changerait que ce fichier : les
 * InstancedMesh acceptent n'importe quelle BufferGeometry.
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

/** Y de la base de chaque étage, plaque de montage à Y = 0. */
export const LEVELS = {
  plateTop: 0,
  switchBottom: 0,
  stemBottom: SWITCH_HOUSING_HEIGHT,
  keycapBottom: SWITCH_HOUSING_HEIGHT + 0.02,
} as const;

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
  curveSegments?: number;
  /** Trou rectangulaire au centre (pour le cadre du châssis). */
  hole?: { width: number; depth: number; radius?: number };
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
  curveSegments = 3,
  hole,
}: SlabOptions): BufferGeometry {
  const b = Math.min(bevel, height / 2 - 0.001, width / 2 - 0.001, depth / 2 - 0.001);
  const shape = roundedRectShape(width - 2 * b, depth - 2 * b, Math.max(radius - b, 0.005));

  if (hole) {
    const holeShape = roundedRectShape(hole.width, hole.depth, hole.radius ?? 0.05);
    shape.holes.push(holeShape);
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: height - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: 2,
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
 * Keycap : dalle arrondie dont le dessus est rétréci.
 * Le rétrécissement est absolu et non proportionnel — sur une barre d'espace,
 * les flancs restent aussi inclinés que sur une touche 1u, comme en vrai.
 */
export function createKeycapGeometry(widthU: number, heightU = 1): BufferGeometry {
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

/** Boîtier du switch : la partie sombre qui dépasse de la plaque. */
export function createSwitchHousingGeometry(): BufferGeometry {
  return createSlabGeometry({
    width: SWITCH_HOUSING_SIZE,
    depth: SWITCH_HOUSING_SIZE,
    height: SWITCH_HOUSING_HEIGHT,
    radius: 0.05,
    bevel: 0.015,
  });
}

/** Tige du switch : la pièce colorée qui identifie le type. */
export function createSwitchStemGeometry(): BufferGeometry {
  return createSlabGeometry({
    width: 0.36,
    depth: 0.36,
    height: SWITCH_STEM_HEIGHT,
    radius: 0.04,
    bevel: 0.012,
  });
}

/** Emplacement vide : plaque fine qui matérialise une position non assignée. */
export function createSlotGeometry(): BufferGeometry {
  return createSlabGeometry({
    width: SWITCH_HOUSING_SIZE,
    depth: SWITCH_HOUSING_SIZE,
    height: 0.04,
    radius: 0.05,
    bevel: 0.012,
  });
}

/** Plaque de montage : le plateau plein sur lequel reposent les switches. */
export function createChassisPlateGeometry(widthU: number, depthU: number): BufferGeometry {
  const geometry = createSlabGeometry({
    width: widthU + 2 * CHASSIS_MARGIN,
    depth: depthU + 2 * CHASSIS_MARGIN,
    height: PLATE_THICKNESS,
    radius: 0.3,
    bevel: 0.03,
    curveSegments: 4,
  });
  geometry.translate(0, -PLATE_THICKNESS, 0);
  return geometry;
}

/** Cadre du châssis : le rebord qui entoure la zone des touches. */
export function createChassisRimGeometry(widthU: number, depthU: number): BufferGeometry {
  return createSlabGeometry({
    width: widthU + 2 * CHASSIS_MARGIN,
    depth: depthU + 2 * CHASSIS_MARGIN,
    height: CHASSIS_RIM_HEIGHT,
    radius: 0.3,
    bevel: 0.03,
    curveSegments: 4,
    hole: { width: widthU + 0.12, depth: depthU + 0.12, radius: 0.08 },
  });
}
