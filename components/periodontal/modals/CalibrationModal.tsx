'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';

interface CalibrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalibrationModal({ open, onOpenChange }: CalibrationModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);

  const offset = String(chartData.calibracion_sonda ?? '0');

  if (!open) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Calibración de la sonda"
        >
          <div
            className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div>
                <h2 className="text-sm font-semibold text-white">Calibración de la sonda</h2>
                <p className="mt-1 text-[11px] text-slate-400">Ajuste aplicado a las profundidades de sondaje registradas</p>
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
              <div className="max-w-md mx-auto">
                <label
                  htmlFor="calibracion-offset"
                  className="mb-1 block text-xs font-medium text-slate-400"
                >
                  Desvío (mm)
                </label>
                <input
                  id="calibracion-offset"
                  type="number"
                  step="0.1"
                  value={offset}
                  onChange={event => updateField('calibracion_sonda', event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Un desvío positivo suma milímetros a cada lectura de profundidad de sondaje.
                </p>
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
