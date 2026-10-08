export type PaymentProcessingMode = 'cash' | 'advance';

export interface TreatmentLedger {
  id: string;
  total_final: number;
  moneda: string;
  paciente_id?: string | null;
}

export interface ExistingPaymentRow {
  monto_pago: number;
  monto_convertido?: number | null;
}

export interface PaymentSource {
  tratamiento_completado_id: string;
  monto_pago: number;
  moneda: string;
  metodo_pago?: string;
  notas_pago?: string;
  fecha_pago?: string;
  creado_por?: string;
  [key: string]: any;
}

export interface CurrencyConversion {
  convertedAmount: number;
  exchangeRate: number;
}

export interface AdvanceCreditLookup {
  origen_pago_id: string;
  paciente_id?: string | null;
  monto?: number;
  moneda?: string;
  tratamiento_completado_id?: string;
}

export interface PaymentAdvanceDeps<TRow = any, TCredit = any> {
  getTreatment(tratamientoCompletadoId: string): Promise<TreatmentLedger | null>;
  getExistingPayments(tratamientoCompletadoId: string): Promise<ExistingPaymentRow[] | null>;
  insertPayment(row: Record<string, any>): Promise<TRow>;
  fetchAdvanceCredit(input: AdvanceCreditLookup): Promise<TCredit | null>;
  convertAmount?(amount: number, from: string, to: string): Promise<CurrencyConversion | null>;
}

export interface AdvanceEntry<TCredit = any> {
  monto: number;
  moneda: string;
  credit: TCredit | null;
}

export interface ProcessedPayment<TRow = any, TCredit = any> {
  payment: TRow | null;
  advance: AdvanceEntry<TCredit> | null;
  cashAmount: number;
  treatmentCurrency: string;
  mode: PaymentProcessingMode;
}

export interface PaymentSplit {
  cashAmount: number;
  advanceAmount: number;
  pendingBefore: number;
}

export interface CashLedgerEntry {
  monto_pago?: number;
  monto_convertido?: number | null;
  moneda?: string;
  metodo_pago?: string;
  concepto?: string;
  tipo_asiento?: string;
  es_adelanto?: boolean;
  verificado?: boolean | null;
}

const ADVANCE_METHODS = new Set(['pago_adelanto', 'adelanto', 'advance', 'prepayment']);
const ADVANCE_ASIENTOS = new Set(['adelanto', 'advance', 'prepayment', 'liabilidad', 'liability', 'unearned']);
const ADVANCE_CONCEPT = /adelanto|prepayment|unearned|prepago/i;
const SALDO_POSITIVO_METHOD = 'saldo_positivo';

export function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function paidAmountOf(row: ExistingPaymentRow): number {
  const converted = row?.monto_convertido;
  if (typeof converted === 'number' && !Number.isNaN(converted)) {
    return roundMoney(converted);
  }
  if (converted !== null && converted !== undefined) {
    const parsed = Number(converted);
    if (!Number.isNaN(parsed)) return roundMoney(parsed);
  }
  return roundMoney(Number(row?.monto_pago) || 0);
}

export function sumPaidAmounts(rows: ExistingPaymentRow[] | null): number {
  if (!rows || rows.length === 0) return 0;
  return roundMoney(rows.reduce((total, row) => total + paidAmountOf(row), 0));
}

export function pendingBalance(totalFinal: number, paidSoFar: number): number {
  return Math.max(0, roundMoney((Number(totalFinal) || 0) - (Number(paidSoFar) || 0)));
}

export function splitPayment(input: {
  totalFinal: number;
  paidSoFar: number;
  amountInTreatmentCurrency: number;
}): PaymentSplit {
  const pendingBefore = pendingBalance(input.totalFinal, input.paidSoFar);
  const amount = Math.max(0, roundMoney(input.amountInTreatmentCurrency));
  const cashAmount = roundMoney(Math.min(amount, pendingBefore));
  const advanceAmount = roundMoney(Math.max(0, amount - cashAmount));
  return { cashAmount, advanceAmount, pendingBefore };
}

export function isSaldoPositivoEntry(entry: CashLedgerEntry | null | undefined): boolean {
  if (!entry) return false;
  const method = String(entry.metodo_pago || '').toLowerCase();
  return method === SALDO_POSITIVO_METHOD;
}

export function isAdvanceConceptEntry(entry: CashLedgerEntry | null | undefined): boolean {
  if (!entry) return false;
  if (entry.es_adelanto === true) return true;
  if (entry.tipo_asiento && ADVANCE_ASIENTOS.has(String(entry.tipo_asiento).toLowerCase())) return true;
  if (entry.concepto && ADVANCE_CONCEPT.test(String(entry.concepto))) return true;
  if (entry.metodo_pago && ADVANCE_METHODS.has(String(entry.metodo_pago).toLowerCase())) return true;
  return false;
}

export function isCashLedgerEntry(entry: CashLedgerEntry | null | undefined): boolean {
  if (!entry) return false;
  if (entry.verificado === false) return false;
  if (isAdvanceConceptEntry(entry)) return false;
  if (isSaldoPositivoEntry(entry)) return false;
  return true;
}

export function filterCashLedgerEntries<T extends CashLedgerEntry>(entries: T[]): T[] {
  return (entries || []).filter(isCashLedgerEntry);
}

export function cashAmountOf(entry: CashLedgerEntry): number {
  const converted = entry?.monto_convertido;
  if (typeof converted === 'number' && !Number.isNaN(converted)) {
    return roundMoney(converted);
  }
  if (converted !== null && converted !== undefined) {
    const parsed = Number(converted);
    if (!Number.isNaN(parsed)) return roundMoney(parsed);
  }
  return roundMoney(Number(entry?.monto_pago) || 0);
}

export function computeCashBalance(entries: CashLedgerEntry[]): number {
  return roundMoney(filterCashLedgerEntries(entries || []).reduce((total, entry) => total + cashAmountOf(entry), 0));
}

/**
 * Records a payment exactly as received (full monto_pago cash entry on the
 * receipt date). Any overpayment vs. the treatment's outstanding balance is
 * automatically captured as a patient credit by the DB trigger
 * `handle_overpayment_credit`; the trigger is authoritative and the created
 * credit is fetched (for the caller's informational use) if available.
 */
export async function processPaymentWithAdvance<TRow, TCredit>(
  deps: PaymentAdvanceDeps<TRow, TCredit>,
  payment: PaymentSource,
  treatmentCurrency?: string,
  now: () => string = () => new Date().toISOString()
): Promise<ProcessedPayment<TRow, TCredit>> {
  const treatment = await deps.getTreatment(payment.tratamiento_completado_id);
  const targetCurrency = treatmentCurrency || treatment?.moneda || payment.moneda;

  let conversion: CurrencyConversion | null = null;
  if (payment.moneda !== targetCurrency && deps.convertAmount) {
    try {
      conversion = await deps.convertAmount(payment.monto_pago, payment.moneda, targetCurrency);
    } catch (conversionError) {
      console.warn('Currency conversion failed:', conversionError);
      conversion = null;
    }
  }

  const amountInTreatmentCurrency = roundMoney(
    conversion ? conversion.convertedAmount : payment.monto_pago
  );

  const row: Record<string, any> = {
    ...payment,
    monto_original: payment.monto_pago,
    moneda_original: payment.moneda,
    creado_en: now(),
    actualizado_en: now()
  };
  if (conversion) {
    row.monto_convertido = amountInTreatmentCurrency;
    row.moneda_conversion = targetCurrency;
    row.tasa_conversion = conversion.exchangeRate;
  }

  const paymentRow = await deps.insertPayment(row);

  let mode: PaymentProcessingMode = 'cash';
  let advance: AdvanceEntry<TCredit> | null = null;

  if (treatment && Number(treatment.total_final) > 0) {
    const existingPayments = await deps.getExistingPayments(payment.tratamiento_completado_id);
    const paidAfter = roundMoney((existingPayments ? sumPaidAmounts(existingPayments) : 0) + amountInTreatmentCurrency);
    const advanceAmount = roundMoney(Math.max(0, paidAfter - Number(treatment.total_final)));

    if (advanceAmount > 0) {
      mode = 'advance';

      let credit: TCredit | null = null;
      if (treatment.paciente_id) {
        try {
          credit = await deps.fetchAdvanceCredit({
            origen_pago_id: (paymentRow as any)?.id,
            paciente_id: treatment.paciente_id,
            monto: advanceAmount,
            moneda: targetCurrency,
            tratamiento_completado_id: payment.tratamiento_completado_id
          });
        } catch (creditError) {
          console.warn('Could not load the patient credit created by the overpayment trigger:', creditError);
          credit = null;
        }
      }

      advance = { monto: advanceAmount, moneda: targetCurrency, credit };
    }
  }

  return {
    payment: paymentRow,
    advance,
    cashAmount: amountInTreatmentCurrency,
    treatmentCurrency: targetCurrency,
    mode
  };
}