import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stockAfterMovement,
  isLowStock,
  inventoryValuation,
  mergeInventoryPatch,
  isInventoryRole,
  parseItemInput,
  parseItemPatch,
  parseMovementInput,
  InventoryValidationError,
} from '../src/lib/inventory/domain.ts';

describe('stockAfterMovement', () => {
  test('adds entries and subtracts exits', () => {
    assert.equal(stockAfterMovement(10, 'entrada', 5), 15);
    assert.equal(stockAfterMovement(10, 'salida', 5), 5);
  });

  test('never goes below zero and truncates quantities', () => {
    assert.equal(stockAfterMovement(2, 'salida', 10), 0);
    assert.equal(stockAfterMovement(2, 'entrada', 2.9), 4);
    assert.equal(stockAfterMovement(2, 'entrada', -5), 2);
  });
});

describe('isLowStock', () => {
  test('is true at or below the minimum', () => {
    assert.equal(isLowStock({ stock_actual: 5, stock_minimo: 5 }), true);
    assert.equal(isLowStock({ stock_actual: 4, stock_minimo: 5 }), true);
    assert.equal(isLowStock({ stock_actual: 6, stock_minimo: 5 }), false);
  });
});

describe('inventoryValuation', () => {
  test('separates cost and retail value and falls back to insumo price', () => {
    const result = inventoryValuation([
      { stock_actual: 2, precio: 100, precio_compra: 60 },
      { stock_actual: 3, insumo: { precio: 20 } },
      { stock_actual: 1, precio: null, precio_compra: null },
    ]);
    assert.deepEqual(result, { cost: 120, retail: 260 });
  });
});

describe('mergeInventoryPatch', () => {
  const existing = {
    id: 'item-1',
    created_at: '2026-01-01',
    nombre: 'Guantes',
    stock_actual: 9,
    precio: 10,
    ubicacion: 'A1',
  };

  test('preserves omitted fields, including stock', () => {
    const merged = mergeInventoryPatch(existing, { precio: 12 });
    assert.equal(merged.stock_actual, 9);
    assert.equal(merged.nombre, 'Guantes');
    assert.equal(merged.precio, 12);
  });

  test('applies explicit zero and null but ignores id/created_at', () => {
    const merged = mergeInventoryPatch(existing, {
      stock_actual: 0,
      ubicacion: null,
      id: 'hacked',
      created_at: 'x',
    });
    assert.equal(merged.stock_actual, 0);
    assert.equal(merged.ubicacion, null);
    assert.equal(merged.id, 'item-1');
    assert.equal(merged.created_at, '2026-01-01');
  });
});

describe('isInventoryRole', () => {
  test('allows admin and tech_support only', () => {
    assert.equal(isInventoryRole('admin'), true);
    assert.equal(isInventoryRole('TECH_SUPPORT'), true);
    assert.equal(isInventoryRole('doctor'), false);
    assert.equal(isInventoryRole(null), false);
  });
});

describe('input parsing', () => {
  test('rejects an empty item name', () => {
    assert.throws(() => parseItemInput({ nombre: '  ' }), InventoryValidationError);
  });

  test('normalizes item defaults', () => {
    const item = parseItemInput({ nombre: '  Guantes  ', precio: '5', stock_actual: '3' });
    assert.equal(item.nombre, 'Guantes');
    assert.equal(item.precio, 5);
    assert.equal(item.stock_actual, 3);
    assert.equal(item.moneda, 'HNL');
    assert.equal(item.activo, true);
  });

  test('rejects non-positive movements', () => {
    assert.throws(
      () => parseMovementInput({ inventario_id: 'x', tipo: 'entrada', cantidad: 0 }),
      InventoryValidationError
    );
    assert.throws(
      () => parseMovementInput({ inventario_id: 'x', tipo: 'otro', cantidad: 1 }),
      InventoryValidationError
    );
  });

  test('accepts optional price fields on a movement', () => {
    const movement = parseMovementInput({
      inventario_id: 'item-1',
      tipo: 'entrada',
      cantidad: 2,
      precio: 15,
      precio_compra: 9,
      fecha_compra: '2026-10-22',
    });
    assert.equal(movement.precio, 15);
    assert.equal(movement.precio_compra, 9);
  });

  test('parseItemPatch only keeps mutable keys and rejects bad numbers', () => {
    const patch = parseItemPatch({ precio: 8, id: 'nope', stock_actual: '4' });
    assert.deepEqual(patch, { precio: 8, stock_actual: 4 });
    assert.throws(() => parseItemPatch({ stock_actual: -1 }), InventoryValidationError);
  });
});
