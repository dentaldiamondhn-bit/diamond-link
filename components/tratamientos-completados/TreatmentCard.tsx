'use client';

import React from 'react';
import { CalendarDays, MessageCircle, Stethoscope } from 'lucide-react';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatPhoneDisplay, createWhatsAppUrl } from '../../utils/phoneUtils';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';
import { getRecordCategoryInfoSync } from '../../utils/recordCategoryUtils';
import type { CompletedTreatment } from '../../services/completedTreatmentService';
import StatusBadge from './StatusBadge';
import { calculatePendingBalance, getTreatmentItemCount } from '@/lib/treatments/completedTreatmentMetrics';
import { paymentStatusFor } from '@/lib/treatments/completedTreatmentSort';
import TreatmentActions from './TreatmentActions';
import { patientDoctor, patientIdentity, resolvePatientType } from './treatmentView';

const META_ICON = 'h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400';

export default function TreatmentCard({
  treatment,
  patientBypassStatus,
  onOpenPayments,
  onDelete,
}: {
  treatment: CompletedTreatment;
  patientBypassStatus: Record<string, boolean>;
  onOpenPayments: (treatment: CompletedTreatment) => void;
  onDelete: (treatment: CompletedTreatment) => void;
}) {
  const patientType = resolvePatientType(treatment);
  const recordCategoryInfo = treatment.fecha_cita
    ? getRecordCategoryInfoSync(treatment.fecha_cita)
    : null;
  const isHistorical =
    !!recordCategoryInfo?.isHistorical && !patientBypassStatus[treatment.paciente_id];

  const totalFinal = treatment.total_final || 0;
  const totalPaid = treatment.monto_pagado || 0;
  const pendingBalance = calculatePendingBalance(totalFinal, totalPaid);
  const status = paymentStatusFor(totalFinal, totalPaid);
  const phone = treatment.paciente?.telefono;
  const currency = treatment.moneda || 'HNL';

  const itemsTotal =
    treatment.tratamientos_realizados?.reduce(
      (sum, item) => sum + (item.precio_final || 0) * (item.cantidad || 0),
      0,
    ) || 0;
  const inventoryTotal =
    treatment.tratamientos_inventario?.reduce(
      (sum, item) => sum + (item.precio || 0) * (item.cantidad || 0),
      0,
    ) || 0;
  const subtotal = itemsTotal + inventoryTotal;
  const descuento = treatment.total_descuento || 0;
  const total = treatment.total_final || subtotal - descuento;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
      <header
        className={`bg-gradient-to-r p-5 ${
          patientType?.colors.header ||
          'from-teal-600 to-cyan-600 dark:from-teal-700 dark:to-cyan-800'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-white">
              {treatment.paciente?.nombre_completo || 'Paciente Desconocido'}
            </h3>
            <p className="mt-0.5 text-sm text-white/80">{patientIdentity(treatment)}</p>
            {phone ? (
              <p className="mt-1 text-xs text-white/70">
                {formatPhoneDisplay(phone, treatment.paciente?.codigopais)}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {patientType ? (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${patientType.colors.badge} border ${patientType.colors.badgeText}`}
              >
                {patientType.label}
              </span>
            ) : null}
            {isHistorical ? (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200">
                Histórico
              </span>
            ) : null}
            <StatusBadge status={status} variant="onGradient" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col p-5">
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CalendarDays className={META_ICON} aria-hidden="true" />
            {SimpleTimezoneFix.formatDisplayDate(treatment.fecha_cita)}
          </p>

          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Stethoscope className={META_ICON} aria-hidden="true" />
            {patientDoctor(treatment)}
          </p>

          {phone ? (
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <MessageCircle className={META_ICON} aria-hidden="true" />
              <a
                href={createWhatsAppUrl(phone, treatment.paciente?.codigopais)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
              >
                {formatPhoneDisplay(phone, treatment.paciente?.codigopais)}
              </a>
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tratamientos Realizados ({getTreatmentItemCount(treatment)})
          </p>

          <ul className="mt-2.5 space-y-2">
            {treatment.tratamientos_realizados?.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                    {item.cantidad}x {item.nombre_tratamiento}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.codigo_tratamiento}
                  </p>
                  <p className="mt-0.5 text-xs text-teal-600 dark:text-teal-400">
                    Tratado por: {item.doctor_name || 'No especificado'}
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold text-teal-700 dark:text-teal-300">
                  {formatCurrency(item.precio_final * item.cantidad, item.moneda || currency)}
                </span>
              </li>
            ))}

            {treatment.tratamientos_inventario?.map((item) => (
              <li
                key={`inv-${item.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-900/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                    {item.cantidad}x {item.nombre}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.codigo}{' '}
                    <span className="text-amber-600 dark:text-amber-400">(Inventario)</span>
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold text-teal-700 dark:text-teal-300">
                  {formatCurrency(item.precio * item.cantidad, item.moneda || currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 border-t border-slate-200/80 pt-4 dark:border-slate-800/70">
          {!isHistorical ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>

              {descuento > 0 ? (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Descuento:</span>
                  <span className="font-medium text-rose-500 dark:text-rose-400">
                    -{formatCurrency(descuento, currency)}
                  </span>
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900 dark:text-white">
                  Total:
                </span>
                <span className="text-base font-bold text-teal-700 dark:text-teal-300">
                  {formatCurrency(total, currency)}
                </span>
              </div>

              {totalPaid > 0 || pendingBalance > 0 ? (
                <div className="mt-3 space-y-1 border-t border-slate-200/80 pt-3 dark:border-slate-800/70">
                  {totalPaid > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400">Pagado:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalPaid, currency)}
                      </span>
                    </div>
                  ) : null}
                  {pendingBalance > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-rose-500 dark:text-rose-400">Pendiente:</span>
                      <span className="font-semibold text-rose-500 dark:text-rose-400">
                        {formatCurrency(pendingBalance, currency)}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm italic text-slate-500 dark:text-slate-400">
              Precios ocultos (modo histórico activado)
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-slate-200/80 pt-4 dark:border-slate-800/70">
          <TreatmentActions
            viewHref={`/tratamientos-completados/${treatment.id}/view`}
            onOpenPayments={() => onOpenPayments(treatment)}
            onDelete={() => onDelete(treatment)}
          />
        </div>
      </div>
    </article>
  );
}
