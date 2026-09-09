'use client';

import { fr } from '@/content/fr';
import { useConfiguratorStore } from '@/lib/configurator/store';
import { CONFIGURATOR_STEPS } from '@/lib/configurator/types';
import type { ConfiguratorStep } from '@/lib/configurator/types';
import { cx } from '@/lib/cx';

/** Navigation libre entre les étapes : rien n'est verrouillé, la config est conservée. */
export function StepNav() {
  const step = useConfiguratorStore((state) => state.step);
  const setStep = useConfiguratorStore((state) => state.setStep);
  const currentIndex = CONFIGURATOR_STEPS.indexOf(step);

  return (
    <nav aria-label="Étapes du configurateur">
      <ol className="flex items-center gap-1">
        {CONFIGURATOR_STEPS.map((value, index) => {
          const isCurrent = value === step;
          const isPast = index < currentIndex;

          return (
            <li key={value} className="flex-1">
              <button
                type="button"
                onClick={() => setStep(value)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cx(
                  'w-full rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                  isCurrent
                    ? 'border-accent text-accent bg-accent/5'
                    : isPast
                      ? 'border-border text-foreground'
                      : 'border-border text-muted hover:text-foreground',
                )}
              >
                <span className="block text-[10px] tabular-nums opacity-60">{index + 1}</span>
                {fr.pages.configurator.steps[value as ConfiguratorStep]}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
