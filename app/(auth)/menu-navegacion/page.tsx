'use client';
// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { PatientService } from '@/services/patientService';
import { Patient } from '@/types/patient';
import { createWhatsAppUrl, formatPhoneDisplay } from '@/utils/phoneUtils';
import { useHistoricalMode } from '@/contexts/HistoricalModeContext';
import { getRecordCategoryInfoSync } from '@/utils/recordCategoryUtils';
import { supabase } from '@/lib/supabase';
import { HistoricalModeService } from '@/services/historicalModeService';
import HistoricalBadge from '@/components/HistoricalBadge';
import HistoricalBanner from '@/components/HistoricalBanner';
import Link from 'next/link';

// DEBUG: Add role detection debugging
export default function MenuNavegacion() {
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();
  
  console.log('🔍 MENU-NAVEGACION DEBUG:', {
    user: user?.id,
    userRole,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR'
  });

  const [patient, setPatient] = useState<Patient | null>(null);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bypassHistoricalMode, setBypassHistoricalMode, loading, setCurrentPatient, loadPatientSettings, savePatientSettings } = useHistoricalMode();
  const { isLoaded } = useUser();

  // Function to handle bypass changes using new context method
  const handleBypassChange = async (newBypassValue: boolean) => {
    try {
      const pacienteId = searchParams.get('id');
      if (pacienteId && pacienteId !== 'null' && pacienteId !== 'undefined') {
        await savePatientSettings(pacienteId, newBypassValue);
        console.log('✅ Patient bypass setting updated successfully');
      }
    } catch (error) {
      console.error('❌ Failed to update bypass setting:', error);
      alert('Error al actualizar la configuración del modo histórico');
    }
  };

  useEffect(() => {
    const loadPatient = async () => {
      try {
        const pacienteId = searchParams.get('id');
        
        if (!pacienteId || pacienteId === 'null' || pacienteId === 'undefined') {
          setError('ID de paciente no proporcionado');
          setPatientLoading(false);
          return;
        }

        // Load patient data
        const patientData = await PatientService.getPatientById(pacienteId);
        if (patientData) {
          setPatient(patientData);
          setCurrentPatient(pacienteId);
          
          // Check record category (historical, active, archived)
          const categoryInfo = getRecordCategoryInfoSync(patientData.fecha_inicio);
          setRecordCategoryInfo(categoryInfo);
          
          // Load patient-specific historical mode settings
          await loadPatientSettings(pacienteId);
          
          // Show warning modal if patient has medical conditions and severity is not 'none'
          if ((patientData.enfermedades || patientData.alergias || patientData.medicamentos) || (patientData.sexo === 'femenino' && patientData.embarazo === 'si')) {
            const severity = getConditionSeverity(patientData);
            if (severity.level !== 'none') {
              setShowWarningModal(true);
            }
          }
        } else {
          setError('Paciente no encontrado');
        }
      } catch (error) {
        console.error('Error loading patient:', error);
        setError('Error al cargar el paciente');
      } finally {
        setPatientLoading(false);
      }
    };

    if (isLoaded) {
      loadPatient();
    }
  }, [searchParams.get('id'), isLoaded]); // Only depend on the ID, not the entire searchParams

  const calculateAge = (fechaNacimiento: string): string => {
    const birthDate = new Date(fechaNacimiento);
    if (isNaN(birthDate.getTime())) return 'No especificada';
    
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} años`;
  };

  const pacienteId = searchParams.get('id');
const validPacienteId = pacienteId && pacienteId !== 'null' && pacienteId !== 'undefined' ? pacienteId : '';

  // Medical condition severity calculation (same as other pages)
  const getConditionSeverity = (patient: Patient) => {
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
    
    if (severityScore >= 6) return { level: 'critical', color: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800', textColor: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-500' };
    if (severityScore >= 4) return { level: 'high', color: 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-800', textColor: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-500' };
    if (severityScore >= 2) return { level: 'medium', color: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800', textColor: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-500' };
    if (severityScore >= 1) return { level: 'low', color: 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800', textColor: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-500' };
    
    return { level: 'none', color: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800', textColor: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-500' };
  };

  // Patient type utility (same as pacientes page)
  const getPatientType = (patient: any) => {
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
    const gender = patient.sexo?.toLowerCase() === 'femenino' ? 'femenino' : 'masculino';
    
    // Determine patient type based on age
    if (age < 18) {
      return {
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
      };
    } else if (age >= 80) {
      return {
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
      };
    } else if (age >= 60) {
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
  };

  const menuItems = [
    {
      id: 'editar-datos-btn',
      icon: 'fas fa-user-edit',
      title: 'Datos Generales',
      description: 'Actualice la información personal, contacto y antecedentes médicos del paciente.',
      href: `/patient-form?id=${validPacienteId}`
    },
    {
      id: 'registros-paciente',
      icon: 'fas fa-user-chart',
      title: 'Registros del Paciente',
      description: 'Vea los registros completos del paciente incluyendo historial de odontogramas y documentos.',
      href: `/patient-records?id=${validPacienteId}`
    },
    {
      id: 'odontograma',
      icon: 'fas fa-tooth',
      title: 'Odontograma',
      description: 'Registre y visualice el estado dental del paciente, incluyendo tratamientos realizados y planificados.',
      href: `/odontogram?id=${validPacienteId}`
    },
    {
      id: 'estudios-ortodonticos',
      icon: 'fas fa-teeth',
      title: 'Estudios Ortodónticos',
      description: 'Gestione los estudios ortodónticos, incluyendo análisis cefalométricos y registros de tratamientos.',
      href: `/dashboard/orthodontic?id=${validPacienteId}`
    },
    {
      id: 'estudios-periodontales',
      icon: 'fas fa-teeth-open',
      title: 'Estudios Periodontales',
      description: 'Registre y gestione los estudios periodontales, incluyendo índices de placa, sangrado y profundidad de bolsas.',
      href: `/dashboard/periodontal?id=${validPacienteId}`
    },
    {
      id: 'consentimientos',
      icon: 'fas fa-file-signature',
      title: 'Consentimientos',
      description: 'Genere y gestione los consentimientos informados para los distintos procedimientos odontológicos.',
      href: `/consentimientos?id=${validPacienteId}`
    },
    {
      id: 'presupuesto',
      icon: 'fas fa-file-invoice-dollar',
      title: 'Presupuestos',
      description: 'Cree y gestione presupuestos de tratamientos con 30 días de validez para el paciente.',
      href: `/presupuestos?id=${validPacienteId}`
    },
    {
      id: 'preformas',
      icon: 'fas fa-check-circle',
      title: 'Tratamientos Completados',
      description: 'Vea y gestione los tratamientos completados del paciente, incluyendo precios, descuentos y firmas.',
      href: `/tratamientos-completados?paciente_id=${validPacienteId}`
    },
    {
      id: 'gestion-documental',
      icon: 'fas fa-folder-open',
      title: 'Gestión Documental',
      description: 'Administre todos los documentos del paciente, incluyendo informes, radiografías y archivos adjuntos.',
      href: `/dashboard/documents?id=${validPacienteId}`
    }
  ];

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-gray-600 dark:text-gray-400 text-xl flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
            Cargando datos del paciente...
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md">
            <div className="text-red-600 dark:text-red-400 text-center">
              <i className="fas fa-exclamation-triangle text-5xl mb-4"></i>
              <h2 className="text-2xl font-bold mb-2">Error</h2>
              <p className="text-lg">{error}</p>
              <button 
                onClick={() => router.back()}
                className="mt-6 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Patient Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {patient && (
          <>
            <div 
              className="bg-gradient-to-r p-8 text-white"
              style={{
                background: patient.sexo === 'femenino' && patient.embarazo === 'si'
                  ? 'linear-gradient(to right, rgb(236 72 153), rgb(59 130 246))' // Soft pink to blue gradient for pregnancy
                  : getPatientType(patient).category === 'menor' && patient.sexo === 'femenino' 
                  ? 'linear-gradient(to right, rgb(236 72 153), rgb(219 39 119))'
                  : getPatientType(patient).category === 'menor' && patient.sexo === 'masculino'
                  ? 'linear-gradient(to right, rgb(96 165 250), rgb(59 130 246))'
                  : getPatientType(patient).category === '4ta' && patient.sexo === 'femenino'
                  ? 'linear-gradient(to right, rgb(168 85 247), rgb(147 51 234))'
                  : getPatientType(patient).category === '4ta' && patient.sexo === 'masculino'
                  ? 'linear-gradient(to right, rgb(107 114 128), rgb(75 85 99))'
                  : getPatientType(patient).category === '3ra' && patient.sexo === 'femenino'
                  ? 'linear-gradient(to right, rgb(248 113 113), rgb(239 68 68))'
                  : getPatientType(patient).category === '3ra' && patient.sexo === 'masculino'
                  ? 'linear-gradient(to right, rgb(245 158 11), rgb(217 119 6))'
                  : 'linear-gradient(to right, rgb(20 184 166), rgb(6 182 212))'
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold flex items-center">
                  <i className="fas fa-user-injured mr-4"></i>
                  <div className="flex items-center">
                    Información del Paciente
                    <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPatientType(patient).colors.badge} border ${getPatientType(patient).colors.badgeText}`}>
                      {getPatientType(patient).label}
                    </span>
                    {/* Historical banner - only show if historical and bypass is not active */}
                    <HistoricalBadge 
                      isHistorical={recordCategoryInfo?.isHistorical} 
                      isBypassed={bypassHistoricalMode} 
                    />
                  </div>
                </h2>
                <div className="flex items-center space-x-3">
                  <span className="text-teal-100 text-sm">Paciente actual:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-lg border border-white/30">
                      {patient?.nombre_completo?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-base font-medium text-white">{patient?.nombre_completo}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-100 mb-1">Nombre Completo</div>
                  <div className="text-lg font-bold">{patient?.nombre_completo || 'No especificado'}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-100 mb-1">Número de Identidad</div>
                  <div className="text-lg font-bold">{patient?.numero_identidad || 'No especificado'}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-100 mb-1">Edad</div>
                  <div className="text-lg font-bold">
                    {patient?.edad ? `${patient.edad} años` : patient?.fecha_nacimiento ? calculateAge(patient.fecha_nacimiento) : 'No especificada'}
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-100 mb-1">Teléfono</div>
                  <div className="text-lg font-bold">
                    {patient?.telefono ? (
                      <a 
                        href={createWhatsAppUrl(patient.telefono, patient.codigopais)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-teal-100 transition-colors duration-200 flex items-center gap-2"
                      >
                        <i className="fab fa-whatsapp"></i>
                        {formatPhoneDisplay(patient.telefono, patient.codigopais)}
                      </a>
                    ) : (
                      'No especificado'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Historical Mode Control */}
      <HistoricalBanner
        isHistorical={recordCategoryInfo?.isHistorical}
        isBypassed={bypassHistoricalMode}
        patientId={validPacienteId}
        onBypassChange={handleBypassChange}
        loading={loading}
      />

      {/* Navigation Menu */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Módulos del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group"
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/30">
                    <i className={`${item.icon} text-xl`}></i>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold border border-white/30">
                    Módulo
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed line-clamp-3">
                  {item.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link 
                    href={item.href}
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm transform hover:scale-105"
                  >
                    <i className="fas fa-arrow-right mr-2"></i>
                    {item.id === 'editar-datos-btn' ? 'Editar Datos' : 
                     item.id === 'registros-paciente' ? 'Ver Registros' :
                     item.id === 'odontograma' ? 'Ir al Odontograma' :
                     item.id.includes('estudios') ? 'Ir a Estudios' :
                     item.id === 'consentimientos' ? 'Consentimientos' :
                     item.id === 'presupuesto' ? 'Ir a Presupuestos' :
                     item.id === 'preformas' ? 'Ver Tratamientos' :
                     item.id === 'gestion-documental' ? 'Ir a Documentos' : 'Ir'}
                  </Link>
                  {item.id === 'consentimientos' && (
                    <Link
                      href={`/consentimientos/new?id=${validPacienteId}`}
                      className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm transform hover:scale-105"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Crear
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-8 text-center">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-base"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Volver
        </button>
      </div>

      {showWarningModal && patient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 ${getConditionSeverity(patient).color} opacity-80`}
            style={getConditionSeverity(patient).gradient ? {
              background: getConditionSeverity(patient).gradient,
              border: 'none'
            } : {}}
          >
            {/* Warning Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getConditionSeverity(patient).bgColor}`}>
                <i className={`fas ${getConditionSeverity(patient).level === 'pregnancy' ? 'fa-baby' : 'fa-exclamation-triangle'} text-white text-2xl`}></i>
              </div>
            </div>
            
            {/* Warning Title */}
            <h3 className={`text-lg font-semibold mb-3 text-center ${getConditionSeverity(patient).gradient ? 'text-white' : getConditionSeverity(patient).textColor}`}>
              {getConditionSeverity(patient).level === 'pregnancy' ? 'Embarazo Detectado' : 'Alerta Médica Importante'}
            </h3>
            
            {/* Warning Message */}
            <div className={`text-sm mb-6 text-center ${getConditionSeverity(patient).gradient ? 'text-white' : getConditionSeverity(patient).textColor}`}>
              {getConditionSeverity(patient).level === 'pregnancy' && (
                <p>Esta paciente está <strong>embarazada</strong>. Se debe tener especial consideración en los tratamientos odontológicos.</p>
              )}
              {getConditionSeverity(patient).level === 'critical' && (
                <p>Este paciente presenta <strong>condiciones médicas críticas</strong> que requieren atención ESPECIAL.</p>
              )}
              {getConditionSeverity(patient).level === 'high' && (
                <p>Este paciente presenta <strong>condiciones médicas de alto riesgo</strong> que requieren especial atención.</p>
              )}
              {getConditionSeverity(patient).level === 'medium' && (
                <p>Este paciente presenta <strong>condiciones médicas moderadas</strong> que deben ser consideradas en el tratamiento.</p>
              )}
              {getConditionSeverity(patient).level === 'low' && (
                <p>Este paciente presenta <strong>condiciones médicas leves</strong> que deben ser tenidas en cuenta.</p>
              )}
              
              {/* Condition Details */}
              <div className="mt-3 space-y-1 text-xs">
                {patient.sexo === 'femenino' && patient.embarazo === 'si' && (
                  <div><strong>Embarazo:</strong> {patient.embarazo === 'si' ? 'Sí' : 'No'}</div>
                )}
                {patient.enfermedades && (
                  <div><strong>Enfermedades:</strong> {patient.enfermedades}</div>
                )}
                {patient.alergias && (
                  <div><strong>Alergias:</strong> {patient.alergias}</div>
                )}
                {patient.medicamentos && (
                  <div><strong>Medicamentos:</strong> {patient.medicamentos}</div>
                )}
              </div>
            </div>
            
            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
