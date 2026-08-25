import * as React from 'react';
import { cn } from '@/lib/utils';

const Tooltip = ({ children, content, className }: { children: React.ReactNode; content: React.ReactNode; className?: string }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={cn('relative inline-block', className)}>
      <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-block"
      >
        {children}
      </div>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded-md shadow-lg whitespace-nowrap z-50">
          {content}
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';

export { Tooltip };