'use client';

import React from 'react';
import { Patient } from '@/types/patient';

interface MedicalWarningModalProps {
  patient: Patient;
  onClose: () => void;
  isOpen: boolean;
}

// Improved medical condition severity calculation
const getImprovedConditionSeverity = (patient: Patient) => {
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(patient.fecha_nacimiento);
  let severityScore = 0;
  const conditions = [];
  
  // Helper function to check if field contains meaningful content
  const hasMeaningfulContent = (field?: string): boolean => {
    if (!field) return false;
    
    // Flexible normalization function
    const normalizeText = (text: string) => {
      return text.toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const normalizedField = normalizeText(field);
    
    // List of negative/empty responses that should NOT trigger warnings (with variations)
    const negativeResponses = [
      'na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningun', 'sin', 
      'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes',
      'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere',
      'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda',
      // English variations
      'none', 'n/a', 'na', 'not applicable', 'not applicable', 'without', 
      'without diseases', 'without allergies', 'without medications',
      'denied', 'denies', 'unknown', "doesn't know", 'doesnt know'
    ];
    
    // Check if field is exactly a negative response (with flexible matching)
    const isExactNegative = negativeResponses.some(negative => {
      const normalizedNegative = normalizeText(negative);
      return normalizedField === normalizedNegative;
    });
    
    // If it's exactly a negative response, return false
    if (isExactNegative) return false;
    
    // Otherwise, check if it has meaningful content (more than just negative words)
    // This allows for cases like "Diabetes" which should trigger the modal
    return normalizedField.length > 0;
  };
  
  // Age-based severity weighting
  if (age >= 80) severityScore += 3; // 4ta edad - highest priority
  else if (age >= 60) severityScore += 2; // 3ra edad - high priority
  else if (age < 18) severityScore += 1; // Menor - medium priority
  
  // Critical diseases (highest severity) - with flexible matching
  if (hasMeaningfulContent(patient.enfermedades)) {
    const criticalDiseases = [
      'diabetes', 'diabetis', 'hipertension', 'hipertensión', 'hipertension arterial',
      'corazon', 'corazón', 'cardiaco', 'cardíaco', 'cardiopatia', 'cardiopatía',
      'cancer', 'cáncer', 'tumor', 'epilepsia', 'epilepsia', 'asma', 'asma',
      'renal', 'rinon', 'riñón', 'hepatico', 'hepático', 'higado', 'hígado',
      'insuficiencia', 'infarto', 'derrame cerebral', 'accidente cerebrovascular',
      'acv', 'ictus', 'derrame', 'accidente vascular'
    ];
    const lifeThreateningDiseases = [
      'cancer', 'cáncer', 'tumor', 'insuficiencia cardiaca', 'insuficiencia cardíaca',
      'infarto', 'derrame cerebral', 'accidente cerebrovascular', 'acv', 'ictus'
    ];
    
    // Flexible matching function
    const flexibleMatch = (text: string, patterns: string[]) => {
      const normalized = text.toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, ' ');
      
      return patterns.some(pattern => {
        const normalizedPattern = pattern.toLowerCase()
          .replace(/[áàäâ]/g, 'a')
          .replace(/[éèëê]/g, 'e')
          .replace(/[íìïî]/g, 'i')
          .replace(/[óòöô]/g, 'o')
          .replace(/[úùüû]/g, 'u')
          .replace(/ñ/g, 'n')
          .replace(/\s+/g, ' ');
        
        return normalized.includes(normalizedPattern);
      });
    };
    
    // Auto-trigger critical severity for life-threatening conditions
    if (flexibleMatch(patient.enfermedades!, lifeThreateningDiseases)) {
      return { 
        level: 'critical', 
        color: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800', 
        textColor: 'text-red-700 dark:text-red-300', 
        bgColor: 'bg-red-500',
        conditions: ['life-threatening-disease'],
        details: [`Enfermedades críticas: ${patient.enfermedades}`]
      };
    }
    
    if (flexibleMatch(patient.enfermedades!, criticalDiseases)) {
      severityScore += 3;
      conditions.push('critical-disease');
    }
  }
  
  // Severe allergies (medium-high severity) - with flexible matching
  if (hasMeaningfulContent(patient.alergias)) {
    const severeAllergies = [
      'anafilaxia', 'anafilaxis', 'penicilina', 'penicilina', 'mani', 'maní',
      'mariscos', 'mariscos', 'latex', 'látex', 'abeja', 'avispa', 'avispas',
      'huevo', 'huevo', 'leche', 'leche', 'gluten', 'gluten', 'soja', 'soja',
      'frutos secos', 'frutos secos', 'cacahuates', 'cacahuetes', 'nueces', 'nueces'
    ];
    
    // Flexible matching function (reuse from above)
    const flexibleMatch = (text: string, patterns: string[]) => {
      const normalized = text.toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, ' ');
      
      return patterns.some(pattern => {
        const normalizedPattern = pattern.toLowerCase()
          .replace(/[áàäâ]/g, 'a')
          .replace(/[éèëê]/g, 'e')
          .replace(/[íìïî]/g, 'i')
          .replace(/[óòöô]/g, 'o')
          .replace(/[úùüû]/g, 'u')
          .replace(/ñ/g, 'n')
          .replace(/\s+/g, ' ');
        
        return normalized.includes(normalizedPattern);
      });
    };
    
    if (flexibleMatch(patient.alergias!, severeAllergies)) {
      severityScore += 2;
      conditions.push('severe-allergy');
    }
  }
  
  // Multiple medications (medium severity)
  if (hasMeaningfulContent(patient.medicamentos)) {
    const medicationCount = patient.medicamentos!.split(',').length;
    if (medicationCount >= 3) {
      severityScore += 2;
      conditions.push('multiple-meds');
    } else if (medicationCount >= 2) {
      severityScore += 1;
      conditions.push('multiple-meds');
    }
  }
  
  // Pregnancy (high priority for female patients)
  if (patient.sexo === 'femenino' && patient.embarazo === 'si') {
    severityScore += 3; // Pregnancy is high priority
    conditions.push('pregnancy');
  }
  
  // Multiple meaningful medical fields (additional severity)
  const meaningfulFieldsCount = [
    hasMeaningfulContent(patient.enfermedades),
    hasMeaningfulContent(patient.alergias),
    hasMeaningfulContent(patient.medicamentos),
    hasMeaningfulContent(patient.hospitalizaciones),
    hasMeaningfulContent(patient.cirugias)
  ].filter(Boolean).length;
  
  if (meaningfulFieldsCount >= 3) {
    severityScore += 2;
    conditions.push('multiple-conditions');
  } else if (meaningfulFieldsCount >= 2) {
    severityScore += 1;
    conditions.push('multiple-conditions');
  }
  
  // Determine severity level and color
  // Special case: pregnancy-only (no other conditions) - use soft pink to blue gradient
  if (conditions.length === 1 && conditions.includes('pregnancy')) {
    return { 
      level: 'pregnancy', 
      color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800', 
      textColor: 'text-pink-700 dark:text-pink-300', 
      bgColor: 'bg-pink-500',
      gradient: 'linear-gradient(to right, rgb(244 114 182), rgb(147 197 253))',
      conditions: ['pregnancy'],
      details: ['Embarazo detectado']
    };
  }
  
  if (severityScore >= 6) return { 
    level: 'critical', 
    color: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800', 
    textColor: 'text-red-700 dark:text-red-300', 
    bgColor: 'bg-red-500',
    conditions,
    details: getConditionDetails(patient, conditions)
  };
  
  if (severityScore >= 4) return { 
    level: 'high', 
    color: 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-800', 
    textColor: 'text-orange-700 dark:text-orange-300', 
    bgColor: 'bg-orange-500',
    conditions,
    details: getConditionDetails(patient, conditions)
  };
  
  if (severityScore >= 2) return { 
    level: 'medium', 
    color: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800', 
    textColor: 'text-yellow-700 dark:text-yellow-300', 
    bgColor: 'bg-yellow-500',
    conditions,
    details: getConditionDetails(patient, conditions)
  };
  
  if (severityScore >= 1) return { 
    level: 'low', 
    color: 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800', 
    textColor: 'text-blue-700 dark:text-blue-300', 
    bgColor: 'bg-blue-500',
    conditions,
    details: getConditionDetails(patient, conditions)
  };
  
  return { 
    level: 'none', 
    color: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800', 
    textColor: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-500',
    conditions: [],
    details: []
  };
};

// Helper function to get condition details for display
const getConditionDetails = (patient: Patient, conditions: string[]): string[] => {
  const details = [];
  
  if (patient.sexo === 'femenino' && patient.embarazo === 'si') {
    details.push('Embarazo: Sí');
  }
  
  if (patient.enfermedades && conditions.some(c => c.includes('disease'))) {
    details.push(`Enfermedades: ${patient.enfermedades}`);
  }
  
  if (patient.alergias && conditions.includes('severe-allergy')) {
    details.push(`Alergias: ${patient.alergias}`);
  }
  
  if (patient.medicamentos && conditions.includes('multiple-meds')) {
    details.push(`Medicamentos: ${patient.medicamentos}`);
  }
  
  if (conditions.includes('multiple-conditions')) {
    details.push('Múltiples condiciones médicas presentes');
  }
  
  return details;
};

const MedicalWarningModal: React.FC<MedicalWarningModalProps> = ({ patient, onClose, isOpen }) => {
  if (!isOpen || !patient) return null;
  
  const severity = getImprovedConditionSeverity(patient);
  
  // Don't show modal if no significant conditions
  if (severity.level === 'none') {
    return null;
  }
  
  const getIcon = () => {
    switch (severity.level) {
      case 'pregnancy': return 'fa-baby';
      case 'critical': return 'fa-exclamation-triangle';
      case 'high': return 'fa-exclamation-circle';
      case 'medium': return 'fa-info-circle';
      case 'low': return 'fa-info';
      default: return 'fa-info';
    }
  };
  
  const getTitle = () => {
    switch (severity.level) {
      case 'pregnancy': return 'Embarazo Detectado';
      case 'critical': return 'Alerta Médica Crítica';
      case 'high': return 'Alerta Médica Alta';
      case 'medium': return 'Alerta Médica Moderada';
      case 'low': return 'Nota Médica Importante';
      default: return 'Información Médica';
    }
  };
  
  const getMessage = () => {
    switch (severity.level) {
      case 'pregnancy':
        return 'Esta paciente está embarazada. Se debe tener especial consideración en los tratamientos odontológicos.';
      case 'critical':
        return 'Este paciente presenta condiciones médicas críticas que requieren atención ESPECIAL inmediata.';
      case 'high':
        return 'Este paciente presenta condiciones médicas de alto riesgo que requieren especial atención.';
      case 'medium':
        return 'Este paciente presenta condiciones médicas moderadas que deben ser consideradas en el tratamiento.';
      case 'low':
        return 'Este paciente presenta condiciones médicas leves que deben ser tenidas en cuenta.';
      default:
        return 'Información médica relevante para el tratamiento.';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 ${severity.color} opacity-80`}
        style={severity.gradient ? {
          background: severity.gradient,
          border: 'none'
        } : {}}
      >
        {/* Warning Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${severity.bgColor}`}>
            <i className={`fas ${getIcon()} text-white text-2xl`}></i>
          </div>
        </div>
        
        {/* Warning Title */}
        <h3 className={`text-lg font-semibold mb-3 text-center ${severity.gradient ? 'text-white' : severity.textColor}`}>
          {getTitle()}
        </h3>
        
        {/* Warning Message */}
        <div className={`text-sm mb-6 text-center ${severity.gradient ? 'text-white' : severity.textColor}`}>
          <p>{getMessage()}</p>
          
          {/* Condition Details */}
          {severity.details.length > 0 && (
            <div className="mt-3 space-y-1 text-xs">
              {severity.details.map((detail, index) => (
                <div key={index}><strong>{detail}</strong></div>
              ))}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalWarningModal;
