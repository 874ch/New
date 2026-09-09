import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

type Tone = 'neutral' | 'accent';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-background text-muted',
  accent: 'bg-accent/10 text-accent',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
