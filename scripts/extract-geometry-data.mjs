// Script one-shot : charge assets/blender/keyboard-parts.glb avec le GLTFLoader
// de three.js et exporte la géométrie de chaque pièce (attributs position et
// normal, indices) dans src/components/configurator/scene/geometry-data.generated.ts.
//
// Pourquoi ce détour : geometry.ts doit rester synchrone (BufferGeometry
// retourné directement) alors que GLTFLoader est intrinsèquement asynchrone.
// Ce script fait le chargement une fois, hors ligne, avec le même loader que
// celui qu'utiliserait le navigateur — pas de parseur maison, pas de risque de
// divergence sur la conversion d'axes ou la triangulation.
//
// Usage : node scripts/extract-geometry-data.mjs

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const glbPath = path.join(repoRoot, 'assets/blender/keyboard-parts.glb');
const outPath = path.join(
  repoRoot,
  'src/components/configurator/scene/geometry-data.generated.ts',
);

const EXPECTED_NAMES = [
  'keycap_1u',
  'keycap_1_25u',
  'keycap_1_5u',
  'keycap_1_75u',
  'keycap_2u',
  'keycap_2_25u',
  'keycap_6_25u',
  'switch_housing',
  'switch_stem',
  'slot',
  'chassis_knob',
];

function roundArray(typedArray, decimals = 5) {
  const factor = 10 ** decimals;
  const out = new Array(typedArray.length);
  for (let i = 0; i < typedArray.length; i += 1) {
    out[i] = Math.round(typedArray[i] * factor) / factor;
  }
  return out;
}

async function main() {
  const buffer = await readFile(glbPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', resolve, reject);
  });

  const meshByName = new Map();
  gltf.scene.traverse((obj) => {
    if (obj.isMesh) meshByName.set(obj.name, obj);
  });

  const missing = EXPECTED_NAMES.filter((name) => !meshByName.has(name));
  if (missing.length > 0) {
    throw new Error(`Objets manquants dans le GLB : ${missing.join(', ')}`);
  }

  const entries = [];
  for (const name of EXPECTED_NAMES) {
    const mesh = meshByName.get(name);
    const geometry = mesh.geometry;
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const index = geometry.getIndex();

    if (!position || !normal || !index) {
      throw new Error(`Géométrie incomplète pour "${name}" (position/normal/index requis)`);
    }

    entries.push({
      name,
      position: roundArray(position.array),
      normal: roundArray(normal.array),
      index: Array.from(index.array),
      vertexCount: position.count,
      triangleCount: index.count / 3,
    });
  }

  const totalTris = entries.reduce((sum, e) => sum + e.triangleCount, 0);

  const banner = `/**
 * Généré par scripts/extract-geometry-data.mjs à partir de
 * assets/blender/keyboard-parts.glb — NE PAS ÉDITER À LA MAIN.
 * Pour régénérer après une modification du modèle Blender :
 *   node scripts/extract-geometry-data.mjs
 *
 * Triangles totaux (géométries distinctes) : ${totalTris}
 */
`;

  const body = entries
    .map(
      (e) => `export const ${toConstName(e.name)}: PieceGeometryData = {
  position: new Float32Array([${e.position.join(',')}]),
  normal: new Float32Array([${e.normal.join(',')}]),
  index: new Uint16Array([${e.index.join(',')}]),
};
`,
    )
    .join('\n');

  const typeDecl = `export interface PieceGeometryData {
  position: Float32Array;
  normal: Float32Array;
  index: Uint16Array;
}

`;

  await writeFile(outPath, banner + '\n' + typeDecl + body, 'utf-8');

  console.log(`Écrit ${outPath}`);
  for (const e of entries) {
    console.log(`  ${e.name}: ${e.vertexCount} verts, ${e.triangleCount} tris`);
  }
  console.log(`Total : ${totalTris} triangles`);
}

function toConstName(pieceName) {
  return `GEOM_${pieceName.toUpperCase()}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
