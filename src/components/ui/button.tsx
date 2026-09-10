import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';

import { cx } from '@/lib/cx';

type Variant = 'primary' | 'outline';
type Size = 'sm' | 'md';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-accent-foreground shadow-sm shadow-accent/25 hover:opacity-90',
  outline: 'border border-border hover:border-accent hover:text-accent',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
};

const base =
  'inline-flex items-center justify-center rounded-md font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  title?: string;
  onClick?: MouseEventHandler;
}

/** Rendu en `<Link>` si `href` est fourni, sinon en `<button>`. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  href,
  title,
  ...buttonProps
}: ButtonProps) {
  const classes = cx(base, variantClasses[variant], sizeClasses[size], className);

  if (href) {
    return (
      <Link href={href} className={classes} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} title={title} {...buttonProps}>
      {children}
    </button>
  );
}
