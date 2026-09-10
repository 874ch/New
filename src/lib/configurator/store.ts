import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

import type { ConfiguratorStep, LayoutData } from '@/lib/configurator/types';
import type { Build, KeyAssignment, KeyCode, Sku } from '@/lib/pricing';

interface HistoryEntry {
  chassisSku: Sku | null;
  keys: Record<KeyCode, KeyAssignment>;
}

interface ConfiguratorState {
  layoutSlug: string | null;
  /** Codes du layout courant, dans l'ordre d'affichage. */
  keyCodes: readonly KeyCode[];

  step: ConfiguratorStep;
  chassisSku: Sku | null;
  keys: Record<KeyCode, KeyAssignment>;

  /** Pinceaux : le type qui sera posé au prochain clic sur une touche. */
  activeSwitchSku: Sku | null;
  activeKeycapSku: Sku | null;
  hoveredKey: KeyCode | null;

  /** Historique du châssis/des positions posées, pour annuler/rétablir. */
  past: readonly HistoryEntry[];
  future: readonly HistoryEntry[];

  setStep: (step: ConfiguratorStep) => void;
  setChassis: (sku: Sku) => void;
  setActiveSwitch: (sku: Sku) => void;
  setActiveKeycap: (sku: Sku) => void;
  setHoveredKey: (code: KeyCode | null) => void;

  /** Applique le pinceau de l'étape courante sur une position. */
  paintKey: (code: KeyCode) => void;
  /** Retire ce que l'étape courante pose, sur une position. */
  clearKey: (code: KeyCode) => void;
  /** Remplissage rapide : pose le pinceau courant sur toutes les positions. */
  fillAll: () => void;
  /** Pose le pinceau courant uniquement sur les positions encore vides. */
  fillEmpty: () => void;
  undo: () => void;
  redo: () => void;

  /** Réconcilie l'état (éventuellement restauré du localStorage) avec le layout servi. */
  initialize: (
    layout: LayoutData,
    defaults: { chassisSku?: Sku; switchSku?: Sku; keycapSku?: Sku },
  ) => void;
  reset: () => void;

  /** Sérialisation vers le contrat partagé avec le serveur (`Build`). */
  toBuild: () => Build | null;
}

const EMPTY_ASSIGNMENT: KeyAssignment = { switchSku: null, keycapSku: null };
/** Nombre d'étapes annulables conservées — au-delà, superflu pour un usage normal. */
const MAX_HISTORY = 50;

export const useConfiguratorStore = create<ConfiguratorState>()(
  subscribeWithSelector(
    persist(
      (set, get) => {
        /**
         * Empile l'état courant (châssis + positions) dans `past` avant de le
         * remplacer par `partial` — utilisé par toute action qui modifie le
         * build, pour permettre annuler/rétablir. Toute nouvelle action après
         * un undo invalide la pile `future` (comportement standard).
         */
        function commit(partial: Pick<ConfiguratorState, 'chassisSku' | 'keys'>) {
          const { chassisSku, keys, past } = get();
          set({
            past: [...past.slice(-MAX_HISTORY + 1), { chassisSku, keys }],
            future: [],
            ...partial,
          });
        }

        return {
          layoutSlug: null,
          keyCodes: [],
          step: 'chassis',
          chassisSku: null,
          keys: {},
          activeSwitchSku: null,
          activeKeycapSku: null,
          hoveredKey: null,
          past: [],
          future: [],

          setStep: (step) => set({ step, hoveredKey: null }),
          setChassis: (chassisSku) => commit({ chassisSku, keys: get().keys }),
          setActiveSwitch: (activeSwitchSku) => set({ activeSwitchSku }),
          setActiveKeycap: (activeKeycapSku) => set({ activeKeycapSku }),
          setHoveredKey: (hoveredKey) => set({ hoveredKey }),

          paintKey: (code) => {
            const { step, keys, chassisSku, activeSwitchSku, activeKeycapSku } = get();
            const current = keys[code] ?? EMPTY_ASSIGNMENT;

            if (step === 'switches') {
              if (!activeSwitchSku) return;
              // Retaper la pièce déjà posée avec le même pinceau la retire :
              // annule un misclic sans « Maj + clic », inutilisable au tactile.
              const switchSku = current.switchSku === activeSwitchSku ? null : activeSwitchSku;
              commit({ chassisSku, keys: { ...keys, [code]: { ...current, switchSku } } });
              return;
            }

            if (step === 'keycaps') {
              if (!activeKeycapSku) return;
              const keycapSku = current.keycapSku === activeKeycapSku ? null : activeKeycapSku;
              commit({ chassisSku, keys: { ...keys, [code]: { ...current, keycapSku } } });
            }
          },

          clearKey: (code) => {
            const { step, keys, chassisSku } = get();
            const current = keys[code];
            if (!current) return;

            if (step === 'switches' && current.switchSku !== null) {
              commit({ chassisSku, keys: { ...keys, [code]: { ...current, switchSku: null } } });
            } else if (step === 'keycaps' && current.keycapSku !== null) {
              commit({ chassisSku, keys: { ...keys, [code]: { ...current, keycapSku: null } } });
            }
          },

          fillAll: () => {
            const { step, keys, keyCodes, chassisSku, activeSwitchSku, activeKeycapSku } = get();
            const sku = step === 'switches' ? activeSwitchSku : activeKeycapSku;
            if (!sku || (step !== 'switches' && step !== 'keycaps')) return;

            const field = step === 'switches' ? 'switchSku' : 'keycapSku';
            const next: Record<KeyCode, KeyAssignment> = {};
            for (const code of keyCodes) {
              next[code] = { ...(keys[code] ?? EMPTY_ASSIGNMENT), [field]: sku };
            }
            commit({ chassisSku, keys: next });
          },

          fillEmpty: () => {
            const { step, keys, keyCodes, chassisSku, activeSwitchSku, activeKeycapSku } = get();
            const sku = step === 'switches' ? activeSwitchSku : activeKeycapSku;
            if (!sku || (step !== 'switches' && step !== 'keycaps')) return;

            const field = step === 'switches' ? 'switchSku' : 'keycapSku';
            const next: Record<KeyCode, KeyAssignment> = { ...keys };
            for (const code of keyCodes) {
              const current = keys[code] ?? EMPTY_ASSIGNMENT;
              if (current[field] === null) {
                next[code] = { ...current, [field]: sku };
              }
            }
            commit({ chassisSku, keys: next });
          },

          undo: () => {
            const { past, future, chassisSku, keys } = get();
            const previous = past.at(-1);
            if (!previous) return;
            set({
              past: past.slice(0, -1),
              future: [{ chassisSku, keys }, ...future],
              chassisSku: previous.chassisSku,
              keys: previous.keys,
            });
          },

          redo: () => {
            const { past, future, chassisSku, keys } = get();
            const [next, ...rest] = future;
            if (!next) return;
            set({
              past: [...past, { chassisSku, keys }],
              future: rest,
              chassisSku: next.chassisSku,
              keys: next.keys,
            });
          },

          initialize: (layout, defaults) => {
            const state = get();
            const keyCodes = layout.keys.map((key) => key.code);
            // Un layout différent (ou un état restauré périmé) ne doit jamais laisser
            // traîner des positions qui n'existent plus.
            const previous = state.layoutSlug === layout.slug ? state.keys : {};

            const keys: Record<KeyCode, KeyAssignment> = {};
            for (const code of keyCodes) {
              keys[code] = previous[code] ?? EMPTY_ASSIGNMENT;
            }

            set({
              layoutSlug: layout.slug,
              keyCodes,
              keys,
              chassisSku: state.chassisSku ?? defaults.chassisSku ?? null,
              activeSwitchSku: state.activeSwitchSku ?? defaults.switchSku ?? null,
              activeKeycapSku: state.activeKeycapSku ?? defaults.keycapSku ?? null,
              past: [],
              future: [],
            });
          },

          reset: () => {
            const { keyCodes, chassisSku } = get();
            const next: Record<KeyCode, KeyAssignment> = {};
            for (const code of keyCodes) {
              next[code] = EMPTY_ASSIGNMENT;
            }
            commit({ chassisSku, keys: next });
            set({ step: 'chassis', hoveredKey: null });
          },

          toBuild: () => {
            const { layoutSlug, chassisSku, keys } = get();
            if (!layoutSlug || !chassisSku) return null;
            return { version: 1, layoutSlug, chassisSku, keys };
          },
        };
      },
      {
        name: 'configurateur-build',
        version: 1,
        // Le pinceau, l'étape, le survol et l'historique sont de l'UI éphémère :
        // seul le build est restauré.
        partialize: (state) => ({
          layoutSlug: state.layoutSlug,
          chassisSku: state.chassisSku,
          keys: state.keys,
        }),
      },
    ),
  ),
);
