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
      const response = await fetch(`/api/presupuestos/statistics?patient_id=${pacienteId}`);
      
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
