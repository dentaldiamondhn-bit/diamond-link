import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCashBalance,
  filterCashLedgerEntries,
  isCashLedgerEntry,
  pendingBalance,
  processPaymentWithAdvance,
  splitPayment,
  sumPaidAmounts
} from '../src/services/paymentAdvance.ts';
import type {
  ExistingPaymentRow,
  PaymentAdvanceDeps,
  PaymentSource,
  TreatmentLedger
} from '../src/services/paymentAdvance.ts';

interface FakeState {
  treatment: TreatmentLedger | null;
  existing: ExistingPaymentRow[] | null;
  insertedRows: Record<string, any>[];
  credits: { id: string; origen_pago_id?: string }[];
  creditByPayment: Record<string, { id: string }>;
}

function createDeps(state: FakeState): PaymentAdvanceDeps<{ id: string }, { id: string }> {
  return {
    getTreatment: async () => state.treatment,
    getExistingPayments: async () => state.existing,
    insertPayment: async (row: Record<string, any>) => {
      const inserted = { id: `payment-${state.insertedRows.length + 1}`, ...row };
      state.insertedRows.push(inserted);
      return { id: inserted.id };
    },
    fetchAdvanceCredit: async (input) => {
      state.credits.push({ id: input.origen_pago_id ? `credit-${input.origen_pago_id}` : 'credit-?', origen_pago_id: input.origen_pago_id });
      return state.creditByPayment[input.origen_pago_id] ?? null;
    }
  };
}

function paymentInput(overrides: Partial<PaymentSource> = {}): PaymentSource {
  return {
    tratamiento_completado_id: 'treatment-1',
    monto_pago: 1000,
    moneda: 'HNL',
    metodo_pago: 'efectivo',
    fecha_pago: '2026-10-07T10:00:00.000Z',
    ...overrides
  };
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    treatment: { id: 'treatment-1', total_final: 1000, moneda: 'HNL', paciente_id: 'patient-1' },
    existing: [],
    insertedRows: [],
    credits: [],
    creditByPayment: {},
    ...overrides
  };
}

describe('processPaymentWithAdvance', () => {
  test('records the full cash amount when it fits within the pending balance', async () => {
    const state = baseState({
      existing: [{ monto_pago: 400 }]
    });

    const result = await processPaymentWithAdvance(createDeps(state), paymentInput({ monto_pago: 600 }));

    assert.equal(result.mode, 'cash');
    assert.equal(state.insertedRows.length, 1, 'full amount must be recorded as cash');
    assert.equal(state.insertedRows[0].monto_pago, 600);
    assert.equal(state.insertedRows[0].monto_original, 600);
    assert.equal(state.insertedRows[0].moneda_original, 'HNL');
    assert.equal(result.advance, null);
    assert.equal(state.credits.length, 0, 'no credit lookup when there is no overpayment');
  });

  test('overpayment stays as a full cash entry and reports the excess as advance credit', async () => {
    const state = baseState({
      existing: [{ monto_pago: 400 }],
      creditByPayment: { 'payment-1': { id: 'credit-from-trigger' } }
    });

    const result = await processPaymentWithAdvance(createDeps(state), paymentInput({ monto_pago: 900 }));

    assert.equal(result.mode, 'advance');
    assert.equal(state.insertedRows.length, 1);
    assert.equal(state.insertedRows[0].monto_pago, 900, 'full original amount is kept in payments');
    assert.equal(result.cashAmount, 900);
    assert.ok(result.advance);
    assert.equal(result.advance.monto, 300);
    assert.equal(result.advance.moneda, 'HNL');
    assert.deepEqual(state.credits[0].origen_pago_id, 'payment-1');
    assert.equal(result.advance.credit?.id, 'credit-from-trigger');
  });

  test('a payment on a fully paid treatment is fully an advance (cash entry kept intact)', async () => {
    const state = baseState({
      existing: [{ monto_pago: 1000 }]
    });

    const result = await processPaymentWithAdvance(createDeps(state), paymentInput({ monto_pago: 500 }));

    assert.equal(result.mode, 'advance');
    assert.equal(state.insertedRows.length, 1);
    assert.equal(state.insertedRows[0].monto_pago, 500);
    assert.equal(result.advance?.monto, 500);
  });

  test('reports the advance even when the trigger credit cannot be found', async () => {
    const state = baseState({
      existing: [{ monto_pago: 800 }],
      creditByPayment: {}
    });

    const result = await processPaymentWithAdvance(createDeps(state), paymentInput({ monto_pago: 300 }));

    assert.equal(result.mode, 'advance');
    assert.equal(result.advance?.monto, 100);
    assert.equal(result.advance?.credit, null);
  });

  test('without a treatment ledger the full payment is a plain cash entry', async () => {
    const state = baseState({ treatment: null });

    const result = await processPaymentWithAdvance(createDeps(state), paymentInput({ monto_pago: 750 }));

    assert.equal(result.mode, 'cash');
    assert.equal(state.insertedRows.length, 1);
    assert.equal(state.insertedRows[0].monto_pago, 750);
    assert.equal(result.advance, null);
  });

  test('currency conversion keeps the full payment currency amount and advances in the treatment currency', async () => {
    const state = baseState({
      treatment: { id: 'treatment-1', total_final: 24500, moneda: 'HNL', paciente_id: 'patient-1' },
      existing: [{ monto_pago: 24500 }]
    });
    const deps = createDeps(state);
    deps.convertAmount = async (amount, from, to) => ({
      convertedAmount: from === 'USD' && to === 'HNL' ? amount * 24.5 : amount,
      exchangeRate: from === 'USD' && to === 'HNL' ? 24.5 : 1
    });

    const result = await processPaymentWithAdvance(deps, paymentInput({ monto_pago: 20, moneda: 'USD' }));

    assert.equal(result.mode, 'advance');
    assert.equal(state.insertedRows.length, 1, 'full amount must be kept as a cash entry');
    assert.equal(state.insertedRows[0].monto_pago, 20, 'original USD amount must not be reduced');
    assert.equal(state.insertedRows[0].monto_convertido, 490);
    assert.equal(state.insertedRows[0].moneda_conversion, 'HNL');
    assert.equal(state.insertedRows[0].tasa_conversion, 24.5);
    assert.equal(result.advance?.monto, 490);
    assert.equal(result.advance?.moneda, 'HNL');
  });

  test('existing paid amounts are taken from converted amounts when present', async () => {
    const state = baseState({
      treatment: { id: 'treatment-1', total_final: 3000, moneda: 'HNL', paciente_id: 'patient-1' },
      existing: [
        { monto_pago: 100, monto_convertido: 2450 },
        { monto_pago: 75.5 }
      ]
    });

    const result = await processPaymentWithAdvance(createDeps(state), paymentInput({ monto_pago: 500 }));

    assert.equal(pendingBalance(3000, sumPaidAmounts(state.existing as ExistingPaymentRow[])), 474.5);
    assert.equal(result.mode, 'advance');
    assert.equal(result.cashAmount, 500, 'full amount is recorded as cash');
    assert.equal(result.advance?.monto, 25.5);
  });
});

describe('splitPayment', () => {
  test('keeps the full amount as cash while it fits in the pending balance', () => {
    const split = splitPayment({ totalFinal: 1000, paidSoFar: 200, amountInTreatmentCurrency: 800 });
    assert.deepEqual(split, { cashAmount: 800, advanceAmount: 0, pendingBefore: 800 });
  });

  test('rounds to cents and never produces a negative pending balance', () => {
    const split = splitPayment({ totalFinal: 100, paidSoFar: 33.33, amountInTreatmentCurrency: 99.999 });
    assert.equal(split.pendingBefore, 66.67);
    assert.equal(split.cashAmount, 66.67);
    assert.equal(split.advanceAmount, 33.33);

    assert.equal(pendingBalance(500, 900), 0);
  });

  test('fully paid treatment routes every cent to the advance bucket', () => {
    const split = splitPayment({ totalFinal: 500, paidSoFar: 500, amountInTreatmentCurrency: 300 });
    assert.equal(split.cashAmount, 0);
    assert.equal(split.advanceAmount, 300);
  });
});

describe('cash balance ledger', () => {
  test('excludes advance-generated, saldo_positivo and unverified entries', () => {
    const entries = [
      { monto_pago: 500, metodo_pago: 'efectivo' },
      { monto_pago: 250, metodo_pago: 'pago_adelanto' },
      { monto_pago: 100, es_adelanto: true },
      { monto_pago: 75, verificado: false },
      { monto_pago: 60, tipo_asiento: 'liabilidad' },
      { monto_pago: 40, concepto: 'Pago en adelanto' },
      { monto_pago: 200, metodo_pago: 'saldo_positivo' },
      { monto_pago: 30, monto_convertido: 735, moneda: 'USD' }
    ];

    assert.equal(isCashLedgerEntry(entries[0]), true);
    assert.equal(isCashLedgerEntry(entries[1]), false);
    assert.equal(isCashLedgerEntry(entries[2]), false);
    assert.equal(isCashLedgerEntry(entries[3]), false);
    assert.equal(isCashLedgerEntry(entries[4]), false);
    assert.equal(isCashLedgerEntry(entries[5]), false);
    assert.equal(isCashLedgerEntry(entries[6]), false, 'saldo_positivo usage must never count as cash');
    assert.equal(isCashLedgerEntry(entries[7]), true);

    assert.equal(filterCashLedgerEntries(entries).length, 2);
    assert.equal(computeCashBalance(entries), 1235, 'cash balance must ignore advance/saldo/unverified rows');
  });

  test('prefers the converted amount when computing the balance', () => {
    assert.equal(
      computeCashBalance([{ monto_pago: 20, monto_convertido: 490, moneda: 'USD' }]),
      490
    );
    assert.equal(computeCashBalance([]), 0);
  });
});