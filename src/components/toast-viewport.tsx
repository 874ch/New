'use client';

import { useToastStore } from '@/lib/toast';

/**
 * Monté une seule fois dans le layout racine : n'importe quelle page peut
 * déclencher une notification via `useToastStore.getState().show(...)` sans
 * avoir à gérer elle-même l'affichage ou la disparition automatique.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed top-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-xs flex-col gap-2 sm:w-auto"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="border-border bg-surface pointer-events-auto flex items-center gap-3 rounded-md border px-4 py-3 text-sm shadow-lg animate-[toast-in_0.25s_ease-out]"
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Fermer la notification"
            className="text-muted hover:text-foreground shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
