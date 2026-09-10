import { cx } from '@/lib/cx';

/**
 * Silhouette de clavier générique, utilisée sur le catalogue et les fiches
 * produit tant qu'aucune photo produit n'existe (§13 Q8 — dépend du choix de
 * marque). Le rendu 3D réel existe depuis la Phase 4, mais uniquement dans le
 * configurateur : les vraies photos du catalogue restent à produire.
 */
export function KeyboardGlyph({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'from-background to-border/60 flex items-center justify-center bg-gradient-to-br',
        className,
      )}
    >
      <svg viewBox="0 0 64 24" className="text-muted h-auto w-2/3" aria-hidden="true">
        <rect x="0" y="0" width="64" height="24" rx="3" fill="none" stroke="currentColor" />
        {Array.from({ length: 4 }, (_, row) =>
          Array.from({ length: 10 }, (_, col) => (
            <rect
              key={`${row}-${col}`}
              x={3 + col * 6}
              y={3 + row * 5}
              width="4.5"
              height="3.5"
              rx="0.8"
              fill="currentColor"
              opacity="0.6"
            />
          )),
        )}
      </svg>
    </div>
  );
}
