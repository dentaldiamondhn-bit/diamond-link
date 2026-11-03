import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  comparePaymentStatus,
  paymentStatusFor,
} from '../src/lib/treatments/completedTreatmentSort.ts';

describe('paymentStatusFor', () => {
  test('treats a fully paid treatment as paid', () => {
    assert.equal(paymentStatusFor(1000, 1000), 'pagado');
    assert.equal(paymentStatusFor(1000, 1500), 'pagado');
  });

  test('treats a zero total as paid', () => {
    assert.equal(paymentStatusFor(0, 0), 'pagado');
    assert.equal(paymentStatusFor(null, null), 'pagado');
  });

  test('treats a partially paid treatment as partially paid', () => {
    assert.equal(paymentStatusFor(1000, 400), 'parcialmente_pagado');
  });

  test('treats an unpaid treatment as pending', () => {
    assert.equal(paymentStatusFor(1000, 0), 'pendiente');
  });

  test('accepts numeric strings', () => {
    assert.equal(paymentStatusFor('1000', '400'), 'parcialmente_pagado');
    assert.equal(paymentStatusFor('1000', '1000'), 'pagado');
  });
});

describe('comparePaymentStatus', () => {
  test('orders pending before partial before paid when ascending', () => {
    assert.ok(comparePaymentStatus('pendiente', 'parcialmente_pagado', 'asc') < 0);
    assert.ok(comparePaymentStatus('parcialmente_pagado', 'pagado', 'asc') < 0);
    assert.equal(comparePaymentStatus('pagado', 'pagado', 'asc'), 0);
  });

  test('reverses the order when descending', () => {
    assert.ok(comparePaymentStatus('pendiente', 'parcialmente_pagado', 'desc') > 0);
    assert.ok(comparePaymentStatus('pagado', 'pendiente', 'desc') < 0);
  });
});
