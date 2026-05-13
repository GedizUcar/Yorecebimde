import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errorMessage?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, errorMessage, className, id, ...rest },
  ref,
) {
  const fieldId = id ?? rest.name;
  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={fieldId} className="block text-sm font-medium">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={fieldId}
        className={cn(
          'w-full px-4 py-3 rounded-pill border bg-canvas',
          errorMessage ? 'border-red-500 focus:border-red-500' : 'border-hairline focus:border-primary-focus',
          'focus:outline-none focus:ring-2',
          errorMessage ? 'focus:ring-red-500/30' : 'focus:ring-primary-focus/30',
          className,
        )}
        {...rest}
      />
      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
    </div>
  );
});
