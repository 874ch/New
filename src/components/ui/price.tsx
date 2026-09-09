import { formatPriceCents } from '@/lib/pricing';

export function Price({ cents, className }: { cents: number; className?: string }) {
  return <span className={className}>{formatPriceCents(cents)}</span>;
}
