import { supabase } from '../lib/supabase';

export interface ReportData {
  date: string;
  patients: number;
  treatments: number;
  revenue: number;
  doctors: number;
}

export interface DoctorPerformance {
  name: string;
  patients: number;
  treatments: number;
  revenue: number;
  satisfaction: number;
}

export interface TreatmentType {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface BudgetData {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
}

export class ReportsService {
  static async getReportData(timeRange: 'daily' | 'weekly' | 'monthly' | 'yearly', startDate?: string, endDate?: string): Promise<ReportData[]> {
    try {
      // This would be replaced with actual database queries
      // For now, return mock data
      const mockData: ReportData[] = [
        {
          date: new Date().toISOString().split('T')[0],
          patients: 15,
          treatments: 42,
          revenue: 3500,
          doctors: 4
        },
        {
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          patients: 18,
          treatments: 48,
          revenue: 4200,
          doctors: 4
        }
      ];
      
      return mockData;
    } catch (error) {
      console.error('Error fetching report data:', error);
      throw error;
    }
  }

  static async getDoctorPerformance(startDate?: string, endDate?: string): Promise<DoctorPerformance[]> {
    try {
      // Get all completed treatments in date range
      const { data: treatments, error } = await supabase
        .from('vista_tratamientos_completados_detalles')
        .select('*')
        .gte('fecha_completado', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('fecha_completado', endDate || new Date().toISOString());

      if (error) throw error;

      // Group by doctor manually
      const doctorGroups = treatments?.reduce((acc, treatment) => {
        const doctorName = treatment.doctor_name || 'Unknown';
        if (!acc[doctorName]) {
          acc[doctorName] = {
            name: doctorName,
            patients: new Set(),
            treatments: 0,
            revenue: 0
          };
        }
        acc[doctorName].patients.add(treatment.patient_id);
        acc[doctorName].treatments += 1;
        acc[doctorName].revenue += treatment.precio_final || 0;
        return acc;
      }, {} as any);

      // Convert to performance array
      const performance: DoctorPerformance[] = Object.values(doctorGroups).map((group: any) => ({
        name: group.name,
        patients: group.patients.size,
        treatments: group.treatments,
        revenue: group.revenue,
        satisfaction: 4.5 // Mock satisfaction score
      }));

      return performance;
    } catch (error) {
      console.error('Error fetching doctor performance:', error);
      throw error;
    }
  }

  static async getTreatmentTypes(startDate?: string, endDate?: string): Promise<TreatmentType[]> {
    try {
      const { data, error } = await supabase
        .from('vista_tratamientos_completados_detalles')
        .select('*')
        .gte('fecha_completado', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('fecha_completado', endDate || new Date().toISOString());

      if (error) throw error;

      // Group by treatment type manually
      const treatmentGroups = data?.reduce((acc, item) => {
        const treatmentName = item.nombre_tratamiento || 'Unknown';
        if (!acc[treatmentName]) {
          acc[treatmentName] = {
            name: treatmentName,
            count: 0,
            revenue: 0
          };
        }
        acc[treatmentName].count += 1;
        acc[treatmentName].revenue += item.precio_final || 0;
        return acc;
      }, {} as any);

      const totalTreatments = data?.length || 0;

      const treatmentTypes: TreatmentType[] = Object.values(treatmentGroups).map((group: any) => ({
        name: group.name,
        count: group.count,
        revenue: group.revenue,
        percentage: totalTreatments > 0 ? Math.round((group.count / totalTreatments) * 100) : 0
      }));

      return treatmentTypes.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error fetching treatment types:', error);
      throw error;
    }
  }

  static async getBudgetData(): Promise<BudgetData[]> {
    try {
      // This would connect to a budget/expenses table
      // For now, return mock data
      const mockBudgetData: BudgetData[] = [
        { category: 'Personal', budgeted: 15000, actual: 14800, variance: -200 },
        { category: 'Materiales', budgeted: 8000, actual: 8500, variance: 500 },
        { category: 'Marketing', budgeted: 3000, actual: 2800, variance: -200 },
        { category: 'Equipamiento', budgeted: 5000, actual: 5200, variance: 200 },
        { category: 'Operaciones', budgeted: 10000, actual: 9800, variance: -200 }
      ];
      
      return mockBudgetData;
    } catch (error) {
      console.error('Error fetching budget data:', error);
      throw error;
    }
  }

  static async getPatientStats(startDate?: string, endDate?: string) {
    try {
      const { data: newPatients, error: newError } = await supabase
        .from('patients')
        .select('created_at')
        .gte('created_at', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('created_at', endDate || new Date().toISOString());

      if (newError) throw newError;

      const { data: returningPatients, error: returningError } = await supabase
        .from('patients')
        .select('created_at, updated_at')
        .lt('created_at', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .gte('updated_at', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());

      if (returningError) throw returningError;

      return {
        newPatients: newPatients?.length || 0,
        returningPatients: returningPatients?.length || 0,
        totalPatients: (newPatients?.length || 0) + (returningPatients?.length || 0)
      };
    } catch (error) {
      console.error('Error fetching patient stats:', error);
      throw error;
    }
  }

  static async getRevenueStats(startDate?: string, endDate?: string) {
    try {
      const { data, error } = await supabase
        .from('vista_tratamientos_completados_detalles')
        .select('precio_final, fecha_completado')
        .gte('fecha_completado', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('fecha_completado', endDate || new Date().toISOString());

      if (error) throw error;

      const totalRevenue = data?.reduce((sum, item) => sum + (item.precio_final || 0), 0) || 0;
      const totalTreatments = data?.length || 0;

      return {
        totalRevenue,
        totalTreatments,
        averageRevenuePerTreatment: totalTreatments > 0 ? totalRevenue / totalTreatments : 0
      };
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      throw error;
    }
  }
}
