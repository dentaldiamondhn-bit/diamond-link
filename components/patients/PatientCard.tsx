'use client';

import React from 'react';
import Link from 'next/link';
import { Patient } from '@/types/patient';
import { createWhatsAppUrl, formatPhoneDisplay } from '@/utils/phoneUtils';
import AnimatedWhatsApp from '@/components/AnimatedWhatsApp';
import { getPatientType } from '@/utils/patientTypeUtils';
import { getRecordCategoryInfoSync } from '@/utils/recordCategoryUtils';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';

interface PatientCardProps {
  patient: Patient;
  patientBypassStatus: boolean;
  onShowWarning: (patient: Patient) => void;
  calculateAge: (birthDate: string) => string;
}

const getAgeNumber = (fechaNacimiento: string): number => {
  if (!fechaNacimiento) return 0;
  try {
    return SimpleTimezoneFix.calculateAge(fechaNacimiento);
  } catch {
    return 0;
  }
};

const getConditionSeverity = (patient: Patient) => {
  const age = getAgeNumber(patient.fecha_nacimiento);
  let severityScore = 0;

  if (age >= 80) severityScore += 3;
  else if (age >= 60) severityScore += 2;
  else if (age < 18) severityScore += 1;

  const conditions = [];

  if (patient.enfermedades) {
    const criticalDiseases = ['diabetes', 'hipertensión', 'corazón', 'cardíaco', 'cáncer', 'tumor', 'epilepsia', 'asma', 'renal', 'hepático'];
    const lifeThreateningDiseases = ['cáncer', 'tumor', 'corazón', 'cardíaco', 'insuficiencia cardíaca', 'infarto', 'derrame cerebral'];

    if (lifeThreateningDiseases.some(disease => patient.enfermedades.toLowerCase().includes(disease))) {
      return { level: 'critical', color: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800', textColor: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-500' };
    }

    if (criticalDiseases.some(disease => patient.enfermedades.toLowerCase().includes(disease))) {
      severityScore += 3;
      conditions.push('critical');
    }
  }

  if (patient.alergias) {
    const severeAllergies = ['anafilaxia', 'penicilina', 'maní', 'mariscos', 'látex', 'abeja', 'avispas'];
    if (severeAllergies.some(allergy => patient.alergias.toLowerCase().includes(allergy))) {
      severityScore += 2;
      conditions.push('severe-allergy');
    }
  }

  if (patient.medicamentos) {
    const medicationCount = patient.medicamentos.split(',').length;
    if (medicationCount >= 3) {
      severityScore += 2;
      conditions.push('multiple-meds');
    } else if (medicationCount >= 2) {
      severityScore += 1;
      conditions.push('multiple-meds');
    }
  }

  if (patient.sexo === 'femenino' && patient.embarazo === 'si') {
    severityScore += 3;
    conditions.push('pregnancy');
  }

  if (conditions.length === 1 && conditions.includes('pregnancy')) {
    return {
      level: 'pregnancy',
      color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
      textColor: 'text-pink-700 dark:text-pink-300',
      bgColor: 'bg-pink-500',
      gradient: 'linear-gradient(to right, rgb(244 114 182), rgb(147 197 253))'
    };
  }

  if (severityScore >= 6) return { level: 'critical', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', textColor: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-500' };
  if (severityScore >= 4) return { level: 'high', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', textColor: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-500' };
  if (severityScore >= 2) return { level: 'medium', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800', textColor: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-500' };
  if (severityScore >= 1) return { level: 'low', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', textColor: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-500' };

  return { level: 'none', color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700', textColor: 'text-gray-600 dark:text-gray-400' };
};

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  patientBypassStatus,
  onShowWarning,
  calculateAge
}) => {
  const patientType = getPatientType(patient);
  const conditionSeverity = getConditionSeverity(patient);
  const recordCategoryInfo = getRecordCategoryInfoSync(patient.fecha_inicio);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group relative h-full flex flex-col">
      {/* Patient Type Badge */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patientType.colors.badge} border ${patientType.colors.badgeText}`}>
          {patientType.label}
        </span>
        {recordCategoryInfo?.isHistorical && !patientBypassStatus && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
            Histórico
          </span>
        )}
      </div>

      {/* Patient Header with Dynamic Gradient */}
      <div
        className="bg-gradient-to-r p-4 text-white"
        style={{
          background: patient.sexo === 'femenino' && patient.embarazo === 'si'
            ? 'linear-gradient(to right, rgb(236 72 153), rgb(59 130 246))'
            : patientType.category === 'menor' && patient.sexo === 'femenino'
            ? 'linear-gradient(to right, rgb(236 72 153), rgb(219 39 119))'
            : patientType.category === 'menor' && patient.sexo === 'masculino'
            ? 'linear-gradient(to right, rgb(96 165 250), rgb(59 130 246))'
            : patientType.category === '4ta' && patient.sexo === 'femenino'
            ? 'linear-gradient(to right, rgb(168 85 247), rgb(147 51 234))'
            : patientType.category === '4ta' && patient.sexo === 'masculino'
            ? 'linear-gradient(to right, rgb(107 114 128), rgb(75 85 99))'
            : patientType.category === '3ra' && patient.sexo === 'femenino'
            ? 'linear-gradient(to right, rgb(248 113 113), rgb(239 68 68))'
            : patientType.category === '3ra' && patient.sexo === 'masculino'
            ? 'linear-gradient(to right, rgb(245 158 11), rgb(217 119 6))'
            : 'linear-gradient(to right, rgb(20 184 166), rgb(6 182 212))'
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold border border-white/30 flex-shrink-0">
            {patient.nombre_completo?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{patient.nombre_completo}</h3>
            <p className="text-white/80 text-sm">ID: {patient.numero_identidad}</p>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-birthday-cake w-4 mr-2 text-teal-400"></i>
            <span>Edad: {patient.edad ? `${patient.edad} años` : patient.fecha_nacimiento ? calculateAge(patient.fecha_nacimiento) : 'No especificada'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <i className="fas fa-phone w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
            {patient.telefono ? (
              <a
                href={createWhatsAppUrl(patient.telefono, patient.codigopais)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 underline flex items-center gap-1"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <AnimatedWhatsApp />
                </div>
                {formatPhoneDisplay(patient.telefono, patient.codigopais)}
              </a>
            ) : (
              <span>No especificado</span>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <i className="fas fa-calendar w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
            <span>{patient.fecha_nacimiento ? SimpleTimezoneFix.formatDisplayDate(patient.fecha_nacimiento) : 'No especificada'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <i className="fas fa-user-md w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
            <span className="truncate">{patient.doctor || 'No especificado'}</span>
          </div>
        </div>

        {/* Medical Conditions */}
        {(patient.enfermedades || patient.alergias || patient.medicamentos || (patient.sexo === 'femenino' && patient.embarazo === 'si')) && (
          <div
            className={`backdrop-blur-sm rounded-lg p-2 mb-4 shadow-sm border ${conditionSeverity.color} cursor-pointer hover:opacity-90 transition-opacity`}
            onClick={() => onShowWarning(patient)}
          >
            <div className="space-y-1">
              {patient.sexo === 'femenino' && patient.embarazo === 'si' && (
                <div className="flex items-start gap-1">
                  <span className={`font-semibold text-xs ${conditionSeverity.textColor} min-w-[30px]`}>Embarazo:</span>
                  <span className={`text-xs ${conditionSeverity.textColor} leading-tight line-clamp-1`}>{patient.semanas_embarazo ? `${patient.semanas_embarazo} sem` : 'Sí'}</span>
                </div>
              )}
              {patient.enfermedades && (
                <div className="flex items-start gap-1">
                  <span className={`font-semibold text-xs ${conditionSeverity.textColor} min-w-[30px]`}>Enf:</span>
                  <span className={`text-xs ${conditionSeverity.textColor} leading-tight line-clamp-1`}>{patient.enfermedades}</span>
                </div>
              )}
              {patient.alergias && (
                <div className="flex items-start gap-1">
                  <span className={`font-semibold text-xs ${conditionSeverity.textColor} min-w-[30px]`}>Alerg:</span>
                  <span className={`text-xs ${conditionSeverity.textColor} leading-tight line-clamp-1`}>{patient.alergias}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <Link
            href={`/patient-preview/${patient.paciente_id}`}
            className="flex-1 inline-flex items-center justify-center px-2 py-2 bg-gradient-to-r from-blue-400 to-blue-700 text-white text-xs font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
          >
            <i className="fas fa-eye mr-1"></i>
            Historia
          </Link>
          <Link
            href={`/menu-navegacion?id=${patient.paciente_id}`}
            className="flex-1 inline-flex items-center justify-center px-2 py-2 bg-gradient-to-r from-teal-400 to-cyan-600 text-white text-xs font-medium rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg"
          >
            <i className="fas fa-th-large mr-1"></i>
            Menu
          </Link>
          <Link
            href={`/patient-form?id=${patient.paciente_id}`}
            className="flex-1 inline-flex items-center justify-center px-2 py-2 bg-gradient-to-r from-gray-400 to-gray-700 text-white text-xs font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg"
          >
            <i className="fas fa-edit mr-1"></i>
            Editar
          </Link>
        </div>
      </div>
    </div>
  );
};
