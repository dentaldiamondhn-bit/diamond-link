'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { formatCurrency, Currency } from '../../utils/currencyUtils';
import { PaymentService } from '../../services/paymentService';
import GlassModal from './GlassModal';
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY_DARK } from './glassTheme';
import { cn } from '@/lib/utils';

export interface PendingPaymentDeletion {
  id: string;
  amount: number;
  currency: string;
  method: string;
}

export default function DeletePaymentModal({
  open,
  onClose,
  payment,
  success,
  error,
  onConfirm,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  payment: PendingPaymentDeletion | null;
  success: boolean;
  error: string | null;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  if (!payment) return null;

  const title = success ? 'Pago Eliminado' : error ? 'Error al Eliminar' : 'Eliminar Pago';
  const description = success
    ? `El pago de ${formatCurrency(payment.amount, payment.currency as Currency)} (${PaymentService.formatPaymentMethod(payment.method)}) ha sido eliminado exitosamente.`
    : error
      ? `Error: ${error}`
      : `¿Está seguro de que desea eliminar el pago de ${formatCurrency(payment.amount, payment.currency as Currency)} (${PaymentService.formatPaymentMethod(payment.method)})? Esta acción no se puede deshacer.`;

  const icon = success ? (
    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
  ) : error ? (
    <XCircle className="h-5 w-5" aria-hidden="true" />
  ) : (
    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
  );

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      maxWidth="max-w-lg"
      footer={
        !success ? (
          <>
            <button type="button" onClick={onClose} className={BTN_SECONDARY_DARK}>
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} className={BTN_DANGER}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={BTN_PRIMARY}>
              Cerrar
            </button>
            {error ? (
              <button type="button" onClick={onRetry} className={BTN_SECONDARY_DARK}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </button>
            ) : null}
          </>
        )
      }
    >
      <p className={cn('text-sm', success ? 'text-emerald-300' : error ? 'text-rose-300' : 'text-slate-300')}>
        {description}
      </p>
    </GlassModal>
  );
}