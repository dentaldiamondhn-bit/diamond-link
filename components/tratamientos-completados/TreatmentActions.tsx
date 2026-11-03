'use client';

import React from 'react';
import Link from 'next/link';
import { CreditCard, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_BASE =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-400 dark:focus-visible:ring-offset-slate-900';

const NEUTRAL_HOVER =
  'hover:border-slate-200 hover:bg-slate-50 hover:text-teal-600 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-teal-300';

const DANGER_HOVER =
  'hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300';

export default function TreatmentActions({
  viewHref,
  onOpenPayments,
  onDelete,
  className,
}: {
  viewHref: string;
  onOpenPayments: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-end gap-1', className)}>
      <button
        type="button"
        onClick={onOpenPayments}
        title="Gestionar pagos"
        aria-label="Gestionar pagos"
        className={cn(ACTION_BASE, NEUTRAL_HOVER)}
      >
        <CreditCard className="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onDelete}
        title="Eliminar tratamiento"
        aria-label="Eliminar tratamiento"
        className={cn(ACTION_BASE, DANGER_HOVER)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>

      <Link
        href={viewHref}
        title="Ver detalle"
        aria-label="Ver detalle"
        className={cn(ACTION_BASE, NEUTRAL_HOVER)}
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
