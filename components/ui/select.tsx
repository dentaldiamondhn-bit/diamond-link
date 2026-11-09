'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    return (
      <select
        ref={ref}
        onChange={handleChange}
        className={cn(
          'flex h-10 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur-sm transition-colors dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-100',
          'focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

Select.displayName = 'Select';

export const SelectOption = ({ value, children, ...props }: { value: string; children: React.ReactNode } & React.OptionHTMLAttributes<HTMLOptionElement>) => {
  return <option value={value} {...props}>{children}</option>;
};

export const SelectValue = SelectOption;
export const SelectTrigger = Select;
export const SelectContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SelectItem = SelectOption;
export const SelectSeparator = () => <option disabled>──────────</option>;
