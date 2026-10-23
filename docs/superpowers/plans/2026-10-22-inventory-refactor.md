# Inventory Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 1,482-line inventory page with a modular tab/modal structure and fix the stock, partial-update, audit-history, and valuation defects found during analysis.

**Architecture:** Pure inventory rules live in `src/lib/inventory/domain.ts`; server data access stays in `src/services/inventarioService.ts` but moves to a service-role Supabase client behind Clerk authorization. Stock mutations become one PostgreSQL RPC transaction that updates stock, prices, and the movement row together. The page becomes an orchestrator over route-colocated tabs/modals, with a typed client wrapper in `src/services/inventoryApi.ts`.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript 5.9, Tailwind CSS 3, Supabase (`@supabase/supabase-js`), Clerk, Node's built-in test runner.

**Spec:** User-provided inventory skeleton (conversation, 2026-10-22) plus the inventory analysis in the same conversation. The skeleton's `/api/marcas` and `{ data }` assumptions are intentionally adapted to the existing `/api/inventario/*` raw-array API.

## Global Constraints

- Preserve all user-facing Spanish copy and the existing `/inventario` route.
- Do not add dependencies. Use the existing `node:test` runner.
- Do not import `createServiceClient` or `SUPABASE_SERVICE_ROLE_KEY` into any `'use client'` file.
- Keep existing endpoints and response shapes (`GET /api/inventario` returns an array) so other callers do not break.
- The `/inventario` page and all master-data/item writes are restricted to `admin` and `tech_support`. Reads of inventory items and stock-exit movements require only a signed-in user, because the completed-treatment form uses them.
- Do not tighten RLS in this plan: `completedTreatmentService` still uses the anon client from client components. RLS hardening is a separate follow-up.
- Do not commit unless the user explicitly asks.
- Verify with `npm test`, `npx tsc --noEmit`, and `npm run lint:check`.

## Review Focus

- Omitting `stock_actual` in an update must preserve the stored stock; only an explicit value changes it.
- A stock movement for a missing or deleted item must fail with a clear 404/400, never silently do nothing.
- Two concurrent movements must both be reflected (row lock inside one transaction).
- Deleting an item must retain its prior movements and deletion audit row.
- An unauthenticated request must receive 401 before touching inventory data; master-data writes must additionally require admin/tech_support.
- Completing a treatment with inventory items must decrement stock exactly once, not once in the service and again from the page.

---

### Task 1: Pure inventory domain rules and validation

**Files:**
- Create: `src/lib/inventory/domain.ts`
- Test: `tests/inventoryDomain.test.ts`

**Interfaces:**
- Produces:
  - `type MovementType = 'entrada' | 'salida'`
  - `interface ItemInput { codigo: string | null; nombre: string; precio: number; precio_compra: number; fecha_compra: string | null; moneda: string; marca_id: string | null; marca: string | null; stock_actual: number; stock_minimo: number; ubicacion: string | null; imagen_url: string | null; activo: boolean }`
  - `interface MovementInput { inventario_id: string; tipo: MovementType; cantidad: number; precio_unitario: number | null; notas: string | null; created_by: string | null; precio: number | null; precio_compra: number | null; fecha_compra: string | null }`
  - `class InventoryValidationError extends Error`
  - `stockAfterMovement(current: number, type: MovementType, quantity: number): number`
  - `isLowStock(item: { stock_actual: number; stock_minimo: number }): boolean`
  - `inventoryValuation(items: Array<{ stock_actual: number; precio?: number | null; precio_compra?: number | null; insumo?: { precio?: number | null } | null }>): { cost: number; retail: number }`
  - `mergeInventoryPatch<T extends { id?: string; created_at?: string }>(existing: T, patch: Record<string, unknown>): T`
  - `isInventoryRole(role: string | null | undefined): boolean`
  - `parseItemInput(raw: Record<string, unknown>): ItemInput`
  - `parseItemPatch(raw: Record<string, unknown>): Record<string, unknown>`
  - `parseMovementInput(raw: Record<string, unknown>): MovementInput`

- [ ] **Step 1: Write the failing domain tests**

Create `tests/inventoryDomain.test.ts` with these cases:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stockAfterMovement, isLowStock, inventoryValuation, mergeInventoryPatch,
  isInventoryRole, parseItemInput, parseItemPatch, parseMovementInput,
  InventoryValidationError
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
  const existing = { id: 'item-1', created_at: '2026-01-01', nombre: 'Guantes', stock_actual: 9, precio: 10, ubicacion: 'A1' };
  test('preserves omitted fields, including stock', () => {
    const merged = mergeInventoryPatch(existing, { precio: 12 });
    assert.equal(merged.stock_actual, 9);
    assert.equal(merged.nombre, 'Guantes');
    assert.equal(merged.precio, 12);
  });
  test('applies explicit zero and null but ignores id/created_at', () => {
    const merged = mergeInventoryPatch(existing, { stock_actual: 0, ubicacion: null, id: 'hacked', created_at: 'x' });
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
    assert.throws(() => parseMovementInput({ inventario_id: 'x', tipo: 'entrada', cantidad: 0 }), InventoryValidationError);
    assert.throws(() => parseMovementInput({ inventario_id: 'x', tipo: 'otro', cantidad: 1 }), InventoryValidationError);
  });
  test('accepts optional price fields on a movement', () => {
    const movement = parseMovementInput({
      inventario_id: 'item-1', tipo: 'entrada', cantidad: 2,
      precio: 15, precio_compra: 9, fecha_compra: '2026-10-22'
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/inventoryDomain.test.ts`
Expected: FAIL because `../src/lib/inventory/domain.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/inventory/domain.ts`**

Rules the implementation must follow:
- `stockAfterMovement` coerces non-finite numbers to 0, truncates quantity, treats a non-positive quantity as 0, and floors the resulting stock at 0.
- `isLowStock` uses `<=` (the skeleton's definition).
- `inventoryValuation` sums `precio_compra * stock_actual` for cost and `(precio ?? insumo?.precio ?? 0) * stock_actual` for retail.
- `mergeInventoryPatch` iterates only `INVENTORY_MUTABLE_FIELDS = ['insumo_id','marca_id','codigo','nombre','precio','precio_compra','fecha_compra','moneda','marca','stock_actual','stock_minimo','ubicacion','imagen_url','activo']`, copying keys whose value is not `undefined`. Never copy `id`, `created_at`, or `updated_at`.
- `parseItemInput` trims `nombre`, throws when empty, coerces numeric fields, defaults `moneda` to `'HNL'`, `activo` to `true`, and `stock_minimo` to 5.
- `parseItemPatch` validates only provided mutable keys and rejects negative stock/prices.
- `parseMovementInput` requires a non-empty `inventario_id`, `tipo` in `entrada|salida`, and an integer `cantidad > 0`; optional price fields become `null` when absent.
- `isInventoryRole` lowercases and compares against `['admin', 'tech_support']`.

- [ ] **Step 4: Run the domain tests and full suite**

Run: `node --test tests/inventoryDomain.test.ts`
Expected: PASS.

Run: `npm test`
Expected: existing payment tests plus new domain tests pass.

---

### Task 2: Database integrity migration and atomic movement RPC

**Files:**
- Create: `database/migrations/20261022_inventory_integrity.sql`

**Interfaces:**
- Produces SQL function:
  - `register_inventory_movement(p_inventario_id uuid, p_tipo text, p_cantidad integer, p_precio_unitario numeric, p_notas text, p_created_by uuid, p_precio numeric, p_precio_compra numeric, p_fecha_compra date) returns movimientos_inventario`
- Changes FK:
  - `movimientos_inventario.inventario_id` becomes `ON DELETE SET NULL`.

- [ ] **Step 1: Write the migration**

The migration must contain, in order:

```sql
-- Preserve movement/audit history when an inventory item is deleted.
ALTER TABLE movimientos_inventario
  DROP CONSTRAINT IF EXISTS movimientos_inventario_inventario_id_fkey;
ALTER TABLE movimientos_inventario
  ADD CONSTRAINT movimientos_inventario_inventario_id_fkey
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE SET NULL;

-- One transaction: lock the item, update stock and optional prices, insert movement.
CREATE OR REPLACE FUNCTION register_inventory_movement(
  p_inventario_id UUID,
  p_tipo TEXT,
  p_cantidad INTEGER,
  p_precio_unitario DECIMAL(10,2) DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_precio DECIMAL(10,2) DEFAULT NULL,
  p_precio_compra DECIMAL(10,2) DEFAULT NULL,
  p_fecha_compra DATE DEFAULT NULL
) RETURNS movimientos_inventario
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
  v_movement movimientos_inventario;
BEGIN
  IF p_tipo NOT IN ('entrada', 'salida') THEN
    RAISE EXCEPTION 'invalid movement type: %', p_tipo;
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'cantidad must be greater than zero';
  END IF;

  SELECT stock_actual INTO v_current
  FROM inventario WHERE id = p_inventario_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory item not found: %', p_inventario_id;
  END IF;

  v_new := CASE
    WHEN p_tipo = 'entrada' THEN GREATEST(0, v_current) + p_cantidad
    ELSE GREATEST(0, GREATEST(0, v_current) - p_cantidad)
  END;

  UPDATE inventario
  SET stock_actual = v_new,
      precio = COALESCE(p_precio, precio),
      precio_compra = COALESCE(p_precio_compra, precio_compra),
      fecha_compra = COALESCE(p_fecha_compra, fecha_compra),
      updated_at = NOW()
  WHERE id = p_inventario_id;

  INSERT INTO movimientos_inventario (
    inventario_id, tipo, cantidad, precio_unitario, notas, created_by,
    accion, entidad_tipo, created_at
  ) VALUES (
    p_inventario_id, p_tipo, p_cantidad, p_precio_unitario, p_notas, p_created_by,
    CASE WHEN p_tipo = 'entrada' THEN 'entrada_stock' ELSE 'salida_stock' END,
    'inventario', NOW()
  ) RETURNING * INTO v_movement;

  RETURN v_movement;
END;
$$;

REVOKE ALL ON FUNCTION register_inventory_movement(
  UUID, TEXT, INTEGER, DECIMAL, TEXT, UUID, DECIMAL, DECIMAL, DATE
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_inventory_movement(
  UUID, TEXT, INTEGER, DECIMAL, TEXT, UUID, DECIMAL, DECIMAL, DATE
) TO anon, authenticated, service_role;
```

The `anon` and `authenticated` grants are required because `completedTreatmentService` calls the RPC from client-side code today. The inventory tables themselves are already anon-writable, so this does not broaden access; it keeps the existing treatment flow working until RLS is hardened in a separate project.

- [ ] **Step 2: Apply the migration**

Apply through the Supabase SQL editor or the project's migration runner against the target project. Do not run it against production without the user's confirmation.

- [ ] **Step 3: Verify the schema**

Run in the Supabase SQL editor:

```sql
SELECT confdeltype FROM pg_constraint
WHERE conname = 'movimientos_inventario_inventario_id_fkey';
-- expect: n (SET NULL)

SELECT proname FROM pg_proc
WHERE proname = 'register_inventory_movement';
-- expect: one row
```

---

### Task 3: Server-side inventory authorization

**Files:**
- Create: `src/lib/inventoryAuth.ts`

**Interfaces:**
- Consumes: `isInventoryRole` from `src/lib/inventory/domain.ts` (already tested in Task 1), `getCalendarSession` from `src/lib/calendarAuth.ts`.
- Produces:
  - `authorizeAuthenticated(): Promise<{ ok: true; userId: string; role: string } | { ok: false; response: NextResponse }>`
  - `authorizeInventory(): Promise<{ ok: true; userId: string; role: string } | { ok: false; response: NextResponse }>`

- [ ] **Step 1: Implement `src/lib/inventoryAuth.ts`**

Use `getCalendarSession()` so the existing `TECH_SUPPORT_USER_IDS` superuser override is preserved. Both helpers return `401 { error: 'Unauthorized' }` when the session is null. `authorizeInventory` additionally returns `403 { error: 'Forbidden' }` when `isInventoryRole(session.role)` is false. `authorizeAuthenticated` returns any signed-in user.

Why both: `/inventario` is restricted to admin/tech_support, but the completed-treatment form (available to other roles) reads `GET /api/inventario` and posts stock exits. Master-data writes stay admin/tech_support only.

- [ ] **Step 2: Typecheck the helper**

Run: `npx tsc --noEmit`
Expected: no errors in `src/lib/inventoryAuth.ts`.

---

### Task 4: Service layer uses the service-role client and atomic RPC

**Files:**
- Modify: `src/services/inventarioService.ts`
- Modify: `src/types/inventario.ts`
- Test covered by Task 1 domain tests.

**Interfaces:**
- Consumes: Task 1 domain functions, Task 2 RPC.
- Produces:
  - `getInventario(activeOnly?: boolean): Promise<InventarioItem[]>`
  - `updateInventario(id: string, patch: Record<string, unknown>): Promise<InventarioItem | null>`
  - `upsertInventario(item: ItemInput & { id?: string }): Promise<InventarioItem>`
  - `registrarMovimiento(mov: MovementInput): Promise<MovimientoInventario>`
  - existing marca/distribuidor/categoria methods keep their signatures.

- [ ] **Step 1: Switch the Supabase client**

Add `import 'server-only';` at the top so this module can never be bundled into a client component. Replace the import of the anon `supabase` singleton with `createServiceClient` from `../lib/supabase`. Create one lazy module-level client:

```ts
let db: ReturnType<typeof createServiceClient> | null = null;
function getDb() {
  if (!db) db = createServiceClient();
  return db;
}
```

Replace every `supabase.from(...)` / `supabase.storage(...)` / `supabase.rpc(...)` with `getDb()`.

- [ ] **Step 2: Make updates partial-safe**

Add `updateInventario(id, patch)`:
1. `parseItemPatch(patch)`.
2. Fetch the existing row (`select('*')`).
3. Return `null` if not found.
4. Call `mergeInventoryPatch(existing, parsedPatch)`.
5. Update only the provided mutable keys plus `updated_at`; never write the merged full object.
6. Update the linked `insumos` row only when `insumo_id` exists and `codigo`, `nombre`, `precio`, `moneda`, or `activo` changed.
7. Log `item_editado`.

Change `upsertInventario` so that when `item.id` is present it delegates to `updateInventario(item.id, item)`; otherwise it creates a new row with defaults from `parseItemInput`. Keep the legacy `insumos` creation for new items but skip the lookup when `codigo` is empty.

- [ ] **Step 3: Replace stock mutation with the RPC**

`registrarMovimiento` must:

```ts
const { data, error } = await getDb().rpc('register_inventory_movement', {
  p_inventario_id: mov.inventario_id,
  p_tipo: mov.tipo,
  p_cantidad: mov.cantidad,
  p_precio_unitario: mov.precio_unitario ?? null,
  p_notas: mov.notas ?? null,
  p_created_by: mov.created_by ?? null,
  p_precio: mov.precio ?? null,
  p_precio_compra: mov.precio_compra ?? null,
  p_fecha_compra: mov.fecha_compra ?? null,
});
if (error) throw new Error(error.message);
return data;
```

Remove the old read-modify-write `updateStock` helper and all fallback inserts. A missing RPC must surface as an error, not silently update stock.

- [ ] **Step 4: Stop swallowing read errors**

`getInventario`, `getMovimientos`, `getMarcas`, `getDistribuidores`, and `getStockBajo` must throw on Supabase errors. The API client and page now display errors. Keep `getStockBajo` and `getValorTotalInventario` implemented with the Task 1 domain helpers (`isLowStock`, `inventoryValuation`) so their results match the UI.

- [ ] **Step 5: Preserve audit history on delete**

Keep `deleteInventario`'s image and legacy-insumo cleanup, but do not delete `movimientos_inventario` rows manually. The Task 2 FK changes `inventario_id` to `NULL` automatically. Await `registrarActividad` before deleting the item so the audit insert still sees a valid FK target. Before deleting the linked `insumo`, check whether another `inventario` row references it; if so, skip the legacy delete.

- [ ] **Step 6: Update the movement join for currency**

Add `moneda` to the `inventario(...)` select used by `getMovimientos` and to `MovimientoInventario['inventario']` in `src/types/inventario.ts`, so the UI can format movement prices with the item currency.

---

### Task 5: Route handlers enforce auth and expose safe PATCH

**Files:**
- Modify: `app/api/inventario/route.ts`
- Modify: `app/api/inventario/movimientos/route.ts`
- Modify: `app/api/inventario/marcas/route.ts`
- Modify: `app/api/inventario/distribuidores/route.ts`
- Modify: `app/api/inventario/categorias/route.ts`
- Modify: `app/api/inventario/upload-image/route.ts`

**Interfaces:**
- Consumes: `authorizeAuthenticated`, `authorizeInventory`, `parseItemInput`, `parseItemPatch`, `parseMovementInput`.
- Produces: same URL surface plus `PATCH /api/inventario?id=<uuid>`.

- [ ] **Step 1: Apply the role split**

Use `authorizeAuthenticated` for:
- `GET /api/inventario` (completed-treatment form needs it)
- `POST /api/inventario/movimientos` (completed-treatment form needs it)
- `GET` handlers for marcas, distribuidores, categorias

Use `authorizeInventory` (admin/tech_support) for:
- `POST`, `PUT`, `PATCH`, `DELETE /api/inventario`
- `GET /api/inventario/movimientos`
- `POST`/`PUT`/`DELETE` for marcas, distribuidores, categorias
- `POST /api/inventario/upload-image`

Every handler starts with the matching guard: `const auth = await ...; if (!auth.ok) return auth.response;`.

- [ ] **Step 2: Validate input**

In `/api/inventario`:
- `POST` uses `parseItemInput(await request.json())`.
- `PUT` and `PATCH` use `parseItemPatch(await request.json())`.
- Return `400 { error, message }` for `InventoryValidationError`.
- Return `404` when updating or deleting a missing item.
- `GET` returns `Cache-Control: no-store`.

In `/api/inventario/movimientos`:
- `POST` uses `parseMovementInput`.
- Return `400` for validation errors and `404` when the RPC reports a missing item.
- `GET` returns `Cache-Control: no-store`.

- [ ] **Step 3: Add PATCH**

`PATCH /api/inventario?id=...` calls `updateInventario(id, body)` and returns the updated row. Do not reuse the old full-object defaults for partial updates.

- [ ] **Step 4: Uploads**

`upload-image` uses `authorizeInventory`, `createServiceClient`, and rejects files larger than 5 MB or files whose `type` does not start with `image/`.

- [ ] **Step 5: Verify with curl against a local dev server**

Run `npm run dev`, then from another shell:

```bash
curl -i http://localhost:3000/api/inventario
# expect 401 without a Clerk session

curl -i -X PATCH 'http://localhost:3000/api/inventario?id=00000000-0000-0000-0000-000000000000' \
  -H 'Content-Type: application/json' -d '{"precio":10}'
# expect 401 without a Clerk session (not 500)
```

Authenticated checks require a browser session; verify those manually in Task 11.

---

### Task 6: Typed client API wrapper

**Files:**
- Create: `src/services/inventoryApi.ts`
- Test: `tests/inventoryApi.test.ts`

**Interfaces:**
- Produces:
  - `class InventoryApiError extends Error { status: number }`
  - `apiRequest<T>(url: string, init?: RequestInit, fetcher?: typeof fetch): Promise<T>`
  - `inventoryApi` with:
    - Items: `listItems`, `createItem`, `updateItem`, `deleteItem`
    - Movements: `listMovements`, `addMovement` (`addStock` is `addMovement({ tipo: 'entrada', ... })`)
    - Brands: `listBrands`, `createBrand`, `updateBrand`, `deleteBrand`
    - Suppliers: `listSuppliers`, `createSupplier`, `updateSupplier`, `deleteSupplier`
    - Categories: `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`
    - Uploads: `uploadImage`

- [ ] **Step 1: Write the failing wrapper tests**

Create `tests/inventoryApi.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it and confirm failure**

Run: `node --test tests/inventoryApi.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the wrapper**

`apiRequest` sets `Content-Type: application/json` only when a body is present, parses `{ error, message }` for failures, and throws `InventoryApiError`. All methods call the existing endpoints and return raw arrays/objects; do not expect a `{ data }` envelope.

- [ ] **Step 4: Run the wrapper tests**

Run: `node --test tests/inventoryApi.test.ts`
Expected: PASS.

---

### Task 7: Split the page into an orchestrator plus tabs

**Files:**
- Modify: `app/(auth)/inventario/page.tsx` (replace contents)
- Create: `app/(auth)/inventario/components/HeaderActions.tsx`
- Create: `app/(auth)/inventario/components/tabs/ItemsTab.tsx`
- Create: `app/(auth)/inventario/components/tabs/MovementsTab.tsx`
- Create: `app/(auth)/inventario/components/tabs/ReportsTab.tsx`
- Create: `app/(auth)/inventario/components/tabs/BrandsTab.tsx`
- Create: `app/(auth)/inventario/components/tabs/DistributorsTab.tsx`

**Interfaces:**
- Consumes: `inventoryApi`, `InventarioItem`, `MovimientoInventario`, `InventarioCard`, `MarcasTab`, `DistribuidoresTab`.
- Produces: tabs with these props:
  - `ItemsTab { items, onEdit, onAddStock, onDelete, refreshing? }`
  - `MovementsTab { movements, items, loading, filters, onFilterChange, onNewMovement }`
  - `ReportsTab { items }`
  - `BrandsTab` and `DistributorsTab` keep their existing self-loading behavior.

- [ ] **Step 1: Build the orchestrator page**

State: active tab, items, movements, brands, loading, error, movement filters, modal state. On mount call `inventoryApi.listItems()` and `inventoryApi.listBrands()` in parallel. Load movements when the movements tab becomes active or after a mutation. Preserve `useRoleBasedAccess`, `LoadingAnimation`, and `AccessDenied` exactly as they are today.

Render the five tabs in this order: Inventario, Movimientos, Reportes, Marcas, Distribuidores. Keep all Spanish labels.

- [ ] **Step 2: Build `HeaderActions`**

Props: `onOpenNewItem`, `onOpenAddStock`. Render the existing `Nuevo Item` and `Registrar Entrada` buttons only when the active tab is Inventario (pass a `visible` prop or gate in the page).

- [ ] **Step 3: Build `ItemsTab`**

Reuse `InventarioCard` (move it in Task 10). Keep the existing search behavior over nombre/código/marca/ubicación. Add a status filter: `Todos | Stock bajo | Inactivos`. Deletion calls `onDelete(item)`; the page owns the confirm + API call.

- [ ] **Step 4: Build `MovementsTab`**

Move the existing filters and table from the old page. Use `formatCurrency` with `mov.inventario?.moneda ?? 'HNL'` instead of hardcoded HNL. Show `mov.detalle || mov.entidad_nombre || mov.inventario?.nombre || mov.insumo?.nombre || '-'`.

- [ ] **Step 5: Build `ReportsTab`**

Use `inventoryValuation(items)` and `isLowStock` from the domain module. Show three cards: `Valor al costo`, `Valor de venta`, `Items con stock bajo`. The low-stock table uses `isLowStock`, so items exactly at the minimum are included.

- [ ] **Step 6: Add tab wrappers**

`BrandsTab.tsx` renders `<MarcasTab />`; `DistributorsTab.tsx` renders `<DistribuidoresTab />`. These files exist so the page imports only route-local components; Task 10 overwrites them with the moved implementations.

- [ ] **Step 7: Typecheck the split**

Run: `npx tsc --noEmit`
Expected: no new errors in `app/(auth)/inventario/**`.

---

### Task 8: Modals and corrected workflows

**Files:**
- Create: `app/(auth)/inventario/components/modals/ItemFormModal.tsx`
- Create: `app/(auth)/inventario/components/modals/AddStockModal.tsx`
- Create: `app/(auth)/inventario/components/modals/MovementModal.tsx`

**Interfaces:**
- `ItemFormModal { item: InventarioItem | null; brands: Marca[]; onClose(): void; onSaved(): Promise<void> | void }`
- `AddStockModal { item: InventarioItem | null; items: InventarioItem[]; onClose(): void; onSaved(): Promise<void> | void }`
- `MovementModal { items: InventarioItem[]; initialItem?: InventarioItem | null; initialType?: 'entrada' | 'salida'; onClose(): void; onSaved(): Promise<void> | void }`

- [ ] **Step 1: Implement `ItemFormModal`**

Fields: código, nombre, marca (select from brands), precio venta, precio compra, moneda, fecha de compra, stock actual (create only; show read-only on edit), stock mínimo, ubicación, imagen, activo. On brand selection:
- set `marca_id`
- set `marca` to `` `${brand.nombre}${brand.tipo ? ' - ' + brand.tipo : ''}` ``
- set `codigo` from `brand.codigo` only when the code field is empty
- set `nombre` from `brand.nombre` only when the name field is empty
Never set `nombre` from `brand.tipo`.

On save:
- create: `inventoryApi.createItem(payload)`
- edit: `inventoryApi.updateItem(item.id, payload)` where the payload includes only edited fields (at minimum do not send `stock_actual` on edit)
- image upload: `inventoryApi.uploadImage(file)`
- show field-level/server errors inside the modal; do not use `alert`.

- [ ] **Step 2: Implement `AddStockModal`**

Fields: item (select when opened without one), cantidad, precio venta, precio compra, fecha de compra. On submit call exactly one endpoint:

```ts
await inventoryApi.addMovement({
  inventario_id: item.id,
  tipo: 'entrada',
  cantidad,
  precio_unitario: precioCompra || null,
  notas: 'Agregado manualmente',
  precio: precioVenta,
  precio_compra: precioCompra,
  fecha_compra: fechaCompra || null,
});
```

Do not issue a follow-up PUT. The RPC updates stock and prices atomically. If the call fails, keep the modal open and show the error.

- [ ] **Step 3: Implement `MovementModal`**

Fields: item, tipo (entrada/salida), cantidad, precio unitario, notas. Calls `inventoryApi.addMovement`. Disable submit without an item or valid quantity. On success call `onSaved`.

- [ ] **Step 4: Wire modals into the page**

The page owns `selectedItem`, `modal` state, and `onSaved` handlers that refresh items and movements. Deletion uses `confirm()` and `inventoryApi.deleteItem`, then refreshes.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

---

### Task 9: Fix treatment-completion double decrement

**Files:**
- Modify: `src/services/completedTreatmentService.ts`
- Modify: `services/completedTreatmentService.ts` (identical duplicate; keep both in sync)
- Modify: `app/(auth)/tratamientos-completados/new/page.tsx`

**Interfaces:**
- Consumes: Task 2 RPC.
- Produces: one stock decrement per inventory item used in a completed treatment.

- [ ] **Step 1: Replace the service's read-modify-write block**

In both copies of `completedTreatmentService.ts`, inside `createCompletedTreatment`, replace the loop body that currently:
1. selects `stock_actual`
2. computes `Math.max(0, current - cantidad)`
3. updates `inventario`
4. inserts a movement

with one call per item:

```ts
const { error: movementError } = await supabase.rpc('register_inventory_movement', {
  p_inventario_id: inventarioId,
  p_tipo: 'salida',
  p_cantidad: cantidad,
  p_precio_unitario: null,
  p_notas: `Venta: ${invItem.nombre_tratamiento}`,
  p_created_by: null,
  p_precio: null,
  p_precio_compra: null,
  p_fecha_compra: null,
});
if (movementError) {
  console.warn(`Could not register inventory exit for ${inventarioId}:`, movementError);
}
```

Keep the `tratamientos_inventario` insert unchanged.

- [ ] **Step 2: Remove the page-level duplicate**

In `app/(auth)/tratamientos-completados/new/page.tsx`, delete the `decrementInsumosInventory` function and both calls to it (the group-promotion path and the regular path). The service is now the single owner of stock consumption.

- [ ] **Step 3: Verify no duplicate path remains**

Run:

```bash
grep -n "decrementInsumosInventory" app/'(auth)'/tratamientos-completados/new/page.tsx
grep -n "stock_actual - cantidad\|stock_actual = newStock" src/services/completedTreatmentService.ts services/completedTreatmentService.ts
```

Expected: no matches.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

---

### Task 10: Move existing components and remove dead code

**Files:**
- Move: `components/InventarioCard.tsx` -> `app/(auth)/inventario/components/ItemCard.tsx`
- Move: `components/MarcasTab.tsx` -> `app/(auth)/inventario/components/tabs/BrandsTab.tsx` (overwrite the Task 7 wrapper)
- Move: `components/DistribuidoresTab.tsx` -> `app/(auth)/inventario/components/tabs/DistributorsTab.tsx` (overwrite the Task 7 wrapper)
- Delete: `services/inventarioService.ts` (unused root duplicate; all imports resolve to `src/services/inventarioService.ts`)
- Modify: imports in the new page/components.
- Delete: the old 1,482-line page body (replaced in Task 7).

- [ ] **Step 1: Move files and update imports**

Use `git mv` or file copy + delete. Update imports so `ItemCard` is imported from `./ItemCard`, and the tab wrappers import the moved implementations directly. Remove the wrapper indirection if the moved file already exports the tab.

- [ ] **Step 2: Update `ItemCard` for the new behavior**

Keep the existing card layout. Ensure:
- `onEdit`, `onAddStock`, `onDelete` are required.
- Stock status uses `isLowStock` from the domain module.
- Inactive items still render with the existing muted style.

- [ ] **Step 3: Remove direct API calls from tabs**

The page and modals use `inventoryApi`. `BrandsTab` and `DistributorsTab` may keep their existing self-loading behavior for now, but any `fetch('/api/inventario/...')` in those files must be replaced with `inventoryApi` methods.

- [ ] **Step 4: Find leftovers**

Run:

```bash
grep -rn "fetch('/api/inventario\|fetch(\`/api/inventario" app/'(auth)'/inventario components
grep -rn "stock_actual.*update\|update.*stock_actual" src/services/inventarioService.ts services/completedTreatmentService.ts
```

Expected: no inventory UI file calls `fetch` directly, and every stock write goes through `register_inventory_movement` (from `inventarioService` or `completedTreatmentService`).

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint:check`
Expected: PASS.

---

### Task 11: End-to-end verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run all automated gates**

```bash
npm test
npx tsc --noEmit
npm run lint:check
npm run build
```

Expected: all pass. If `npm run build` fails for unrelated pre-existing reasons, record the exact failing file/route and verify the inventory files compile with `npx tsc --noEmit`.

- [ ] **Step 2: Verify the database fixes**

In Supabase SQL editor, re-run the two verification queries from Task 2. Then, with a test item:

```sql
SELECT id, nombre, stock_actual, precio, precio_compra FROM inventario WHERE id = '<test-id>';
SELECT * FROM register_inventory_movement('<test-id>', 'entrada', 2, 10, 'prueba', NULL, 15, 9, '2026-10-22');
SELECT id, nombre, stock_actual, precio, precio_compra FROM inventario WHERE id = '<test-id>';
-- expect stock increased by 2 and prices updated in the same result
```

Then delete the test item and confirm its movement rows still exist with `inventario_id IS NULL`.

- [ ] **Step 3: Manual browser smoke test**

As an `admin`:
1. Open `/inventario`; verify all five tabs load.
2. Create an item with a brand and image; verify the name is not overwritten by the brand category.
3. Edit only the price; verify name, stock, code, and image are preserved.
4. Add stock with new prices; verify stock increases and prices change (not reset to 0, not blanked).
5. Register a manual salida; verify stock decreases and never goes below 0.
6. Open Reportes; verify cost value, retail value, and low-stock list.
7. Delete the item; verify the item disappears and Movimientos still shows its history.

As a non-admin/non-tech-support user, confirm `/inventario` shows `AccessDenied`, direct item/master-data writes return 403, and the completed-treatment form can still read inventory items and post stock exits.

As an `admin`, complete a treatment containing an inventory item and verify `stock_actual` decreases by exactly the quantity used (previously it was decremented twice).

- [ ] **Step 4: Report results**

Summarize each gate and smoke-test result. Do not claim success for any step that was not executed.
