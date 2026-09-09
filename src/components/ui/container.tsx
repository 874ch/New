import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto max-w-6xl px-6', className)}>{children}</div>;
}
