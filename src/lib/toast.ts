import { create } from 'zustand';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastState {
  toasts: readonly ToastItem[];
  show: (message: string) => void;
  dismiss: (id: number) => void;
}

const TOAST_DURATION_MS = 3200;

let nextId = 0;

/** Notifications globales (ex. ajout au panier) — indépendantes de la page qui les déclenche. */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message) => {
    const id = ++nextId;
    set((state) => ({ toasts: [...state.toasts, { id, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, TOAST_DURATION_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
