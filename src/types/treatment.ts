import { Currency } from '../utils/currencyUtils';

export interface Treatment {
  id?: number;
  codigo: string;
  nombre: string;
  especialidad: string;
  precio: number;
  moneda: Currency; // New field for currency
  notas?: string; // Notes field for additional treatment information
  veces_realizado: number; // Counter for how many times this treatment has been performed
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface Promotion {
  id?: number;
  codigo: string;
  nombre: string;
  descuento: number;
  precio_original: number;
  precio_promocional: number;
  moneda: Currency; // New field for currency
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  veces_realizado: number; // Counter for how many times this promotion has been used
  creado_en?: string;
  actualizado_en?: string;
}
