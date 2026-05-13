import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils.js';

type Variant = 'primary' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white rounded-pill',
  ghost: 'bg-transparent border border-primary text-primary rounded-pill',
  dark: 'bg-ink text-white rounded-sm',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3',
  lg: 'px-8 py-4 text-lg font-light',
};

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
