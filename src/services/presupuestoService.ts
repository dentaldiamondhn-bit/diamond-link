export interface Presupuesto {
  id?: string;
  patient_id: string;
  patient_name: string;
  treatment_description?: string;
  notes?: string;
  quote_date: string;
  items: any[];
  total_amount: number;
  doctor_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
  acceptd_at?: string;
}

export function extractConteoPorEstado(notes?: string | null): string {
  if (!notes) return '';
  const marker = '=== CONTEO POR ESTADO ===';
  const idx = notes.indexOf(marker);
  if (idx === -1) return '';
  const rest = notes.slice(idx);
  const nextSection = rest.indexOf('\n===');
  const section = nextSection === -1 ? rest : rest.slice(0, nextSection);
  return section.trim();
}

const ESTADO_COLORS: { [key: string]: { label: string; color: string } } = {
  abfraccion: { label: 'Abfracción', color: '#BA68C8' },
  abrasion: { label: 'Abrasión', color: '#4FC3F7' },
  amalgama: { label: 'Restauración Amalgama', color: '#607D8B' },
  apilado: { label: 'Apiñamiento', color: '#455A64' },
  atricion: { label: 'Atrición', color: '#FFD54F' },
  ausente: { label: 'Ausente', color: '#9E9E9E' },
  carilla: { label: 'Carilla', color: '#00BCD4' },
  cariado: { label: 'Cariado', color: '#FF5722' },
  'caries-restauracion': { label: 'Restauración con Caries', color: '#FFC107' },
  corona: { label: 'Corona', color: '#795548' },
  endodoncia: { label: 'Endodoncia', color: '#5D4037' },
  erosion: { label: 'Erosión', color: '#FF8A65' },
  erupcion: { label: 'En Erupción', color: '#FF7043' },
  extraccionind: { label: 'Extracción indicada', color: '#E91E63' },
  fistula: { label: 'Fístula', color: '#7E57C2' },
  fracturado: { label: 'Fracturado', color: '#FF9800' },
  implante: { label: 'Implante', color: '#3F51B5' },
  movilidad: { label: 'Movilidad', color: '#FDD835' },
  obturado: { label: 'Obturado', color: '#2196F3' },
  odontopatia: { label: 'Odontopatía', color: '#CDDC39' },
  protesis: { label: 'Prótesis', color: '#8D6E63' },
  raiz: { label: 'Raíz Residual', color: '#5E35B1' },
  resina: { label: 'Restauración Resina', color: '#8BC34A' },
  sano: { label: 'Sano', color: '#FFFFFF' },
  sellante: { label: 'Sellante', color: '#26C6DA' },
  temporal: { label: 'Restauración Temporal', color: '#9C27B0' },
  txpulpar: { label: 'Trat. pulpar', color: '#1976D2' },
};

export interface ConteoEstadoEntry {
  key: string;
  label: string;
  count: number;
  color: string;
}

export function parseConteoPorEstado(notes?: string | null): ConteoEstadoEntry[] {
  const section = extractConteoPorEstado(notes);
  if (!section) return [];
  const entries: ConteoEstadoEntry[] = [];
  section.split(/\r?\n|·/).forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(.+?):\s*(\d+)/);
    if (!match) return;
    const count = parseInt(match[2], 10);
    if (isNaN(count)) return;
    const key = match[1].trim().toLowerCase();
    const known = ESTADO_COLORS[key];
    entries.push({
      key,
      label: known?.label || match[1].trim(),
      count,
      color: known?.color || '#9CA3AF',
    });
  });
  return entries;
}

class PresupuestoService {
  async getPatientPresupuestoStatistics(pacienteId: string): Promise<{
    total_presupuestos: number;
    pendientes: number;
    aceptados: number;
    rechazados: number;
    expirados: number;
    total_valor_pendiente: number;
    total_valor_aceptado: number;
    total_valor_rechazado: number;
    totals_by_currency: {
      pendientes: { HNL: number; USD: number };
      aceptados: { HNL: number; USD: number };
      rechazados: { HNL: number; USD: number };
    };
    latest_presupuesto?: {
      treatment_description: string;
      total_amount: number;
      quote_date: string;
      status: string;
      doctor_name: string;
    };
    valor_promedio: number;
  }> {
    try {
      const response = await fetch(`/api/presupuestos/statistics?patient_id=${pacienteId}`, { cache: 'no-store' });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching presupuesto statistics:', errorData);
        throw new Error(errorData.error || 'Failed to fetch presupuesto statistics');
      }

      const statistics = await response.json();
      return statistics;
    } catch (error) {
      console.error('Unexpected error fetching patient presupuesto statistics:', error);
      throw error;
    }
  }
}

export const presupuestoService = new PresupuestoService();
