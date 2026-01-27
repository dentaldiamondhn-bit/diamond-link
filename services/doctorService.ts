import { Doctor, getAvailableDoctors } from '../config/doctors';
import { DoctorValidator } from '../utils/doctorValidator';

export class DoctorService {
  // In a real implementation, this would interact with a database
  // For now, we'll use localStorage for persistence
  
  static getStorageKey(): string {
    return 'clinica_doctores_config';
  }

  static async getDoctors(): Promise<Doctor[]> {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
          return JSON.parse(stored);
        }
      }
      // Return dynamic doctors from config
      return getAvailableDoctors();
    } catch (error) {
      console.error('Error getting doctors:', error);
      return getAvailableDoctors();
    }
  }

  static async saveDoctors(doctors: Doctor[]): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(doctors));
      }
    } catch (error) {
      console.error('Error saving doctors:', error);
      throw error;
    }
  }

  static async addDoctor(doctor: Omit<Doctor, 'id'>): Promise<Doctor> {
    const doctors = await this.getDoctors();
    const newDoctor: Doctor = {
      ...doctor,
      id: `doctor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    const updatedDoctors = [...doctors, newDoctor];
    await this.saveDoctors(updatedDoctors);
    return newDoctor;
  }

  static async updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor | null> {
    const doctors = await this.getDoctors();
    const index = doctors.findIndex(d => d.id === id);
    
    if (index === -1) {
      throw new Error('Doctor not found');
    }
    
    const updatedDoctors = [...doctors];
    updatedDoctors[index] = { ...updatedDoctors[index], ...updates };
    await this.saveDoctors(updatedDoctors);
    return updatedDoctors[index];
  }

  static async deleteDoctor(id: string): Promise<boolean> {
    const doctors = await this.getDoctors();
    const updatedDoctors = doctors.filter(d => d.id !== id);
    
    if (updatedDoctors.length === doctors.length) {
      return false; // No doctor was removed
    }
    
    await this.saveDoctors(updatedDoctors);
    return true;
  }

  static async getDoctorById(id: string): Promise<Doctor | null> {
    const doctors = await this.getDoctors();
    return doctors.find(d => d.id === id) || null;
  }

  static async getDoctorsBySpecialty(specialty: string): Promise<Doctor[]> {
    const doctors = await this.getDoctors();
    return doctors.filter(d => d.specialty === specialty);
  }

  static async searchDoctors(query: string): Promise<Doctor[]> {
    const doctors = await this.getDoctors();
    const lowercaseQuery = query.toLowerCase();
    
    return doctors.filter(doctor => 
      doctor.name.toLowerCase().includes(lowercaseQuery) ||
      doctor.specialty.toLowerCase().includes(lowercaseQuery)
    );
  }

  static async validateDoctor(doctor: Partial<Doctor>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!doctor.name || doctor.name.trim() === '') {
      errors.push('El nombre del doctor es requerido');
    }
    
    if (!doctor.specialty || doctor.specialty.trim() === '') {
      errors.push('La especialidad es requerida');
    }
    
    if (doctor.name && doctor.name.length < 3) {
      errors.push('El nombre del doctor debe tener al menos 3 caracteres');
    }
    
    if (doctor.specialty && doctor.specialty.length < 2) {
      errors.push('La especialidad debe tener al menos 2 caracteres');
    }
    
    // Validate email format if provided
    if (doctor.user_email && doctor.user_email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(doctor.user_email)) {
        errors.push('El email del usuario no es válido');
      }
    }
    
    // Check for duplicate names (if updating, exclude current doctor)
    if (doctor.name && doctor.id) {
      const doctors = await this.getDoctors();
      const duplicate = doctors.find(d => 
        d.name.toLowerCase() === doctor.name!.toLowerCase() && d.id !== doctor.id
      );
      if (duplicate) {
        errors.push('Ya existe un doctor con este nombre');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // For server-side usage (API endpoints)
  static getServerDoctors(): Doctor[] {
    // In a real implementation, this would fetch from database
    // For now, return dynamic configuration
    return getAvailableDoctors();
  }

  static async exportDoctors(): Promise<string> {
    const doctors = await this.getDoctors();
    return JSON.stringify(doctors, null, 2);
  }

  static async importDoctors(jsonData: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
    try {
      const importedDoctors: Doctor[] = JSON.parse(jsonData);
      const errors: string[] = [];
      let imported = 0;

      // Validate each doctor
      for (const doctor of importedDoctors) {
        const validation = await this.validateDoctor(doctor);
        if (!validation.isValid) {
          errors.push(`Doctor "${doctor.name}": ${validation.errors.join(', ')}`);
          continue;
        }

        // Check for duplicates
        const existingDoctors = await this.getDoctors();
        const duplicate = existingDoctors.find(d => 
          d.name.toLowerCase() === doctor.name.toLowerCase()
        );
        
        if (duplicate) {
          errors.push(`Doctor "${doctor.name}" ya existe`);
          continue;
        }

        // Add the doctor
        await this.addDoctor(doctor);
        imported++;
      }

      return {
        success: errors.length === 0,
        imported,
        errors
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: ['Error parsing JSON data']
      };
    }
  }
}
