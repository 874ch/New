import { cx } from '@/lib/cx';

/**
 * Silhouette de clavier générique, utilisée tant qu'aucun rendu 3D / photo
 * produit n'existe (le rendu réel arrive en Phase 4 et Phase 6).
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
