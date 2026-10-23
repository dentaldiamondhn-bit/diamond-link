import 'server-only';
import { createServiceClient } from '../lib/supabase';
import {
  inventoryValuation,
  isLowStock,
  mergeInventoryPatch,
  parseItemInput,
  parseItemPatch,
  type ItemInput,
  type MovementInput,
} from '../lib/inventory/domain';
import type { InventarioItem, MovimientoInventario } from '../types/inventario';

let db: ReturnType<typeof createServiceClient> | null = null;

function getDb() {
  if (!db) db = createServiceClient();
  return db;
}

export class InventarioService {
  static async getInventario(activeOnly: boolean = false): Promise<InventarioItem[]> {
    const client = getDb();
    let query = client
      .from('inventario')
      .select('*, marca_ref:marcas(*), insumo:insumos(*)')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query;

    if (error && error.code === 'PGRST200' && error.message?.includes('marca_ref')) {
      let fallbackQuery = client
        .from('inventario')
        .select('*, insumo:insumos(*)')
        .order('created_at', { ascending: false });
      if (activeOnly) {
        fallbackQuery = fallbackQuery.eq('activo', true);
      }
      const { data: fallback, error: fallbackError } = await fallbackQuery;
      if (fallbackError) throw fallbackError;
      return (fallback ?? []) as InventarioItem[];
    }

    if (error && activeOnly && (error.message?.includes('activo') || error.code === 'PGRST200')) {
      const { data: fallback, error: fallbackError } = await client
        .from('inventario')
        .select('*, marca_ref:marcas(*), insumo:insumos(*)')
        .order('created_at', { ascending: false });
      if (fallbackError && fallbackError.message?.includes('marca_ref')) {
        const { data: withoutBrand, error: withoutBrandError } = await client
          .from('inventario')
          .select('*, insumo:insumos(*)')
          .order('created_at', { ascending: false });
        if (withoutBrandError) throw withoutBrandError;
        return (withoutBrand ?? []) as InventarioItem[];
      }
      if (fallbackError) throw fallbackError;
      return (fallback ?? []) as InventarioItem[];
    }

    if (error) throw error;
    return (data ?? []) as InventarioItem[];
  }

  static async getInventarioItem(id: string): Promise<InventarioItem | null> {
    const client = getDb();
    const { data, error } = await client
      .from('inventario')
      .select('*, marca_ref:marcas(*), insumo:insumos(*)')
      .eq('id', id)
      .maybeSingle();

    if (error && error.message?.includes('marca_ref')) {
      const { data: fallback, error: fallbackError } = await client
        .from('inventario')
        .select('*, insumo:insumos(*)')
        .eq('id', id)
        .maybeSingle();
      if (fallbackError) throw fallbackError;
      return (fallback ?? null) as InventarioItem | null;
    }

    if (error) throw error;
    return (data ?? null) as InventarioItem | null;
  }

  static async updateInventario(
    id: string,
    patch: Record<string, unknown>
  ): Promise<InventarioItem | null> {
    const parsedPatch = parseItemPatch(patch);
    const client = getDb();
    const { data: existing, error: fetchError } = await client
      .from('inventario')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return null;

    if (Object.keys(parsedPatch).length === 0) {
      return this.getInventarioItem(id);
    }

    const merged = mergeInventoryPatch(existing as InventarioItem, parsedPatch);
    const updatePayload: Record<string, unknown> = {
      ...parsedPatch,
      updated_at: new Date().toISOString(),
    };

    let { error } = await client
      .from('inventario')
      .update(updatePayload)
      .eq('id', id)
      .select('id')
      .single();

    if (error && (error.message?.includes('precio_compra') || error.code === 'PGRST204')) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.precio_compra;
      const retry = await client
        .from('inventario')
        .update(fallbackPayload)
        .eq('id', id)
        .select('id')
        .single();
      error = retry.error;
    }

    if (error) throw error;

    const updated = await this.getInventarioItem(id);
    if (!updated) throw new Error('Failed to update inventory item');

    const insumoFields = ['codigo', 'nombre', 'precio', 'moneda', 'activo'];
    if (
      existing.insumo_id &&
      insumoFields.some((field) => Object.prototype.hasOwnProperty.call(parsedPatch, field))
    ) {
      const insumoPatch: Record<string, unknown> = {};
      for (const field of insumoFields) {
        if (Object.prototype.hasOwnProperty.call(parsedPatch, field)) {
          insumoPatch[field] = parsedPatch[field];
        }
      }
      const { error: insumoError } = await client
        .from('insumos')
        .update(insumoPatch)
        .eq('id', existing.insumo_id);
      if (insumoError) throw insumoError;
    }

    await this.registrarActividad({
      accion: 'item_editado',
      entidad_tipo: 'inventario',
      entidad_nombre: merged.nombre,
      entidad_codigo: merged.codigo,
      inventario_id: id,
      detalle: `Item "${merged.nombre}" (${merged.codigo || 'sin código'}) fue actualizado`,
    });

    return updated;
  }

  static async upsertInventario(item: ItemInput & { id?: string }): Promise<InventarioItem> {
    if (item.id) {
      const updated = await this.updateInventario(
        item.id,
        item as unknown as Record<string, unknown>
      );
      if (!updated) throw new Error(`Inventory item not found: ${item.id}`);
      return updated;
    }

    const input = parseItemInput(item as unknown as Record<string, unknown>);
    const client = getDb();
    let insumoId: string | null = null;

    if (input.codigo) {
      const insumoPayload = {
        codigo: input.codigo,
        nombre: input.nombre,
        precio: input.precio,
        moneda: input.moneda,
        activo: input.activo,
      };
      const { data: existingInsumo, error: lookupError } = await client
        .from('insumos')
        .select('id')
        .eq('codigo', input.codigo)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existingInsumo) {
        insumoId = existingInsumo.id;
        const { error: updateError } = await client
          .from('insumos')
          .update(insumoPayload)
          .eq('id', insumoId);
        if (updateError) throw updateError;
      } else {
        const { data: newInsumo, error: insertError } = await client
          .from('insumos')
          .insert(insumoPayload)
          .select('id')
          .single();
        if (insertError) throw insertError;
        insumoId = newInsumo.id;
      }
    }

    const payload: Record<string, unknown> = {
      insumo_id: insumoId,
      ...input,
      updated_at: new Date().toISOString(),
    };

    let { data: inserted, error } = await client
      .from('inventario')
      .insert(payload)
      .select('id')
      .single();

    if (error && (error.message?.includes('precio_compra') || error.code === 'PGRST204')) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.precio_compra;
      const retry = await client
        .from('inventario')
        .insert(fallbackPayload)
        .select('id')
        .single();
      inserted = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!inserted) throw new Error('Failed to create inventory item');

    const created = await this.getInventarioItem(inserted.id);
    if (!created) throw new Error('Failed to create inventory item');

    await this.registrarActividad({
      accion: 'item_creado',
      entidad_tipo: 'inventario',
      entidad_nombre: created.nombre,
      entidad_codigo: created.codigo,
      inventario_id: created.id,
      detalle: `Item "${created.nombre}" (${created.codigo || 'sin código'}) fue creado`,
    });

    return created;
  }

  static async deleteInventario(id: string): Promise<void> {
    const client = getDb();
    const { data: item, error: fetchError } = await client
      .from('inventario')
      .select('imagen_url, insumo_id, nombre, codigo')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!item) return;

    await this.registrarActividad({
      accion: 'item_eliminado',
      entidad_tipo: 'inventario',
      entidad_nombre: item.nombre,
      entidad_codigo: item.codigo,
      inventario_id: id,
      detalle: `Item "${item.nombre}" (${item.codigo || 'sin código'}) fue eliminado`,
    });

    if (item.imagen_url) {
      const url = new URL(item.imagen_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      if (fileName) {
        const { error: storageError } = await client.storage
          .from('inventario-imagenes')
          .remove([fileName]);
        if (storageError) console.warn('Could not delete inventory image:', storageError);
      }
    }

    if (item.insumo_id) {
      const { data: otherInventory, error: otherError } = await client
        .from('inventario')
        .select('id')
        .eq('insumo_id', item.insumo_id)
        .neq('id', id)
        .limit(1)
        .maybeSingle();
      if (otherError) throw otherError;

      if (!otherInventory) {
        const { error: insumoError } = await client
          .from('insumos')
          .delete()
          .eq('id', item.insumo_id);
        if (insumoError) throw insumoError;
      }
    }

    const { error } = await client.from('inventario').delete().eq('id', id);
    if (error) throw error;
  }

  static async registrarMovimiento(mov: MovementInput): Promise<MovimientoInventario> {
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
    if (!data) throw new Error('No movement returned');
    return data as MovimientoInventario;
  }

  static async registrarActividad(params: {
    accion: string;
    entidad_tipo: string;
    entidad_nombre?: string;
    entidad_codigo?: string;
    inventario_id?: string;
    insumo_id?: string;
    tipo?: string;
    cantidad?: number;
    precio_unitario?: number;
    notas?: string;
    created_by?: string;
    detalle?: string;
  }): Promise<void> {
    const client = getDb();
    try {
      const payload: Record<string, unknown> = {
        inventario_id: params.inventario_id || null,
        insumo_id: params.insumo_id || null,
        tipo: params.tipo || null,
        cantidad: params.cantidad ?? 0,
        precio_unitario: params.precio_unitario || null,
        notas: params.notas || null,
        created_by: params.created_by || null,
        created_at: new Date().toISOString(),
      };
      const { error } = await client.from('movimientos_inventario').insert([{
        ...payload,
        accion: params.accion,
        entidad_tipo: params.entidad_tipo,
        entidad_nombre: params.entidad_nombre || null,
        entidad_codigo: params.entidad_codigo || null,
        detalle: params.detalle || null,
      }]);
      if (error) {
        await client.from('movimientos_inventario').insert([{
          ...payload,
          notas: params.detalle || params.notas || null,
        }]);
      }
    } catch (error) {
      console.warn('Could not register activity:', error);
    }
  }

  static async getMovimientos(params?: {
    inventario_id?: string;
    insumo_id?: string;
    tipo?: string;
    accion?: string;
    desde?: string;
    hasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<MovimientoInventario[]> {
    const client = getDb();
    let query = client
      .from('movimientos_inventario')
      .select('*, inventario:inventario(codigo, nombre, marca, imagen_url, moneda), insumo:insumos(codigo, nombre)')
      .order('created_at', { ascending: false });

    if (params?.inventario_id) query = query.eq('inventario_id', params.inventario_id);
    if (params?.insumo_id) query = query.eq('insumo_id', params.insumo_id);
    if (params?.tipo) query = query.eq('tipo', params.tipo);
    if (params?.accion) query = query.eq('accion', params.accion);
    if (params?.desde) query = query.gte('created_at', params.desde);
    if (params?.hasta) query = query.lte('created_at', params.hasta);
    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);

    const { data, error } = await query;

    if (error && error.message?.includes('inventario')) {
      const { data: fallback, error: fallbackError } = await client
        .from('movimientos_inventario')
        .select('*, insumo:insumos(codigo, nombre)')
        .order('created_at', { ascending: false });
      if (fallbackError) throw fallbackError;
      return (fallback ?? []) as MovimientoInventario[];
    }

    if (error) throw error;
    return (data ?? []) as MovimientoInventario[];
  }

  static async getStockBajo(): Promise<InventarioItem[]> {
    const items = await this.getInventario();
    return items.filter(isLowStock);
  }

  static async getValorTotalInventario(): Promise<number> {
    const items = await this.getInventario();
    return inventoryValuation(items).retail;
  }

  static async getMarcas(): Promise<any[]> {
    const { data, error } = await getDb()
      .from('marcas')
      .select('*, distribuidor:distribuidores(nombre, contacto)')
      .order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  static async createMarca(marca: {
    codigo: string;
    nombre: string;
    tipo?: string;
    subcategoria?: string;
    distribuidor_id?: string | null;
  }): Promise<any> {
    try {
      const { data, error } = await getDb().from('marcas').insert([{
        codigo: marca.codigo,
        nombre: marca.nombre,
        tipo: marca.tipo || null,
        subcategoria: marca.subcategoria || null,
        distribuidor_id: marca.distribuidor_id || null,
      }]).select().single();
      if (error) throw error;
      await this.registrarActividad({
        accion: 'marca_creada',
        entidad_tipo: 'marca',
        entidad_nombre: data.nombre,
        entidad_codigo: data.codigo,
        detalle: `Marca "${data.nombre}" (${data.codigo}) fue creada`,
      });
      return data;
    } catch (error) {
      console.error('Error creating marca:', error);
      throw error;
    }
  }

  static async updateMarca(id: string, marca: {
    codigo?: string;
    nombre?: string;
    tipo?: string;
    subcategoria?: string;
    distribuidor_id?: string | null;
  }): Promise<any> {
    try {
      const client = getDb();
      const { data: before } = await client.from('marcas').select('nombre, codigo').eq('id', id).single();
      const { data, error } = await client.from('marcas').update({
        ...marca,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      await this.registrarActividad({
        accion: 'marca_editada',
        entidad_tipo: 'marca',
        entidad_nombre: data.nombre,
        entidad_codigo: data.codigo,
        detalle: `Marca "${before?.nombre || ''}" actualizada a "${data.nombre}"`,
      });
      return data;
    } catch (error) {
      console.error('Error updating marca:', error);
      throw error;
    }
  }

  static async deleteMarca(id: string): Promise<void> {
    try {
      const client = getDb();
      const { data: before } = await client.from('marcas').select('nombre, codigo').eq('id', id).single();
      await client.from('inventario').update({ marca_id: null }).eq('marca_id', id);
      const { error } = await client.from('marcas').delete().eq('id', id);
      if (error) throw error;
      if (before) {
        await this.registrarActividad({
          accion: 'marca_eliminada',
          entidad_tipo: 'marca',
          entidad_nombre: before.nombre,
          entidad_codigo: before.codigo,
          detalle: `Marca "${before.nombre}" (${before.codigo}) fue eliminada`,
        });
      }
    } catch (error) {
      console.error('Error deleting marca:', error);
      throw error;
    }
  }

  static async getDistribuidores(): Promise<any[]> {
    const { data, error } = await getDb().from('distribuidores').select('*').order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  static async createDistribuidor(d: any): Promise<any> {
    try {
      const { data, error } = await getDb().from('distribuidores').insert([d]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating distribuidor:', error);
      throw error;
    }
  }

  static async updateDistribuidor(id: string, d: any): Promise<any> {
    try {
      const { data, error } = await getDb().from('distribuidores').update({
        ...d,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating distribuidor:', error);
      throw error;
    }
  }

  static async deleteDistribuidor(id: string): Promise<void> {
    try {
      const { error } = await getDb().from('distribuidores').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting distribuidor:', error);
      throw error;
    }
  }
}
