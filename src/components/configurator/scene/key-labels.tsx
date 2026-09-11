'use client';

import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, DoubleSide, MeshBasicMaterial } from 'three';
import type { Mesh } from 'three';

import { useConfiguratorStore } from '@/lib/configurator/store';
import type { LayoutData, LayoutKeyData } from '@/lib/configurator/types';
import type { KeyAssignment } from '@/lib/pricing';

/**
 * Étiquettes (lettre/label) des touches, dessinées sur une seule texture
 * canvas partagée par tout le clavier plutôt qu'un objet par touche : le
 * JSX ne parcourt jamais la liste des touches (CLAUDE.md) — la boucle sur
 * `keys` reste une boucle JS classique dans un effet, jamais du rendu React
 * (même principe que `KeyInstances`, qui écrit ses matrices/couleurs
 * d'instance de la même façon).
 *
 * Deux calques utilisent ce composant (cf. `keyboard-model.tsx`) :
 * - un calque de base, posé sur la plaque, qui montre toutes les touches
 *   (pour ne pas poser un switch à l'aveugle) — recouvert naturellement dès
 *   qu'un switch est posé, comme une vraie plaque de montage ;
 * - un calque au-dessus des tiges de switch déjà posées, en petit, dans la
 *   couleur du switch — pour confirmer d'un coup d'œil quelle touche a déjà
 *   reçu quoi.
 */

const PX_PER_UNIT = 48;
const FONT_FAMILY = 'system-ui, sans-serif';

/** Rend ce plan totalement transparent au raycasting : sans ça, l'étiquette
 * (posée au-dessus des cases/tiges) intercepterait les clics de peinture
 * avant qu'ils n'atteignent l'InstancedMesh visé. */
function noRaycast(): null {
  return null;
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
  maxFontPx: number,
): number {
  let size = maxFontPx;
  ctx.font = `600 ${size}px ${FONT_FAMILY}`;
  while (size > 6 && ctx.measureText(text).width > maxWidthPx) {
    size -= 1;
    ctx.font = `600 ${size}px ${FONT_FAMILY}`;
  }
  return size;
}

export interface KeyLabelsProps {
  keys: readonly LayoutKeyData[];
  layout: LayoutData;
  y: number;
  /** `null` : toujours dessinée (calque de base). Sinon, ne dessine que les touches dont ce champ est renseigné. */
  onlyWithField: keyof KeyAssignment | null;
  colorBySku: Readonly<Record<string, string>>;
  baseColor: string;
  maxFontPx: number;
}

export function KeyLabels({
  keys,
  layout,
  y,
  onlyWithField,
  colorBySku,
  baseColor,
  maxFontPx,
}: KeyLabelsProps) {
  const meshRef = useRef<Mesh>(null);

  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(layout.widthU * PX_PER_UNIT));
    c.height = Math.max(1, Math.round(layout.heightU * PX_PER_UNIT));
    return c;
  }, [layout.widthU, layout.heightU]);

  const texture = useMemo(() => new CanvasTexture(canvas), [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const assignments = onlyWithField ? useConfiguratorStore.getState().keys : null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const key of keys) {
        const sku = onlyWithField ? (assignments?.[key.code]?.[onlyWithField] ?? null) : null;
        if (onlyWithField && !sku) continue;

        const px = (key.x + key.widthU / 2) * PX_PER_UNIT;
        const py = (key.y + key.heightU / 2) * PX_PER_UNIT;
        const maxWidthPx = key.widthU * PX_PER_UNIT * 0.72;
        const fontPx = fitFontSize(ctx, key.label, maxWidthPx, maxFontPx);
        ctx.font = `600 ${fontPx}px ${FONT_FAMILY}`;
        ctx.fillStyle = sku ? (colorBySku[sku] ?? baseColor) : baseColor;
        ctx.fillText(key.label, px, py);
      }

      // Réécrire `.needsUpdate` en passant par le matériau du mesh (peuplé
      // par la ref JSX) plutôt que sur `texture` directement : ce dernier
      // est le résultat d'un `useMemo`, qu'il ne faut pas muter à la main.
      const material = meshRef.current?.material;
      if (material instanceof MeshBasicMaterial && material.map) {
        material.map.needsUpdate = true;
      }
    };

    draw();
    if (!onlyWithField) return;
    return useConfiguratorStore.subscribe(draw);
  }, [keys, canvas, onlyWithField, colorBySku, baseColor, maxFontPx]);

  return (
    <mesh ref={meshRef} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
      <planeGeometry args={[layout.widthU, layout.heightU]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}
