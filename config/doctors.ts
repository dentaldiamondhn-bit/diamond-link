// Centralized doctors configuration
// This ensures consistency across all components and pages

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  user_id?: string; // Clerk user ID for authentication
  user_email?: string; // User email for display
  phone?: string;
  license_number?: string;
  consultation_fee?: number;
  bio?: string;
  profile_image_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Default doctors - can be modified through the doctors management page
export const DEFAULT_DOCTORS: Doctor[] = [
  { id: 'dra-sully-calix', name: 'Dra. Sully Calix', specialty: 'Ortodoncia' },
  { id: 'dra-amelia-yanes', name: 'Dra. Amelia Yanes', specialty: 'Endodoncia' },
  { id: 'dra-jimena-molina', name: 'Dra. Jimena Molina', specialty: 'Odontología General' },
  { id: 'dra-melissa-escalante', name: 'Dra. Melissa Escalante', specialty: 'Ortodoncia' },
  { id: 'dr-gustavo-urtecho', name: 'Dr. Gustavo Urtecho', specialty: 'Odontología General' },
  { id: 'dr-jain-reyes', name: 'Dr. Jain Reyes', specialty: 'Odontología General' }
];

// Available specialties - these can be extended as needed
export const AVAILABLE_SPECIALTIES = [
  'Odontología General',
  'Ortodoncia',
  'Endodoncia',
  'Periodoncia',
  'Cirugía Oral y Maxilofacial',
  'Odontopediatría',
  'Rehabilitación Oral',
  'Implantología',
  'Operatoria',
  'Estetica',
  'Patología Bucal',
  'Radiología Dental',
  'Sal Pública Dental'
] as const;

export type Specialty = typeof AVAILABLE_SPECIALTIES[number];

// Get doctors from localStorage or return defaults
export function getAvailableDoctors(): Doctor[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('clinica_doctores_config');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored doctors:', error);
      }
    }
  }
  return DEFAULT_DOCTORS;
}

// For backward compatibility
export const AVAILABLE_DOCTORS = getAvailableDoctors();

// Helper function to get doctor by ID
export function getDoctorById(id: string): Doctor | undefined {
  const doctors = getAvailableDoctors();
  return doctors.find(doctor => doctor.id === id);
}

// Helper function to get doctor by name
export function getDoctorByName(name: string): Doctor | undefined {
  const doctors = getAvailableDoctors();
  return doctors.find(doctor => doctor.name === name);
}

// Helper function to validate if a doctor is valid
export function isValidDoctor(doctorName: string): boolean {
  const doctors = getAvailableDoctors();
  return doctors.some(doctor => doctor.name === doctorName);
}

// Helper function to get doctor by specialty
export function getDoctorsBySpecialty(specialty: string): Doctor[] {
  const doctors = getAvailableDoctors();
  return doctors.filter(doctor => doctor.specialty === specialty);
}

// Helper function to get all unique specialties
export function getUniqueSpecialties(): string[] {
  const doctors = getAvailableDoctors();
  return [...new Set(doctors.map(doctor => doctor.specialty))];
}

// Helper function to validate if a specialty is valid
export function isValidSpecialty(specialty: string): boolean {
  return AVAILABLE_SPECIALTIES.includes(specialty as Specialty);
}

// Helper function to get doctor options for dropdowns (with specialty)
export function getDoctorOptions(): { value: string; label: string; specialty?: string }[] {
  const doctors = getAvailableDoctors();
  return [
    { value: '', label: 'Seleccionar' },
    ...doctors.map(doctor => ({ 
      value: doctor.name, 
      label: `${doctor.name} - ${doctor.specialty}`,
      specialty: doctor.specialty 
    })),
    { value: 'otro', label: 'Otro (especificar)' }
  ];
}

// Helper function to get specialty options for dropdowns
export function getSpecialtyOptions(): { value: string; label: string }[] {
  return [
    { value: '', label: 'Seleccionar especialidad' },
    ...AVAILABLE_SPECIALTIES.map(specialty => ({ value: specialty, label: specialty }))
  ];
}
