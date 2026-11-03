'use client';

import React from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarDays,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DoctorFilterOption } from '@/lib/treatments/completedTreatmentFilters';

export type TreatmentSortKey =
  | 'paciente'
  | 'fecha'
  | 'doctor'
  | 'total'
  | 'estado'
  | 'tratamientos';

const SORT_OPTIONS: { value: TreatmentSortKey; label: string }[] = [
  { value: 'fecha', label: 'Fecha' },
  { value: 'paciente', label: 'Paciente' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'tratamientos', label: 'Tratamientos' },
  { value: 'total', label: 'Total' },
  { value: 'estado', label: 'Estado' },
];

const FIELD_CLASSES =
  'h-11 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500';

export default function TreatmentFiltersBar({
  searchTerm,
  onSearchChange,
  doctorFilter,
  onDoctorChange,
  doctorOptions,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  dateRangeInvalid,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  visibleCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
  colorScheme,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  doctorFilter: string;
  onDoctorChange: (value: string) => void;
  doctorOptions: DoctorFilterOption[];
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  dateRangeInvalid: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: TreatmentSortKey;
  onSortByChange: (value: TreatmentSortKey) => void;
  sortOrder: 'asc' | 'desc';
  onToggleSortOrder: () => void;
  visibleCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  colorScheme?: string;
}) {
  const SortIcon = sortOrder === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:p-5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre, identidad, teléfono o tratamiento..."
            aria-label="Buscar tratamientos"
            className={cn(FIELD_CLASSES, 'w-full pl-11')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="tratamientos-sort">
            Ordenar por
          </label>
          <select
            id="tratamientos-sort"
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as TreatmentSortKey)}
            className={cn(FIELD_CLASSES, 'cursor-pointer pr-8')}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onToggleSortOrder}
            title={`Orden ${sortOrder === 'asc' ? 'ascendente' : 'descendente'}`}
            aria-label={`Orden ${sortOrder === 'asc' ? 'ascendente' : 'descendente'}`}
            className={cn(
              FIELD_CLASSES,
              'inline-flex h-11 w-11 items-center justify-center px-0 text-slate-500 hover:border-teal-400 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/25 dark:text-slate-400 dark:hover:text-teal-300',
            )}
          >
            <SortIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/80">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40',
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Cuadrícula
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40',
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              Lista
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 p-4 lg:flex lg:flex-wrap lg:items-end lg:gap-3 lg:p-5 dark:border-slate-800/70">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="doctor-filter"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            Doctor
          </label>
          <select
            id="doctor-filter"
            value={doctorFilter}
            onChange={(event) => onDoctorChange(event.target.value)}
            className={cn(FIELD_CLASSES, 'min-w-[14rem] cursor-pointer')}
          >
            <option value="">Todos los doctores</option>
            {doctorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="date-from"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Desde
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            style={colorScheme ? { colorScheme } : undefined}
            className={cn(FIELD_CLASSES, 'min-w-[10.5rem]')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="date-to"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Hasta
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            style={colorScheme ? { colorScheme } : undefined}
            className={cn(FIELD_CLASSES, 'min-w-[10.5rem]')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:ml-auto lg:mt-5">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Mostrando{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{visibleCount}</span>{' '}
            de {totalCount} tratamientos
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal-300 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-700 dark:hover:text-teal-300"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>

      {dateRangeInvalid ? (
        <p className="px-4 pb-4 text-sm text-rose-600 dark:text-rose-400 lg:px-5 lg:pb-5">
          Rango de fechas inválido: la fecha "Desde" es posterior a la fecha "Hasta".
        </p>
      ) : null}
    </div>
  );
}
