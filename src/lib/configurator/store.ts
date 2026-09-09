import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

import type { ConfiguratorStep, LayoutData } from '@/lib/configurator/types';
import type { Build, KeyAssignment, KeyCode, Sku } from '@/lib/pricing';

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

export const useConfiguratorStore = create<ConfiguratorState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        layoutSlug: null,
        keyCodes: [],
        step: 'chassis',
        chassisSku: null,
        keys: {},
        activeSwitchSku: null,
        activeKeycapSku: null,
        hoveredKey: null,

        setStep: (step) => set({ step, hoveredKey: null }),
        setChassis: (chassisSku) => set({ chassisSku }),
        setActiveSwitch: (activeSwitchSku) => set({ activeSwitchSku }),
        setActiveKeycap: (activeKeycapSku) => set({ activeKeycapSku }),
        setHoveredKey: (hoveredKey) => set({ hoveredKey }),

        paintKey: (code) => {
          const { step, keys, activeSwitchSku, activeKeycapSku } = get();
          const current = keys[code] ?? EMPTY_ASSIGNMENT;

          if (step === 'switches') {
            if (!activeSwitchSku || current.switchSku === activeSwitchSku) return;
            set({ keys: { ...keys, [code]: { ...current, switchSku: activeSwitchSku } } });
            return;
          }

          if (step === 'keycaps') {
            if (!activeKeycapSku || current.keycapSku === activeKeycapSku) return;
            set({ keys: { ...keys, [code]: { ...current, keycapSku: activeKeycapSku } } });
          }
        },

        clearKey: (code) => {
          const { step, keys } = get();
          const current = keys[code];
          if (!current) return;

          if (step === 'switches' && current.switchSku !== null) {
            set({ keys: { ...keys, [code]: { ...current, switchSku: null } } });
          } else if (step === 'keycaps' && current.keycapSku !== null) {
            set({ keys: { ...keys, [code]: { ...current, keycapSku: null } } });
          }
        },

        fillAll: () => {
          const { step, keys, keyCodes, activeSwitchSku, activeKeycapSku } = get();
          const sku = step === 'switches' ? activeSwitchSku : activeKeycapSku;
          if (!sku || (step !== 'switches' && step !== 'keycaps')) return;

          const field = step === 'switches' ? 'switchSku' : 'keycapSku';
          const next: Record<KeyCode, KeyAssignment> = {};
          for (const code of keyCodes) {
            next[code] = { ...(keys[code] ?? EMPTY_ASSIGNMENT), [field]: sku };
          }
          set({ keys: next });
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
          });
        },

        reset: () => {
          const { keyCodes } = get();
          const keys: Record<KeyCode, KeyAssignment> = {};
          for (const code of keyCodes) {
            keys[code] = EMPTY_ASSIGNMENT;
          }
          set({ keys, step: 'chassis', hoveredKey: null });
        },

        toBuild: () => {
          const { layoutSlug, chassisSku, keys } = get();
          if (!layoutSlug || !chassisSku) return null;
          return { version: 1, layoutSlug, chassisSku, keys };
        },
      }),
      {
        name: 'configurateur-build',
        version: 1,
        // Le pinceau, l'étape et le survol sont de l'UI éphémère : seul le build est restauré.
        partialize: (state) => ({
          layoutSlug: state.layoutSlug,
          chassisSku: state.chassisSku,
          keys: state.keys,
        }),
      },
    ),
  ),
);
