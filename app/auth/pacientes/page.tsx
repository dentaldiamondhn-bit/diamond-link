'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PatientService } from '../../../services/patientService';
import { Patient } from '../../../types/patient';
import Link from 'next/link';
import { createWhatsAppUrl, formatPhoneDisplay } from '../../../utils/phoneUtils';
import { getPatientType } from '../../../utils/patientTypeUtils';
import { getRecordCategoryInfo, getRecordCategoryInfoSync } from '../../../utils/recordCategoryUtils';
import { useHistoricalMode } from '../../../contexts/HistoricalModeContext';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../../lib/supabase';
import LoadingAnimation from '../../../components/LoadingAnimation';
import HistoricalBanner from '../../../components/HistoricalBanner';

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const [showWarningModal, setShowWarningModal] = useState<Patient | null>(null);
  const [patientBypassStatus, setPatientBypassStatus] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { bypassHistoricalMode, setCurrentPatient, loadPatientSettings, savePatientSettings } = useHistoricalMode();
  const { user } = useUser();

  // Function to check if a specific patient has bypass activated
  const checkPatientBypassStatus = async (pacienteId: string) => {
    try {
      console.log('🔍 Checking bypass status for patient:', pacienteId);
      
      // Load ALL settings for this patient (from all users)
      const { data: allPatientSettings, error: allSettingsError } = await supabase
        .from('historical_mode_settings')
        .select('bypass_historical_mode, clerk_user_id, updated_at')
        .eq('patient_id', pacienteId);
      
      // Load global setting as fallback
      const { data: globalData, error: globalError } = await supabase
        .from('app_configuration')
        .select('config_value')
        .eq('config_key', 'historical_records_enabled')
        .single();
      
      // Handle global setting
      let globalBypass = false;
      if (globalData && !globalError) {
        const globalEnabled = globalData.config_value === 'true';
        globalBypass = !globalEnabled;
        console.log('✅ Global historical mode setting loaded:', { configValue: globalData.config_value, globalBypass });
      } else {
        console.log('ℹ️ No global setting found, using default (historical mode enabled)');
      }
      
      // Handle patient-specific settings (use latest setting like other pages)
      if (allPatientSettings && allPatientSettings.length > 0 && !allSettingsError) {
        console.log('📊 Found patient settings from all users:', allPatientSettings);
        
        // Sort by updated_at to get the latest setting (same strategy as other pages)
        const sortedSettings = allPatientSettings.sort((a, b) => 
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );
        
        // Use the latest setting
        const latestSetting = sortedSettings[sortedSettings.length - 1];
        const resolvedValue = latestSetting ? latestSetting.bypass_historical_mode : false;
        
        console.log('✅ Patient historical mode setting resolved:', { 
          allSettings: allPatientSettings, 
          resolvedValue, 
          latestSetting,
          usingPatientSpecific: true 
        });
        
        setPatientBypassStatus(prev => ({ ...prev, [pacienteId]: resolvedValue }));
        return resolvedValue;
      } else if (!allSettingsError) {
        console.log('ℹ️ No patient-specific setting found, using global setting');
        setPatientBypassStatus(prev => ({ ...prev, [pacienteId]: globalBypass }));
        return globalBypass;
      } else {
        console.log('ℹ️ Patient query failed, using global setting:', allSettingsError);
        setPatientBypassStatus(prev => ({ ...prev, [pacienteId]: globalBypass }));
        return globalBypass;
      }
    } catch (error) {
      console.error('❌ Error checking patient bypass status:', error);
      setPatientBypassStatus(prev => ({ ...prev, [pacienteId]: false }));
      return false;
    }
  };

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const patientsData = await PatientService.getPatients();
        setPatients(patientsData);
        
        // Load bypass status for all patients
        if (user) {
          const bypassPromises = patientsData.map(async (patient) => {
            const bypassStatus = await checkPatientBypassStatus(patient.paciente_id);
            return { patientId: patient.paciente_id, bypassStatus };
          });
          
          await Promise.all(bypassPromises);
        }
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [user]);

  const filteredPatients = patients.filter(patient =>
    patient.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.numero_identidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.telefono?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPatients = filteredPatients.length;
  const totalPages = Math.ceil(totalPatients / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, endIndex);

  // Reset to page 1 when search term or records per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recordsPerPage]);

  const calculateAge = (fechaNacimiento: string): string => {
    const birthDate = new Date(fechaNacimiento);
    if (isNaN(birthDate.getTime())) return 'No especificada';
    
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} años`;
  };

  const getAgeNumber = (fechaNacimiento: string): number => {
    const birthDate = new Date(fechaNacimiento);
    if (isNaN(birthDate.getTime())) return 0;
    
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const getConditionSeverity = (patient: any) => {
    const age = getAgeNumber(patient.fecha_nacimiento);
    let severityScore = 0;
    
    // Age-based severity weighting
    if (age >= 80) severityScore += 3; // 4ta edad - highest priority
    else if (age >= 60) severityScore += 2; // 3ra edad - high priority
    else if (age < 18) severityScore += 1; // Menor - medium priority
    
    // Condition-based severity scoring
    const conditions = [];
    
    // Critical conditions (high severity)
    if (patient.enfermedades) {
      const criticalDiseases = ['diabetes', 'hipertensión', 'corazón', 'cardíaco', 'cáncer', 'tumor', 'epilepsia', 'asma', 'renal', 'hepático'];
      const lifeThreateningDiseases = ['cáncer', 'tumor', 'corazón', 'cardíaco', 'insuficiencia cardíaca', 'infarto', 'derrame cerebral'];
      
      // Auto-trigger critical severity for life-threatening conditions
      if (lifeThreateningDiseases.some(disease => patient.enfermedades.toLowerCase().includes(disease))) {
        return { level: 'critical', color: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800', textColor: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-500' };
      }
      
      if (criticalDiseases.some(disease => patient.enfermedades.toLowerCase().includes(disease))) {
        severityScore += 3;
        conditions.push('critical');
      }
    }
    
    // Allergies (medium-high severity)
    if (patient.alergias) {
      const severeAllergies = ['anafilaxia', 'penicilina', 'maní', 'mariscos', 'látex', 'abeja', 'avispas'];
      if (severeAllergies.some(allergy => patient.alergias.toLowerCase().includes(allergy))) {
        severityScore += 2;
        conditions.push('severe-allergy');
      }
    }
    
    // Multiple medications (medium severity)
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
    
    // Pregnancy (high priority for female patients)
    if (patient.sexo === 'femenino' && patient.embarazo === 'si') {
      severityScore += 3; // Pregnancy is high priority
      conditions.push('pregnancy');
    }
    
    // Determine severity level and color
    // Special case: pregnancy-only (no other conditions) - use soft pink to blue gradient
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
    
    return { level: 'none', color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800', textColor: 'text-gray-600 dark:text-gray-400' };
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
  };

  const getPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <LoadingAnimation 
        message="Cargando Pacientes"
        subMessage="Obteniendo lista de pacientes"
        customMessages={[
          "• Cargando pacientes registrados...",
          "• Procesando información médica...",
          "• Organizando resultados..."
        ]}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Todos los Pacientes</h1>
          
          {/* View Toggle Button */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <i className="fas fa-th-large mr-2"></i>
              Cuadrícula
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <i className="fas fa-list mr-2"></i>
              Lista
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            placeholder="Buscar pacientes por nombre, identidad o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-700 dark:focus:placeholder-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Patients Display */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPatients.map((patient) => {
            // Temporarily test with different age scenarios
            const testPatient = {
              ...patient,
              fecha_nacimiento: patient.nombre_completo?.includes('Test') ? 
                (patient.nombre_completo?.includes('Menor') ? '2010-01-01' :
                 patient.nombre_completo?.includes('3ra') ? '1950-01-01' :
                 patient.nombre_completo?.includes('4ta') ? '1940-01-01' :
                 patient.fecha_nacimiento) : patient.fecha_nacimiento,
              sexo: patient.nombre_completo?.includes('Femenino') ? 'femenino' : 
                    patient.nombre_completo?.includes('Masculino') ? 'masculino' : 
                    patient.sexo,
              is_historical: patient.is_historical || (patient.fecha_inicio && new Date(patient.fecha_inicio) < new Date('2026-01-01'))
            };
            
            const patientType = getPatientType(testPatient);
            const conditionSeverity = getConditionSeverity(testPatient);
            const recordCategoryInfo = getRecordCategoryInfoSync(testPatient.fecha_inicio);
            const displayPatient = { ...patient, ...testPatient }; // Merge testPatient overrides with original patient
            
            // Check if this specific patient has bypass activated
            const patientHasBypass = patientBypassStatus[patient.paciente_id] || false;
            
            return (
            <div key={patient.paciente_id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group relative">
              {/* Patient Type Badge */}
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patientType.colors.badge} border ${patientType.colors.badgeText}`}>
                  {patientType.label}
                </span>
                {/* Historical Badge - only show if historical and patient-specific bypass is not active */}
                {recordCategoryInfo?.isHistorical && !patientHasBypass && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
                    Histórico
                  </span>
                )}
              </div>
              
              {/* Patient Header with Dynamic Gradient */}
              <div 
                className={`bg-gradient-to-r p-4 text-white`}
                style={{
                  background: displayPatient.sexo === 'femenino' && displayPatient.embarazo === 'si'
                    ? 'linear-gradient(to right, rgb(236 72 153), rgb(59 130 246))' // Soft pink to blue gradient for pregnancy
                    : patientType.category === 'menor' && displayPatient.sexo === 'femenino' 
                    ? 'linear-gradient(to right, rgb(236 72 153), rgb(219 39 119))'
                    : patientType.category === 'menor' && displayPatient.sexo === 'masculino'
                    ? 'linear-gradient(to right, rgb(96 165 250), rgb(59 130 246))'
                    : patientType.category === '4ta' && displayPatient.sexo === 'femenino'
                    ? 'linear-gradient(to right, rgb(168 85 247), rgb(147 51 234))'
                    : patientType.category === '4ta' && displayPatient.sexo === 'masculino'
                    ? 'linear-gradient(to right, rgb(107 114 128), rgb(75 85 99))'
                    : patientType.category === '3ra' && displayPatient.sexo === 'femenino'
                    ? 'linear-gradient(to right, rgb(248 113 113), rgb(239 68 68))'
                    : patientType.category === '3ra' && displayPatient.sexo === 'masculino'
                    ? 'linear-gradient(to right, rgb(245 158 11), rgb(217 119 6))'
                    : 'linear-gradient(to right, rgb(20 184 166), rgb(6 182 212))'
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold border border-white/30">
                    {displayPatient.nombre_completo?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white transition-colors">{displayPatient.nombre_completo}</h3>
                    <p className="text-white/80 text-sm">ID: {displayPatient.numero_identidad}</p>
                  </div>
                </div>
              </div>

              {/* Patient Details */}
              <div className="p-4">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-400">
                    <i className="fas fa-birthday-cake w-4 mr-2 text-teal-400"></i>
                    <span>Edad: {displayPatient.edad ? `${displayPatient.edad} años` : displayPatient.fecha_nacimiento ? calculateAge(displayPatient.fecha_nacimiento) : 'No especificada'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <i className="fas fa-phone w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                    {displayPatient.telefono ? (
                      <a 
                        href={createWhatsAppUrl(displayPatient.telefono, displayPatient.codigopais)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 underline flex items-center gap-1"
                      >
                        <i className="fab fa-whatsapp text-xs"></i>
                        {formatPhoneDisplay(displayPatient.telefono, displayPatient.codigopais)}
                      </a>
                    ) : (
                      <span>No especificado</span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <i className="fas fa-calendar w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                    <span>{calculateAge(displayPatient.fecha_nacimiento)} años</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <i className="fas fa-user-md w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                    <span>{displayPatient.doctor || 'No especificado'}</span>
                  </div>
                </div>

                {/* Medical Conditions - Middle Right Center */}
                {(displayPatient.enfermedades || displayPatient.alergias || displayPatient.medicamentos || (displayPatient.sexo === 'femenino' && displayPatient.embarazo === 'si')) && (
                  <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 backdrop-blur-sm rounded-lg p-2 shadow-sm border max-w-[140px] ${conditionSeverity.color}`}>
                    <div className="space-y-1">
                      {displayPatient.sexo === 'femenino' && displayPatient.embarazo === 'si' && (
                        <div 
                          className="flex items-start gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setShowWarningModal(displayPatient)}
                        >
                          <span className={`font-semibold text-xs ${conditionSeverity.textColor} min-w-[30px]`}>Embarazo:</span>
                          <span className={`text-xs ${conditionSeverity.textColor} leading-tight line-clamp-2`}>{displayPatient.semanas_embarazo ? `${displayPatient.semanas_embarazo} sem` : 'Sí'}</span>
                        </div>
                      )}
                      {displayPatient.enfermedades && (
                        <div className="flex items-start gap-1">
                          <span className={`font-semibold text-xs ${conditionSeverity.textColor} min-w-[30px]`}>Enf:</span>
                          <span className={`text-xs ${conditionSeverity.textColor} leading-tight line-clamp-2`}>{displayPatient.enfermedades}</span>
                        </div>
                      )}
                      {displayPatient.alergias && (
                        <div className="flex items-start gap-1">
                          <span className={`font-semibold text-xs ${conditionSeverity.textColor} min-w-[30px]`}>Alerg:</span>
                          <span className={`text-xs ${conditionSeverity.textColor} leading-tight line-clamp-2`}>{displayPatient.alergias}</span>
                        </div>
                      )}
                      {displayPatient.medicamentos && (
                        <div className="flex items-start gap-1">
                          <span className={`font-semibold text-xs ${conditionSeverity.textColor} min-w-[30px]`}>Med:</span>
                          <span className={`text-xs ${conditionSeverity.textColor} leading-tight line-clamp-2`}>{displayPatient.medicamentos}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href={`/patient-preview/${patient.paciente_id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-blue-400 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-eye mr-1"></i>
                    Historia
                  </Link>
                  <Link
                    href={`/menu-navegacion?id=${patient.paciente_id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-teal-400 to-cyan-600 text-white text-sm font-medium rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-th-large mr-1"></i>
                    Menu
                  </Link>
                  <Link
                    href={`/patient-form?id=${patient.paciente_id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-gray-400 to-gray-700 text-white text-sm font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-edit mr-1"></i>
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Edad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentPatients.map((patient) => (
                  <tr key={patient.paciente_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                            {patient.nombre_completo?.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {patient.nombre_completo}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {patient.numero_identidad}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.telefono ? (
                        <a 
                          href={createWhatsAppUrl(patient.telefono, patient.codigopais)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 underline flex items-center gap-1"
                        >
                          <i className="fab fa-whatsapp text-xs"></i>
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
                      {patient.doctor || 'No especificado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/patient-preview/${patient.paciente_id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          <i className="fas fa-eye"></i>
                        </Link>
                        <Link
                          href={`/menu-navegacion?id=${patient.paciente_id}`}
                          className="text-teal-600 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300"
                        >
                          <i className="fas fa-th-large"></i>
                        </Link>
                        <Link
                          href={`/patient-form?id=${patient.paciente_id}`}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Medical Conditions Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 ${getConditionSeverity(showWarningModal).color} opacity-80`}
            style={getConditionSeverity(showWarningModal).gradient ? {
              background: getConditionSeverity(showWarningModal).gradient,
              border: 'none'
            } : {}}
          >
            {/* Warning Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getConditionSeverity(showWarningModal).bgColor}`}>
                <i className={`fas ${getConditionSeverity(showWarningModal).level === 'pregnancy' ? 'fa-baby' : 'fa-exclamation-triangle'} text-white text-2xl`}></i>
              </div>
            </div>
            
            {/* Warning Title */}
            <h3 className={`text-lg font-semibold mb-3 text-center ${getConditionSeverity(showWarningModal).gradient ? 'text-white' : getConditionSeverity(showWarningModal).textColor}`}>
              {getConditionSeverity(showWarningModal).level === 'pregnancy' ? 'Embarazo Detectado' : 'Alerta Médica Importante'}
            </h3>
            
            {/* Warning Message */}
            <div className={`text-sm mb-6 text-center ${getConditionSeverity(showWarningModal).gradient ? 'text-white' : getConditionSeverity(showWarningModal).textColor}`}>
              {getConditionSeverity(showWarningModal).level === 'pregnancy' && (
                <p>Esta paciente está <strong>embarazada</strong>. Se debe tener especial consideración en los tratamientos odontológicos.</p>
              )}
              {getConditionSeverity(showWarningModal).level === 'critical' && (
                <p>Este paciente presenta <strong>condiciones médicas críticas</strong> que requieren atención ESPECIAL.</p>
              )}
              {getConditionSeverity(showWarningModal).level === 'high' && (
                <p>Este paciente presenta <strong>condiciones médicas de alto riesgo</strong> que requieren especial atención.</p>
              )}
              {getConditionSeverity(showWarningModal).level === 'medium' && (
                <p>Este paciente presenta <strong>condiciones médicas moderadas</strong> que deben ser consideradas en el tratamiento.</p>
              )}
              {getConditionSeverity(showWarningModal).level === 'low' && (
                <p>Este paciente presenta <strong>condiciones médicas leves</strong> que deben ser tenidas en cuenta.</p>
              )}
              
              {/* Condition Details */}
              <div className="mt-3 space-y-1 text-xs">
                {showWarningModal.sexo === 'femenino' && showWarningModal.embarazo === 'si' && (
                  <div><strong>Embarazo:</strong> {showWarningModal.semanas_embarazo ? `${showWarningModal.semanas_embarazo} semanas` : 'Sí'}</div>
                )}
                {showWarningModal.enfermedades && (
                  <div><strong>Enfermedades:</strong> {showWarningModal.enfermedades}</div>
                )}
                {showWarningModal.alergias && (
                  <div><strong>Alergias:</strong> {showWarningModal.alergias}</div>
                )}
                {showWarningModal.medicamentos && (
                  <div><strong>Medicamentos:</strong> {showWarningModal.medicamentos}</div>
                )}
                {showWarningModal.sexo === 'femenino' && showWarningModal.embarazo === 'si' && showWarningModal.medicamentos_embarazo && (
                  <div><strong>Medicamentos embarazo:</strong> {showWarningModal.medicamentos_embarazo}</div>
                )}
              </div>
            </div>
            
            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowWarningModal(null)}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* No Results */}
      {currentPatients.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="fas fa-users text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
          </h3>
          <p className="text-gray-500">
            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando un nuevo paciente'}
          </p>
          {!searchTerm && (
            <Link
              href="/patient-form"
              className="mt-4 inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors duration-200"
            >
              <i className="fas fa-plus mr-2"></i>
              Nuevo Paciente
            </Link>
          )}
        </div>
      )}

      {/* Pagination and Records Counter */}
      {totalPatients > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            {/* Records Counter */}
            <div className="text-sm text-gray-700">
              <span className="font-medium">Total Pacientes: {totalPatients}</span>
              <span className="mx-2">|</span>
              <span>Mostrando: {startIndex + 1}-{Math.min(endIndex, totalPatients)} de {totalPatients}</span>
            </div>

            {/* Records Per Page Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Registros por página:</label>
              <div className="relative">
                <select
                  value={recordsPerPage}
                  onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer transition-colors duration-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <i className="fas fa-chevron-down text-xs"></i>
                </div>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>

                {/* Page Numbers */}
                {getPaginationNumbers().map((page, index) => (
                  <span key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-1 text-sm text-gray-500">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page as number)}
                        className={`px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                          currentPage === page
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )}
                  </span>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
