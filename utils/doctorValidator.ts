import { getAvailableDoctors, AVAILABLE_SPECIALTIES, isValidSpecialty } from '../config/doctors';

// Validation functions for doctor-related API requests
export class DoctorValidator {
  /**
   * Validates if a doctor name is in approved list
   * For new doctor creation, allow any name (basic validation only)
   * For existing operations, check against approved list
   */
  static async validateDoctorName(doctorName: string, allowNewDoctors: boolean = false): Promise<{ isValid: boolean; error?: string }> {
    if (!doctorName || doctorName.trim() === '') {
      return { isValid: false, error: 'Doctor name is required' };
    }

    if (doctorName === 'otro') {
      return { isValid: true }; // 'otro' is always valid
    }

    // If this is for creating new doctors, allow any name with basic validation
    if (allowNewDoctors) {
      if (doctorName.length < 3) {
        return { isValid: false, error: 'Doctor name must be at least 3 characters' };
      }
      if (doctorName.length > 255) {
        return { isValid: false, error: 'Doctor name must be less than 255 characters' };
      }
      return { isValid: true };
    }

    // For existing operations, check against approved list from database
    try {
      const availableDoctors = await getAvailableDoctors();
      const isValid = availableDoctors.some(doctor => doctor.name === doctorName);
      
      if (!isValid) {
        return { 
          isValid: false, 
          error: `Invalid doctor: ${doctorName}. Must be one of: ${availableDoctors.map(d => d.name).join(', ')} or 'otro'` 
        };
      }
    } catch (error) {
      console.error('Error validating doctor name:', error);
      return { isValid: false, error: 'Error validating doctor name' };
    }

    return { isValid: true };
  }

  /**
   * Validates if a doctor ID is in approved list or is a valid UUID
   */
  static async validateDoctorId(doctorId: string): Promise<{ isValid: boolean; error?: string }> {
    if (!doctorId || doctorId.trim() === '') {
      return { isValid: false, error: 'Doctor ID is required' };
    }

    try {
      const availableDoctors = await getAvailableDoctors();
      
      // Check if it's a legacy string ID
      const doctor = availableDoctors.find(d => d.id === doctorId);
      if (doctor) {
        return { isValid: true };
      }

      // Check if it's a valid UUID format (for new database doctors)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(doctorId)) {
        return { isValid: true }; // Assume UUID is valid if format is correct
      }

      return { 
        isValid: false, 
        error: `Invalid doctor ID: ${doctorId}. Must be a valid UUID or one of: ${availableDoctors.map(d => d.id).join(', ')}` 
      };
    } catch (error) {
      console.error('Error validating doctor ID:', error);
      return { isValid: false, error: 'Error validating doctor ID' };
    }
  }

  /**
   * Validates patient doctor field
   */
  static async validatePatientDoctor(doctor: string, otroDoctor?: string): Promise<{ isValid: boolean; error?: string }> {
    const validation = await this.validateDoctorName(doctor);
    
    if (!validation.isValid) {
      return validation;
    }

    // If doctor is 'otro', check if otro_doctor is provided
    if (doctor === 'otro' && (!otroDoctor || otroDoctor.trim() === '')) {
      return { 
        isValid: false, 
        error: 'When doctor is "otro", otro_doctor must be specified' 
      };
    }

    return { isValid: true };
  }

  /**
   * Sanitizes and validates doctor input from forms
   */
  static sanitizeDoctorInput(doctor: string): string {
    if (!doctor) return '';
    return doctor.trim();
  }

  /**
   * Validates if a specialty is in approved list
   * For new doctor creation, allow any specialty with basic validation
   */
  static validateSpecialty(specialty: string, allowNewSpecialties: boolean = false): { isValid: boolean; error?: string } {
    if (!specialty || specialty.trim() === '') {
      return { isValid: false, error: 'Specialty is required' };
    }

    // If this is for creating new doctors, allow any specialty with basic validation
    if (allowNewSpecialties) {
      if (specialty.length < 2) {
        return { isValid: false, error: 'Specialty must be at least 2 characters' };
      }
      if (specialty.length > 100) {
        return { isValid: false, error: 'Specialty must be less than 100 characters' };
      }
      return { isValid: true };
    }

    // For existing operations, check against approved list
    if (!isValidSpecialty(specialty)) {
      return { 
        isValid: false, 
        error: `Invalid specialty: ${specialty}. Must be one of: ${AVAILABLE_SPECIALTIES.join(', ')}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Validates complete doctor object (name and specialty)
   * For new doctor creation, allow any name with basic validation
   */
  static async validateDoctorObject(doctor: { name?: string; specialty?: string }, allowNewDoctors: boolean = false): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const nameValidation = doctor.name ? await this.validateDoctorName(doctor.name, allowNewDoctors) : null;
    if (nameValidation && !nameValidation.isValid) {
      errors.push(nameValidation.error || 'Invalid doctor name');
    }

    const specialtyValidation = doctor.specialty ? await this.validateSpecialty(doctor.specialty, allowNewDoctors) : null;
    if (specialtyValidation && !specialtyValidation.isValid) {
      errors.push(specialtyValidation.error || 'Invalid specialty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets all valid doctor IDs for API responses
   */
  static async getValidDoctorIds(): Promise<string[]> {
    try {
      const availableDoctors = await getAvailableDoctors();
      return availableDoctors.map(d => d.id);
    } catch (error) {
      console.error('Error getting valid doctor IDs:', error);
      return [];
    }
  }
}
