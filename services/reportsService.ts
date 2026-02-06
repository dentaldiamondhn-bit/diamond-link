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
  specialty?: string;
  patients: number;
  treatments: number;
  revenue: number;
  paidAmount?: number;
  pendingAmount?: number;
  treatmentTypes?: string[];
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
      // Get completed treatments grouped by date
      const { data: treatments, error } = await supabase
        .from('tratamientos_completados')
        .select('fecha_cita, total_final, paciente_id, doctor_name')
        .gte('fecha_cita', startDate || this.getDateRangeStart(timeRange))
        .lte('fecha_cita', endDate || new Date().toISOString())
        .order('fecha_cita', { ascending: true });

      if (error) throw error;

      // Group by date and calculate metrics
      const groupedData = treatments?.reduce((acc, treatment) => {
        const date = new Date(treatment.fecha_cita).toISOString().split('T')[0];
        
        if (!acc[date]) {
          acc[date] = {
            date: new Date(treatment.fecha_cita).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            patients: new Set(),
            treatments: 0,
            revenue: 0,
            doctors: new Set()
          };
        }
        
        acc[date].patients.add(treatment.paciente_id);
        acc[date].treatments += 1;
        acc[date].revenue += treatment.total_final || 0;
        acc[date].doctors.add(treatment.doctor_name);
        
        return acc;
      }, {} as any);

      // Convert to array format
      const reportData: ReportData[] = Object.values(groupedData).map((group: any) => ({
        date: group.date,
        patients: group.patients.size,
        treatments: group.treatments,
        revenue: group.revenue,
        doctors: group.doctors.size
      }));

      return reportData;
    } catch (error) {
      console.error('Error fetching report data:', error);
      throw error;
    }
  }

  // Helper method to get date range start
  private static getDateRangeStart(timeRange: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
    const now = new Date();
    switch (timeRange) {
      case 'daily':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case 'weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'monthly':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'yearly':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  static async getDoctorPerformance(startDate?: string, endDate?: string): Promise<DoctorPerformance[]> {
    try {
      // Get all completed treatments details from tratamientos_realizados
      // NO DATE FILTERING - Get all data to ensure we see everything
      console.log('Fetching ALL treatments from tratamientos_realizados...');
      const { data: treatments, error } = await supabase
        .from('tratamientos_realizados')
        .select(`
          paciente_id, 
          precio_final, 
          creado_en,
          doctor_id,
          doctor_name,
          nombre_tratamiento,
          cantidad,
          notas
        `);

      console.log('Fetched treatments count:', treatments?.length);

      if (error) throw error;

      // Get all active doctors
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('name, specialty')
        .eq('is_active', true);

      if (doctorsError) throw doctorsError;

      // Initialize doctor groups with all active doctors
      const doctorGroups: { [key: string]: any } = {};
      
      doctors?.forEach((doctor: any) => {
        doctorGroups[doctor.name] = {
          name: doctor.name,
          specialty: doctor.specialty,
          patients: 0,
          uniquePatients: new Set(),
          treatments: 0,
          revenue: 0,
          paidAmount: 0,
          pendingAmount: 0,
          treatmentTypes: new Set()
        };
      });

      // Group treatments by actual doctor from tratamientos_realizados
      treatments?.forEach((treatment: any) => {
        let doctorName = treatment.doctor_name || 'Sin Doctor Asignado';
        
        // Check if the notes mention a different doctor performing the treatment
        if (treatment.notas) {
          const notes = treatment.notas.toLowerCase();
          if (notes.includes('dra. karen pacheco')) {
            doctorName = 'Dra. Karen Pacheco';
          } else if (notes.includes('dra. amelia yanes')) {
            doctorName = 'Dra. Amelia Yanes';
          } else if (notes.includes('dra. sully calix')) {
            doctorName = 'Dra. Sully Calix';
          }
        }
        
        // Create doctor group if it doesn't exist (for doctors not in doctors table)
        if (!doctorGroups[doctorName]) {
          doctorGroups[doctorName] = {
            name: doctorName,
            specialty: 'No especificada',
            patients: 0,
            uniquePatients: new Set(),
            treatments: 0,
            revenue: 0,
            paidAmount: 0,
            pendingAmount: 0,
            treatmentTypes: new Set()
          };
        }
        
        // Add treatment data to doctor's group
        const treatmentCount = treatment.cantidad || 1;
        const treatmentRevenue = treatment.precio_final || 0;
        
        doctorGroups[doctorName].patients += treatmentCount;
        if (treatment.paciente_id) {
          doctorGroups[doctorName].uniquePatients.add(treatment.paciente_id);
        }
        doctorGroups[doctorName].treatments += treatmentCount;
        doctorGroups[doctorName].revenue += treatmentRevenue;
        doctorGroups[doctorName].paidAmount += treatmentRevenue; // Assuming full payment for now
        doctorGroups[doctorName].pendingAmount += 0; // No pending amount data in this table
        doctorGroups[doctorName].treatmentTypes.add(treatment.nombre_tratamiento || 'Tratamiento General');
      });

      // Convert to performance array
      const performance: DoctorPerformance[] = Object.values(doctorGroups).map((group: any) => ({
        name: group.name,
        specialty: group.specialty,
        patients: group.patients, // Use treatment count since paciente_id is often null
        treatments: group.treatments,
        revenue: group.revenue,
        paidAmount: group.paidAmount,
        pendingAmount: group.pendingAmount,
        treatmentTypes: Array.from(group.treatmentTypes),
        satisfaction: 4.5 // Mock satisfaction score - can be enhanced later
      }));

      // Debug logging
      console.log('Doctor Performance Results:', performance.map(p => ({
        name: p.name,
        treatments: p.treatments,
        patients: p.patients,
        revenue: p.revenue
      })));
      console.log('Total treatments calculated:', performance.reduce((sum, doc) => sum + doc.treatments, 0));

      // Sort by treatments count (highest first), then by revenue
      return performance.sort((a, b) => {
        if (b.treatments !== a.treatments) {
          return b.treatments - a.treatments;
        }
        return b.revenue - a.revenue;
      });
    } catch (error) {
      console.error('Error fetching doctor performance:', error);
      throw error;
    }
  }

  static async getTreatmentTypes(startDate?: string, endDate?: string): Promise<TreatmentType[]> {
    try {
      // For now, let's get basic treatment stats without the complex join
      // We'll use a simpler approach based on completed treatments
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select('total_final, fecha_cita')
        .gte('fecha_cita', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('fecha_cita', endDate || new Date().toISOString());

      if (error) throw error;

      // Since we can't get treatment names easily, let's return generic categories
      // This can be enhanced later once we understand the table structure better
      const totalTreatments = data?.length || 0;
      const totalRevenue = data?.reduce((sum, item) => sum + (item.total_final || 0), 0) || 0;

      // Return generic treatment types for now
      const treatmentTypes: TreatmentType[] = [
        {
          name: 'Tratamientos Generales',
          count: totalTreatments,
          revenue: totalRevenue,
          percentage: 100
        }
      ];

      return treatmentTypes;
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
      // Get total patient count from patients table (like dashboard)
      const { data: allPatients, error: allPatientsError } = await supabase
        .from('patients')
        .select('paciente_id');

      if (allPatientsError) throw allPatientsError;

      // Get completed treatments in date range for new vs returning analysis
      const { data: completedTreatments, error: completedError } = await supabase
        .from('tratamientos_completados')
        .select('paciente_id, fecha_cita')
        .gte('fecha_cita', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('fecha_cita', endDate || new Date().toISOString());

      if (completedError) throw completedError;

      // Total patients from patients table (matches dashboard)
      const totalPatients = allPatients?.length || 0;
      
      // For new vs returning, use completed treatments in the date range
      const patientTreatmentCounts = completedTreatments?.reduce((acc, treatment) => {
        acc[treatment.paciente_id] = (acc[treatment.paciente_id] || 0) + 1;
        return acc;
      }, {} as any);

      const activePatients = Object.keys(patientTreatmentCounts).length;
      const newPatients = Object.values(patientTreatmentCounts).filter((count: number) => count === 1).length;
      const returningPatients = Object.values(patientTreatmentCounts).filter((count: number) => count > 1).length;

      return {
        totalPatients, // Total from patients table (matches dashboard)
        newPatients, // New patients in date range
        returningPatients, // Returning patients in date range
        activePatients // Patients with treatments in date range
      };
    } catch (error) {
      console.error('Error fetching patient stats:', error);
      throw error;
    }
  }

  static async getPatientDemographics() {
    try {
      const { data: patients, error } = await supabase
        .from('patients')
        .select('edad, sexo');

      if (error) throw error;

      if (!patients?.length) {
        return { 
          averageAge: 0, 
          genderDistribution: { masculino: 0, femenino: 0 },
          ageCategories: {
            '0-17': 0,
            '18-25': 0,
            '26-35': 0,
            '36-45': 0,
            '46-55': 0,
            '56-65': 0,
            '65+': 0
          }
        };
      }

      // Calculate average age
      const validAges = patients.filter(p => p.edad && !isNaN(p.edad));
      const averageAge = validAges.length > 0 
        ? Math.round(validAges.reduce((sum, p) => sum + p.edad, 0) / validAges.length)
        : 0;

      // Calculate gender distribution
      const genderCount = patients.reduce((acc, patient) => {
        const gender = patient.sexo?.toLowerCase() || '';
        if (gender.includes('m') && !gender.includes('f')) {
          acc.masculino++;
        } else if (gender.includes('f')) {
          acc.femenino++;
        }
        return acc;
      }, { masculino: 0, femenino: 0 });

      // Calculate age categories
      const ageCategories = validAges.reduce((acc, patient) => {
        const age = patient.edad;
        if (age <= 17) acc['0-17']++;
        else if (age <= 25) acc['18-25']++;
        else if (age <= 35) acc['26-35']++;
        else if (age <= 45) acc['36-45']++;
        else if (age <= 55) acc['46-55']++;
        else if (age <= 65) acc['56-65']++;
        else acc['65+']++;
        return acc;
      }, {
        '0-17': 0,
        '18-25': 0,
        '26-35': 0,
        '36-45': 0,
        '46-55': 0,
        '56-65': 0,
        '65+': 0
      });

      return { averageAge, genderDistribution: genderCount, ageCategories };
    } catch (error) {
      console.error('Error fetching patient demographics:', error);
      throw error;
    }
  }

  static async getRevenueStats(startDate?: string, endDate?: string) {
    try {
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select('total_final, fecha_cita')
        .gte('fecha_cita', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('fecha_cita', endDate || new Date().toISOString());

      if (error) throw error;

      const totalRevenue = data?.reduce((sum, item) => sum + (item.total_final || 0), 0) || 0;
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
