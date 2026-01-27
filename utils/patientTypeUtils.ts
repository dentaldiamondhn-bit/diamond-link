export interface PatientTypeInfo {
  category: 'menor' | '3ra' | '4ta' | 'adulto';
  label: string;
  colors: {
    header: string;
    badge: string;
    badgeText: string;
  };
}

export function getPatientType(patient: any): PatientTypeInfo {
  // Calculate age from birth date
  const today = new Date();
  const birthDate = new Date(patient.fecha_nacimiento);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const gender = patient.sexo?.toLowerCase() === 'femenino' ? 'femenino' : 'masculino';

  // Determine patient type based on age
  if (age < 18) {
    // Menores de Edad
    const result: PatientTypeInfo = {
      category: 'menor',
      label: 'Menor',
      colors: gender === 'femenino' ? {
        header: 'from-pink-500 to-pink-700',
        badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
        badgeText: 'border-pink-200 text-pink-700 dark:text-pink-300'
      } : {
        header: 'from-blue-400 to-blue-600',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        badgeText: 'border-blue-200 text-blue-700 dark:text-blue-300'
      }
    }
    return result;
  } else if (age >= 80) {
    // 4ta Edad (80+ years)
    const result: PatientTypeInfo = {
      category: '4ta',
      label: '4ta',
      colors: gender === 'femenino' ? {
        header: 'from-purple-500 to-purple-700',
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        badgeText: 'border-purple-200 text-purple-700 dark:text-purple-300'
      } : {
        header: 'from-gray-500 to-gray-700',
        badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        badgeText: 'border-gray-200 text-gray-700 dark:text-gray-300'
      }
    }
    return result;
  } else if (age >= 60) {
    // 3ra Edad (60-79 years)
    return {
      category: '3ra',
      label: '3ra',
      colors: gender === 'femenino' ? {
        header: 'from-red-400 to-red-600',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        badgeText: 'border-red-200 text-red-700 dark:text-red-300'
      } : {
        header: 'from-yellow-500 to-yellow-700',
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        badgeText: 'border-yellow-200 text-yellow-700 dark:text-yellow-300'
      }
    };
  } else {
    // Adultos (18-59 years) - Keep original teal colors
    return {
      category: 'adulto',
      label: 'Adulto',
      colors: {
        header: 'from-teal-500 to-cyan-500',
        badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
        badgeText: 'border-teal-200 text-teal-700 dark:text-teal-300'
      }
    };
  }
}

export function calculateAge(fecha_nacimiento: string): number {
  const today = new Date();
  const birthDate = new Date(fecha_nacimiento);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
