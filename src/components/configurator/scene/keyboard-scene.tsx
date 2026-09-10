'use client';

import { ContactShadows, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ACESFilmicToneMapping, PMREMGenerator, Vector3 } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { CHASSIS_MARGIN } from '@/components/configurator/scene/geometry';
import { KeyboardModel } from '@/components/configurator/scene/keyboard-model';
import type { ConfiguratorCatalog } from '@/lib/configurator/types';

export const CAMERA_VIEW_NAMES = ['trois_quarts', 'dessus', 'face', 'gauche'] as const;
export type CameraView = (typeof CAMERA_VIEW_NAMES)[number];
export const CAMERA_FOV_DEG = 32;

/** Directions unitaires ; la distance est recalculée à l'intérieur du Canvas (cf. `frameDistance`). */
const VIEW_DIRECTIONS: Record<CameraView, [number, number, number]> = {
  trois_quarts: [0, 0.5, 0.87],
  dessus: [0, 1, 0.001],
  face: [0, 0.2, 0.98],
  gauche: [-0.66, 0.45, 0.6],
};

/**
 * Distance nécessaire pour que tout le clavier (largeur ET hauteur) tienne
 * dans le cadre, quel que soit le ratio d'aspect du canvas.
 *
 * Sur un écran étroit et haut (mobile), l'ouverture horizontale effective
 * d'une caméra perspective est *plus étroite* que son FOV vertical — un
 * calcul basé uniquement sur la largeur du clavier (comme en Phase 4/6, où
 * seul le desktop avait été vérifié) coupe le clavier en haut et en bas sur
 * mobile. On calcule donc la distance requise pour la largeur ET la
 * hauteur séparément, et on garde la plus contraignante des deux.
 */
function frameDistance(widthU: number, heightU: number, aspect: number, fovDeg: number): number {
  const fovV = (fovDeg * Math.PI) / 180;
  const distanceForHeight = heightU / 2 / Math.tan(fovV / 2);
  const distanceForWidth = widthU / 2 / (Math.tan(fovV / 2) * aspect);
  return Math.max(distanceForHeight, distanceForWidth) * 1.35;
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

/**
 * Amène la caméra vers l'angle demandé, sans à-coup, à une distance qui
 * cadre tout le clavier pour le ratio d'aspect *actuel* du canvas (recalculé
 * au resize — rotation d'écran mobile comprise).
 *
 * Resynchronise systématiquement `OrbitControls` (`controlsRef.update()`)
 * après avoir déplacé la caméra à la main : `OrbitControls` recalcule sa
 * position à chaque frame à partir de son propre état interne (rayon/angles
 * autour de `target`), donc une mutation directe de `camera.position` ici
 * sans le prévenir se fait immédiatement écraser au frame suivant — l'effet
 * perçu est qu'on ne peut plus qu'zoomer, la rotation semblant figée.
 *
 * Le même resync est aussi rejoué au retour au premier plan (`visibilitychange`) :
 * sur mobile, mettre l'onglet en arrière-plan peut désynchroniser le contexte
 * WebGL et les contrôles, ce qui bloquait totalement la caméra jusqu'ici.
 */
function CameraRig({
  view,
  widthU,
  heightU,
  controlsRef,
}: {
  view: CameraView;
  widthU: number;
  heightU: number;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const target = useRef(new Vector3());
  const animating = useRef(false);

  const distance = useMemo(
    () => frameDistance(widthU, heightU, size.width / size.height, CAMERA_FOV_DEG),
    [widthU, heightU, size.width, size.height],
  );

  useEffect(() => {
    const [x, y, z] = VIEW_DIRECTIONS[view];
    target.current.set(x, y, z).normalize().multiplyScalar(distance);
    animating.current = true;
  }, [view, distance]);

  useEffect(() => {
    function resyncOnForeground() {
      if (document.visibilityState === 'visible') {
        animating.current = true;
      }
    }
    document.addEventListener('visibilitychange', resyncOnForeground);
    return () => document.removeEventListener('visibilitychange', resyncOnForeground);
  }, []);

  useFrame((_, delta) => {
    if (!animating.current) return;
    camera.position.lerp(target.current, Math.min(1, delta * 6));
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
    if (camera.position.distanceTo(target.current) < 0.05) {
      camera.position.copy(target.current);
      animating.current = false;
    }
  });

  return null;
}

/**
 * Mesure le framerate réel plutôt que de deviner depuis le user agent ou
 * `navigator.hardwareConcurrency` — un iGPU récent peut être rapide, un
 * milieu de gamme ancien peut avoir beaucoup de cœurs CPU sans GPU correct.
 * Après quelques allers-retours incline/decline (instabilité chronique,
 * pas un pic ponctuel), `onFallback` déclenche le mode dégradé.
 */
function AdaptivePerformance({ onFallback }: { onFallback: () => void }) {
  return <PerformanceMonitor bounds={() => [30, 55]} onFallback={onFallback} />;
}

/**
 * Expose `renderer.info` (draw calls, triangles) sur `window` pour vérifier
 * le budget de performance (ARCHITECTURE.md §10) depuis l'extérieur —
 * n'a aucun effet sans `?debug` dans l'URL, jamais actif pour un visiteur.
 */
function DebugStatsExporter() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const w = window as unknown as { __r3fDebugInfo?: () => Record<string, unknown> };
    w.__r3fDebugInfo = () => ({ ...gl.info.render, geometries: gl.info.memory.geometries });
  }, [gl]);

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
  const [degraded, setDegraded] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const widthU = catalog.layout.widthU + 2 * CHASSIS_MARGIN;
  const heightU = catalog.layout.heightU + 2 * CHASSIS_MARGIN;
  // Distance de secours pour le cadrage initial (avant que le Canvas ne
  // connaisse sa propre taille) et pour les bornes de zoom : le pire cas
  // plausible est un écran très étroit (aspect ~0.4, mobile en portrait).
  const fallbackDistance = useMemo(
    () => frameDistance(widthU, heightU, 0.4, CAMERA_FOV_DEG),
    [widthU, heightU],
  );

  return (
    <Canvas
      className={className}
      shadows={!degraded}
      dpr={degraded ? 1.25 : [1, 2]}
      camera={{ fov: CAMERA_FOV_DEG, far: 400, position: [0, fallbackDistance * 0.5, fallbackDistance * 0.87] }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      scene={{ environmentIntensity: 0.85 }}
    >
      <color attach="background" args={['#f3ede1']} />

      <AdaptivePerformance onFallback={() => setDegraded(true)} />
      <DebugStatsExporter />
      <CameraRig view={view} widthU={widthU} heightU={heightU} controlsRef={controlsRef} />

      {degraded ? (
        // GPU faible : éclairage 3 points fixe, pas d'ombres ni d'environnement PBR
        // (ARCHITECTURE.md §9.5).
        <>
          <ambientLight intensity={0.55} />
          <directionalLight position={[6, 10, 6]} intensity={1.5} />
          <directionalLight position={[-6, 5, -5]} intensity={0.5} />
        </>
      ) : (
        <>
          <StudioEnvironment />
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
        </>
      )}

      <KeyboardModel catalog={catalog} />

      {!degraded && (
        <ContactShadows position={[0, -0.17, 0]} opacity={0.4} scale={30} blur={2.4} far={4} />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        minDistance={8}
        maxDistance={fallbackDistance * 1.8}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI / 2.05}
        dampingFactor={0.12}
      />
    </Canvas>
  );
}
