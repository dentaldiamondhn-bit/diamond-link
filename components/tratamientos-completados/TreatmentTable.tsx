'use client';

import React from 'react';
import { IdCard, Phone, Stethoscope } from 'lucide-react';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatPhoneDisplay, createWhatsAppUrl } from '../../utils/phoneUtils';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';
import { getRecordCategoryInfoSync } from '../../utils/recordCategoryUtils';
import type { CompletedTreatment } from '../../services/completedTreatmentService';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import { calculatePendingBalance } from '@/lib/treatments/completedTreatmentMetrics';
import { paymentStatusFor } from '@/lib/treatments/completedTreatmentSort';
import TreatmentActions from './TreatmentActions';
import { GLASS_INSET, GLASS_PANEL } from './glassTheme';
import {
  collectTreatmentNames,
  patientDoctor,
  patientIdentity,
  resolvePatientType,
} from './treatmentView';

const HEADING =
  'px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

export default function TreatmentTable({
  treatments,
  patientBypassStatus,
  onOpenPayments,
  onDelete,
  footer,
}: {
  treatments: CompletedTreatment[];
  patientBypassStatus: Record<string, boolean>;
  onOpenPayments: (treatment: CompletedTreatment) => void;
  onDelete: (treatment: CompletedTreatment) => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className={cn(GLASS_PANEL, 'overflow-hidden')}>
      <div className="custom-scrollbar overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800/70">
          <thead className="bg-slate-50/80 dark:bg-slate-950/40">
            <tr>
              <th scope="col" className={`${HEADING} text-left`}>
                Paciente
              </th>
              <th scope="col" className={`${HEADING} text-left`}>
                Fecha
              </th>
              <th scope="col" className={`${HEADING} text-left`}>
                Doctor
              </th>
              <th scope="col" className={`${HEADING} text-left`}>
                Tratamientos
              </th>
              <th scope="col" className={`${HEADING} text-left`}>
                Total
              </th>
              <th scope="col" className={`${HEADING} text-left`}>
                Estado
              </th>
              <th scope="col" className={`${HEADING} text-right`}>
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
            {treatments.map((treatment) => {
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
              const names = collectTreatmentNames(treatment);
              const phone = treatment.paciente?.telefono;

              return (
                <tr
                  key={treatment.id}
                  className="align-top transition-colors duration-150 hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                >
                  <td className="px-6 py-5">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {treatment.paciente?.nombre_completo || 'Paciente Desconocido'}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          GLASS_INSET,
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300',
                        )}
                      >
                        <IdCard className="h-3 w-3" aria-hidden="true" />
                        {patientIdentity(treatment)}
                      </span>

                      {phone ? (
                        <a
                          href={createWhatsAppUrl(phone, treatment.paciente?.codigopais)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                        >
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          {formatPhoneDisplay(phone, treatment.paciente?.codigopais)}
                        </a>
                      ) : null}
                    </div>

                    {patientType || isHistorical ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {patientType ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${patientType.colors.badge} border ${patientType.colors.badgeText}`}
                          >
                            {patientType.label}
                          </span>
                        ) : null}
                        {isHistorical ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200">
                            Histórico
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </td>

                  <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500 dark:text-slate-400">
                    {SimpleTimezoneFix.formatDisplayDate(treatment.fecha_cita)}
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-700 dark:text-slate-200">
                    <span className="inline-flex items-center gap-2">
                      <Stethoscope
                        className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                      {patientDoctor(treatment)}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    {names.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {names.map((name, index) => (
                          <span
                            key={`${name}-${index}`}
                            className={cn(
                              GLASS_INSET,
                              'inline-flex max-w-full items-center px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm dark:text-slate-200',
                            )}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 dark:text-slate-500">
                        Sin tratamientos
                      </span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-6 py-5">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(totalFinal, treatment.moneda)}
                    </p>

                    {totalPaid > 0 ? (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        Pagado:{' '}
                        <span className="font-semibold">
                          {formatCurrency(totalPaid, treatment.moneda)}
                        </span>
                      </p>
                    ) : null}

                    {pendingBalance > 0 ? (
                      <p className="mt-0.5 text-xs text-rose-500 dark:text-rose-400">
                        Pendiente:{' '}
                        <span className="font-semibold">
                          {formatCurrency(pendingBalance, treatment.moneda)}
                        </span>
                      </p>
                    ) : null}
                  </td>

                  <td className="whitespace-nowrap px-6 py-5">
                    <StatusBadge status={status} />
                  </td>

                  <td className="px-6 py-5">
                    <TreatmentActions
                      viewHref={`/tratamientos-completados/${treatment.id}/view`}
                      onOpenPayments={() => onOpenPayments(treatment)}
                      onDelete={() => onDelete(treatment)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}
