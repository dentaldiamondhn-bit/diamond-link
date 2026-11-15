'use client';

import React, { useMemo, useState } from 'react';
import { Eye, Pencil, RefreshCw, Search, Stethoscope, Trash2 } from 'lucide-react';

interface SavedStudyMetricas {
  bop?: number | null;
  pi?: number | null;
  ps_media?: number | null;
  nic_medio?: number | null;
}

interface SavedStudiesTabProps {
  studies: any[];
  loading: boolean;
  onRefresh: () => void;
  onView: (studyId: string) => void;
  onEdit: (studyId: string) => void;
  onDelete: (studyId: string) => void;
  onCreateNew: () => void;
}

const formatLongDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const startOfDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  const studyDay = startOfDay(new Date(dateString));
  const today = startOfDay(new Date());
  const days = Math.round((today.getTime() - studyDay.getTime()) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  if (days < 365) return `Hace ${Math.round(days / 30)} meses`;
  return `Hace ${Math.round(days / 365)} años`;
};

const chipBase =
  'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium backdrop-blur-sm';
const metricChip = `${chipBase} bg-white/[0.05] border-white/10 text-slate-400`;
const metricValue = 'font-semibold text-slate-100';

const bopChipClass = (bop: number | null): string =>
  bop !== null && bop > 10
    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';

const formatIndex = (value: number | null): string =>
  value === null || value === undefined ? '–' : `${value}%`;

const formatMillimeters = (value: number | null): string =>
  value === null || value === undefined ? '–' : `${value} mm`;

export function SavedStudiesTab({
  studies,
  loading,
  onRefresh,
  onView,
  onEdit,
  onDelete,
  onCreateNew,
}: SavedStudiesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStudies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return studies.filter(study => {
      const fecha = study.fecha_estudio || '';
      const haystack = [
        fecha,
        formatLongDate(fecha),
        study.objetivo_estudio || '',
        study.observaciones_generales || '',
        study.atendido_por || '',
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const matchesDate = !dateFilter || fecha === dateFilter;
      return matchesSearch && matchesDate;
    });
  }, [dateFilter, searchTerm, studies]);

  const studiesPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredStudies.length / studiesPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentStudies = filteredStudies.slice(
    (safeCurrentPage - 1) * studiesPerPage,
    safeCurrentPage * studiesPerPage,
  );

  const cardClass =
    'group relative bg-gradient-to-br from-white/[0.05] to-white/[0.015] hover:from-white/[0.08] hover:to-teal-500/[0.04] backdrop-blur-xl border border-white/10 hover:border-teal-400/30 rounded-2xl p-4 transition-all duration-200 shadow-lg';

  const viewButtonClass =
    'bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-200 rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all';
  const editButtonClass =
    'bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all';
  const deleteButtonClass =
    'bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all';

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] md:p-5">
      <div className="flex flex-col items-end justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex-row">
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={event => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por fecha, objetivo u odontólogo..."
            className="h-9 w-full rounded-xl border border-white/10 bg-slate-900/50 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="relative w-full md:w-44">
          <input
            type="date"
            value={dateFilter}
            onChange={event => {
              setDateFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="h-9 w-full rounded-xl border border-white/10 bg-slate-900/50 px-3 text-xs text-slate-100 [color-scheme:dark] focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-75 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => {
                setDateFilter('');
                setCurrentPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 transition-colors hover:text-slate-200"
              title="Limpiar fecha"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-xs font-medium text-slate-200 transition-all hover:bg-white/[0.12]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
            />
          ))
        ) : currentStudies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
              <Stethoscope className="h-6 w-6 text-teal-400/70" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-200">
              No se encontraron estudios guardados
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ajuste los filtros o registre un nuevo estudio periodontal.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-5 rounded-xl border border-teal-400/30 bg-teal-500/15 px-4 py-2 text-xs font-medium text-teal-200 transition-all hover:bg-teal-500/25"
            >
              Crear Nuevo Estudio
            </button>
          </div>
        ) : (
          currentStudies.map(study => {
            const metricas: SavedStudyMetricas = study.metricas || {};
            const observaciones = study.observaciones_generales || '';
            const objetivo = study.objetivo_estudio || '';
            return (
              <div
                key={study.id}
                className={`${cardClass} ${study.es_version_actual ? 'border-l-2 border-l-teal-400' : ''}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <div className="min-w-0 md:w-64 md:shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-100">
                        {formatLongDate(study.fecha_estudio)}
                      </p>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] text-slate-400">
                        {formatRelativeTime(study.fecha_estudio)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md border border-white/10 bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                        v{study.version ?? '—'}
                      </span>
                      {study.es_version_actual && (
                        <span className="rounded-full border border-teal-400/30 bg-teal-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.2)]">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-xs text-slate-400" title={study.atendido_por || ''}>
                      {study.atendido_por ? `Odontólogo: ${study.atendido_por}` : 'Odontólogo: –'}
                    </p>
                    <p
                      className="truncate text-xs text-slate-500"
                      title={objetivo || observaciones || ''}
                    >
                      {objetivo || observaciones
                        ? `Objetivo / Observaciones: ${objetivo || observaciones}`
                        : 'Objetivo / Observaciones: –'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:flex-1">
                    <span className={`${chipBase} ${bopChipClass(metricas.bop ?? null)}`}>
                      BOP: <span className={metricValue}>{formatIndex(metricas.bop ?? null)}</span>
                    </span>
                    <span className={`${chipBase} bg-amber-500/10 border-amber-500/20 text-amber-300`}>
                      Placa (PI): <span className={metricValue}>{formatIndex(metricas.pi ?? null)}</span>
                    </span>
                    <span className={metricChip}>
                      PS Media:{' '}
                      <span className={metricValue}>{formatMillimeters(metricas.ps_media ?? null)}</span>
                    </span>
                    <span className={metricChip}>
                      NIC Medio:{' '}
                      <span className={metricValue}>{formatMillimeters(metricas.nic_medio ?? null)}</span>
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => onView(study.id)} className={viewButtonClass}>
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </button>
                    <button type="button" onClick={() => onEdit(study.id)} className={editButtonClass}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button type="button" onClick={() => onDelete(study.id)} className={deleteButtonClass}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200 transition-all hover:bg-white/[0.12] disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {safeCurrentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200 transition-all hover:bg-white/[0.12] disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
