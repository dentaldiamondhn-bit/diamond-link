import { supabase } from '../lib/supabase';

export interface PatientFollowUp {
  paciente_id: string;
  paciente_nombre: string;
  paciente_telefono?: string;
  ultimo_tratamiento: string;
  fecha_ultimo_tratamiento: string;
  dias_ultimo_tratamiento: number;
  tipo_seguimiento: 'limpieza' | 'ortodoncia' | 'otro';
}

export class PatientFollowUpService {
  /**
   * Get patients who had Limpieza or Profilaxis 4+ months ago
   */
  static async getPatientsForCleaningFollowUp(): Promise<PatientFollowUp[]> {
    try {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select(`
          paciente_id,
          fecha_cita,
          patients (
            paciente_id,
            nombre_completo,
            telefono
          ),
          vista_tratamientos_realizados_detalles (
            nombre_tratamiento
          )
        `)
        .order('fecha_cita', { ascending: false })
        .limit(500);

      console.log('Four months ago date:', fourMonthsAgo.toISOString());
      console.log('Total treatments found:', data?.length);
      
      // Log first 5 treatment dates for debugging
      if (data && data.length > 0) {
        console.log('First 5 treatment dates:');
        data.slice(0, 5).forEach((t: any, i: number) => {
          console.log(`${i + 1}. ${t.fecha_cita} - ${t.patients?.nombre_completo}`);
        });
      }

      if (error) {
        console.error('Error fetching cleaning follow-up patients:', error);
        throw error;
      }

      // Filter for patients with Limpieza or Profilaxis treatments AND 4+ months ago
      const filteredPatients = (data || [])
        .filter((treatment: any) => {
          const treatmentDate = new Date(treatment.fecha_cita);
          const isOldEnough = treatmentDate <= fourMonthsAgo;
          
          const treatmentNames = treatment.vista_tratamientos_realizados_detalles
            ?.map((item: any) => item.nombre_tratamiento.toLowerCase())
            .join(' ') || '';
          const isCleaning = treatmentNames.includes('limpieza') || treatmentNames.includes('profilaxis');
          
          console.log(`Treatment: ${treatment.patients?.nombre_completo}, Date: ${treatment.fecha_cita}, isOldEnough: ${isOldEnough}, isCleaning: ${isCleaning}`);
          
          return isOldEnough && isCleaning;
        })
        .map((treatment: any) => {
          const lastTreatmentDate = new Date(treatment.fecha_cita);
          const daysSinceLastTreatment = Math.floor(
            (new Date().getTime() - lastTreatmentDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          const treatmentNames = treatment.vista_tratamientos_realizados_detalles
            ?.map((item: any) => item.nombre_tratamiento)
            .join(', ') || 'Tratamiento desconocido';

          return {
            paciente_id: treatment.paciente_id,
            paciente_nombre: treatment.patients?.nombre_completo || 'Desconocido',
            paciente_telefono: treatment.patients?.telefono,
            ultimo_tratamiento: treatmentNames,
            fecha_ultimo_tratamiento: treatment.fecha_cita,
            dias_ultimo_tratamiento: daysSinceLastTreatment,
            tipo_seguimiento: 'limpieza' as const
          };
        });

      // Group by patient to get the most recent treatment
      const patientMap = new Map<string, PatientFollowUp>();
      filteredPatients.forEach((patient: PatientFollowUp) => {
        const existing = patientMap.get(patient.paciente_id);
        if (!existing || patient.dias_ultimo_tratamiento < existing.dias_ultimo_tratamiento) {
          patientMap.set(patient.paciente_id, patient);
        }
      });

      return Array.from(patientMap.values());
    } catch (error) {
      console.error('Error in getPatientsForCleaningFollowUp:', error);
      throw error;
    }
  }

  /**
   * Get patients with recurrent orthodontic treatments
   */
  static async getPatientsForOrthodonticFollowUp(): Promise<PatientFollowUp[]> {
    try {
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select(`
          paciente_id,
          fecha_cita,
          patients (
            paciente_id,
            nombre_completo,
            telefono
          ),
          vista_tratamientos_realizados_detalles (
            nombre_tratamiento
          )
        `)
        .order('fecha_cita', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching orthodontic follow-up patients:', error);
        throw error;
      }

      // Filter for patients with orthodontic treatments
      const orthodonticTreatments = (data || [])
        .filter((treatment: any) => {
          const treatmentNames = treatment.vista_tratamientos_realizados_detalles
            ?.map((item: any) => item.nombre_tratamiento.toLowerCase())
            .join(' ') || '';
          return treatmentNames.includes('ortodoncia') || 
                 treatmentNames.includes('brackets') || 
                 treatmentNames.includes('alineadores');
        })
        .map((treatment: any) => {
          const lastTreatmentDate = new Date(treatment.fecha_cita);
          const daysSinceLastTreatment = Math.floor(
            (new Date().getTime() - lastTreatmentDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          const treatmentNames = treatment.vista_tratamientos_realizados_detalles
            ?.map((item: any) => item.nombre_tratamiento)
            .join(', ') || 'Tratamiento desconocido';

          return {
            paciente_id: treatment.paciente_id,
            paciente_nombre: treatment.patients?.nombre_completo || 'Desconocido',
            paciente_telefono: treatment.patients?.telefono,
            ultimo_tratamiento: treatmentNames,
            fecha_ultimo_tratamiento: treatment.fecha_cita,
            dias_ultimo_tratamiento: daysSinceLastTreatment,
            tipo_seguimiento: 'ortodoncia' as const
          };
        });

      // Group by patient and count treatments to identify recurrent patients
      const patientTreatmentCount = new Map<string, { count: number; lastTreatment: PatientFollowUp }>();
      orthodonticTreatments.forEach((treatment: PatientFollowUp) => {
        const existing = patientTreatmentCount.get(treatment.paciente_id);
        if (!existing) {
          patientTreatmentCount.set(treatment.paciente_id, { count: 1, lastTreatment: treatment });
        } else {
          patientTreatmentCount.set(treatment.paciente_id, { 
            count: existing.count + 1, 
            lastTreatment: treatment 
          });
        }
      });

      // Return patients with 2+ orthodontic treatments
      return Array.from(patientTreatmentCount.values())
        .filter(item => item.count >= 2)
        .map(item => item.lastTreatment);
    } catch (error) {
      console.error('Error in getPatientsForOrthodonticFollowUp:', error);
      throw error;
    }
  }

  /**
   * Get all patients needing follow-up
   */
  static async getAllFollowUpPatients(): Promise<PatientFollowUp[]> {
    try {
      const [cleaningPatients, orthodonticPatients] = await Promise.all([
        this.getPatientsForCleaningFollowUp(),
        this.getPatientsForOrthodonticFollowUp()
      ]);

      // Merge and deduplicate by paciente_id
      const patientMap = new Map<string, PatientFollowUp>();
      
      [...cleaningPatients, ...orthodonticPatients].forEach(patient => {
        const existing = patientMap.get(patient.paciente_id);
        if (!existing || patient.dias_ultimo_tratamiento < existing.dias_ultimo_tratamiento) {
          patientMap.set(patient.paciente_id, patient);
        }
      });

      return Array.from(patientMap.values());
    } catch (error) {
      console.error('Error in getAllFollowUpPatients:', error);
      throw error;
    }
  }
}
