'use client';

import React from 'react';
import { Patient } from '@/types/patient';
import { createWhatsAppUrl, formatPhoneDisplay } from '@/utils/phoneUtils';
import AnimatedWhatsApp from '@/components/AnimatedWhatsApp';
import { getPatientType } from '@/utils/patientTypeUtils';
import { getRecordCategoryInfoSync } from '@/utils/recordCategoryUtils';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';
import Link from 'next/link';

interface PatientListRowProps {
  patient: Patient;
  patientBypassStatus: boolean;
  calculateAge: (birthDate: string) => string;
}

export const PatientListRow: React.FC<PatientListRowProps> = ({
  patient,
  patientBypassStatus,
  calculateAge
}) => {
  const patientType = getPatientType(patient);
  const recordCategoryInfo = getRecordCategoryInfoSync(patient.fecha_inicio);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
            {patient.nombre_completo}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">
            ID: {patient.numero_identidad}
          </div>
          {/* Patient Type and Historical Badges */}
          <div className="flex flex-wrap gap-1 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${patientType.colors.badge} border ${patientType.colors.badgeText}`}>
              {patientType.label}
            </span>
            {recordCategoryInfo?.isHistorical && !patientBypassStatus && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
                Histórico
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {patient.protesis === 'si' && patient.protesis_tipo ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
            {patient.protesis_tipo}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs">No</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {patient.telefono ? (
          <a
            href={createWhatsAppUrl(patient.telefono, patient.codigopais)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline flex items-center gap-1"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <AnimatedWhatsApp />
            </div>
            {formatPhoneDisplay(patient.telefono, patient.codigopais)}
          </a>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">No especificado</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {calculateAge(patient.fecha_nacimiento)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        <span className="truncate max-w-[120px] inline-block">{patient.doctor || 'No especificado'}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
        <div className="flex justify-end space-x-3">
          <Link
            href={`/patient-preview/${patient.paciente_id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
            title="Ver Historia"
          >
            <i className="fas fa-eye"></i>
          </Link>
          <Link
            href={`/menu-navegacion?id=${patient.paciente_id}`}
            className="text-teal-600 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 transition-colors"
            title="Menú"
          >
            <i className="fas fa-th-large"></i>
          </Link>
          <Link
            href={`/patient-form?id=${patient.paciente_id}`}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
            title="Editar"
          >
            <i className="fas fa-edit"></i>
          </Link>
        </div>
      </td>
    </tr>
  );
};
