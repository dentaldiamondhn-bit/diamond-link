import * as React from 'react';
import { cn } from '@/lib/utils';

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextValue>({
  open: false,
  setOpen: () => {},
});

const Dropdown = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
};

const DropdownTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { setOpen, open } = React.useContext(DropdownContext);
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn('inline-flex items-center justify-center', className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

const DropdownContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { open } = React.useContext(DropdownContext);
  if (!open) return null;
  return (
    <div
      className={cn(
        'absolute right-0 mt-2 w-56 rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50',
        className
      )}
    >
      <div className="py-1">{children}</div>
    </div>
  );
};

const DropdownItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, onClick, ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownContext);
    return (
      <div
        ref={ref}
        className={cn(
          'px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer',
          className
        )}
        onClick={(e) => {
          onClick?.(e);
          setOpen(false);
        }}
        {...props}
      />
    );
  }
);

const DropdownSeparator = ({ className }: { className?: string }) => (
  <div className={cn('my-1 h-px bg-slate-100 dark:bg-slate-700', className)} />
);

const DropdownLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400', className)}>{children}</div>
);

Dropdown.displayName = 'Dropdown';
DropdownTrigger.displayName = 'DropdownTrigger';
DropdownContent.displayName = 'DropdownContent';
DropdownItem.displayName = 'DropdownItem';
DropdownSeparator.displayName = 'DropdownSeparator';
DropdownLabel.displayName = 'DropdownLabel';

export { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator, DropdownLabel };
