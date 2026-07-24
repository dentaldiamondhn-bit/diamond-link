export interface InventarioItem {
  id: string;
  insumo_id: string | null;
  marca_id: string | null;
  codigo: string | null;
  nombre: string;
  precio: number;
  precio_compra: number;
  moneda: string;
  marca: string | null;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string | null;
  imagen_url: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  marca_ref?: {
    codigo: string;
    nombre: string;
    tipo: string;
  };
  insumo?: {
    id: string;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    precio: number;
    moneda: string;
    activo: boolean;
  };
}

export interface MovimientoInventario {
  id: string;
  inventario_id: string | null;
  insumo_id: string | null;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  precio_unitario: number | null;
  notas: string | null;
  created_by: string | null;
  tratamiento_completado_id: number | null;
  created_at: string;
  inventario?: {
    codigo: string;
    nombre: string;
    marca: string;
    imagen_url: string;
  };
  insumo?: {
    codigo: string;
    nombre: string;
  };
}
