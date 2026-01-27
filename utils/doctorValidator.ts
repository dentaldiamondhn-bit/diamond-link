import { AVAILABLE_DOCTORS, AVAILABLE_SPECIALTIES, isValidDoctor, isValidSpecialty } from '../config/doctors';

// Validation functions for doctor-related API requests
export class DoctorValidator {
  /**
   * Validates if a doctor name is in the approved list
   * For new doctor creation, allow any name (basic validation only)
   * For existing operations, check against approved list
   */
  static validateDoctorName(doctorName: string, allowNewDoctors: boolean = false): { isValid: boolean; error?: string } {
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

    // For existing operations, check against approved list
    if (!isValidDoctor(doctorName)) {
      return { 
        isValid: false, 
        error: `Invalid doctor: ${doctorName}. Must be one of: ${AVAILABLE_DOCTORS.map(d => d.name).join(', ')} or 'otro'` 
      };
    }

    return { isValid: true };
  }

  /**
   * Validates if a doctor ID is in approved list or is a valid UUID
   */
  static validateDoctorId(doctorId: string): { isValid: boolean; error?: string } {
    if (!doctorId || doctorId.trim() === '') {
      return { isValid: false, error: 'Doctor ID is required' };
    }

    // Check if it's a legacy string ID
    const doctor = AVAILABLE_DOCTORS.find(d => d.id === doctorId);
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
      error: `Invalid doctor ID: ${doctorId}. Must be a valid UUID or one of: ${AVAILABLE_DOCTORS.map(d => d.id).join(', ')}` 
    };
  }

  /**
   * Validates patient doctor field
   */
  static validatePatientDoctor(doctor: string, otroDoctor?: string): { isValid: boolean; error?: string } {
    const validation = this.validateDoctorName(doctor);
    
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
  static validateDoctorObject(doctor: { name?: string; specialty?: string }, allowNewDoctors: boolean = false): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const nameValidation = doctor.name ? this.validateDoctorName(doctor.name, allowNewDoctors) : null;
    if (nameValidation && !nameValidation.isValid) {
      errors.push(nameValidation.error || 'Invalid doctor name');
    }

    const specialtyValidation = doctor.specialty ? this.validateSpecialty(doctor.specialty, allowNewDoctors) : null;
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
  static getValidDoctorIds(): string[] {
    return AVAILABLE_DOCTORS.map(d => d.id);
  }
}
