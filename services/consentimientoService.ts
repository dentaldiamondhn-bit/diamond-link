import { supabase } from '../lib/supabase';

export interface Consentimiento {
  id?: string;
  paciente_id: string;
  tipo_consentimiento: string;
  nombre_consentimiento: string;
  descripcion: string;
  contenido: string;
  fecha_consentimiento: string;
  firma_paciente_url?: string;
  firma_doctor_url?: string;
  estado: 'activo' | 'firmado' | 'cancelado';
  is_historical?: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ConsentimientoWithPatient extends Consentimiento {
  patients?: {
    nombre_completo: string;
    numero_identidad: string;
    direccion: string;
    doctor: string;
  };
}

class ConsentimientoService {
  async createConsentimiento(consentimiento: Omit<Consentimiento, 'id' | 'creado_en' | 'actualizado_en'>): Promise<Consentimiento> {
    const { data, error } = await supabase
      .from('consentimientos')
      .insert([{
        ...consentimiento,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating consentimiento:', error);
      throw error;
    }

    return data;
  }

  async updateConsentimiento(id: string, updates: Partial<Consentimiento>): Promise<Consentimiento> {
    const { data, error } = await supabase
      .from('consentimientos')
      .update({
        ...updates,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating consentimiento:', error);
      throw error;
    }

    return data;
  }

  async getConsentimientoById(id: string): Promise<ConsentimientoWithPatient | null> {
    const { data, error } = await supabase
      .from('consentimientos')
      .select(`
        *,
        patients (
          nombre_completo,
          numero_identidad,
          direccion,
          doctor
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching consentimiento:', error);
      return null;
    }

    return data;
  }

  async getConsentimientosByPaciente(pacienteId: string): Promise<ConsentimientoWithPatient[]> {
    const { data, error } = await supabase
      .from('consentimientos')
      .select(`
        *,
        patients (
          nombre_completo,
          numero_identidad,
          direccion,
          doctor
        )
      `)
      .eq('paciente_id', pacienteId)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error fetching consentimientos by patient:', error);
      throw error;
    }

    return data || [];
  }

  async getAllConsentimientos(): Promise<ConsentimientoWithPatient[]> {
    // First try without patient join, then fetch patient data separately
    const { data: consentimientosData, error: consentimientosError } = await supabase
      .from('consentimientos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (consentimientosError) {
      console.error('Error fetching consentimientos:', consentimientosError);
      throw consentimientosError;
    }

    // If we have consentimientos, try to fetch patient data for each one
    const consentimientosWithPatients = await Promise.all(
      consentimientosData.map(async (consentimiento) => {
        let patientInfo = null;
        if (consentimiento.paciente_id) {
          try {
            const { data: patientData, error: patientError } = await supabase
              .from('patients')
              .select('nombre_completo, numero_identidad, direccion, doctor')
              .eq('paciente_id', consentimiento.paciente_id)
              .single();
            
            if (!patientError && patientData) {
              patientInfo = patientData;
            }
          } catch (error) {
            console.error('Error fetching patient for consentimiento:', error);
          }
        }
        
        return {
          ...consentimiento,
          patients: patientInfo
        };
      })
    );

    return consentimientosWithPatients;
  }

  async deleteConsentimiento(id: string): Promise<void> {
    // First get the consentimiento to delete associated signatures
    const consentimiento = await this.getConsentimientoById(id);
    
    if (consentimiento) {
      // Delete signature files from storage
      if (consentimiento.firma_paciente_url) {
        await this.deleteSignatureFile(consentimiento.firma_paciente_url);
      }
      if (consentimiento.firma_doctor_url) {
        await this.deleteSignatureFile(consentimiento.firma_doctor_url);
      }
    }

    // Delete the consentimiento record
    const { error } = await supabase
      .from('consentimientos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting consentimiento:', error);
      throw error;
    }
  }

  async uploadSignature(file: File, consentimientoId: string, type: 'paciente' | 'doctor'): Promise<string> {
    try {
      // Import the server action
      const { uploadSignatureAction } = await import('../app/actions/uploadSignature');

      // Convert File to base64 string
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('Uploading signature via server action:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        consentimientoId,
        type
      });

      const publicUrl = await uploadSignatureAction(
        base64String as string,
        file.name,
        consentimientoId,
        type
      );
      
      console.log('Upload successful via server action:', publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadSignature:', error);
      throw error;
    }
  }

  async uploadSignatureFromBase64(base64Data: string, consentimientoId: string, type: 'paciente' | 'doctor'): Promise<string> {
    // Convert base64 to File
    const response = await fetch(base64Data);
    const blob = await response.blob();
    const file = new File([blob], `signature_${type}.png`, { type: 'image/png' });

    return this.uploadSignature(file, consentimientoId, type);
  }

  async deleteSignatureFile(fileUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(fileUrl);
      const fullPath = url.pathname;
      // Remove bucket name from path (everything before and including '/public/')
      const filePath = fullPath.split('/public/').pop() || fullPath.split('/').pop();
      
      if (filePath) {
        const { error } = await supabase.storage
          .from('consentimientos_signature')
          .remove([filePath]);

        if (error) {
          console.error('Error deleting signature file:', error);
        }
      }
    } catch (error) {
      console.error('Error parsing file URL:', error);
    }
  }

  async getConsentimientosByType(tipo: string): Promise<ConsentimientoWithPatient[]> {
    const { data, error } = await supabase
      .from('consentimientos')
      .select(`
        *,
        patients (
          nombre_completo,
          numero_identidad,
          direccion,
          doctor
        )
      `)
      .eq('tipo_consentimiento', tipo)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error fetching consentimientos by type:', error);
      throw error;
    }

    return data || [];
  }

  async getConsentimientoStats(): Promise<{
    total: number;
    activos: number;
    firmados: number;
    porTipo: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('consentimientos')
      .select('tipo_consentimiento, estado');

    if (error) {
      console.error('Error fetching consentimiento stats:', error);
      throw error;
    }

    const consentimientos = data || [];
    const stats = {
      total: consentimientos.length,
      activos: consentimientos.filter(c => c.estado === 'activo').length,
      firmados: consentimientos.filter(c => c.estado === 'firmado').length,
      porTipo: consentimientos.reduce((acc, c) => {
        acc[c.tipo_consentimiento] = (acc[c.tipo_consentimiento] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return stats;
  }
}

export const consentimientoService = new ConsentimientoService();
