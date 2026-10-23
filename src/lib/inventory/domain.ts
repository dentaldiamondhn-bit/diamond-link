export type MovementType = 'entrada' | 'salida';

export interface ItemInput {
  codigo: string | null;
  nombre: string;
  precio: number;
  precio_compra: number;
  fecha_compra: string | null;
  moneda: string;
  marca_id: string | null;
  marca: string | null;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string | null;
  imagen_url: string | null;
  activo: boolean;
}

export interface MovementInput {
  inventario_id: string;
  tipo: MovementType;
  cantidad: number;
  precio_unitario: number | null;
  notas: string | null;
  created_by: string | null;
  precio: number | null;
  precio_compra: number | null;
  fecha_compra: string | null;
}

export class InventoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryValidationError';
  }
}

const INVENTORY_MUTABLE_FIELDS = [
  'insumo_id',
  'marca_id',
  'codigo',
  'nombre',
  'precio',
  'precio_compra',
  'fecha_compra',
  'moneda',
  'marca',
  'stock_actual',
  'stock_minimo',
  'ubicacion',
  'imagen_url',
  'activo',
] as const;

const STRING_FIELDS = new Set([
  'insumo_id',
  'marca_id',
  'codigo',
  'fecha_compra',
  'marca',
  'ubicacion',
  'imagen_url',
]);

const NUMBER_FIELDS = new Set(['precio', 'precio_compra', 'stock_actual', 'stock_minimo']);

function toFiniteNumber(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new InventoryValidationError(`${field} must be a valid number`);
  }
  return number;
}

function numberOrDefault(value: unknown, fallback: number, field: string): number {
  if (value === undefined || value === null || value === '') return fallback;
  return toFiniteNumber(value, field);
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  return toFiniteNumber(value, field);
}

function nullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function requiredString(value: unknown, field: string): string {
  const text = nullableString(value);
  if (!text) throw new InventoryValidationError(`${field} is required`);
  return text;
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  throw new InventoryValidationError('activo must be a boolean');
}

function nonNegativeNumber(value: unknown, fallback: number, field: string): number {
  const number = numberOrDefault(value, fallback, field);
  if (number < 0) throw new InventoryValidationError(`${field} cannot be negative`);
  return number;
}

function nonNegativeInteger(value: unknown, fallback: number, field: string): number {
  return Math.trunc(nonNegativeNumber(value, fallback, field));
}

export function stockAfterMovement(current: number, type: MovementType, quantity: number): number {
  const base = Number.isFinite(current) ? Math.trunc(current) : 0;
  const requested = Number.isFinite(quantity) ? Math.trunc(quantity) : 0;
  const amount = requested > 0 ? requested : 0;
  const next = type === 'entrada' ? base + amount : base - amount;
  return Math.max(0, next);
}

export function isLowStock(item: { stock_actual: number; stock_minimo: number }): boolean {
  return item.stock_actual <= item.stock_minimo;
}

export function inventoryValuation(
  items: Array<{
    stock_actual: number;
    precio?: number | null;
    precio_compra?: number | null;
    insumo?: { precio?: number | null } | null;
  }>
): { cost: number; retail: number } {
  return items.reduce(
    (totals, item) => {
      const stock = Number.isFinite(item.stock_actual) ? item.stock_actual : 0;
      const costPrice = item.precio_compra ?? 0;
      const retailPrice = item.precio ?? item.insumo?.precio ?? 0;
      return {
        cost: totals.cost + costPrice * stock,
        retail: totals.retail + retailPrice * stock,
      };
    },
    { cost: 0, retail: 0 }
  );
}

export function mergeInventoryPatch<T extends { id?: string; created_at?: string }>(
  existing: T,
  patch: Record<string, unknown>
): T {
  const merged = { ...existing } as Record<string, unknown>;
  for (const field of INVENTORY_MUTABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field) && patch[field] !== undefined) {
      merged[field] = patch[field];
    }
  }
  return merged as T;
}

export function isInventoryRole(role: string | null | undefined): boolean {
  if (typeof role !== 'string') return false;
  const r = role.trim().toLowerCase();
  return ['admin', 'tech_support', 'administrador', 'superadmin', 'owner'].includes(r);
}

export function parseItemInput(raw: Record<string, unknown>): ItemInput {
  return {
    codigo: nullableString(raw.codigo),
    nombre: requiredString(raw.nombre, 'nombre'),
    precio: nonNegativeNumber(raw.precio, 0, 'precio'),
    precio_compra: nonNegativeNumber(raw.precio_compra, 0, 'precio_compra'),
    fecha_compra: nullableString(raw.fecha_compra),
    moneda: (nullableString(raw.moneda) ?? 'HNL').toUpperCase(),
    marca_id: nullableString(raw.marca_id),
    marca: nullableString(raw.marca),
    stock_actual: nonNegativeInteger(raw.stock_actual, 0, 'stock_actual'),
    stock_minimo: nonNegativeInteger(raw.stock_minimo, 5, 'stock_minimo'),
    ubicacion: nullableString(raw.ubicacion),
    imagen_url: nullableString(raw.imagen_url),
    activo: booleanOrDefault(raw.activo, true),
  };
}

export function parseItemPatch(raw: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  for (const field of INVENTORY_MUTABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(raw, field) || raw[field] === undefined) continue;
    const value = raw[field];

    if (field === 'nombre') {
      patch[field] = requiredString(value, 'nombre');
    } else if (field === 'activo') {
      patch[field] = booleanOrDefault(value, true);
    } else if (field === 'moneda') {
      patch[field] = (nullableString(value) ?? 'HNL').toUpperCase();
    } else if (NUMBER_FIELDS.has(field)) {
      const number = nonNegativeNumber(value, 0, field);
      patch[field] = field === 'stock_actual' || field === 'stock_minimo' ? Math.trunc(number) : number;
    } else if (STRING_FIELDS.has(field)) {
      patch[field] = nullableString(value);
    }
  }

  return patch;
}

export function parseMovementInput(raw: Record<string, unknown>): MovementInput {
  const inventarioId = requiredString(raw.inventario_id, 'inventario_id');
  const tipo = requiredString(raw.tipo, 'tipo').toLowerCase();

  if (tipo !== 'entrada' && tipo !== 'salida') {
    throw new InventoryValidationError('tipo must be entrada or salida');
  }

  const cantidad = toFiniteNumber(raw.cantidad, 'cantidad');
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new InventoryValidationError('cantidad must be an integer greater than zero');
  }

  const precioUnitario = nullableNumber(raw.precio_unitario, 'precio_unitario');
  const precio = nullableNumber(raw.precio, 'precio');
  const precioCompra = nullableNumber(raw.precio_compra, 'precio_compra');

  for (const [field, value] of [
    ['precio_unitario', precioUnitario],
    ['precio', precio],
    ['precio_compra', precioCompra],
  ] as const) {
    if (value !== null && value < 0) {
      throw new InventoryValidationError(`${field} cannot be negative`);
    }
  }

  return {
    inventario_id: inventarioId,
    tipo,
    cantidad,
    precio_unitario: precioUnitario,
    notas: nullableString(raw.notas),
    created_by: nullableString(raw.created_by),
    precio,
    precio_compra: precioCompra,
    fecha_compra: nullableString(raw.fecha_compra),
  };
}
