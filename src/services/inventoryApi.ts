import type { ItemInput, MovementInput } from '../lib/inventory/domain';
import type { InventarioItem, MovimientoInventario } from '../types/inventario';

type JsonRecord = Record<string, unknown>;

export class InventoryApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'InventoryApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(
  url: string,
  init: RequestInit = {},
  fetcher: typeof fetch = globalThis.fetch
): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (init.body !== undefined && init.body !== null && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetcher(url, { ...init, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const body = payload as { error?: string; message?: string } | null;
    const message = body?.message || body?.error || response.statusText || 'Request failed';
    throw new InventoryApiError(message, response.status);
  }

  return payload as T;
}

export interface MovementQuery {
  inventario_id?: string;
  insumo_id?: string;
  tipo?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

function movementQuery(params: MovementQuery): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function itemUrl(id: string): string {
  return `/api/inventario?id=${encodeURIComponent(id)}`;
}

function resourceUrl(path: string, id?: string): string {
  return id ? `${path}?id=${encodeURIComponent(id)}` : path;
}

export const inventoryApi = {
  listItems(activeOnly: boolean = false): Promise<InventarioItem[]> {
    return apiRequest(`/api/inventario${activeOnly ? '?activeOnly=true' : ''}`);
  },

  createItem(input: ItemInput): Promise<InventarioItem> {
    return apiRequest('/api/inventario', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateItem(id: string, patch: JsonRecord): Promise<InventarioItem> {
    return apiRequest(itemUrl(id), {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteItem(id: string): Promise<void> {
    return apiRequest(itemUrl(id), { method: 'DELETE' });
  },

  listMovements(params: MovementQuery = {}): Promise<MovimientoInventario[]> {
    return apiRequest(`/api/inventario/movimientos${movementQuery(params)}`);
  },

  addMovement(input: MovementInput): Promise<MovimientoInventario> {
    return apiRequest('/api/inventario/movimientos', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  addStock(input: Omit<MovementInput, 'tipo'>): Promise<MovimientoInventario> {
    return apiRequest('/api/inventario/movimientos', {
      method: 'POST',
      body: JSON.stringify({ ...input, tipo: 'entrada' }),
    });
  },

  listBrands(): Promise<JsonRecord[]> {
    return apiRequest('/api/inventario/marcas');
  },

  createBrand(input: JsonRecord): Promise<JsonRecord> {
    return apiRequest('/api/inventario/marcas', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateBrand(id: string, input: JsonRecord): Promise<JsonRecord> {
    return apiRequest(resourceUrl('/api/inventario/marcas', id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  deleteBrand(id: string): Promise<void> {
    return apiRequest(resourceUrl('/api/inventario/marcas', id), { method: 'DELETE' });
  },

  listSuppliers(): Promise<JsonRecord[]> {
    return apiRequest('/api/inventario/distribuidores');
  },

  createSupplier(input: JsonRecord): Promise<JsonRecord> {
    return apiRequest('/api/inventario/distribuidores', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateSupplier(id: string, input: JsonRecord): Promise<JsonRecord> {
    return apiRequest(resourceUrl('/api/inventario/distribuidores', id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  deleteSupplier(id: string): Promise<void> {
    return apiRequest(resourceUrl('/api/inventario/distribuidores', id), { method: 'DELETE' });
  },

  listCategories(): Promise<JsonRecord[]> {
    return apiRequest('/api/inventario/categorias');
  },

  createCategory(input: JsonRecord): Promise<JsonRecord> {
    return apiRequest('/api/inventario/categorias', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateCategory(id: string, input: JsonRecord): Promise<JsonRecord> {
    return apiRequest(resourceUrl('/api/inventario/categorias', id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  deleteCategory(id: string): Promise<void> {
    return apiRequest(resourceUrl('/api/inventario/categorias', id), { method: 'DELETE' });
  },

  uploadImage(file: File): Promise<{ url: string }> {
    const body = new FormData();
    body.append('file', file);
    return apiRequest('/api/inventario/upload-image', { method: 'POST', body });
  },
};
