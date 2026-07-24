export interface Insumo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  moneda: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}
