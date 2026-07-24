import { supabase } from '../lib/supabase';
import { InventarioItem, MovimientoInventario } from '../types/inventario';

export class InventarioService {
  static async getInventario(activeOnly: boolean = false): Promise<InventarioItem[]> {
    try {
      let query = supabase
        .from('inventario')
        .select('*, marca_ref:marcas(*), insumo:insumos(*)')
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('activo', true);
      }

      const { data, error } = await query;

      if (error && error.code === 'PGRST200' && error.message?.includes('marca_ref')) {
        let fallbackQuery = supabase
          .from('inventario')
          .select('*, insumo:insumos(*)')
          .order('created_at', { ascending: false });
        if (activeOnly) {
          fallbackQuery = fallbackQuery.eq('activo', true);
        }
        const { data: fallback, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;
        return fallback || [];
      }

      // Fallback: if activo column doesn't exist yet, retry without filter
      if (error && activeOnly && (error.message?.includes('activo') || error.code === 'PGRST200')) {
        const { data: fallback, error: fallbackError } = await supabase
          .from('inventario')
          .select('*, marca_ref:marcas(*), insumo:insumos(*)')
          .order('created_at', { ascending: false });
        if (fallbackError && fallbackError.message?.includes('marca_ref')) {
          const { data: f2 } = await supabase
            .from('inventario')
            .select('*, insumo:insumos(*)')
            .order('created_at', { ascending: false });
          return f2 || [];
        }
        if (fallbackError) throw fallbackError;
        return fallback || [];
      }

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching inventario:', error);
      return [];
    }
  }

  static async getInventarioItem(id: string): Promise<InventarioItem | null> {
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*, marca_ref:marcas(*), insumo:insumos(*)')
        .eq('id', id)
        .single();

      if (error && error.message?.includes('marca_ref')) {
        const { data: fallback } = await supabase
          .from('inventario')
          .select('*, insumo:insumos(*)')
          .eq('id', id)
          .single();
        return fallback;
      }

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching inventario item:', error);
      return null;
    }
  }

  static async upsertInventario(item: {
    id?: string;
    insumo_id?: string | null;
    marca_id?: string | null;
    codigo?: string;
    nombre?: string;
    precio?: number;
    moneda?: string;
    marca?: string;
    stock_actual: number;
    stock_minimo: number;
    ubicacion?: string;
    imagen_url?: string | null;
    activo?: boolean;
  }): Promise<InventarioItem> {
    try {
      // Sync to insumos table (legacy) — insert or update matching row
      const insumoPayload: any = {
        codigo: item.codigo || null,
        nombre: item.nombre || '',
        precio: item.precio ?? 0,
        moneda: item.moneda || 'HNL',
        activo: item.activo ?? true,
      };

      const { data: existingInsumo, error: lookupError } = await supabase
        .from('insumos')
        .select('id')
        .eq('codigo', insumoPayload.codigo)
        .maybeSingle();

      let insumoId = item.insumo_id;
      if (existingInsumo && !lookupError) {
        insumoId = existingInsumo.id;
        await supabase.from('insumos').update(insumoPayload).eq('id', insumoId);
      } else {
        const { data: newInsumo } = await supabase
          .from('insumos')
          .insert(insumoPayload)
          .select('id')
          .single();
        if (newInsumo) insumoId = newInsumo.id;
      }

      const payload: any = {
        insumo_id: insumoId || null,
        marca_id: item.marca_id || null,
        codigo: item.codigo || null,
        nombre: item.nombre || '',
        precio: item.precio ?? 0,
        moneda: item.moneda || 'HNL',
        marca: item.marca || null,
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        ubicacion: item.ubicacion || null,
        imagen_url: item.imagen_url || null,
        activo: item.activo ?? true,
        updated_at: new Date().toISOString(),
      };

      if (item.id) payload.id = item.id;

      const { data, error } = await supabase
        .from('inventario')
        .upsert(payload)
        .select('*, marca_ref:marcas(*), insumo:insumos(*)')
        .single();

      if (error && error.message?.includes('marca_ref')) {
        const { data: fallback } = await supabase
          .from('inventario')
          .upsert(payload)
          .select('*, insumo:insumos(*)')
          .single();
        return fallback;
      }

      if (error) throw error;
      return data;
    } catch (error: any) {
      const supabaseError = error?.message || error?.details || error;
      console.error('Error upserting inventario:', supabaseError);
      throw new Error(typeof supabaseError === 'string' ? supabaseError : JSON.stringify(supabaseError));
    }
  }

  static async deleteInventario(id: string): Promise<void> {
    try {
      // Fetch item first to get image URL and insumo_id
      const { data: item } = await supabase
        .from('inventario')
        .select('imagen_url, insumo_id')
        .eq('id', id)
        .single();

      // Delete image from storage if present
      if (item?.imagen_url) {
        const url = new URL(item.imagen_url);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        if (fileName) {
          await supabase.storage.from('inventario-imagenes').remove([fileName]);
        }
      }

      // Also delete corresponding insumo from legacy table
      if (item?.insumo_id) {
        await supabase.from('insumos').delete().eq('id', item.insumo_id);
      }

      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting inventario:', error);
      throw error;
    }
  }

  static async registrarMovimiento(mov: {
    inventario_id: string;
    insumo_id?: string;
    tipo: 'entrada' | 'salida';
    cantidad: number;
    precio_unitario?: number;
    notas?: string;
    created_by?: string;
    tratamiento_completado_id?: number;
  }): Promise<MovimientoInventario> {
    try {
      const { data, error } = await supabase
        .from('movimientos_inventario')
        .insert([{
          inventario_id: mov.inventario_id,
          insumo_id: mov.insumo_id || null,
          tipo: mov.tipo,
          cantidad: mov.cantidad,
          precio_unitario: mov.precio_unitario || null,
          notas: mov.notas || null,
          created_by: mov.created_by || null,
          tratamiento_completado_id: mov.tratamiento_completado_id || null,
          created_at: new Date().toISOString(),
        }])
        .select('*, inventario:inventario(codigo, nombre, marca, imagen_url), insumo:insumos(codigo, nombre)')
        .single();

      // Directly update stock_actual (in case DB trigger is not active)
      if (data) {
        const { data: invItem } = await supabase
          .from('inventario')
          .select('stock_actual')
          .eq('id', mov.inventario_id)
          .single();

        if (invItem) {
          let newStock = invItem.stock_actual;
          if (mov.tipo === 'entrada') {
            newStock += mov.cantidad;
          } else if (mov.tipo === 'salida') {
            newStock = Math.max(0, newStock - mov.cantidad);
          }

          await supabase
            .from('inventario')
            .update({ stock_actual: newStock, updated_at: new Date().toISOString() })
            .eq('id', mov.inventario_id);
        }
      }

      if (error && error.message?.includes('inventario')) {
        const { data: fallback } = await supabase
          .from('movimientos_inventario')
          .insert([{
            inventario_id: mov.inventario_id,
            insumo_id: mov.insumo_id || null,
            tipo: mov.tipo,
            cantidad: mov.cantidad,
            precio_unitario: mov.precio_unitario || null,
            notas: mov.notas || null,
            created_by: mov.created_by || null,
            tratamiento_completado_id: mov.tratamiento_completado_id || null,
            created_at: new Date().toISOString(),
          }])
          .select('*, insumo:insumos(codigo, nombre)')
          .single();

        // Also update stock for fallback
        if (fallback) {
          const { data: invItem } = await supabase
            .from('inventario')
            .select('stock_actual')
            .eq('id', mov.inventario_id)
            .single();

          if (invItem) {
            let newStock = invItem.stock_actual;
            if (mov.tipo === 'entrada') {
              newStock += mov.cantidad;
            } else if (mov.tipo === 'salida') {
              newStock = Math.max(0, newStock - mov.cantidad);
            }

            await supabase
              .from('inventario')
              .update({ stock_actual: newStock, updated_at: new Date().toISOString() })
              .eq('id', mov.inventario_id);
          }
        }
        return fallback;
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      throw error;
    }
  }

  static async getMovimientos(params?: {
    inventario_id?: string;
    insumo_id?: string;
    tipo?: 'entrada' | 'salida';
    desde?: string;
    hasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<MovimientoInventario[]> {
    try {
      let query = supabase
        .from('movimientos_inventario')
        .select('*, inventario:inventario(codigo, nombre, marca, imagen_url), insumo:insumos(codigo, nombre)')
        .order('created_at', { ascending: false });

      if (params?.inventario_id) query = query.eq('inventario_id', params.inventario_id);
      if (params?.insumo_id) query = query.eq('insumo_id', params.insumo_id);
      if (params?.tipo) query = query.eq('tipo', params.tipo);
      if (params?.desde) query = query.gte('created_at', params.desde);
      if (params?.hasta) query = query.lte('created_at', params.hasta);
      if (params?.limit) query = query.limit(params.limit);
      if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);

      const { data, error } = await query;

      if (error && error.message?.includes('inventario')) {
        const { data: fallback } = await supabase
          .from('movimientos_inventario')
          .select('*, insumo:insumos(codigo, nombre)')
          .order('created_at', { ascending: false });
        return fallback || [];
      }

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching movimientos:', error);
      return [];
    }
  }

  static async getStockBajo(): Promise<InventarioItem[]> {
    try {
      const all = await this.getInventario();
      return all.filter(item => item.stock_actual < item.stock_minimo);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      return [];
    }
  }

  static async getValorTotalInventario(): Promise<number> {
    try {
      const items = await this.getInventario();
      return items.reduce((sum, item) => {
        const precio = item.precio ?? item.insumo?.precio ?? 0;
        return sum + (precio * item.stock_actual);
      }, 0);
    } catch (error) {
      console.error('Error calculating total inventory value:', error);
      return 0;
    }
  }

  // -- Marcas --
  static async getMarcas(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('marcas').select('*').order('nombre');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching marcas:', error);
      return [];
    }
  }

  static async createMarca(marca: { codigo: string; nombre: string; tipo?: string }): Promise<any> {
    try {
      const { data, error } = await supabase.from('marcas').insert([{
        codigo: marca.codigo,
        nombre: marca.nombre,
        tipo: marca.tipo || null,
      }]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating marca:', error);
      throw error;
    }
  }

  static async updateMarca(id: string, marca: { codigo?: string; nombre?: string; tipo?: string }): Promise<any> {
    try {
      const { data, error } = await supabase.from('marcas').update({
        ...marca,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating marca:', error);
      throw error;
    }
  }

  static async deleteMarca(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('marcas').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting marca:', error);
      throw error;
    }
  }

  // -- Distribuidores --
  static async getDistribuidores(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('distribuidores').select('*').order('nombre');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching distribuidores:', error);
      return [];
    }
  }

  static async createDistribuidor(d: any): Promise<any> {
    try {
      const { data, error } = await supabase.from('distribuidores').insert([d]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating distribuidor:', error);
      throw error;
    }
  }

  static async updateDistribuidor(id: string, d: any): Promise<any> {
    try {
      const { data, error } = await supabase.from('distribuidores').update({
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
      const { error } = await supabase.from('distribuidores').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting distribuidor:', error);
      throw error;
    }
  }
}
