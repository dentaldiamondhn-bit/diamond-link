'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GlassModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'max-w-4xl',
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <div
          className="fixed inset-0 animate-in fade-in bg-slate-950/70 backdrop-blur-md duration-200"
          onClick={onClose}
          aria-hidden="true"
        />

        <div
          className={cn(
            'relative w-full animate-in fade-in rounded-2xl border border-slate-700/60 bg-slate-900/80 text-left shadow-2xl shadow-black/50 backdrop-blur-xl duration-200',
            maxWidth,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 px-5 pb-4 pt-5">
            <div className="flex min-w-0 items-center gap-3">
              {icon ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  {icon}
                </span>
              ) : null}

              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-white">{title}</h3>
                {subtitle ? <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p> : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="px-5 py-5">{children}</div>

          {footer ? (
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800/80 px-5 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
