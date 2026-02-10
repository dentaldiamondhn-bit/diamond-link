import { Currency } from '../utils/currencyUtils';

export interface Paquete {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio_total: number;
  moneda: Currency;
  max_pacientes: number;
  veces_vendido: number;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
  tratamientos_incluidos?: PaqueteTratamiento[];
}

export interface PaqueteTratamiento {
  id?: number;
  paquete_id: number;
  tratamiento_id: number;
  cantidad: number;
  tratamiento?: {
    id: number;
    codigo: string;
    nombre: string;
    especialidad: string;
    precio: number;
    moneda: Currency;
  };
  creado_en?: string;
}
