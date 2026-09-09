import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('border-border bg-surface rounded-lg border', className)}>{children}</div>
  );
}
