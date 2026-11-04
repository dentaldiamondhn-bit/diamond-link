'use client';

import React from 'react';
import { HandCoins, UserRound } from 'lucide-react';
import { Currency } from '../../utils/currencyUtils';
import { PaymentService } from '../../services/paymentService';
import GlassModal from './GlassModal';
import {
  BTN_PRIMARY,
  BTN_SECONDARY_DARK,
  GLASS_FIELD_LABEL,
  GLASS_INSET_DARK,
  GLASS_MUTED,
} from './glassTheme';
import { cn } from '@/lib/utils';

export interface AdvancePaymentForm {
  monto_pago: string;
  moneda: Currency;
  metodo_pago: string;
  notas_pago: string;
}

export default function AdvancePaymentModal({
  open,
  onClose,
  patientName,
  patientId,
  value,
  onChange,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string | null;
  value: AdvancePaymentForm;
  onChange: (updater: (previous: AdvancePaymentForm) => AdvancePaymentForm) => void;
  saving: boolean;
  onSubmit: () => void;
}) {
  const inputClass = cn(GLASS_INSET_DARK, 'w-full px-3 py-2 text-sm');

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Pago Adelantado"
      subtitle="Registra efectivo recibido hoy como Saldo Positivo del paciente"
      icon={<HandCoins className="h-5 w-5" aria-hidden="true" />}
      maxWidth="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY_DARK}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className={BTN_PRIMARY}
            disabled={saving || !value.monto_pago}
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Registrando...
              </>
            ) : (
              <>
                <HandCoins className="h-4 w-4" aria-hidden="true" />
                Registrar Pago Adelantado
              </>
            )}
          </button>
        </>
      }
    >
      <div className={cn(GLASS_INSET_DARK, 'mb-4 p-4')}>
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-300">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          {patientName ? patientName : `Paciente #${patientId}`}
        </p>
        <p className={cn(GLASS_MUTED, 'mt-2')}>
          El monto se registra como efectivo recibido hoy y queda como Saldo Positivo
          (crédito) disponible para el paciente, aunque aún no tenga tratamiento completado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={GLASS_FIELD_LABEL}>Monto</label>
          <input
            type="number"
            value={value.monto_pago}
            onChange={(event) =>
              onChange((previous) => ({ ...previous, monto_pago: event.target.value }))
            }
            className={inputClass}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className={GLASS_FIELD_LABEL}>Moneda</label>
          <select
            value={value.moneda}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                moneda: event.target.value as Currency,
              }))
            }
            className={inputClass}
          >
            <option value="HNL">HNL</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div>
          <label className={GLASS_FIELD_LABEL}>Método de Pago</label>
          <select
            value={value.metodo_pago}
            onChange={(event) =>
              onChange((previous) => ({ ...previous, metodo_pago: event.target.value }))
            }
            className={inputClass}
          >
            {PaymentService.getPaymentMethods()
              .filter((method) => method !== 'saldo_positivo')
              .map((method) => (
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
            value={value.notas_pago}
            onChange={(event) =>
              onChange((previous) => ({ ...previous, notas_pago: event.target.value }))
            }
            className={inputClass}
            placeholder="Notas del pago"
          />
        </div>
      </div>
    </GlassModal>
  );
}
