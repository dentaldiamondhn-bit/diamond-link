/**
 * Pure helpers for the "Estado" sort on the tratamientos-completados list.
 *
 * The Estado column renders `PaymentService.calculatePaymentStatus(total_final,
 * monto_pagado)` as Pendiente / Parcialmente Pagado / Pagado. The sort must use
 * that same source, otherwise the column does not arrange as displayed.
 */

export type PaymentStatus = 'pendiente' | 'parcialmente_pagado' | 'pagado'

/**
 * Mirrors `PaymentService.calculatePaymentStatus`. Kept dependency-free so the
 * sort key can be unit-tested without importing the React page or the service.
 */
export function paymentStatusFor(totalFinal: number | string | null | undefined, totalPaid: number | string | null | undefined): PaymentStatus {
  const final = Number(totalFinal) || 0
  const paid = Number(totalPaid) || 0
  if (final <= 0) return 'pagado'
  if (paid >= final) return 'pagado'
  if (paid > 0) return 'parcialmente_pagado'
  return 'pendiente'
}

/** Ascending rank: pendiente → parcialmente_pagado → pagado. */
const STATUS_RANK: Record<PaymentStatus, number> = {
  pendiente: 0,
  parcialmente_pagado: 1,
  pagado: 2,
}

/**
 * Compare two payment statuses. `direction` matches the list's `sortOrder`.
 * Returns a negative/zero/positive number so the caller can return it directly.
 */
export function comparePaymentStatus(
  statusA: PaymentStatus,
  statusB: PaymentStatus,
  direction: 'asc' | 'desc',
): number {
  const diff = STATUS_RANK[statusA] - STATUS_RANK[statusB]
  return direction === 'asc' ? diff : -diff
}
