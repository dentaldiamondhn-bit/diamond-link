'use client';

import React from 'react';
import { ClipboardList, Trash2 } from 'lucide-react';
import { formatCurrency, type Currency } from '../../utils/currencyUtils';

export interface SelectedTreatmentItem {
  tratamiento_id: number | string;
  nombre_tratamiento: string;
  codigo_tratamiento: string;
  precio_original: number;
  precio_final: number;
  moneda: Currency;
  cantidad: number;
  notas: string;
  doctor_id?: string;
  doctor_name?: string;
  disableElderlyDiscount?: boolean;
  imagen_url?: string;
}

export interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
}

export default function SelectedTreatmentsPanel({
  treatments,
  doctors,
  elderlyDiscountPercent,
  onDoctorChange,
  onQuantityChange,
  onElderlyDiscountToggle,
  onNotesChange,
  onRemove,
}: {
  treatments: SelectedTreatmentItem[];
  doctors: DoctorOption[];
  elderlyDiscountPercent: 35 | 25 | null;
  onDoctorChange: (index: number, doctorId: string) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onElderlyDiscountToggle: (index: number, disabled: boolean) => void;
  onNotesChange: (index: number, notes: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Tratamientos Seleccionados
        </h2>
        {treatments.length > 0 ? (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {treatments.length}
          </span>
        ) : null}
      </div>

      {treatments.length === 0 ? (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-60" aria-hidden="true" />
          <p className="text-sm">No hay tratamientos seleccionados</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {treatments.map((item, index) => {
            const isPromotion =
              item.notas?.toLowerCase().includes('promoción') ||
              item.notas?.toLowerCase().includes('promocion') ||
              item.notas?.toLowerCase().includes('promo');
            const promotionMatch = item.notas?.match(/promoci[oó]n:\s*(\d+)%\s*off/i);
            const promotionLabel = promotionMatch
              ? `Promoción: ${promotionMatch[1]}% OFF`
              : 'Promoción';

            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 transition-colors hover:bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
                  {/* Left — identifiers, price & promotion badge */}
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    {item.imagen_url ? (
                      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800/60">
                        <img
                          src={item.imagen_url}
                          alt={item.nombre_tratamiento}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}

                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.nombre_tratamiento}
                    </h4>

                    {isPromotion ? (
                      <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                        {promotionLabel}
                      </span>
                    ) : null}

                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.codigo_tratamiento}
                    </span>

                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.precio_original, item.moneda)}
                    </span>

                    {elderlyDiscountPercent !== null && isPromotion ? (
                      <label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-300">
                        <input
                          type="checkbox"
                          checked={!item.disableElderlyDiscount}
                          onChange={(event) => onElderlyDiscountToggle(index, !event.target.checked)}
                          className="h-3 w-3 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:ring-amber-400"
                        />
                        Descuento {elderlyDiscountPercent}%
                      </label>
                    ) : null}
                  </div>

                  {/* Right — doctor, quantity & delete */}
                  <div className="ml-auto flex shrink-0 items-center gap-2.5">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Tratado por:</label>
                    <select
                      value={item.doctor_id || 'dr-default'}
                      onChange={(event) => onDoctorChange(index, event.target.value)}
                      className="max-w-[11rem] cursor-pointer truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none transition focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
                    >
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.specialty}
                        </option>
                      ))}
                    </select>

                    <label htmlFor={`cantidad-${index}`} className="sr-only">
                      Cantidad
                    </label>
                    <input
                      id={`cantidad-${index}`}
                      type="number"
                      value={item.cantidad}
                      onChange={(event) => onQuantityChange(index, parseInt(event.target.value) || 1)}
                      min="1"
                      className="h-8 w-12 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs text-slate-900 outline-none transition focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      aria-label={`Quitar ${item.nombre_tratamiento}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex w-full items-center gap-2">
                  <label
                    htmlFor={`notas-${index}`}
                    className="shrink-0 text-xs text-slate-500 dark:text-slate-400"
                  >
                    Notas:
                  </label>
                  <input
                    id={`notas-${index}`}
                    type="text"
                    value={item.notas || ''}
                    onChange={(event) => onNotesChange(index, event.target.value)}
                    placeholder="Notas del tratamiento..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
