'use client';

import React from 'react';
import {
  ArrowRightLeft,
  Check,
  Coins,
  CreditCard,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { formatCurrency, Currency } from '../../utils/currencyUtils';
import { PaymentService, type PaymentSummary } from '../../services/paymentService';
import { SimpleTimezoneFix } from '../../services/simpleTimezoneFix';
import type { CompletedTreatment } from '../../services/completedTreatmentService';
import GlassModal from './GlassModal';
import {
  BTN_PRIMARY,
  BTN_SECONDARY_DARK,
  GLASS_FIELD_LABEL,
  GLASS_INSET_DARK,
  GLASS_MUTED,
  GLASS_SUMMARY,
} from './glassTheme';
import { cn } from '@/lib/utils';

export interface NewPaymentForm {
  monto_pago: string;
  moneda: Currency;
  metodo_pago: string;
  notas_pago: string;
}

export default function PaymentManagementModal({
  open,
  onClose,
  treatment,
  paymentSummary,
  loadingPayments,
  newPayment,
  conversionInfo,
  applyCredit,
  creditAmount,
  applyingCredit,
  onStartApplyCredit,
  onCreditAmountChange,
  onApplyCredit,
  onCancelCredit,
  onAddPayment,
  onDeletePayment,
  onPaymentAmountChange,
  onPaymentCurrencyChange,
  onPaymentMethodChange,
  onPaymentNotesChange,
}: {
  open: boolean;
  onClose: () => void;
  treatment: CompletedTreatment | null;
  paymentSummary: PaymentSummary | null;
  loadingPayments: boolean;
  newPayment: NewPaymentForm;
  conversionInfo: { convertedAmount: number; exchangeRate: number } | null;
  applyCredit: boolean;
  creditAmount: string;
  applyingCredit: boolean;
  onStartApplyCredit: () => void;
  onCreditAmountChange: (value: string) => void;
  onApplyCredit: () => void;
  onCancelCredit: () => void;
  onAddPayment: () => void;
  onDeletePayment: (paymentId: string) => void;
  onPaymentAmountChange: (value: string) => void;
  onPaymentCurrencyChange: (currency: Currency) => void;
  onPaymentMethodChange: (value: string) => void;
  onPaymentNotesChange: (value: string) => void;
}) {
  if (!treatment) return null;

  const treatmentCurrency = treatment.moneda || 'HNL';
  const fieldClass = cn(GLASS_INSET_DARK, 'w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50');

  const totalLabel = (() => {
    if (treatment.total_final) {
      return formatCurrency(treatment.total_final, treatmentCurrency);
    }

    if (treatment.tratamientos_realizados && treatment.tratamientos_realizados.length > 0) {
      const calculatedTotal = treatment.tratamientos_realizados.reduce(
        (sum, item) => sum + (item.precio_final || 0) * (item.cantidad || 0),
        0,
      );
      if (calculatedTotal > 0) {
        return formatCurrency(calculatedTotal, treatmentCurrency);
      }
    }

    if (paymentSummary?.total_tratamiento) {
      return formatCurrency(paymentSummary.total_tratamiento, paymentSummary.moneda_principal || 'HNL');
    }

    return 'No definido';
  })();

  const creditAvailable =
    paymentSummary?.credito_disponible
      ? treatmentCurrency === 'USD'
        ? paymentSummary.credito_disponible.disponible_usd
        : paymentSummary.credito_disponible.disponible_hnl
      : 0;

  const creditMax = Math.min(creditAvailable, paymentSummary?.saldo_pendiente || 0);
  const canAddPayment = Boolean(paymentSummary && paymentSummary.saldo_pendiente > 0);
  const showCurrencyWarning = Boolean(
    newPayment.moneda && treatment.moneda && newPayment.moneda !== treatment.moneda,
  );

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Gestión de Pagos"
      subtitle="Registra pagos, aplica Saldo Positivo y revisa el historial"
      icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
      maxWidth="max-w-4xl"
      footer={
        <button type="button" onClick={onClose} className={BTN_SECONDARY_DARK}>
          Cerrar
        </button>
      }
    >
      <div className={cn(GLASS_INSET_DARK, 'p-4')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className={GLASS_MUTED}>Paciente</p>
            <p className="font-medium text-white">{treatment.paciente?.nombre_completo}</p>
          </div>
          <div>
            <p className={GLASS_MUTED}>Total del Tratamiento</p>
            <p className="font-medium text-white">{totalLabel}</p>
          </div>
        </div>

        {loadingPayments ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" aria-hidden="true" />
            <p className={cn(GLASS_MUTED, 'mt-2')}>Cargando información de pagos...</p>
          </div>
        ) : paymentSummary ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Monto Pagado</span>
              <span className="font-semibold text-emerald-400">
                {formatCurrency(paymentSummary.monto_pagado, paymentSummary.moneda_principal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Saldo Pendiente</span>
              <span
                className={cn(
                  'font-semibold',
                  paymentSummary.saldo_pendiente > 0 ? 'text-rose-400' : 'text-emerald-400',
                )}
              >
                {formatCurrency(paymentSummary.saldo_pendiente, paymentSummary.moneda_principal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Estado del Pago</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  PaymentService.getPaymentStatusBadge(paymentSummary.estado_pago),
                )}
              >
                {PaymentService.getPaymentStatusText(paymentSummary.estado_pago)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {paymentSummary?.credito_disponible && treatment.paciente_id && creditAvailable > 0 ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 font-medium text-emerald-300">
              <Coins className="h-4 w-4" aria-hidden="true" />
              Saldo Positivo Disponible
            </h4>
            <span className="text-lg font-bold text-emerald-300">
              {formatCurrency(creditAvailable, treatmentCurrency)}
            </span>
          </div>
          <p className="mb-3 text-sm text-emerald-200/80">
            Este paciente tiene crédito disponible de sobre-pagos anteriores. Puede aplicarlo a este
            tratamiento.
          </p>

          {!applyCredit ? (
            <button
              type="button"
              onClick={onStartApplyCredit}
              className={BTN_PRIMARY}
              disabled={(paymentSummary.saldo_pendiente || 0) <= 0}
            >
              <Coins className="h-4 w-4" aria-hidden="true" />
              Aplicar Saldo Positivo
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-emerald-200">Monto a aplicar:</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(event) => onCreditAmountChange(event.target.value)}
                  className={cn(GLASS_INSET_DARK, 'w-32 px-3 py-1.5 text-sm')}
                  min="0"
                  max={creditMax}
                  step="0.01"
                />
                <span className="text-sm text-emerald-300">
                  / {formatCurrency(creditAvailable, treatmentCurrency)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onApplyCredit}
                  className={BTN_PRIMARY}
                  disabled={applyingCredit || !creditAmount || parseFloat(creditAmount) <= 0}
                >
                  {applyingCredit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Confirmar
                    </>
                  )}
                </button>
                <button type="button" onClick={onCancelCredit} className={BTN_SECONDARY_DARK}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {(!paymentSummary || (paymentSummary.saldo_pendiente || 0) > 0) && (
        <div className={cn(GLASS_INSET_DARK, 'mt-4 p-4')}>
          <h4 className="mb-3 flex items-center gap-2 font-medium text-white">
            <CreditCard className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Agregar Nuevo Pago
          </h4>

          {!paymentSummary ? (
            <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-200">
              Cargando información de pago...
            </p>
          ) : null}

          {paymentSummary && (paymentSummary.saldo_pendiente || 0) <= 0 && (treatment.total_final || 0) > 0 ? (
            <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-200">
              Este tratamiento ya está completamente pagado.
            </p>
          ) : null}

          {canAddPayment && paymentSummary && (treatment.total_final || 0) > 0 ? (
            <div className={cn(GLASS_SUMMARY, 'mb-3 p-2 font-normal text-emerald-300')}>
              Saldo pendiente:{' '}
              {formatCurrency(paymentSummary.saldo_pendiente, paymentSummary.moneda_principal)}
            </div>
          ) : null}

          {showCurrencyWarning ? (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
                <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                Conversión automática: {newPayment.moneda} → {treatment.moneda}
              </p>
              {conversionInfo ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-amber-200/80">
                    {formatCurrency(parseFloat(newPayment.monto_pago || '0'), newPayment.moneda)} →{' '}
                    {formatCurrency(conversionInfo.convertedAmount, treatment.moneda || 'HNL')}
                    <span className="ml-1 text-amber-300/70">
                      ({conversionInfo.exchangeRate.toFixed(4)})
                    </span>
                  </p>
                  <p className="text-xs text-amber-200/70">
                    El pago será convertido automáticamente a la moneda del tratamiento
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className={GLASS_FIELD_LABEL}>Monto</label>
              <input
                type="number"
                value={newPayment.monto_pago}
                onChange={(event) => onPaymentAmountChange(event.target.value)}
                className={fieldClass}
                placeholder="0.00"
                min="0"
                max={paymentSummary?.saldo_pendiente || 0}
                step="0.01"
                disabled={!canAddPayment}
              />
            </div>
            <div>
              <label className={GLASS_FIELD_LABEL}>Moneda</label>
              <select
                value={newPayment.moneda || 'HNL'}
                onChange={(event) =>
                  onPaymentCurrencyChange((event.target.value || 'HNL') as Currency)
                }
                className={fieldClass}
                disabled={!canAddPayment}
              >
                <option value="HNL">HNL</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className={GLASS_FIELD_LABEL}>Método de Pago</label>
              <select
                value={newPayment.metodo_pago}
                onChange={(event) => onPaymentMethodChange(event.target.value)}
                className={fieldClass}
                disabled={!canAddPayment}
              >
                {PaymentService.getPaymentMethods().map((method) => (
                  <option key={method} value={method}>
                    {PaymentService.formatPaymentMethod(method)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={GLASS_FIELD_LABEL}>Notas (Opcional)</label>
              <input
                type="text"
                value={newPayment.notas_pago}
                onChange={(event) => onPaymentNotesChange(event.target.value)}
                className={fieldClass}
                placeholder="Notas del pago"
                disabled={!canAddPayment}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onAddPayment}
            className={cn(BTN_PRIMARY, 'mt-3')}
            disabled={!canAddPayment}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar Pago
          </button>
        </div>
      )}

      {paymentSummary && paymentSummary.pagos.length > 0 ? (
        <div className={cn(GLASS_INSET_DARK, 'mt-4 p-4')}>
          <h4 className="mb-3 font-medium text-white">Historial de Pagos</h4>
          <div className="max-h-56 space-y-2 overflow-y-auto custom-scrollbar">
            {paymentSummary.pagos.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">
                      {formatCurrency(payment.monto_pago, payment.moneda)}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {payment.moneda}
                    </span>
                    {payment.monto_convertido &&
                    payment.moneda_conversion &&
                    payment.moneda_conversion !== payment.moneda ? (
                      <>
                        <span className="text-xs text-slate-400">
                          → {formatCurrency(payment.monto_convertido, payment.moneda_conversion)}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({payment.tasa_conversion?.toFixed(4)})
                        </span>
                      </>
                    ) : null}
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                      {PaymentService.formatPaymentMethod(payment.metodo_pago)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {SimpleTimezoneFix.formatDateForConsultationAge(payment.fecha_pago)}
                    {payment.notas_pago ? ` - ${payment.notas_pago}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeletePayment(payment.id)}
                  aria-label="Eliminar pago"
                  className="shrink-0 rounded-lg p-2 text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </GlassModal>
  );
}
