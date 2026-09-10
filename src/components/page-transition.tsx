'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Rejoue une animation d'entrée à chaque changement de route : la clé sur
 * `pathname` force React à démonter/remonter ce conteneur, ce qui relance
 * l'animation CSS (une simple mise à jour de props ne le ferait pas).
 * Pas de vraie transition croisée avec la page sortante — ça demanderait
 * soit l'API `ViewTransition` de React (nécessite une version canary,
 * incompatible avec le react@19.2.8 épinglé pour react-three-fiber), soit
 * l'API navigateur `startViewTransition` pilotée à la main, plus fragile
 * avec le streaming de l'App Router. Ce compromis reste sans dépendance et
 * sans risque pour le configurateur.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-[page-in_0.35s_ease-out]">
      {children}
    </div>
  );
}
