import { supabase } from '../lib/supabase';
import { DoctorValidator } from '../utils/doctorValidator';
import { Currency } from '../utils/currencyUtils';

export interface CompletedTreatment {
  id: string;
  paciente_id: string;
  paciente_beneficiario_id?: string;
  tipo_participacion: 'individual' | 'pagador' | 'beneficiario';
  tratamiento_padre_id?: string;
  fecha_cita: string;
  total_original: number;
  total_descuento: number;
  total_final: number;
  moneda: Currency; // Currency field
  tipo_descuento: 'monto' | 'porcentaje' | 'ninguno';
  valor_descuento: number;
  notas_doctor?: string;
  firma_paciente_url?: string;
  especialidad?: string;
  estado: 'pendiente_firma' | 'firmado' | 'pagado';
  monto_pagado?: number; // Amount paid so far
  saldo_pendiente?: number; // Remaining balance (calculated)
  estado_pago?: 'pendiente' | 'parcialmente_pagado' | 'pagado'; // Payment status
  creado_en: string;
  actualizado_en: string;
  paciente?: any;
  paciente_beneficiario?: any;
  tratamientos_realizados?: TreatmentItem[];
}

export interface TreatmentItem {
  id: string;
  tratamiento_completado_id: string;
  tratamiento_id: number;
  nombre_tratamiento: string;
  codigo_tratamiento: string;
  precio_original: number;
  precio_final: number;
  moneda: Currency; // Currency field
  cantidad: number;
  notas?: string;
  doctor_id?: string;
  doctor_name?: string;
  tratamiento?: {
    id: number;
    nombre: string;
    precio: number;
    codigo: string;
    especialidad?: string;
    moneda: Currency; // Currency field
  };
}

export interface CreateCompletedTreatmentData {
  paciente_id: string;
  fecha_cita: string;
  total_original: number;
  total_descuento: number;
  total_final: number;
  moneda: Currency; // Currency field
  tipo_descuento: 'monto' | 'porcentaje' | 'ninguno';
  valor_descuento: number;
  notas_doctor?: string;
  firma_paciente_url?: string;
  // Removed doctor signature field
  especialidad?: string; // Added especialidad field
  estado: 'pendiente_firma' | 'firmado' | 'pagado';
  tratamientos_realizados: Omit<TreatmentItem, 'id' | 'tratamiento_completado_id' | 'creado_en' | 'actualizado_en'>[];
}

export class CompletedTreatmentService {
  // ========================================
  // CRUD Operations
  // ========================================

  static async getAllCompletedTreatments(): Promise<CompletedTreatment[]> {
    try {
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .order('fecha_cita', { ascending: false });

      if (error) {
        console.error('Error fetching completed treatments:', error);
        throw error;
      }

      // Fetch treatment items for each completed treatment
      const treatmentsWithItems = await Promise.all(
        (data || []).map(async (treatment: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('vista_tratamientos_realizados_detalles')
            .select('*')
            .eq('tratamiento_completado_id', treatment.id)
            .order('creado_en', { ascending: true });

          // Fetch patient data directly from patients table
          let patientData = {};
          if (treatment.paciente_id) {
            const { data: patient, error: patientError } = await supabase
              .from('patients')
              .select('*')
              .eq('paciente_id', treatment.paciente_id)
              .single();
            
            if (!patientError && patient) {
              patientData = patient;
            } else {
              console.error('Error fetching patient data:', patientError);
            }
          }

          if (itemsError) {
            console.error('Error fetching treatment items:', itemsError);
            return { 
              ...treatment, 
              tratamientos_realizados: [],
              paciente: patientData
            };
          }

          return {
            ...treatment,
            tratamientos_realizados: items || [],
            paciente: patientData,
            paciente_beneficiario: treatment.beneficiario_nombre_completo ? {
              nombre_completo: treatment.beneficiario_nombre_completo,
              numero_identidad: treatment.beneficiario_numero_identidad,
              telefono: treatment.beneficiario_telefono,
              email: treatment.beneficiario_email
            } : null
          };
        })
      );

      return treatmentsWithItems;
    } catch (error) {
      console.error('Unexpected error fetching completed treatments:', error);
      throw error;
    }
  }

  static async getCompletedTreatmentById(id: string): Promise<CompletedTreatment | null> {
    try {
      // First get the treatment details
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('Error fetching completed treatment:', error);
        throw error;
      }

      // Then get the patient data separately to include all fields
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('nombre_completo, numero_identidad, telefono, codigopais, fecha_nacimiento, edad, sexo')
        .eq('paciente_id', data.paciente_id)
        .single();

      if (patientError) {
        console.error('Error fetching patient data:', patientError);
        // Return treatment data without patient details if patient fetch fails
        return {
          ...data,
          paciente: {
            nombre_completo: data.nombre_completo,
            telefono: data.telefono,
            codigopais: data.codigopais,
            fecha_nacimiento: data.fecha_nacimiento,
            edad: data.edad,
            sexo: data.sexo
          }
        };
      }

      console.log('🔍 Patient data from patients table:', patientData);

      // Fetch treatment items
      const { data: items, error: itemsError } = await supabase
        .from('vista_tratamientos_realizados_detalles')
        .select('*')
        .eq('tratamiento_completado_id', id)
        .order('creado_en', { ascending: true });

      // Combine treatment data with complete patient data
      const result = {
        ...data,
        paciente: patientData,
        tratamientos_realizados: items || []  // Add this line!
      };
      
      console.log('🔍 Final result being returned:', result);
      return result;
    } catch (error) {
      console.error('Unexpected error fetching completed treatment:', error);
      throw error;
    }
  }

  static async getCompletedTreatmentsByPatientId(pacienteId: string): Promise<CompletedTreatment[]> {
    try {
      console.log('Fetching treatments for patient:', pacienteId);
      
      // Fetch treatments where patient is the main patient
      const { data: mainTreatments, error: mainError } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_cita', { ascending: false });

      console.log('Main treatments:', mainTreatments);

      // Also check if there are separate treatment records where patient is beneficiary
      const { data: separateBeneficiaryTreatments, error: separateError } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .eq('paciente_id', pacienteId)  // Look for treatments where beneficiary is the main patient
        .eq('estado', 'completado')  // Beneficiary treatments are marked as completed
        .ilike('notas_doctor', '%beneficiario%')  // Check if notes mention beneficiary
        .order('fecha_cita', { ascending: false });

      console.log('Separate beneficiary treatments:', separateBeneficiaryTreatments);

      if (mainError || separateError) {
        console.error('Error fetching completed treatments by patient:', mainError || separateError);
        throw mainError || separateError;
      }

      // Combine both sets of treatments
      const allTreatments = [...(mainTreatments || []), ...(separateBeneficiaryTreatments || [])];
      
      // Remove duplicates by ID
      const uniqueTreatments = allTreatments.filter((treatment, index, self) =>
        index === self.findIndex((t) => t.id === treatment.id)
      );

      console.log('Final unique treatments:', uniqueTreatments);

      // Fetch treatment items for each completed treatment
      const treatmentsWithItems = await Promise.all(
        uniqueTreatments.map(async (treatment: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('vista_tratamientos_realizados_detalles')
            .select('*')
            .eq('tratamiento_completado_id', treatment.id)
            .order('creado_en', { ascending: true });

          // Fetch patient data directly from patients table
          let patientData = {};
          if (treatment.paciente_id) {
            const { data: patient, error: patientError } = await supabase
              .from('patients')
              .select('*')
              .eq('paciente_id', treatment.paciente_id)
              .single();
            
            if (!patientError && patient) {
              patientData = patient;
            } else {
              console.error('Error fetching patient data:', patientError);
            }
          }

          if (itemsError) {
            console.error('Error fetching treatment items:', itemsError);
            return { 
              ...treatment, 
              tratamientos_realizados: [],
              paciente: patientData,
              paciente_beneficiario: treatment.beneficiario_nombre_completo ? {
                nombre_completo: treatment.beneficiario_nombre_completo,
                numero_identidad: treatment.beneficiario_numero_identidad,
                telefono: treatment.beneficiario_telefono,
                email: treatment.beneficiario_email
              } : null
            };
          }

          return {
            ...treatment,
            tratamientos_realizados: items || [],
            paciente: patientData,
            paciente_beneficiario: treatment.beneficiario_nombre_completo ? {
              nombre_completo: treatment.beneficiario_nombre_completo,
              numero_identidad: treatment.beneficiario_numero_identidad,
              telefono: treatment.beneficiario_telefono,
              email: treatment.beneficiario_email
            } : null
          };
        })
      );

      return treatmentsWithItems;
    } catch (error) {
      console.error('Unexpected error fetching completed treatments by patient:', error);
      throw error;
    }
  }

  static async createCompletedTreatment(treatmentData: CreateCompletedTreatmentData): Promise<CompletedTreatment> {
    try {
      // Create the completed treatment record directly
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .insert([{
          paciente_id: treatmentData.paciente_id,
          fecha_cita: treatmentData.fecha_cita,
          total_original: treatmentData.total_original,
          total_descuento: treatmentData.total_descuento,
          total_final: treatmentData.total_final,
          moneda: treatmentData.moneda,
          tipo_descuento: treatmentData.tipo_descuento,
          valor_descuento: treatmentData.valor_descuento,
          notas_doctor: treatmentData.notas_doctor,
          firma_paciente_url: treatmentData.firma_paciente_url,
          especialidad: treatmentData.especialidad,
          estado: treatmentData.estado || 'pendiente_firma',
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating completed treatment:', error);
        throw error;
      }

      // Extract treatment_id from the response
      const treatmentId = data?.id;
      if (!treatmentId) {
        throw new Error('No treatment ID returned from database');
      }

      // Insert treatment items into tratamientos_realizados table
      if (treatmentData.tratamientos_realizados && treatmentData.tratamientos_realizados.length > 0) {
        // Validate all doctor IDs in treatment items
        for (const item of treatmentData.tratamientos_realizados) {
          if (item.doctor_id) {
            const doctorValidation = await DoctorValidator.validateDoctorId(item.doctor_id);
            if (!doctorValidation.isValid) {
              throw new Error(`Invalid doctor ID in treatment item "${item.nombre_tratamiento}": ${doctorValidation.error}`);
            }
          }
        }

        const treatmentItems = treatmentData.tratamientos_realizados.map(item => ({
          tratamiento_completado_id: treatmentId,
          tratamiento_id: item.tratamiento_id,
          nombre_tratamiento: item.nombre_tratamiento,
          codigo_tratamiento: item.codigo_tratamiento,
          precio_original: item.precio_original,
          precio_final: item.precio_final,
          moneda: item.moneda,
          cantidad: item.cantidad,
          notas: item.notas,
          doctor_id: item.doctor_id || null,
          doctor_name: item.doctor_name,
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString()
        }));

        const { error: itemsError } = await supabase
          .from('tratamientos_realizados')
          .insert(treatmentItems);

        if (itemsError) {
          console.error('Error creating treatment items:', itemsError);
          // Don't throw error here - the main treatment was created successfully
          // But we should log it for debugging
        }
      }

      // Increment promotion counters for any promotion items
      for (const item of treatmentData.tratamientos_realizados) {
        // Check if this item is a promotion (by checking if it has promotion-like characteristics)
        if (item.notas && item.notas.includes('Promoción:')) {
          try {
            // This is a promotion item, increment its counter
            await fetch(`/api/promociones/${item.tratamiento_id}/increment`, {
              method: 'POST',
            });
          } catch (promoError) {
            console.warn('Failed to increment promotion counter:', promoError);
            // Don't throw error, just log it - the treatment was created successfully
          }
        }
      }

      // Fetch the complete treatment with items
      const createdTreatment = await this.getCompletedTreatmentById(treatmentId);
      if (!createdTreatment) {
        throw new Error('Failed to retrieve created treatment');
      }

      return createdTreatment;
    } catch (error) {
      console.error('Unexpected error creating completed treatment:', error);
      throw error;
    }
  }

  static async updateCompletedTreatment(id: string, updates: Partial<CompletedTreatment>): Promise<CompletedTreatment> {
    try {
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .update({
          ...updates,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating completed treatment:', error);
        throw error;
      }

      // Fetch the complete updated treatment
      const updatedTreatment = await this.getCompletedTreatmentById(id);
      if (!updatedTreatment) {
        throw new Error('Failed to retrieve updated treatment');
      }

      return updatedTreatment;
    } catch (error) {
      console.error('Unexpected error updating completed treatment:', error);
      throw error;
    }
  }

  static async deleteCompletedTreatment(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tratamientos_completados')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting completed treatment:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting completed treatment:', error);
      throw error;
    }
  }

  // ========================================
  // Treatment Items Operations
  // ========================================

  static async addTreatmentItem(completedTreatmentId: string, itemData: Omit<TreatmentItem, 'id' | 'tratamiento_completado_id' | 'creado_en' | 'actualizado_en'>): Promise<TreatmentItem> {
    try {
      const { data, error } = await supabase
        .from('tratamientos_realizados')
        .insert({
          ...itemData,
          tratamiento_completado_id: completedTreatmentId,
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding treatment item:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error adding treatment item:', error);
      throw error;
    }
  }

  static async updateTreatmentItem(id: string, updates: Partial<TreatmentItem>): Promise<TreatmentItem> {
    try {
      const { data, error } = await supabase
        .from('tratamientos_realizados')
        .update({
          ...updates,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating treatment item:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating treatment item:', error);
      throw error;
    }
  }

  static async removeTreatmentItem(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tratamientos_realizados')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error removing treatment item:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error removing treatment item:', error);
      throw error;
    }
  }

  // ========================================
  // Search and Filter Operations
  // ========================================

  static async searchCompletedTreatments(query: string): Promise<CompletedTreatment[]> {
    try {
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .or(`nombre_completo.ilike.%${query}%,numero_identidad.ilike.%${query}%,telefono.ilike.%${query}%`)
        .order('fecha_cita', { ascending: false });

      if (error) {
        console.error('Error searching completed treatments:', error);
        throw error;
      }

      // Fetch treatment items for each treatment
      const treatmentsWithItems = await Promise.all(
        (data || []).map(async (treatment: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('vista_tratamientos_realizados_detalles')
            .select('*')
            .eq('tratamiento_completado_id', treatment.id)
            .order('creado_en', { ascending: true });

          if (itemsError) {
            console.error('Error fetching treatment items:', itemsError);
            return { ...treatment, tratamientos_realizados: [] };
          }

          return {
            ...treatment,
            tratamientos_realizados: items || []
          };
        })
      );

      return treatmentsWithItems;
    } catch (error) {
      console.error('Unexpected error searching completed treatments:', error);
      throw error;
    }
  }

  static async getCompletedTreatmentsByDateRange(startDate: string, endDate: string): Promise<CompletedTreatment[]> {
    try {
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .gte('fecha_cita', startDate)
        .lte('fecha_cita', endDate)
        .order('fecha_cita', { ascending: false });

      if (error) {
        console.error('Error fetching completed treatments by date range:', error);
        throw error;
      }

      // Fetch treatment items for each treatment
      const treatmentsWithItems = await Promise.all(
        (data || []).map(async (treatment: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('vista_tratamientos_realizados_detalles')
            .select('*')
            .eq('tratamiento_completado_id', treatment.id)
            .order('creado_en', { ascending: true });

          if (itemsError) {
            console.error('Error fetching treatment items:', itemsError);
            return { ...treatment, tratamientos_realizados: [] };
          }

          return {
            ...treatment,
            tratamientos_realizados: items || []
          };
        })
      );

      return treatmentsWithItems;
    } catch (error) {
      console.error('Unexpected error fetching completed treatments by date range:', error);
      throw error;
    }
  }

  // ========================================
  // Statistics and Analytics
  // ========================================

  static async getTreatmentStatistics(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select('*');

      if (error) {
        console.error('Error fetching treatment statistics:', error);
        throw error;
      }

      const treatments = data || [];
      
      return {
        total_treatments: treatments.length,
        total_revenue: treatments.reduce((sum, t) => sum + parseFloat(t.total_final), 0),
        treatments_by_status: {
          pendiente_firma: treatments.filter(t => t.estado === 'pendiente_firma').length,
          firmado: treatments.filter(t => t.estado === 'firmado').length,
          pagado: treatments.filter(t => t.estado === 'pagado').length
        },
        average_treatment_value: treatments.length > 0 
          ? treatments.reduce((sum, t) => sum + parseFloat(t.total_final), 0) / treatments.length 
          : 0,
        total_discount_given: treatments.reduce((sum, t) => sum + parseFloat(t.total_descuento), 0)
      };
    } catch (error) {
      console.error('Unexpected error fetching treatment statistics:', error);
      throw error;
    }
  }
}
