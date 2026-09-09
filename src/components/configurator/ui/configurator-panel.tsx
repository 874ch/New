'use client';

import { useMemo } from 'react';

import { Palette } from '@/components/configurator/ui/palette';
import { StepNav } from '@/components/configurator/ui/step-nav';
import { Button } from '@/components/ui/button';
import { fr } from '@/content/fr';
import { useConfiguratorStore } from '@/lib/configurator/store';
import { CONFIGURATOR_STEPS } from '@/lib/configurator/types';
import type { ComponentOption, ConfiguratorCatalog } from '@/lib/configurator/types';

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const ratio = total === 0 ? 0 : done / total;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">{Math.round(ratio * 100)}%</span>
      </div>
      <div
        className="bg-border mt-1.5 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
      >
        <div
          className="bg-accent h-full rounded-full transition-[width] duration-200"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function SummaryLines({
  title,
  counts,
  options,
}: {
  title: string;
  counts: ReadonlyMap<string, number>;
  options: readonly ComponentOption[];
}) {
  if (counts.size === 0) return null;

  return (
    <div>
      <h3 className="text-muted text-xs font-medium tracking-wide uppercase">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {[...counts.entries()].map(([sku, quantity]) => {
          const option = options.find((candidate) => candidate.sku === sku);
          return (
            <li key={sku} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="border-border h-3.5 w-3.5 shrink-0 rounded-full border"
                style={{ backgroundColor: option?.swatchHex ?? '#ffffff' }}
              />
              <span className="flex-1">{option?.name ?? sku}</span>
              <span className="tabular-nums">{quantity}×</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ConfiguratorPanel({ catalog }: { catalog: ConfiguratorCatalog }) {
  const step = useConfiguratorStore((state) => state.step);
  const setStep = useConfiguratorStore((state) => state.setStep);
  const keys = useConfiguratorStore((state) => state.keys);
  const chassisSku = useConfiguratorStore((state) => state.chassisSku);
  const activeSwitchSku = useConfiguratorStore((state) => state.activeSwitchSku);
  const activeKeycapSku = useConfiguratorStore((state) => state.activeKeycapSku);
  const setChassis = useConfiguratorStore((state) => state.setChassis);
  const setActiveSwitch = useConfiguratorStore((state) => state.setActiveSwitch);
  const setActiveKeycap = useConfiguratorStore((state) => state.setActiveKeycap);
  const fillAll = useConfiguratorStore((state) => state.fillAll);
  const reset = useConfiguratorStore((state) => state.reset);

  const totalKeys = catalog.layout.keyCount;

  const tally = useMemo(() => {
    const switches = new Map<string, number>();
    const keycaps = new Map<string, number>();
    let complete = 0;

    for (const assignment of Object.values(keys)) {
      if (assignment.switchSku) {
        switches.set(assignment.switchSku, (switches.get(assignment.switchSku) ?? 0) + 1);
      }
      if (assignment.keycapSku) {
        keycaps.set(assignment.keycapSku, (keycaps.get(assignment.keycapSku) ?? 0) + 1);
      }
      if (assignment.switchSku && assignment.keycapSku) complete += 1;
    }

    const switchCount = [...switches.values()].reduce((sum, n) => sum + n, 0);
    const keycapCount = [...keycaps.values()].reduce((sum, n) => sum + n, 0);
    return { switches, keycaps, complete, switchCount, keycapCount };
  }, [keys]);

  const stepIndex = CONFIGURATOR_STEPS.indexOf(step);
  const activeBrush =
    step === 'switches'
      ? catalog.switches.find((option) => option.sku === activeSwitchSku)
      : step === 'keycaps'
        ? catalog.keycaps.find((option) => option.sku === activeKeycapSku)
        : undefined;

  return (
    <aside className="border-border flex h-full flex-col gap-6 border-l p-6">
      <StepNav />

      <p className="text-muted text-sm">{fr.pages.configurator.stepHelp[step]}</p>

      {step === 'chassis' && (
        <Palette
          label={fr.pages.configurator.steps.chassis}
          options={catalog.chassis}
          selectedSku={chassisSku}
          onSelect={setChassis}
        />
      )}

      {step === 'switches' && (
        <>
          <Palette
            label={fr.pages.configurator.steps.switches}
            options={catalog.switches}
            selectedSku={activeSwitchSku}
            onSelect={setActiveSwitch}
          />
          <ProgressBar
            done={tally.switchCount}
            total={totalKeys}
            label={fr.pages.configurator.switchProgress(tally.switchCount, totalKeys)}
          />
        </>
      )}

      {step === 'keycaps' && (
        <>
          <Palette
            label={fr.pages.configurator.steps.keycaps}
            options={catalog.keycaps}
            selectedSku={activeKeycapSku}
            onSelect={setActiveKeycap}
          />
          <ProgressBar
            done={tally.keycapCount}
            total={totalKeys}
            label={fr.pages.configurator.keycapProgress(tally.keycapCount, totalKeys)}
          />
        </>
      )}

      {(step === 'switches' || step === 'keycaps') && activeBrush && (
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={fillAll}>
            {fr.pages.configurator.fillAll(activeBrush.name)}
          </Button>
          <p className="text-muted text-xs">{fr.pages.configurator.clearHint}</p>
        </div>
      )}

      {step === 'summary' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-muted text-xs font-medium tracking-wide uppercase">
              {fr.pages.configurator.summary.chassis}
            </h3>
            <p className="mt-2 text-sm">
              {catalog.chassis.find((option) => option.sku === chassisSku)?.name ??
                fr.pages.configurator.summary.empty}
            </p>
          </div>

          <SummaryLines
            title={fr.pages.configurator.summary.switches}
            counts={tally.switches}
            options={catalog.switches}
          />
          <SummaryLines
            title={fr.pages.configurator.summary.keycaps}
            counts={tally.keycaps}
            options={catalog.keycaps}
          />

          <p className={tally.complete === totalKeys ? 'text-sm' : 'text-danger text-sm'}>
            {tally.complete === totalKeys
              ? fr.pages.configurator.summary.complete
              : fr.pages.configurator.summary.incomplete(totalKeys - tally.complete)}
          </p>
          <p className="text-muted text-xs">{fr.pages.configurator.summary.priceInPhase5}</p>
        </div>
      )}

      <div className="mt-auto space-y-3">
        <ProgressBar
          done={tally.complete}
          total={totalKeys}
          label={fr.pages.configurator.progress(tally.complete, totalKeys)}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={stepIndex === 0}
            onClick={() => setStep(CONFIGURATOR_STEPS[stepIndex - 1] ?? 'chassis')}
          >
            {fr.pages.configurator.previous}
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={stepIndex === CONFIGURATOR_STEPS.length - 1}
            onClick={() => setStep(CONFIGURATOR_STEPS[stepIndex + 1] ?? 'summary')}
          >
            {fr.pages.configurator.next}
          </Button>
        </div>

        <button
          type="button"
          onClick={reset}
          className="text-muted hover:text-danger w-full text-xs"
        >
          {fr.pages.configurator.reset}
        </button>
      </div>
    </aside>
  );
}
