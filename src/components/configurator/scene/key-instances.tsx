'use client';

import type { ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Matrix4, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh } from 'three';

import { useConfiguratorStore } from '@/lib/configurator/store';
import type { LayoutData, LayoutKeyData } from '@/lib/configurator/types';
import type { KeyAssignment } from '@/lib/pricing';

/** Instance masquée : une matrice à l'échelle 0 sort l'instance du rendu et du raycast. */
const HIDDEN_MATRIX = new Matrix4().makeScale(0, 0, 0);
const SCRATCH_COLOR = new Color();
const WHITE = new Color('#ffffff');

/**
 * Un clic ne doit pas peindre si l'utilisateur était en train de faire tourner
 * la caméra. On mémorise où le pointeur a été enfoncé (un seul pointeur
 * primaire à la fois) et on compare au relâchement.
 */
const pointerDownAt = { x: 0, y: 0 };
const CLICK_SLOP_PX = 6;

function markPointerDown(event: { clientX: number; clientY: number }): void {
  pointerDownAt.x = event.clientX;
  pointerDownAt.y = event.clientY;
}

function isClickNotDrag(event: { clientX: number; clientY: number }): boolean {
  return (
    Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y) < CLICK_SLOP_PX
  );
}

/** Convertit une position du layout (origine en haut à gauche) en coordonnées de scène centrées. */
function keyScenePosition(key: LayoutKeyData, layout: LayoutData): Vector3 {
  return new Vector3(
    key.x + key.widthU / 2 - layout.widthU / 2,
    0,
    key.y + key.heightU / 2 - layout.heightU / 2,
  );
}

export interface KeyInstancesProps {
  keys: readonly LayoutKeyData[];
  layout: LayoutData;
  geometry: BufferGeometry;
  /** Hauteur de la base de la pièce. */
  y: number;
  /** Champ qui décide si l'instance est visible ; `null` = toujours visible. */
  visibilityField: keyof KeyAssignment | null;
  /** Champ qui décide de la couleur ; `null` = couleur fixe. */
  colorField: keyof KeyAssignment | null;
  /** Couleur utilisée quand `colorField` est nul ou la pièce inconnue. */
  baseColor: string;
  colorBySku: Readonly<Record<string, string>>;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  /** Réagit au clic et au survol (une seule couche le fait par position). */
  interactive?: boolean;
}

/**
 * Une pièce répétée sur les positions de touches, rendue en un seul draw call.
 *
 * Les matrices sont écrites une fois, les couleurs à chaque changement du
 * store — directement dans les attributs d'instance, jamais via un rendu
 * React : le JSX ne parcourt pas les touches (cf. CLAUDE.md).
 */
export function KeyInstances({
  keys,
  layout,
  geometry,
  y,
  visibilityField,
  colorField,
  baseColor,
  colorBySku,
  roughness = 0.6,
  metalness = 0,
  opacity = 1,
  interactive = false,
}: KeyInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);

  const basePositions = useMemo(
    () => keys.map((key) => keyScenePosition(key, layout)),
    [keys, layout],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new Matrix4();

    // Sphère englobante calculée une fois, toutes instances à leur place :
    // le masquage (échelle 0) ne doit pas la rétrécir, sinon le raycast
    // rejetterait le mesh trop tôt.
    for (let i = 0; i < keys.length; i += 1) {
      const position = basePositions[i];
      if (!position) continue;
      matrix.makeTranslation(position.x, y, position.z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();

    const apply = () => {
      const { keys: assignments, hoveredKey } = useConfiguratorStore.getState();

      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        const position = basePositions[i];
        if (!key || !position) continue;

        const assignment = assignments[key.code];
        const sku = visibilityField ? (assignment?.[visibilityField] ?? null) : null;
        const visible = visibilityField === null || sku !== null;

        matrix.makeTranslation(position.x, y, position.z);
        mesh.setMatrixAt(i, visible ? matrix : HIDDEN_MATRIX);

        const colorSku = colorField ? (assignment?.[colorField] ?? null) : null;
        SCRATCH_COLOR.set((colorSku && colorBySku[colorSku]) || baseColor);
        if (hoveredKey === key.code) {
          SCRATCH_COLOR.lerp(WHITE, 0.4);
        }
        mesh.setColorAt(i, SCRATCH_COLOR);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    apply();
    return useConfiguratorStore.subscribe(apply);
  }, [keys, basePositions, y, visibilityField, colorField, baseColor, colorBySku]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    markPointerDown(event);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.instanceId === undefined || !isClickNotDrag(event)) return;
    const key = keys[event.instanceId];
    if (!key) return;

    const { paintKey, clearKey } = useConfiguratorStore.getState();
    if (event.shiftKey) {
      clearKey(key.code);
    } else {
      paintKey(key.code);
    }
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.instanceId === undefined) return;
    const key = keys[event.instanceId];
    if (!key) return;
    if (useConfiguratorStore.getState().hoveredKey !== key.code) {
      useConfiguratorStore.getState().setHoveredKey(key.code);
    }
  };

  const handlePointerOut = () => {
    useConfiguratorStore.getState().setHoveredKey(null);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, keys.length]}
      castShadow
      receiveShadow
      onPointerDown={interactive ? handlePointerDown : undefined}
      onClick={interactive ? handleClick : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerOut={interactive ? handlePointerOut : undefined}
    >
      <meshStandardMaterial
        color="#ffffff"
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </instancedMesh>
  );
}
