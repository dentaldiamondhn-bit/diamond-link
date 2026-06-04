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
  static async getReportData(timeRange: 'daily' | 'weekly' | 'monthly' | 'yearly', startDate?: string, endDate?: string, doctorEmail?: string): Promise<ReportData[]> {
    try {
      // Get completed treatments grouped by date, filtered by doctor if specified
      let query = supabase
        .from('tratamientos_completados')
        .select('fecha_cita, total_final, paciente_id, doctor_name, patients!inner(doctor)')
        .gte('fecha_cita', startDate || this.getDateRangeStart(timeRange))
        .lte('fecha_cita', endDate || new Date().toISOString())
        .order('fecha_cita', { ascending: true });

      // Add doctor filter if specified - filter by patients.doctor
      if (doctorEmail) {
        // First get the doctor name from the doctors table using user_email
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          query = query.eq('patients.doctor', doctorData.name);
        }
      }

      const { data: treatments, error } = await query;

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

  static async getDoctorPerformance(startDate?: string, endDate?: string, doctorEmail?: string): Promise<DoctorPerformance[]> {
    try {
      // Get all completed treatments details from tratamientos_realizados, filtered by doctor if specified
      let query = supabase
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

      // Add doctor filter if specified - get doctor name from doctors table
      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          query = query.eq('doctor_name', doctorData.name);
        }
      }

      const { data: treatments, error } = await query;

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

  static async getTreatmentTypes(startDate?: string, endDate?: string, doctorEmail?: string): Promise<TreatmentType[]> {
    try {
      // Get treatment types from completed treatments using the view, filtered by doctor if specified
      let query = supabase
        .from('tratamientos_completados')
        .select(`
          vista_tratamientos_realizados_detalles!inner (
            nombre_tratamiento,
            precio_final
          ),
          patients!inner(doctor)
        `)
        .gte('fecha_cita', startDate || this.getDateRangeStart('monthly'))
        .lte('fecha_cita', endDate || new Date().toISOString());

      // Add doctor filter if specified - filter by patients.doctor
      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          query = query.eq('patients.doctor', doctorData.name);
        }
      }

      const { data: treatments, error } = await query;

      if (error) throw error;

      // Since we can't get treatment names easily, let's return generic categories
      // This can be enhanced later once we understand the table structure better
      const totalTreatments = treatments?.length || 0;
      const totalRevenue = treatments?.reduce((sum, item) => {
        // Extract precio_final from the nested vista_tratamientos_realizados_detalles
        const treatmentDetails = item.vista_tratamientos_realizados_detalles;
        if (treatmentDetails && Array.isArray(treatmentDetails)) {
          return sum + treatmentDetails.reduce((detailSum, detail) => detailSum + (detail.precio_final || 0), 0);
        }
        return sum;
      }, 0) || 0;

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

  static async getPatientStats(startDate?: string, endDate?: string, doctorEmail?: string): Promise<any> {
    try {
      // Get total patient count from patients table (like dashboard), filtered by doctor if specified
      let patientsQuery = supabase
        .from('patients')
        .select('paciente_id');

      // Add doctor filter to patients if specified
      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          patientsQuery = patientsQuery.eq('doctor', doctorData.name);
        }
      }

      const { data: allPatients, error: allPatientsError } = await patientsQuery;

      if (allPatientsError) throw allPatientsError;

      // Get completed treatments in date range for new vs returning analysis, filtered by doctor if specified
      let treatmentsQuery = supabase
        .from('tratamientos_completados')
        .select('paciente_id, fecha_cita, patients!inner(doctor)')
        .gte('fecha_cita', startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        .lte('fecha_cita', endDate || new Date().toISOString());

      // Add doctor filter to treatments if specified
      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          treatmentsQuery = treatmentsQuery.eq('patients.doctor', doctorData.name);
        }
      }

      const { data: completedTreatments, error: completedError } = await treatmentsQuery;

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

  static async getPatientDemographics(doctorEmail?: string) {
    try {
      let query = supabase
        .from('patients')
        .select('edad, sexo');

      // Add doctor filter if specified
      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          query = query.eq('doctor', doctorData.name);
        }
      }

      const { data: patients, error } = await query;

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

  static async getRevenueStats(startDate?: string, endDate?: string, doctorEmail?: string): Promise<any> {
    try {
      // If custom dates are provided, use them exactly as provided
      // Only use defaults if no dates are specified
      const queryStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
      const queryEndDate = endDate || new Date().toISOString();
      
      let query = supabase
        .from('tratamientos_completados')
        .select('total_final, fecha_cita, patients!inner(doctor)')
        .gte('fecha_cita', queryStartDate)
        .lte('fecha_cita', queryEndDate);

      // Add doctor filter if specified
      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          query = query.eq('patients.doctor', doctorData.name);
        }
      }

      const { data, error } = await query;
      
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

  static async getDetailedPatientAnalytics(startDate?: string, endDate?: string, doctorEmail?: string): Promise<any[]> {
    try {
      const queryStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 365)).toISOString();
      const queryEndDate = endDate || new Date().toISOString();

      let patientsQuery = supabase
        .from('patients')
        .select('paciente_id, nombre_completo, numero_identidad, telefono, doctor, fecha_inicio');

      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          patientsQuery = patientsQuery.eq('doctor', doctorData.name);
        }
      }

      const { data: patients, error: patientsError } = await patientsQuery;

      if (patientsError) throw patientsError;

      const { data: treatments, error: treatmentsError } = await supabase
        .from('tratamientos_completados')
        .select('paciente_id, total_final, monto_pagado, fecha_cita');

      if (treatmentsError) throw treatmentsError;

      const { data: presupuestos, error: presupuestosError } = await supabase
        .from('presupuestos')
        .select('patient_id, total_amount, status, quote_date');

      if (presupuestosError) throw presupuestosError;

      const patientAnalytics = patients?.map((patient: any) => {
        const patientTreatments = treatments?.filter((t: any) => t.paciente_id === patient.paciente_id) || [];
        const patientPresupuestos = presupuestos?.filter((p: any) => p.patient_id === patient.paciente_id) || [];

        const totalSpent = patientTreatments.reduce((sum: number, t: any) => sum + (t.total_final || 0), 0);
        const totalPaid = patientTreatments.reduce((sum: number, t: any) => sum + (t.monto_pagado || 0), 0);
        const outstandingBalance = totalSpent - totalPaid;

        const pendingBudgets = patientPresupuestos.filter((p: any) => p.status === 'pending');
        const acceptedBudgets = patientPresupuestos.filter((p: any) => p.status === 'accepted');

        const latestTreatment = patientTreatments.length > 0
          ? new Date(Math.max(...patientTreatments.map((t: any) => new Date(t.fecha_cita).getTime())))
          : null;

        const treatmentCount = patientTreatments.length;
        const averageSpentPerTreatment = treatmentCount > 0 ? totalSpent / treatmentCount : 0;

        return {
          paciente_id: patient.paciente_id,
          nombre: patient.nombre_completo,
          identidad: patient.numero_identidad,
          telefono: patient.telefono,
          doctor: patient.doctor,
          fechaInicio: patient.fecha_inicio,
          totalTreatments: treatmentCount,
          totalSpent,
          totalPaid,
          outstandingBalance,
          paymentPercentage: totalSpent > 0 ? (totalPaid / totalSpent) * 100 : 0,
          averageSpent: averageSpentPerTreatment,
          lastVisit: latestTreatment ? latestTreatment.toISOString().split('T')[0] : 'N/A',
          pendingBudgets: pendingBudgets.length,
          acceptedBudgets: acceptedBudgets.length,
          status: outstandingBalance > 0 ? 'Con Saldo' : totalSpent > 0 ? 'Al Día' : 'Sin Tratamientos'
        };
      }) || [];

      return patientAnalytics;
    } catch (error) {
      console.error('Error fetching detailed patient analytics:', error);
      throw error;
    }
  }

  static async getFinancialSummaryByTreatment(startDate?: string, endDate?: string, doctorEmail?: string): Promise<any[]> {
    try {
      const queryStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
      const queryEndDate = endDate || new Date().toISOString();

      let query = supabase
        .from('vista_tratamientos_realizados_detalles')
        .select('nombre_tratamiento, precio_final, cantidad')
        .gte('creado_en', queryStartDate)
        .lte('creado_en', queryEndDate);

      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          query = query.eq('doctor_name', doctorData.name);
        }
      }

      const { data: treatments, error } = await query;

      if (error) throw error;

      const treatmentSummary: { [key: string]: any } = {};

      treatments?.forEach((treatment: any) => {
        const treatmentName = treatment.nombre_tratamiento || 'Sin clasificar';
        const cantidad = treatment.cantidad || 1;
        const precio = treatment.precio_final || 0;

        if (!treatmentSummary[treatmentName]) {
          treatmentSummary[treatmentName] = {
            nombre: treatmentName,
            cantidad: 0,
            totalIngresos: 0,
            promedioPorTratamiento: 0
          };
        }

        treatmentSummary[treatmentName].cantidad += cantidad;
        treatmentSummary[treatmentName].totalIngresos += precio;
      });

      const result = Object.values(treatmentSummary).map((summary: any) => ({
        ...summary,
        promedioPorTratamiento: summary.cantidad > 0 ? summary.totalIngresos / summary.cantidad : 0
      }));

      return result.sort((a: any, b: any) => b.totalIngresos - a.totalIngresos);
    } catch (error) {
      console.error('Error fetching financial summary by treatment:', error);
      throw error;
    }
  }

  static async getFinancialTransactions(startDate?: string, endDate?: string, doctorEmail?: string): Promise<any[]> {
    try {
      const queryStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
      const queryEndDate = endDate || new Date().toISOString();

      let treatmentIds: string[] | null = null;
      
      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          const { data: treatments } = await supabase
            .from('tratamientos_completados')
            .select('id')
            .eq('doctor_name', doctorData.name);
          
          treatmentIds = treatments?.map((t: any) => t.id) || null;
        }
      }

      let query = supabase
        .from('payments')
        .select('fecha_pago, monto_pago, metodo_pago, tratamiento_completado_id, moneda')
        .gte('fecha_pago', queryStartDate)
        .lte('fecha_pago', queryEndDate)
        .order('fecha_pago', { ascending: false });

      if (treatmentIds && treatmentIds.length > 0) {
        query = query.in('tratamiento_completado_id', treatmentIds);
      }

      const { data: payments, error: txError } = await query;

      if (txError) {
        console.error('Supabase error in getFinancialTransactions:', txError);
        return [];
      }

      if (!payments || payments.length === 0) return [];

      const allTreatmentIds = payments.map((p: any) => p.tratamiento_completado_id).filter(Boolean);
      
      let treatmentsMap = new Map();
      if (allTreatmentIds.length > 0) {
        const { data: treatments } = await supabase
          .from('tratamientos_completados')
          .select('id, paciente_id')
          .in('id', allTreatmentIds);
        
        if (treatments) {
          treatments.forEach((t: any) => treatmentsMap.set(t.id, t));
        }
      }

      const patientIds = Array.from(treatmentsMap.values()).map((t: any) => t.paciente_id).filter(Boolean);
      
      let patientsMap = new Map();
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from('patients')
          .select('paciente_id, nombre_completo')
          .in('paciente_id', patientIds);
        
        if (patients) {
          patients.forEach((p: any) => patientsMap.set(p.paciente_id, p.nombre_completo));
        }
      }

      const treatmentItemsMap = new Map<string, string>();
      if (allTreatmentIds.length > 0) {
        const { data: items } = await supabase
          .from('vista_tratamientos_realizados_detalles')
          .select('tratamiento_completado_id, nombre_tratamiento')
          .in('tratamiento_completado_id', allTreatmentIds);
        
        if (items) {
          items.forEach((i: any) => {
            if (!treatmentItemsMap.has(i.tratamiento_completado_id)) {
              treatmentItemsMap.set(i.tratamiento_completado_id, i.nombre_tratamiento);
            }
          });
        }
      }

      return payments.map((p: any) => {
        const tc = treatmentsMap.get(p.tratamiento_completado_id) as any;
        const pacienteId = tc?.paciente_id;
        const tratamiento = treatmentItemsMap.get(p.tratamiento_completado_id) || 'Tratamiento';
        const amount = Number(p.monto_pago) || 0;
        return {
          fecha: p.fecha_pago,
          paciente: patientsMap.get(pacienteId) || pacienteId || 'N/A',
          totalPagado: amount,
          metodoPago: p.metodo_pago || 'Efectivo',
          tratamiento
        };
      });
    } catch (error) {
      console.error('Error fetching financial transactions:', error);
      return [];
    }
  }

  static async getPaymentStatusSummary(doctorEmail?: string): Promise<any> {
    try {
      let patientIds: string[] | null = null;
      
      if (doctorEmail) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', doctorEmail)
          .single();
        
        if (doctorData) {
          const { data: patients } = await supabase
            .from('patients')
            .select('paciente_id')
            .eq('doctor', doctorData.name);
          
          patientIds = patients?.map((p: any) => p.paciente_id) || [];
        }
      }

      let query = supabase
        .from('tratamientos_completados')
        .select('total_final, monto_pagado, paciente_id, patients!inner(nombre_completo)');

      if (patientIds && patientIds.length > 0) {
        query = query.in('paciente_id', patientIds);
      }

      const { data: treatments, error } = await query;

      if (error) throw error;

      const categories = {
        paid: { count: 0, total: 0 },
        partial: { count: 0, total: 0 },
        unpaid: { count: 0, total: 0 }
      };

      treatments?.forEach((treatment: any) => {
        const total = treatment.total_final || 0;
        const paid = treatment.monto_pagado || 0;

        if (paid >= total) {
          categories.paid.count++;
          categories.paid.total += total;
        } else if (paid > 0) {
          categories.partial.count++;
          categories.partial.total += total;
        } else {
          categories.unpaid.count++;
          categories.unpaid.total += total;
        }
      });

      return {
        paidFully: categories.paid,
        partiallyPaid: categories.partial,
        unpaid: categories.unpaid,
        total: treatments?.length || 0,
        totalRevenue: treatments?.reduce((sum: number, t: any) => sum + (t.total_final || 0), 0) || 0
      };
    } catch (error) {
      console.error('Error fetching payment status summary:', error);
      throw error;
    }
  }

  static async exportPatientAnalyticsToCSV(patientAnalytics: any[]): Promise<string> {
    if (!patientAnalytics || patientAnalytics.length === 0) {
      return 'No data available';
    }

    const headers = [
      'Paciente',
      'Identidad',
      'Teléfono',
      'Doctor',
      'Tratamientos',
      'Gasto Total',
      'Pagado',
      'Pendiente',
      '% Pago',
      'Última Visita',
      'Estado'
    ];

    const rows = patientAnalytics.map(p => [
      p.nombre || '',
      p.identidad || '',
      p.telefono || '',
      p.doctor || '',
      p.totalTreatments || 0,
      p.totalSpent || 0,
      p.totalPaid || 0,
      p.outstandingBalance || 0,
      p.paymentPercentage?.toFixed(1) || '0.0',
      p.lastVisit || '',
      p.status || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => {
        const str = String(v);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','))
    ].join('\n');

    return csvContent;
  }
}
