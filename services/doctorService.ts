import { supabase } from '../lib/supabase';
import { Doctor } from '../config/doctors';

export class DoctorService {
  static async getDoctors(): Promise<Doctor[]> {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching doctors:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching doctors:', error);
      throw error;
    }
  }

  static async getDoctorById(id: string): Promise<Doctor | null> {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching doctor:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching doctor:', error);
      throw error;
    }
  }

  static async createDoctor(doctorData: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>): Promise<Doctor> {
    try {
      // Basic validation only
      if (!doctorData.name || doctorData.name.trim() === '') {
        throw new Error('Doctor name is required');
      }
      if (doctorData.name.length < 3) {
        throw new Error('Doctor name must be at least 3 characters');
      }
      if (!doctorData.specialty || doctorData.specialty.trim() === '') {
        throw new Error('Specialty is required');
      }

      const { data, error } = await supabase
        .from('doctors')
        .insert([{
          ...doctorData,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating doctor:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating doctor:', error);
      throw error;
    }
  }

  static async updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor | null> {
    try {
      if (updates.name && updates.name.trim() === '') {
        throw new Error('Doctor name cannot be empty');
      }

      const { data, error } = await supabase
        .from('doctors')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating doctor:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating doctor:', error);
      throw error;
    }
  }

  static async deleteDoctor(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting doctor:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error deleting doctor:', error);
      throw error;
    }
  }

  static async getDoctorsBySpecialty(specialty: string): Promise<Doctor[]> {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('specialty', specialty)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching doctors by specialty:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching doctors by specialty:', error);
      throw error;
    }
  }

  static async getDoctorByUserId(userId: string): Promise<Doctor | null> {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        // P0000 might happen if user doesn't exist in doctor table
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching doctor by user ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching doctor by user ID:', error);
      throw error;
    }
  }

  static async uploadProfileImage(file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `doctor-profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('doctor-profiles')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading profile image:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('doctor-profiles')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading profile image:', error);
      throw error;
    }
  }
}
