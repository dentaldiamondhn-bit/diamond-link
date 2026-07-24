import { supabase } from '../lib/supabase';
import { DoctorValidator } from '../utils/doctorValidator';
import { Currency } from '../utils/currencyUtils';

export interface InventarioEnTratamiento {
  id: string;
  tratamiento_completado_id: string;
  inventario_id: string;
  nombre: string;
  codigo?: string;
  cantidad: number;
  precio: number;
  moneda: Currency;
  imagen_url?: string;
  notas?: string;
  created_at: string;
}

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
  tratamientos_inventario?: InventarioEnTratamiento[];
}

export interface TreatmentItem {
  id: string;
  tratamiento_completado_id: string;
  tratamiento_id: number | string;
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
      // Use single query with joins to avoid N+1 performance issue
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select(`
          id,
          paciente_id,
          fecha_cita,
          total_final,
          monto_pagado,
          moneda,
          estado,
          patients!left (
            paciente_id,
            nombre_completo,
            numero_identidad,
            telefono,
            doctor
          ),
          vista_tratamientos_realizados_detalles (
            id,
            tratamiento_completado_id,
            nombre_tratamiento,
            doctor_name,
            precio_final,
            cantidad,
            creado_en
          )
        `)
        .order('fecha_cita', { ascending: false });

      if (error) {
        console.error('Error fetching completed treatments:', error);
        throw error;
      }

      // Process the joined data efficiently
      return (data || []).map((treatment: any) => {
        // Group treatment items by treatment
        const treatmentItems = treatment.vista_tratamientos_realizados_detalles || [];
        
        return {
          id: treatment.id,
          paciente_id: treatment.paciente_id,
          paciente_beneficiario_id: undefined,
          tipo_participacion: 'individual' as const,
          tratamiento_padre_id: undefined,
          fecha_cita: treatment.fecha_cita,
          total_original: treatment.total_final || 0,
          total_descuento: 0,
          total_final: treatment.total_final || 0,
          moneda: treatment.moneda || 'HNL',
          tipo_descuento: 'ninguno' as const,
          valor_descuento: 0,
          notas_doctor: undefined,
          firma_paciente_url: undefined,
          especialidad: undefined,
          estado: treatment.estado || 'pendiente_firma',
          monto_pagado: treatment.monto_pagado,
          saldo_pendiente: (treatment.total_final || 0) - (treatment.monto_pagado || 0),
          estado_pago: treatment.estado === 'pagado' ? 'pagado' as const : 'pendiente' as const,
          creado_en: treatment.fecha_cita,
          actualizado_en: treatment.fecha_cita,
          paciente: treatment.patients || null,
          paciente_beneficiario: null,
          tratamientos_realizados: treatmentItems
        };
      });
    } catch (error) {
      console.error('Error fetching completed treatments:', error);
      return [];
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

      // Also fetch inventory items from tratamientos_inventario
      const { data: invItems, error: invError } = await supabase
        .from('tratamientos_inventario')
        .select('*, inventario:inventario(imagen_url)')
        .eq('tratamiento_completado_id', id);

      if (!invError && invItems) {
        (result as any).tratamientos_inventario = invItems.map((item: any) => ({
          ...item,
          imagen_url: item.inventario?.imagen_url || null,
          inventario: undefined,
        }));
      }

      return result;
    } catch (error) {
      console.error('Unexpected error fetching completed treatment:', error);
      throw error;
    }
  }

  static async getCompletedTreatmentsByPatientId(pacienteId: string): Promise<CompletedTreatment[]> {
    try {
      // Fetch treatments where patient is the main patient
      const { data: mainTreatments, error: mainError } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_cita', { ascending: false });

      // Also check if there are separate treatment records where patient is beneficiary
      const { data: separateBeneficiaryTreatments, error: separateError } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .eq('paciente_id', pacienteId)  // Look for treatments where beneficiary is the main patient
        .eq('estado', 'completado')  // Beneficiary treatments are marked as completed
        .ilike('notas_doctor', '%beneficiario%')  // Check if notes mention beneficiary
        .order('fecha_cita', { ascending: false });

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

      // Batch-fetch treatment items for ALL treatments at once
      const treatmentIds = uniqueTreatments.map((t: any) => t.id);
      const { data: allItems } = await supabase
        .from('vista_tratamientos_realizados_detalles')
        .select('*')
        .in('tratamiento_completado_id', treatmentIds)
        .order('creado_en', { ascending: true });

      const itemsByTreatment: Record<string, any[]> = {};
      if (allItems) {
        for (const item of allItems) {
          if (!itemsByTreatment[item.tratamiento_completado_id]) itemsByTreatment[item.tratamiento_completado_id] = [];
          itemsByTreatment[item.tratamiento_completado_id].push(item);
        }
      }

      // Batch-fetch patient data for ALL unique pacientes
      const pacienteIds = [...new Set(uniqueTreatments.map((t: any) => t.paciente_id).filter(Boolean))];
      const { data: allPatients } = await supabase
        .from('patients')
        .select('*')
        .in('paciente_id', pacienteIds);

      const patientMap: Record<string, any> = {};
      if (allPatients) {
        for (const p of allPatients) {
          patientMap[p.paciente_id] = p;
        }
      }

      const treatmentsWithItems = uniqueTreatments.map((treatment: any) => ({
        ...treatment,
        tratamientos_realizados: itemsByTreatment[treatment.id] || [],
        paciente: patientMap[treatment.paciente_id] || {},
        paciente_beneficiario: treatment.beneficiario_nombre_completo ? {
          nombre_completo: treatment.beneficiario_nombre_completo,
          numero_identidad: treatment.beneficiario_numero_identidad,
          telefono: treatment.beneficiario_telefono,
          email: treatment.beneficiario_email
        } : null
      }));

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

      // Filter out inventory-only items (they use inv_ prefix as tratamiento_id)
      const realTreatmentItems = treatmentData.tratamientos_realizados?.filter(
        item => !String(item.tratamiento_id).startsWith('inv_')
      ) ?? [];

      // Insert treatment items into tratamientos_realizados table
      if (realTreatmentItems.length > 0) {
        // Validate all doctor IDs in treatment items
        for (const item of realTreatmentItems) {
          if (item.doctor_id) {
            const doctorValidation = await DoctorValidator.validateDoctorId(item.doctor_id);
            if (!doctorValidation.isValid) {
              throw new Error(`Invalid doctor ID in treatment item "${item.nombre_tratamiento}": ${doctorValidation.error}`);
            }
          }
        }

        const treatmentItems = realTreatmentItems.map(item => ({
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
        if (String(item.tratamiento_id).startsWith('inv_')) continue;
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

      // Insert inventory items into tratamientos_inventario table
      const inventarioItems = treatmentData.tratamientos_realizados?.filter(
        item => String(item.tratamiento_id).startsWith('inv_')
      ) ?? [];

      if (inventarioItems.length > 0) {
        const inventarioInserts = await Promise.all(inventarioItems.map(async (item) => {
          const inventarioId = String(item.tratamiento_id).replace('inv_', '');
          return {
            tratamiento_completado_id: treatmentId,
            inventario_id: inventarioId,
            nombre: item.nombre_tratamiento,
            codigo: item.codigo_tratamiento,
            cantidad: item.cantidad,
            precio: item.precio_final,
            moneda: item.moneda,
            notas: item.notas,
            created_at: new Date().toISOString(),
          };
        }));

        const { error: invError } = await supabase
          .from('tratamientos_inventario')
          .insert(inventarioInserts);

        // Decrement stock_actual for each inventory item used
        for (const invItem of inventarioItems) {
          const inventarioId = String(invItem.tratamiento_id).replace('inv_', '');
          const cantidad = invItem.cantidad || 1;

          const { data: current } = await supabase
            .from('inventario')
            .select('stock_actual')
            .eq('id', inventarioId)
            .single();

          if (current) {
            const newStock = Math.max(0, current.stock_actual - cantidad);
            await supabase
              .from('inventario')
              .update({ stock_actual: newStock, updated_at: new Date().toISOString() })
              .eq('id', inventarioId);
          }

          // Register movement record for audit trail
          try {
            await supabase
              .from('movimientos_inventario')
              .insert([{
                inventario_id: inventarioId,
                tipo: 'salida',
                cantidad,
                notas: `Venta: ${invItem.nombre_tratamiento}`,
                tratamiento_completado_id: treatmentId,
                created_at: new Date().toISOString(),
              }])
              .select()
              .maybeSingle();
          } catch (movError) {
            console.warn('Could not register movement (table may not exist):', movError);
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

      // Batch-fetch treatment items for ALL results at once
      const treatmentIds = (data || []).map((t: any) => t.id);
      const { data: allItems } = await supabase
        .from('vista_tratamientos_realizados_detalles')
        .select('*')
        .in('tratamiento_completado_id', treatmentIds)
        .order('creado_en', { ascending: true });

      const itemsByTreatment: Record<string, any[]> = {};
      if (allItems) {
        for (const item of allItems) {
          if (!itemsByTreatment[item.tratamiento_completado_id]) itemsByTreatment[item.tratamiento_completado_id] = [];
          itemsByTreatment[item.tratamiento_completado_id].push(item);
        }
      }

      const treatmentsWithItems = (data || []).map((treatment: any) => ({
        ...treatment,
        tratamientos_realizados: itemsByTreatment[treatment.id] || []
      }));

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

      // Batch-fetch treatment items for ALL results at once
      const treatmentIds = (data || []).map((t: any) => t.id);
      const { data: allItems } = await supabase
        .from('vista_tratamientos_realizados_detalles')
        .select('*')
        .in('tratamiento_completado_id', treatmentIds)
        .order('creado_en', { ascending: true });

      const itemsByTreatment: Record<string, any[]> = {};
      if (allItems) {
        for (const item of allItems) {
          if (!itemsByTreatment[item.tratamiento_completado_id]) itemsByTreatment[item.tratamiento_completado_id] = [];
          itemsByTreatment[item.tratamiento_completado_id].push(item);
        }
      }

      const treatmentsWithItems = (data || []).map((treatment: any) => ({
        ...treatment,
        tratamientos_realizados: itemsByTreatment[treatment.id] || []
      }));

      return treatmentsWithItems;
    } catch (error) {
      console.error('Unexpected error fetching completed treatments by date range:', error);
      throw error;
    }
  }

  // ========================================
  // Statistics and Analytics
  // ========================================

  static async getCompletedTreatmentsByDoctor(doctorName: string): Promise<CompletedTreatment[]> {
    try {
      // Join with treatment items to get doctor information
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select(`
          *,
          tratamientos_realizados (*),
          paciente:patients (*),
          paciente_beneficiario:patients (*),
          vista_tratamientos_realizados_detalles!inner (
            doctor_name
          )
        `)
        .eq('vista_tratamientos_realizados_detalles.doctor_name', doctorName)
        .order('fecha_cita', { ascending: false });

      if (error) {
        console.error('Error fetching treatments by doctor:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching treatments by doctor:', error);
      throw error;
    }
  }

  static async getDoctorRevenue(doctorName: string): Promise<number> {
    try {
      // Join with treatment items to get doctor information
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select(`
          total_final,
          vista_tratamientos_realizados_detalles!inner (
            doctor_name
          )
        `)
        .eq('vista_tratamientos_realizados_detalles.doctor_name', doctorName)
        .eq('estado', 'pagado');

      if (error) {
        console.error('Error fetching doctor revenue:', error);
        throw error;
      }

      return data?.reduce((sum, treatment) => sum + treatment.total_final, 0) || 0;
    } catch (error) {
      console.error('Unexpected error fetching doctor revenue:', error);
      throw error;
    }
  }

  static async getDoctorAverageRevenue(doctorName: string): Promise<number> {
    try {
      // Join with treatment items to get doctor information
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select(`
          total_final,
          vista_tratamientos_realizados_detalles!inner (
            doctor_name
          )
        `)
        .eq('vista_tratamientos_realizados_detalles.doctor_name', doctorName)
        .eq('estado', 'pagado');

      if (error) {
        console.error('Error fetching doctor average revenue:', error);
        throw error;
      }

      if (!data || data.length === 0) return 0;
      const total = data.reduce((sum, treatment) => sum + treatment.total_final, 0);
      return total / data.length;
    } catch (error) {
      console.error('Unexpected error fetching doctor average revenue:', error);
      throw error;
    }
  }

  static async getDoctorStatistics(): Promise<any> {
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

  static async getPatientTreatmentStatistics(pacienteId: string): Promise<any> {
    try {
      // Fetch treatments for the specific patient
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select('*')
        .eq('paciente_id', pacienteId);

      if (error) {
        console.error('Error fetching patient treatment statistics:', error);
        throw error;
      }

      const treatments = data || [];
      
      // Calculate statistics
      const totalTreatments = treatments.length;
      const totalAmountPaid = treatments.reduce((sum, t) => {
        const paidAmount = t.monto_pagado || 0;
        return sum + parseFloat(paidAmount.toString());
      }, 0);
      const totalAmountBilled = treatments.reduce((sum, t) => sum + parseFloat(t.total_final), 0);
      const totalDiscount = treatments.reduce((sum, t) => sum + parseFloat(t.total_descuento), 0);
      
      const treatmentsByStatus = {
        pendiente_firma: treatments.filter(t => t.estado === 'pendiente_firma').length,
        firmado: treatments.filter(t => t.estado === 'firmado').length,
        pagado: treatments.filter(t => t.estado === 'pagado').length
      };

      const averageTreatmentValue = totalTreatments > 0 ? totalAmountBilled / totalTreatments : 0;
      
      // Get latest treatment date
      const latestTreatmentDate = treatments.length > 0 
        ? treatments.reduce((latest, current) => {
            const latestDate = new Date(latest.fecha_cita);
            const currentDate = new Date(current.fecha_cita);
            return currentDate > latestDate ? current : latest;
          }).fecha_cita
        : null;
      
      return {
        total_treatments: totalTreatments,
        total_amount_paid: totalAmountPaid,
        total_amount_billed: totalAmountBilled,
        total_discount: totalDiscount,
        average_treatment_value: averageTreatmentValue,
        treatments_by_status: treatmentsByStatus,
        latest_treatment_date: latestTreatmentDate,
        currency: treatments.length > 0 ? treatments[0].moneda : 'USD'
      };
    } catch (error) {
      console.error('Unexpected error fetching patient treatment statistics:', error);
      throw error;
    }
  }

  static async getIndividualTreatmentsCountByDoctor(doctorName: string): Promise<number> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstOfMonth = new Date(year, month, 1);
      const firstOfNextMonth = new Date(year, month + 1, 1);
      
      const { data, error } = await supabase
        .from('vista_tratamientos_realizados_detalles')
        .select('id')
        .eq('doctor_name', doctorName)
        .gte('creado_en', firstOfMonth.toISOString())
        .lt('creado_en', firstOfNextMonth.toISOString());

      if (error) {
        console.error('Error fetching individual treatments count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Unexpected error fetching individual treatments count:', error);
      return 0;
    }
  }

  static async getCompletedTreatmentsCountByDoctor(doctorName: string): Promise<number> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstOfMonth = new Date(year, month, 1);
      const firstOfNextMonth = new Date(year, month + 1, 1);
      
      const { data, error } = await supabase
        .from('tratamientos_completados')
        .select(`
          id,
          fecha_cita,
          vista_tratamientos_realizados_detalles!inner (
            doctor_name
          )
        `)
        .eq('vista_tratamientos_realizados_detalles.doctor_name', doctorName)
        .gte('fecha_cita', firstOfMonth.toISOString().split('T')[0])
        .lt('fecha_cita', firstOfNextMonth.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching completed treatments count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Unexpected error fetching completed treatments count:', error);
      return 0;
    }
  }
}
