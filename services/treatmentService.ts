import { Currency } from '../utils/currencyUtils';
import { Treatment, Promotion } from '../types/treatment';
import { Paquete, PaqueteTratamiento } from '../types/paquete';
import { supabase } from '../lib/supabase';

export class TreatmentService {
  // Specialty to code prefix mapping
  private static readonly SPECIALTY_PREFIXES: { [key: string]: string } = {
    // From tratamientos-completados page
    'Preventiva': 'PR',
    'Diagnostico': 'DX',
    'Laboratiorio': 'LA',
    'Endodoncia': 'EN',
    'Paido': 'PA',
    'PERIO': 'PE',
    'CIRU': 'CI',
    'General': 'GX',
    // From tratamientos page
    'Odontología General': 'OG',
    'Ortodoncia': 'OR',
    'Periodoncia': 'PE',
    'Cirugía Oral y Maxilofacial': 'CI',
    'Odontopediatría': 'OP',
    'Rehabilitación Oral': 'RO',
    'Implantología': 'IM',
    'Operatoria': 'OPR',
    'Estetica': 'ES',
    'Patología Bucal': 'PB',
    'Radiología Dental': 'RD',
    'Sal Pública Dental': 'SP'
  };

  // Generate next available code for a specialty
  static async generateNextCode(specialty: string): Promise<string> {
    try {
      const prefix = this.SPECIALTY_PREFIXES[specialty];
      if (!prefix) {
        throw new Error(`No code prefix found for specialty: ${specialty}`);
      }

      // Get existing treatments for this specialty
      const { data: existingTreatments, error } = await supabase
        .from('tratamientos')
        .select('codigo')
        .eq('especialidad', specialty)
        .like('codigo', `${prefix}%`)
        .order('codigo', { ascending: false });

      if (error) {
        console.error('Error fetching existing treatments:', error);
        throw error;
      }

      // Extract existing numbers and find the next one
      const existingNumbers = existingTreatments?.map(t => {
        const match = t.codigo.match(new RegExp(`^${prefix}(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      }) || [];

      const maxNumber = Math.max(...existingNumbers, 0);
      const nextNumber = maxNumber + 1;
      
      // Format with leading zeros (2 digits)
      return `${prefix}${nextNumber.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error generating next code:', error);
      throw error;
    }
  }

  // Generate next available promotion code
  static async generateNextPromotionCode(): Promise<string> {
    try {
      // Get existing promotions
      const { data: existingPromotions, error } = await supabase
        .from('promociones')
        .select('codigo')
        .like('codigo', 'P%')
        .order('codigo', { ascending: false });

      if (error) {
        console.error('Error fetching existing promotions:', error);
        throw error;
      }

      // Extract existing numbers and find the next one
      const existingNumbers = existingPromotions?.map(p => {
        const match = p.codigo.match(/^P(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      }) || [];

      const maxNumber = Math.max(...existingNumbers, 0);
      const nextNumber = maxNumber + 1;
      
      // Format with leading zeros (3 digits for promotions)
      return `P${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating next promotion code:', error);
      throw error;
    }
  }
  // Tratamientos CRUD operations
  static async createTreatment(treatmentData: Omit<Treatment, 'id' | 'creado_en' | 'actualizado_en'>) {
    try {
      const { data, error } = await supabase
        .from('tratamientos')
        .insert([{
          codigo: treatmentData.codigo,
          nombre: treatmentData.nombre,
          especialidad: treatmentData.especialidad,
          precio: treatmentData.precio,
          moneda: treatmentData.moneda,
          notas: treatmentData.notas || null,
          veces_realizado: treatmentData.veces_realizado,
          activo: treatmentData.activo,
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('Error creating treatment:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Unexpected error creating treatment:', error);
      throw error;
    }
  }

  static async getTreatments() {
    try {
      const { data, error } = await supabase
        .from('tratamientos')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error fetching treatments:', error);
        // Check if it's a "relation does not exist" error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log('tratamientos table does not exist, returning empty array');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching treatments:', error);
      // Check if it's a "relation does not exist" error
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.log('tratamientos table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }

  static async getTreatmentById(id: number) {
    try {
      const { data, error } = await supabase
        .from('tratamientos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.error('Treatment not found:', id);
          throw new Error('Tratamiento no encontrado');
        }
        console.error('Error fetching treatment:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching treatment:', error);
      throw error;
    }
  }

  static async updateTreatment(id: number, updates: Partial<Treatment>) {
    try {
      const { data, error } = await supabase
        .from('tratamientos')
        .update({
          ...updates,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating treatment:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Tratamiento no encontrado');
      }

      return data[0];
    } catch (error) {
      console.error('Unexpected error updating treatment:', error);
      throw error;
    }
  }

  static async deleteTreatment(id: number) {
    try {
      const { error } = await supabase
        .from('tratamientos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting treatment:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting treatment:', error);
      throw error;
    }
  }

  static async incrementTreatmentCounter(id: number, increment: number = 1) {
    try {
      // First get current treatment to get current counter
      const treatment = await this.getTreatmentById(id);
      
      if (!treatment) {
        throw new Error('Tratamiento no encontrado');
      }

      // Increment the counter
      const { data, error } = await supabase
        .from('tratamientos')
        .update({
          veces_realizado: treatment.veces_realizado + increment,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error incrementing treatment counter:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Tratamiento no encontrado');
      }

      return data[0];
    } catch (error) {
      console.error('Unexpected error incrementing treatment counter:', error);
      throw error;
    }
  }

  static async searchTreatments(searchTerm: string): Promise<Treatment[]> {
    try {
      const { data, error } = await supabase
        .from('tratamientos')
        .select('*')
        .or(`nombre.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%,especialidad.ilike.%${searchTerm}%,notas.ilike.%${searchTerm}%`)
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error searching treatments:', error);
        // Check if it's a "relation does not exist" error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log('tratamientos table does not exist, returning empty array');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchTreatments:', error);
      // Check if it's a "relation does not exist" error
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.log('tratamientos table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }

  // Promociones CRUD operations
  static async createPromotion(promotionData: Omit<Promotion, 'id' | 'creado_en' | 'actualizado_en'>) {
    try {
      const { data, error } = await supabase
        .from('promociones')
        .insert([{
          codigo: promotionData.codigo,
          nombre: promotionData.nombre,
          descuento: promotionData.descuento,
          precio_original: promotionData.precio_original,
          precio_promocional: promotionData.precio_promocional,
          moneda: promotionData.moneda,
          fecha_inicio: promotionData.fecha_inicio,
          fecha_fin: promotionData.fecha_fin,
          activo: promotionData.activo,
          veces_realizado: 0, // Start at 0 for new promotions
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('Error creating promotion:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Unexpected error creating promotion:', error);
      throw error;
    }
  }

  static async getPromotions() {
    try {
      const { data, error } = await supabase
        .from('promociones')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error fetching promotions:', error);
        // Check if it's a "relation does not exist" error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log('promociones table does not exist, returning empty array');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching promotions:', error);
      // Check if it's a "relation does not exist" error
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.log('promociones table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }

  static async getPromotionById(id: number) {
    try {
      const { data, error } = await supabase
        .from('promociones')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.error('Promotion not found:', id);
          throw new Error('Promoción no encontrada');
        }
        console.error('Error fetching promotion:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching promotion:', error);
      throw error;
    }
  }

  static async updatePromotion(id: number, updates: Partial<Promotion>) {
    try {
      const { data, error } = await supabase
        .from('promociones')
        .update({
          ...updates,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating promotion:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Promoción no encontrada');
      }

      return data[0];
    } catch (error) {
      console.error('Unexpected error updating promotion:', error);
      throw error;
    }
  }

  static async deletePromotion(id: number) {
    try {
      const { error } = await supabase
        .from('promociones')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting promotion:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting promotion:', error);
      throw error;
    }
  }

  static async incrementPromotionCounter(id: number) {
    try {
      // First get current promotion to get current counter
      const promotion = await this.getPromotionById(id);
      
      if (!promotion) {
        throw new Error('Promoción no encontrada');
      }

      // Increment the counter
      const { data, error } = await supabase
        .from('promociones')
        .update({
          veces_realizado: promotion.veces_realizado + 1,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error incrementing promotion counter:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Promoción no encontrada');
      }

      return data[0];
    } catch (error) {
      console.error('Unexpected error incrementing promotion counter:', error);
      throw error;
    }
  }

  // Paquetes CRUD operations
  static async getPaquetes(): Promise<Paquete[]> {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error fetching paquetes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching paquetes:', error);
      throw error;
    }
  }

  static async createPaquete(paqueteData: Omit<Paquete, 'id' | 'creado_en' | 'actualizado_en'>): Promise<Paquete> {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .insert([{
          codigo: paqueteData.codigo,
          nombre: paqueteData.nombre,
          descripcion: paqueteData.descripcion || null,
          precio_total: paqueteData.precio_total,
          moneda: paqueteData.moneda,
          max_pacientes: paqueteData.max_pacientes,
          veces_vendido: 0,
          activo: paqueteData.activo,
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating paquete:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating paquete:', error);
      throw error;
    }
  }

  static async updatePaquete(id: number, paqueteData: Partial<Paquete>): Promise<Paquete> {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .update({
          ...paqueteData,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating paquete:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating paquete:', error);
      throw error;
    }
  }

  static async deletePaquete(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('paquetes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting paquete:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error deleting paquete:', error);
      throw error;
    }
  }

  static async getPaqueteById(id: number): Promise<Paquete> {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching paquete:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Paquete no encontrado');
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching paquete:', error);
      throw error;
    }
  }

  static async addTratamientoToPaquete(paqueteId: number, tratamientoId: number, cantidad: number = 1): Promise<void> {
    try {
      const { error } = await supabase
        .from('paquetes_tratamientos')
        .insert([{
          paquete_id: paqueteId,
          tratamiento_id: tratamientoId,
          cantidad: cantidad
        }]);

      if (error) {
        console.error('Error adding tratamiento to paquete:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error adding tratamiento to paquete:', error);
      throw error;
    }
  }

  static async removeTratamientoFromPaquete(paqueteId: number, tratamientoId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('paquetes_tratamientos')
        .delete()
        .eq('paquete_id', paqueteId)
        .eq('tratamiento_id', tratamientoId);

      if (error) {
        console.error('Error removing tratamiento from paquete:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error removing tratamiento from paquete:', error);
      throw error;
    }
  }

  static async getPaqueteTratamientos(paqueteId: number): Promise<PaqueteTratamiento[]> {
    try {
      const { data, error } = await supabase
        .from('paquetes_tratamientos')
        .select(`
          *,
          tratamiento:tratamientos!inner(
            id,
            codigo,
            nombre,
            especialidad,
            precio,
            moneda
          )
        `)
        .eq('paquete_id', paqueteId);

      if (error) {
        console.error('Error fetching paquete tratamientos:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching paquete tratamientos:', error);
      throw error;
    }
  }

  static async generateNextPaqueteCode(): Promise<string> {
    try {
      // Get existing paquetes
      const { data: existingPaquetes, error } = await supabase
        .from('paquetes')
        .select('codigo')
        .like('codigo', 'B%')
        .order('codigo', { ascending: false });

      if (error) {
        console.error('Error fetching existing paquetes:', error);
        throw error;
      }

      // Extract existing numbers and find next one
      const existingNumbers = existingPaquetes?.map(p => {
        const match = p.codigo.match(/^B(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      }) || [];

      const maxNumber = Math.max(...existingNumbers, 0);
      const nextNumber = maxNumber + 1;
      
      // Format with leading zeros (3 digits for paquetes)
      return `B${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating next paquete code:', error);
      throw error;
    }
  }

  static async searchPaquetes(searchTerm: string): Promise<Paquete[]> {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .or(`nombre.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%`)
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error searching paquetes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error searching paquetes:', error);
      throw error;
    }
  }

  static async searchPromotions(searchTerm: string): Promise<Promotion[]> {
    try {
      const { data, error } = await supabase
        .from('promociones')
        .select('*')
        .or(`nombre.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%`)
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error searching promotions:', error);
        // Check if it's a "relation does not exist" error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log('promociones table does not exist, returning empty array');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchPromotions:', error);
      // Check if it's a "relation does not exist" error
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.log('promociones table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }
}
