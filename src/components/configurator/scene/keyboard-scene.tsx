'use client';

import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { ACESFilmicToneMapping, PMREMGenerator, Vector3 } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { CHASSIS_MARGIN } from '@/components/configurator/scene/geometry';
import { KeyboardModel } from '@/components/configurator/scene/keyboard-model';
import type { ConfiguratorCatalog } from '@/lib/configurator/types';

export const CAMERA_VIEW_NAMES = ['trois_quarts', 'dessus', 'face', 'gauche'] as const;
export type CameraView = (typeof CAMERA_VIEW_NAMES)[number];

/** Directions unitaires ; la distance vient de la largeur réelle du clavier. */
const VIEW_DIRECTIONS: Record<CameraView, [number, number, number]> = {
  trois_quarts: [0, 0.5, 0.87],
  dessus: [0, 1, 0.001],
  face: [0, 0.2, 0.98],
  gauche: [-0.66, 0.45, 0.6],
};

/**
 * Distance de cadrage : le clavier est très large, c'est lui qui contraint.
 * Le facteur tient compte du champ de vision et laisse une marge autour.
 */
function frameDistance(totalWidthU: number): number {
  return totalWidthU * 1.4;
}

export function getCameraViews(layoutWidthU: number): Record<CameraView, Vector3> {
  const distance = frameDistance(layoutWidthU + 2 * CHASSIS_MARGIN);
  const views = {} as Record<CameraView, Vector3>;

  for (const name of CAMERA_VIEW_NAMES) {
    const [x, y, z] = VIEW_DIRECTIONS[name];
    views[name] = new Vector3(x, y, z).normalize().multiplyScalar(distance);
  }

  return views;
}

/**
 * Éclairage d'ambiance PBR sans HDRI distant : `RoomEnvironment` est une scène
 * de studio générée par three lui-même, convertie en environment map. Sans
 * elle, l'aluminium du châssis serait noir.
 */
function StudioEnvironment() {
  const gl = useThree((state) => state.gl);

  const environment = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    return target.texture;
  }, [gl]);

  useEffect(() => () => environment.dispose(), [environment]);

  // `attach` laisse R3F poser puis retirer la texture sur la scène.
  return <primitive attach="environment" object={environment} />;
}

/** Amène la caméra vers l'angle demandé, sans à-coup. */
function CameraRig({ view, views }: { view: CameraView; views: Record<CameraView, Vector3> }) {
  const camera = useThree((state) => state.camera);
  const target = useRef(new Vector3().copy(views.trois_quarts));
  const animating = useRef(false);

  useEffect(() => {
    target.current.copy(views[view]);
    animating.current = true;
  }, [view, views]);

  useFrame((_, delta) => {
    if (!animating.current) return;
    camera.position.lerp(target.current, Math.min(1, delta * 6));
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(target.current) < 0.05) {
      camera.position.copy(target.current);
      animating.current = false;
    }
  });

  return null;
}

export function KeyboardScene({
  catalog,
  view,
  className,
}: {
  catalog: ConfiguratorCatalog;
  view: CameraView;
  className?: string;
}) {
  const views = useMemo(() => getCameraViews(catalog.layout.widthU), [catalog.layout.widthU]);
  const maxDistance = views.trois_quarts.length() * 1.8;

  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 2]}
      camera={{ position: views.trois_quarts.toArray(), fov: 32, far: 400 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      scene={{ environmentIntensity: 0.85 }}
    >
      <color attach="background" args={['#f2f2f0']} />

      <StudioEnvironment />
      <CameraRig view={view} views={views} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.7} />

      <KeyboardModel catalog={catalog} />

      <ContactShadows position={[0, -0.17, 0]} opacity={0.4} scale={30} blur={2.4} far={4} />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={8}
        maxDistance={maxDistance}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.15}
        dampingFactor={0.12}
      />
    </Canvas>
  );
}
