'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import type { Group, Mesh } from 'three';

import {
  LEVELS,
  createKeycapGeometry,
  createSwitchHousingGeometry,
  createSwitchStemGeometry,
} from '@/components/configurator/scene/geometry';

/**
 * Pièce décorative du hero d'accueil : le même switch que celui du
 * configurateur (mêmes géométries procédurales, cf. geometry.ts) — aucun
 * nouvel asset, juste une mise en scène différente. Éclaté à l'arrivée sur
 * la page, il s'assemble et tourne au fil du défilement dans la section
 * hero, écho au geste de « construire son clavier ».
 *
 * Coût gardé bas à dessein : pas d'environnement PBR ni d'ombres (§10
 * budget de performance) — ce n'est qu'une décoration, pas la vue produit.
 * Ne monte le canvas WebGL que sur les écrans larges (`useIsLargeScreen`) et
 * n'anime que si `prefers-reduced-motion` ne l'exclut pas.
 */

const EXPLODE_STEM = 0.35;
const EXPLODE_KEYCAP = 0.65;
/** Recentre l'assemblage (dont l'origine est la base du boîtier, pas son
 * centre visuel) sur l'axe de visée de la caméra, éclaté compris. */
const GROUP_Y_OFFSET = -0.55;
const LARGE_SCREEN_QUERY = '(min-width: 1024px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * `useState(() => window.matchMedia(...).matches)` désynchronise le premier
 * rendu client de la page statique générée au build (fausse la valeur dès
 * le rendu d'hydratation, avant même l'effet) — erreur d'hydratation React.
 * Comme pour le consentement cookies (`consent.ts`), on passe par
 * `useSyncExternalStore` : snapshot serveur fixe (`false`), vraie valeur
 * appliquée seulement après l'accroche côté client.
 */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function Assembly({ progressRef, animate }: { progressRef: RefObject<number>; animate: boolean }) {
  const groupRef = useRef<Group>(null);
  const stemRef = useRef<Mesh>(null);
  const keycapRef = useRef<Mesh>(null);
  const smoothed = useRef(animate ? 0 : 1);

  const housingGeometry = useMemo(() => createSwitchHousingGeometry(), []);
  const stemGeometry = useMemo(() => createSwitchStemGeometry(), []);
  const keycapGeometry = useMemo(() => createKeycapGeometry(1), []);

  useEffect(
    () => () => {
      housingGeometry.dispose();
      stemGeometry.dispose();
      keycapGeometry.dispose();
    },
    [housingGeometry, stemGeometry, keycapGeometry],
  );

  useFrame((state, delta) => {
    if (!animate) return;

    smoothed.current += (progressRef.current - smoothed.current) * Math.min(1, delta * 4);
    const gapStem = (1 - smoothed.current) * EXPLODE_STEM;
    const gapKeycap = (1 - smoothed.current) * EXPLODE_KEYCAP;
    if (stemRef.current) stemRef.current.position.y = LEVELS.stemBottom + gapStem;
    if (keycapRef.current) keycapRef.current.position.y = LEVELS.keycapBottom + gapKeycap;

    if (groupRef.current) {
      groupRef.current.rotation.y =
        state.clock.elapsedTime * 0.2 + smoothed.current * Math.PI * 0.6;
      groupRef.current.position.y = GROUP_Y_OFFSET + Math.sin(state.clock.elapsedTime * 0.6) * 0.05;
    }
  });

  const initialGapStem = animate ? EXPLODE_STEM : 0;
  const initialGapKeycap = animate ? EXPLODE_KEYCAP : 0;

  return (
    <group ref={groupRef} position={[0, GROUP_Y_OFFSET, 0]} rotation={[0.35, 0, 0]}>
      <mesh geometry={housingGeometry} position={[0, LEVELS.switchBottom, 0]}>
        <meshStandardMaterial color="#2b2115" roughness={0.7} />
      </mesh>
      <mesh
        ref={stemRef}
        geometry={stemGeometry}
        position={[0, LEVELS.stemBottom + initialGapStem, 0]}
      >
        <meshStandardMaterial color="#e35d24" roughness={0.5} />
      </mesh>
      <mesh
        ref={keycapRef}
        geometry={keycapGeometry}
        position={[0, LEVELS.keycapBottom + initialGapKeycap, 0]}
      >
        <meshStandardMaterial color="#fff6ed" roughness={0.55} />
      </mesh>
    </group>
  );
}

export function HeroKeyScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const isLargeScreen = useMediaQuery(LARGE_SCREEN_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  useEffect(() => {
    if (!isLargeScreen || reducedMotion) return;

    // Le hero est visible dès le chargement (pas d'entrée depuis le bas de
    // l'écran) : on ne peut pas mesurer la progression par rapport à la
    // hauteur de la fenêtre sans démarrer déjà à moitié assemblé. On mesure
    // donc par rapport à la position de départ elle-même — 0 garanti au
    // chargement, 1 quand la pièce atteint le haut de l'écran.
    let initialTop: number | null = null;

    function updateProgress() {
      const el = containerRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (initialTop === null) initialTop = Math.max(top, 1);
      const raw = 1 - top / initialTop;
      progressRef.current = Math.min(1, Math.max(0, raw));
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [isLargeScreen, reducedMotion]);

  if (!isLargeScreen) return null;

  return (
    <div ref={containerRef} className="aspect-square w-full max-w-sm" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ fov: 35, position: [1.5, 1.7, 2.6] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} />
        <Assembly progressRef={progressRef} animate={!reducedMotion} />
      </Canvas>
    </div>
  );
}
