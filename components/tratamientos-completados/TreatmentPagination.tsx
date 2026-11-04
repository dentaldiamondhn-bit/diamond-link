'use client';

import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GLASS_INSET, GLASS_PANEL } from './glassTheme';

const PAGE_BUTTON =
  'h-9 min-w-9 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';

const PAGE_BUTTON_IDLE =
  'border-slate-200/80 bg-white/80 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300';

const PAGE_BUTTON_ACTIVE =
  'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-950/50';

const ARROW_BUTTON =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 backdrop-blur-sm transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-emerald-700 dark:hover:text-emerald-300';

export default function TreatmentPagination({
  totalTreatments,
  startIndex,
  endIndex,
  totalPages,
  currentPage,
  recordsPerPage,
  onRecordsPerPageChange,
  onPageChange,
  variant = 'standalone',
}: {
  totalTreatments: number;
  startIndex: number;
  endIndex: number;
  totalPages: number;
  currentPage: number;
  recordsPerPage: number;
  onRecordsPerPageChange: (value: number) => void;
  onPageChange: (page: number) => void;
  variant?: 'attached' | 'standalone';
}) {
  const pageNumbers = getPaginationNumbers(currentPage, totalPages);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-4 px-4 py-3 lg:flex-row',
        variant === 'attached'
          ? 'border-t border-slate-200/80 dark:border-slate-800/80'
          : GLASS_PANEL,
      )}
    >
      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span>
          Total Tratamientos:{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {totalTreatments}
          </span>
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          Mostrando: {startIndex + 1}-{Math.min(endIndex, totalTreatments)} de{' '}
          {totalTreatments}
        </span>
      </p>

      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="records-per-page"
            className="text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            Registros por página:
          </label>
          <div className="relative flex items-center justify-center">
            <select
              id="records-per-page"
              value={recordsPerPage}
              onChange={(event) => onRecordsPerPageChange(Number(event.target.value))}
              className={cn(
                GLASS_INSET,
                'h-10 w-20 cursor-pointer appearance-none py-0 pl-4 pr-8 text-sm font-medium leading-none shadow-sm',
              )}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
          </div>
        </div>

        {totalPages > 1 ? (
          <nav aria-label="Paginación" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Página anterior"
              className={ARROW_BUTTON}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {pageNumbers.map((page, index) => (
              <span key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-sm text-slate-400 dark:text-slate-500">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPageChange(page as number)}
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={cn(
                      PAGE_BUTTON,
                      currentPage === page ? PAGE_BUTTON_ACTIVE : PAGE_BUTTON_IDLE,
                    )}
                  >
                    {page}
                  </button>
                )}
              </span>
            ))}

            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
              className={ARROW_BUTTON}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function getPaginationNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  const pages: (number | '...')[] = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) {
      pages.push('...');
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push('...');
    }
    pages.push(totalPages);
  }

  return pages;
}
