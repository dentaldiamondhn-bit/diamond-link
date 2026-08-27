export interface Marca {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  subcategoria: string | null;
  distribuidor_id: string | null;
  created_at: string;
  updated_at: string;
  distribuidor?: {
    id: string;
    nombre: string;
    contacto: string | null;
  };
}
