export interface Distribuidor {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  marcas_provistas: string | null;
  ultimos_items: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}
