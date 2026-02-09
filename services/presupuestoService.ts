import { supabase } from '../lib/supabase';

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
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
  acceptd_at?: string;
}

class PresupuestoService {
  async getPatientPresupuestoStatistics(pacienteId: string): Promise<{
    total_presupuestos: number;
    pendientes: number;
    aceptados: number;
    expirados: number;
    total_valor_pendiente: number;
    total_valor_aceptado: number;
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
      // Use the correct field name: patient_id (not paciente_id)
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('patient_id', pacienteId)
        .order('quote_date', { ascending: false });

      if (error) {
        console.error('Error fetching patient presupuesto statistics:', error);
        throw error;
      }

      const presupuestos = data || [];
      
      // Calculate statistics
      const totalPresupuestos = presupuestos.length;
      const pendientes = presupuestos.filter(p => p.status === 'pending').length;
      const aceptados = presupuestos.filter(p => p.status === 'accepted').length;
      const expirados = presupuestos.filter(p => p.status === 'expired').length;
      
      // Calculate total amounts
      const totalValorPendiente = presupuestos
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (p.total_amount || 0), 0);
      
      const totalValorAceptado = presupuestos
        .filter(p => p.status === 'accepted')
        .reduce((sum, p) => sum + (p.total_amount || 0), 0);
      
      // Get latest presupuesto
      const latestPresupuesto = presupuestos.length > 0 ? {
        treatment_description: presupuestos[0].treatment_description || 'Tratamiento general',
        total_amount: presupuestos[0].total_amount,
        quote_date: presupuestos[0].quote_date,
        status: presupuestos[0].status,
        doctor_name: presupuestos[0].doctor_name
      } : undefined;
      
      // Calculate average value
      const valorPromedio = totalPresupuestos > 0 
        ? presupuestos.reduce((sum, p) => sum + (p.total_amount || 0), 0) / totalPresupuestos
        : 0;

      return {
        total_presupuestos: totalPresupuestos,
        pendientes: pendientes,
        aceptados: aceptados,
        expirados: expirados,
        total_valor_pendiente: totalValorPendiente,
        total_valor_aceptado: totalValorAceptado,
        latest_presupuesto: latestPresupuesto,
        valor_promedio: valorPromedio
      };
    } catch (error) {
      console.error('Unexpected error fetching patient presupuesto statistics:', error);
      throw error;
    }
  }
}

export const presupuestoService = new PresupuestoService();
