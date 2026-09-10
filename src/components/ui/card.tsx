import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'border-border bg-surface shadow-foreground/5 rounded-lg border shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
