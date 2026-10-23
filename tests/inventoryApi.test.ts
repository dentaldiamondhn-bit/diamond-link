import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, InventoryApiError } from '../src/services/inventoryApi.ts';

describe('apiRequest', () => {
  test('returns parsed JSON on success', async () => {
    const fakeFetch = async () => new Response(JSON.stringify([{ id: '1' }]), { status: 200 });
    const data = await apiRequest('/api/inventario', {}, fakeFetch as any);
    assert.deepEqual(data, [{ id: '1' }]);
  });

  test('throws InventoryApiError with the server message and status', async () => {
    const fakeFetch = async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    await assert.rejects(
      () => apiRequest('/api/inventario', {}, fakeFetch as any),
      (error: any) => error instanceof InventoryApiError && error.status === 403 && error.message === 'Forbidden'
    );
  });

  test('returns undefined for 204', async () => {
    const fakeFetch = async () => new Response(null, { status: 204 });
    assert.equal(await apiRequest('/api/inventario?id=1', { method: 'DELETE' }, fakeFetch as any), undefined);
  });
});
