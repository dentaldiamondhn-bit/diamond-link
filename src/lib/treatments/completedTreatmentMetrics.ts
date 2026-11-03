/**
 * Pure helpers for the status pills, balances and treatment counters on the
 * tratamientos-completados list.
 *
 * Kept dependency-free so the rules can be unit-tested without importing the
 * React page or the Supabase service.
 */

import type { PaymentStatus } from './completedTreatmentSort';

export type PaymentStatusTone = PaymentStatus;

export interface PaymentStatusPresentation {
  label: string;
  tone: PaymentStatusTone;
}

export interface TreatmentItemCounts {
  tratamientos_realizados?: unknown[] | null;
  tratamientos_inventario?: unknown[] | null;
}

function toAmount(value: number | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function calculatePendingBalance(
  totalFinal: number | null | undefined,
  totalPaid: number | null | undefined,
): number {
  return Math.max(0, toAmount(totalFinal) - toAmount(totalPaid));
}

export function getPaymentStatusPresentation(
  status: PaymentStatus,
): PaymentStatusPresentation {
  if (status === 'pagado') {
    return { label: 'Pagado', tone: 'pagado' };
  }

  if (status === 'parcialmente_pagado') {
    return { label: 'Parcialmente Pagado', tone: 'parcialmente_pagado' };
  }

  return { label: 'Pendiente', tone: 'pendiente' };
}

export function getTreatmentItemCount(treatment: TreatmentItemCounts): number {
  return (
    (treatment.tratamientos_realizados?.length ?? 0) +
    (treatment.tratamientos_inventario?.length ?? 0)
  );
}
