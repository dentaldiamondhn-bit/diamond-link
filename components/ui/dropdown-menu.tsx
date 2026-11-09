'use client';

import React from 'react';
import { X } from 'lucide-react';

interface DropdownMenuProps {
  children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  inset?: boolean;
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

interface DropdownMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

interface DropdownMenuShortcutProps {
  children: React.ReactNode;
  className?: string;
}

// Internal props passed by parent
interface DropdownMenuContentInternalProps extends DropdownMenuContentProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentRef: React.Ref<HTMLDivElement>;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contentRef.current && !contentRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const context = React.useMemo(() => ({ open, setOpen, contentRef }), [open]);

  return (
    <DropdownMenuContext.Provider value={context}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

const DropdownMenuContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  contentRef: React.Ref<HTMLDivElement>;
} | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenu components must be used within DropdownMenu');
  }
  return context;
}

export function DropdownMenuTrigger({ children, className = '', ...props }: { children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useDropdownMenuContext();
  
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 hover:bg-gray-100 ${className}`}
      onClick={() => setOpen(!open)}
      aria-haspopup="menu"
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, className = '', align = 'end', side = 'bottom' }: DropdownMenuContentProps) {
  const { open, contentRef } = useDropdownMenuContext();
  
  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={`fixed z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 text-gray-950 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 ${className}`}
      role="menu"
      style={{ 
        [align === 'end' ? 'right' : 'left']: 0,
        [side === 'bottom' ? 'top' : 'bottom']: '100%',
        marginTop: side === 'bottom' ? '4px' : undefined,
        marginBottom: side === 'top' ? '4px' : undefined,
      }}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, disabled = false, className = '', inset = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; inset?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onClick?.()}
      disabled={disabled}
      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${inset ? 'pl-8' : ''} ${className}`}
      role="menuitem"
      data-disabled={disabled}
    >
      {inset && <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center" />}
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className = '' }: { className?: string }) {
  return <div className={`-mx-1 my-1 h-px bg-gray-100 ${className}`} role="separator" />;
}

export function DropdownMenuLabel({ children, className = '', inset = false }: { children: React.ReactNode; className?: string; inset?: boolean }) {
  return (
    <div className={`px-2 py-1.5 text-sm font-semibold ${inset ? 'pl-8' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function DropdownMenuShortcut({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`ml-auto text-xs tracking-widest opacity-60 ${className}`}>{children}</span>;
}