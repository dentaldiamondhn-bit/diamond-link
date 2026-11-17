'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors';
const PILL_IDLE = 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white';
const PILL_ACTIVE = 'border-teal-400/40 bg-teal-500/15 text-teal-300';

interface IntervalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INTERVALS = [
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: '24', label: '24 meses' },
];

export function IntervalModal({ open, onOpenChange }: IntervalModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);

  const current = String(chartData.intervalo_mantenimiento ?? '6');

  if (!open) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Intervalo de mantenimiento"
        >
          <div
            className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div>
                <h2 className="text-sm font-semibold text-white">Intervalo de mantenimiento</h2>
                <p className="mt-1 text-[11px] text-slate-400">Periodicidad recomendada para el paciente</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {INTERVALS.map(interval => (
                  <label
                    key={interval.value}
                    className={`w-full ${PILL_BASE} ${current === interval.value ? PILL_ACTIVE : PILL_IDLE}`}
                  >
                    <input
                      type="radio"
                      name="intervalo_mantenimiento"
                      value={interval.value}
                      checked={current === interval.value}
                      onChange={() => updateField('intervalo_mantenimiento', interval.value)}
                      className="sr-only"
                    />
                    {interval.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2.5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-400/35 hover:border-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.12)] px-4 py-2 text-sm font-medium transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
