import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePendingBalance,
  getPaymentStatusPresentation,
  getTreatmentItemCount,
} from '../src/lib/treatments/completedTreatmentMetrics.ts';

describe('calculatePendingBalance', () => {
  test('returns the unpaid part of the total', () => {
    assert.equal(calculatePendingBalance(1000, 400), 600);
    assert.equal(calculatePendingBalance(1000, 0), 1000);
  });

  test('never returns a negative balance', () => {
    assert.equal(calculatePendingBalance(1000, 1000), 0);
    assert.equal(calculatePendingBalance(1000, 1500), 0);
    assert.equal(calculatePendingBalance(0, 0), 0);
  });
});

describe('getPaymentStatusPresentation', () => {
  test('labels a fully paid treatment', () => {
    assert.deepEqual(getPaymentStatusPresentation('pagado'), {
      label: 'Pagado',
      tone: 'pagado',
    });
  });

  test('labels a partially paid treatment', () => {
    assert.deepEqual(getPaymentStatusPresentation('parcialmente_pagado'), {
      label: 'Parcialmente Pagado',
      tone: 'parcialmente_pagado',
    });
  });

  test('labels an unpaid treatment', () => {
    assert.deepEqual(getPaymentStatusPresentation('pendiente'), {
      label: 'Pendiente',
      tone: 'pendiente',
    });
  });
});

describe('getTreatmentItemCount', () => {
  test('counts performed and inventory treatments together', () => {
    assert.equal(
      getTreatmentItemCount({
        tratamientos_realizados: [{ id: 'a' }, { id: 'b' }],
        tratamientos_inventario: [{ id: 'c' }],
      }),
      3,
    );
  });

  test('returns zero when there are no treatments', () => {
    assert.equal(getTreatmentItemCount({}), 0);
    assert.equal(
      getTreatmentItemCount({ tratamientos_realizados: [], tratamientos_inventario: [] }),
      0,
    );
  });
});
