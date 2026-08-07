'use client';
// Force dynamic rendering for this page

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientService } from '@/services/patientService';
import { ExportService } from '@/services/exportService';
import { Patient } from '@/types/patient';
import { useHistoricalMode } from '@/contexts/HistoricalModeContext';
import { getRecordCategoryInfoSync } from '@/utils/recordCategoryUtils';
import { getPatientType } from '@/utils/patientTypeUtils';
import { createWhatsAppUrl, formatPhoneDisplay, parsePhoneNumber } from '@/utils/phoneUtils';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';
import HistoricalBanner from '@/components/HistoricalBanner';
import AnimatedWhatsApp from '@/components/AnimatedWhatsApp';
import AnimatedUser from '@/components/AnimatedUser';
import DocumentDisplay from '@/components/DocumentDisplay';
import MedicalWarningModal from '@/components/MedicalWarningModal';
import { 
  User, Phone, Mail, MapPin, Heart, Activity, Coffee, 
  FileText, Edit3, ArrowLeft, Download, Printer, 
  AlertTriangle, Calendar, Clock, Stethoscope, Smile
} from 'lucide-react';

// Isolated component to prevent authentication conflicts
const IsolatedDocumentDisplay: React.FC<{ documents: string[], patientId: string }> = React.memo(({ documents, patientId }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <DocumentDisplay 
      documents={documents} 
      patientId={patientId}
      removable={false}
    />
  );
});

IsolatedDocumentDisplay.displayName = 'IsolatedDocumentDisplay';

export default function PatientPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const [patientType, setPatientType] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const { bypassHistoricalMode, setBypassHistoricalMode, loadPatientSettings, savePatientSettings } = useHistoricalMode();

  // Function to load historical mode setting from Supabase
  const loadHistoricalModeSetting = async () => {
    try {
      const pacienteId = params.id;
      if (!pacienteId || !isLoaded || !user) {
        return;
      }
      
      // Load both global and patient-specific settings
      const [globalResult, patientResult] = await Promise.allSettled([
        supabase
          .from('app_configuration')
          .select('config_value')
          .eq('config_key', 'historical_records_enabled')
          .single(),
        supabase
          .from('historical_mode_settings')
          .select('bypass_historical_mode')
          .eq('clerk_user_id', user.id)
          .eq('patient_id', pacienteId)
          .single()
      ]);
      
      // Handle global setting
      let globalBypass = false;
      if (globalResult.status === 'fulfilled' && globalResult.value.data) {
        const globalEnabled = globalResult.value.data.config_value === 'true';
        globalBypass = !globalEnabled;
      }
      
      // Handle patient-specific setting (takes priority)
      if (patientResult.status === 'fulfilled' && patientResult.value.data) {
        const patientBypass = patientResult.value.data.bypass_historical_mode;
        setBypassHistoricalMode(patientBypass);
      } else {
        setBypassHistoricalMode(globalBypass);
      }
    } catch (error) {
      console.error('Unexpected error loading historical mode setting:', error);
      setBypassHistoricalMode(false);
    }
  };

  useEffect(() => {
    if (params.id && isLoaded) {
      fetchPatient(params.id as string);
      loadHistoricalModeSetting();
    }
  }, [params.id, isLoaded]);

  const fetchPatient = async (id: string) => {
    try {
      const patientData = await PatientService.getPatientById(id);
      setPatient(patientData);
      
      // Calculate patient type for age-based colors
      const patientTypeData = getPatientType(patientData);
      
      // Special case: pregnancy - override colors with soft pink to blue gradient
      if (patientData.sexo === 'femenino' && patientData.embarazo === 'si') {
        patientTypeData.colors = {
          header: 'from-pink-500 to-blue-500',
          badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
          badgeText: 'border-pink-200 text-pink-700 dark:border-pink-200 dark:text-pink-300'
        };
        patientTypeData.label = 'Embarazada';
      }
      
      setPatientType(patientTypeData);
      
      // Load historical mode setting for this patient
      await loadPatientSettings(patientData.paciente_id);
      
      // Check record category (historical, active, archived)
      const categoryInfo = getRecordCategoryInfoSync(patientData.fecha_inicio || patientData.fecha_inicio_consulta);
      setRecordCategoryInfo(categoryInfo);
      
      // Show warning modal using improved algorithm - only if significant conditions exist
      const hasSignificantConditions = 
        (patientData.enfermedades && patientData.enfermedades.trim() !== '' && 
         !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patientData.enfermedades.toLowerCase().trim())) ||
        (patientData.alergias && patientData.alergias.trim() !== '' && 
         !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patientData.alergias.toLowerCase().trim())) ||
        (patientData.medicamentos && patientData.medicamentos.trim() !== '' && 
         !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patientData.medicamentos.toLowerCase().trim())) ||
        (patientData.sexo === 'femenino' && patientData.embarazo === 'si');
      
      if (hasSignificantConditions) {
        setShowWarningModal(true);
      }
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError('No se pudo cargar la información del paciente');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (patient) {
      ExportService.exportToPDF(patient);
    }
  };

  const handleExport = (format: 'pdf' | 'html' | 'json') => {
    if (!patient) return;
    
    switch (format) {
      case 'pdf':
        ExportService.exportToPDF(patient);
        break;
      case 'html':
        ExportService.exportToHTML(patient);
        break;
      case 'json':
        ExportService.exportToJSON(patient);
        break;
    }
    setShowExportModal(false);
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="w-6 h-6 text-teal-600" />
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Cargando información del paciente...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
          Error
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md text-center">
          {error || 'No se encontró el paciente'}
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-teal-600/25"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      {/* Header Actions - Modern Navigation Bar */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                Vista Previa del Paciente
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                #{patient.paciente_id} • {patientType?.label || 'Paciente'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Edit Patient Button */}
            <button
              onClick={() => router.push(`/patient-form?id=${params.id as string}`)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-600/25 active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </button>
            
            {/* Menu Button */}
            <button
              onClick={() => {
                const url = patient?.paciente_id ? `/menu-navegacion?id=${encodeURIComponent(patient.paciente_id)}` : '/menu-navegacion';
                router.push(url);
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-600/25 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Menú</span>
            </button>
            
            {/* Export Button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-600/25 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-gray-600/25 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Header - Modern Hero Card */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${patientType?.colors?.header || 'from-teal-500 to-cyan-500'} rounded-2xl shadow-xl mb-6`}>
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className={`w-24 h-24 ${patientType?.colors?.badge || 'bg-white/20'} rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm`}>
              <span className={`${patientType?.colors?.badgeText || 'text-white'} font-bold text-3xl`}>
                {getInitials(patient.nombre_completo)}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {patient.nombre_completo}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm md:text-base">
                {patient.numero_identidad && (
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <User className="w-4 h-4" />
                    {patient.numero_identidad}
                  </span>
                )}
                {patient.telefono && (
                  <a
                    href={createWhatsAppUrl(patient.telefono, patient.pais_codigo || '504')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {formatPhoneDisplay(patient.telefono, patient.pais_codigo || '504')}
                  </a>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <Mail className="w-4 h-4" />
                    {patient.email}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${patientType?.colors?.badge || 'bg-white/20 text-white'} backdrop-blur-sm shadow-lg`}>
                <User className="w-4 h-4" />
                {patientType?.label || 'Adulto'}
              </span>
              <span className="text-white/70 text-sm">
                Paciente #{patient.paciente_id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Mode Banner */}
      <HistoricalBanner
        isHistorical={recordCategoryInfo?.isHistorical}
        isBypassed={bypassHistoricalMode}
        patientId={patient?.paciente_id}
        onBypassChange={async (newBypassValue) => {
          try {
            await savePatientSettings(patient?.paciente_id, newBypassValue);
          } catch (error) {
            console.error('❌ Failed to update bypass setting:', error);
            alert('Error al actualizar la configuración del modo histórico');
          }
        }}
        loading={false}
        compact={true}
      />

      {/* Patient Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <div className="w-5 h-5 mr-2 flex items-center justify-center">
              <AnimatedUser />
            </div>
            Información Personal
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Nombre Completo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.nombre_completo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de Identificación:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.tipo_identificacion}</p>
            </div>
            {patient.numero_identidad && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Número de Identidad:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.numero_identidad}</p>
              </div>
            )}
            {patient.fecha_nacimiento && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Fecha de Nacimiento:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.fecha_nacimiento}</p>
              </div>
            )}
            {patient.edad && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Edad:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.edad} años (actual)</p>
                {patient.edad_al_momento_consulta && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <div className="text-sm">
                      <span className="font-medium text-green-700">Edad al momento de consulta:</span>
                      <span className="text-green-600 font-semibold">{patient.edad_al_momento_consulta} años</span>
                      {patient.fecha_inicio && <span className="text-xs text-green-500"> (al {SimpleTimezoneFix.formatDateForConsultationAge(patient.fecha_inicio)})</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Sexo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.sexo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de Sangre:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.tipo_sangre}</p>
            </div>
            {/* Legal Representative Information - Show if under 18 or if representative data exists */}
            {((patient.edad && patient.edad < 18) || patient.representante_legal) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <h4 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                  <div className="w-5 h-5 mr-2 flex items-center justify-center">
                    <AnimatedUser />
                  </div>
                  Representante Legal
                </h4>
                <div className="space-y-2">
                  {patient.representante_legal && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Nombre del Representante:</span>
                      <p className="text-gray-600 dark:text-gray-400">{patient.representante_legal}</p>
                    </div>
                  )}
                  {patient.parentesco && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Parentesco:</span>
                      <p className="text-gray-600 dark:text-gray-400">{patient.parentesco}</p>
                    </div>
                  )}
                  {patient.rep_celular && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Teléfono del Representante:</span>
                      <div className="flex items-center space-x-2">
                        <a
                          href={createWhatsAppUrl(patient.rep_celular, patient.rep_pais_codigo || '504')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          title="Enviar mensaje de WhatsApp"
                        >
                          <div className="w-5 h-5 flex items-center justify-center">
                            <AnimatedWhatsApp />
                          </div>
                        </a>
                        <a
                          href={createWhatsAppUrl(patient.rep_celular, patient.rep_pais_codigo || '504')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Enviar mensaje de WhatsApp"
                        >
                          {formatPhoneDisplay(patient.rep_celular, patient.rep_pais_codigo || '504')}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-address-book mr-2"></i>
            Información de Contacto
          </h3>
          <div className="space-y-3">
            {patient.telefono && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Teléfono:</span>
                <div className="flex items-center space-x-2">
                  <a
                    href={createWhatsAppUrl(patient.telefono, patient.pais_codigo || '504')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    title="Enviar mensaje de WhatsApp"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <AnimatedWhatsApp />
                    </div>
                  </a>
                  <a
                    href={createWhatsAppUrl(patient.telefono, patient.pais_codigo || '504')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    title="Enviar mensaje de WhatsApp"
                  >
                    {formatPhoneDisplay(patient.telefono, patient.pais_codigo || '504')}
                  </a>
                </div>
              </div>
            )}
            {patient.email && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.email}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dirección:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.direccion}</p>
            </div>
            {patient.contacto_emergencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Contacto de Emergencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.contacto_emergencia}</p>
              </div>
            )}
            {patient.contacto_telefono && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Teléfono de Emergencia:</span>
                <div className="flex items-center space-x-2">
                  <a
                    href={createWhatsAppUrl(patient.contacto_telefono, patient.contacto_pais_codigo || '504')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    title="Enviar mensaje de WhatsApp"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <AnimatedWhatsApp />
                    </div>
                  </a>
                  <a
                    href={createWhatsAppUrl(patient.contacto_telefono, patient.contacto_pais_codigo || '504')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    title="Enviar mensaje de WhatsApp"
                  >
                    {formatPhoneDisplay(patient.contacto_telefono, patient.contacto_pais_codigo || '504')}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-heartbeat mr-2"></i>
            Información Médica
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Enfermedades:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.enfermedades || 'Ninguna'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Alergias:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.alergias || 'Ninguna'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Medicamentos:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.medicamentos || 'Ninguno'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Hospitalizaciones:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.hospitalizaciones || 'Ninguna'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Cirugías:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.cirugias || 'Ninguna'}</p>
            </div>
            {patient.embarazo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Embarazo:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.embarazo}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Antecedentes Familiares:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.antecedentes_familiares || 'Ninguno'}</p>
            </div>
            {patient.vacunas && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Vacunas:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.vacunas}</p>
              </div>
            )}
            {patient.observaciones_medicas && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones Médicas:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.observaciones_medicas}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dental Evaluation Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-tooth mr-2"></i>
            Evaluación Odontológica
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Reacción adversa al anestésico:</span>
              <p className="text-gray-600 dark:text-gray-400">
                {patient.reaccion_adversa_anestesico === 'no' ? 'No' : 
                 patient.reaccion_adversa_anestesico === 'si' ? 'Sí' : 
                 patient.reaccion_adversa_anestesico === 'no_aplicada' ? 'No Aplicada' : 
                 'No especificado'}
              </p>
            </div>
            {patient.tipo_reaccion && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de reacción:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_reaccion}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Ha tenido experiencia odontológica traumática:</span>
              <p className="text-gray-600 dark:text-gray-400">
                {patient.experiencia_traumatica === 'no' ? 'No' : 
                 patient.experiencia_traumatica === 'si' ? 'Sí' : 
                 patient.experiencia_traumatica === 'es_1ra_consulta' ? 'Es 1ra Consulta' : 
                 'No especificado'}
              </p>
            </div>
            {patient.que_sucedio && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">¿Qué sucedió?:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.que_sucedio}</p>
              </div>
            )}
            {patient.observaciones_generales && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones Generales:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.observaciones_generales}</p>
              </div>
            )}
          </div>
        </div>

        {/* Habits Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-smoking mr-2"></i>
            Hábitos
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Fuma:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.fuma}</p>
            </div>
            {patient.fuma_cantidad && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Cantidad (cigarrillos/día):</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.fuma_cantidad}</p>
              </div>
            )}
            {patient.fuma_frecuencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.fuma_frecuencia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Alcohol:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.alcohol}</p>
            </div>
            {patient.alcohol_frecuencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.alcohol_frecuencia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Drogas:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.drogas}</p>
            </div>
            {patient.tipo_droga && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de Droga:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_droga}</p>
              </div>
            )}
            {patient.drogas_frecuencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.drogas_frecuencia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Café:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.cafe}</p>
            </div>
            {patient.cantidad_tazas && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tazas al día:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.cantidad_tazas}</p>
              </div>
            )}
            {patient.cafe_frecuencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.cafe_frecuencia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Bruxismo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.bruxismo}</p>
            </div>
            {patient.tipo_bruxismo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de bruxismo:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_bruxismo}</p>
              </div>
            )}
          </div>
        </div>

        {/* Diet Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-utensils mr-2"></i>
            Dieta y Hábitos Alimenticios
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Objetos duros:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.objetos}</p>
            </div>
            {patient.morder && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Morderse:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.morder}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Prótesis:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.protesis}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Prótesis tipo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.protesis_tipo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Uso nocturno de protesis:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.protesis_nocturno}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Sensibilidad:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.sensibilidad}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de sensibilidad:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.tipo_sensibilidad}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Bruxismo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.bruxismo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de bruxismo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.tipo_bruxismo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Higiene Oral - Cepillado:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.f_cepillado} veces al día</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Higiene Oral - Hilo Dental:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.hilo_dental}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Enjuague bucal:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.enjuague_bucal}</p>
            </div>
            {patient.enjuague_bucal === 'si' && patient.tipo_enjuague_bucal && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo enjuague bucal:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_enjuague_bucal}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor de cabeza:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_cabeza}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Detalles del dolor de cabeza:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_cabeza_detalle}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Chasquidos mandibulares:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.chasquidos_mandibulares}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor de oído frecuente:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_oido}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Detalles del dolor de oído:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_oido_detalle}</p>
            </div>
              <p className="text-gray-600 dark:text-gray-400">{patient.pastadental}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Cambio de cepillo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.cambio_cepillo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Hilo dental:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.hilo_dental}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Enjuague bucal:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.enjuague_bucal}</p>
            </div>
          </div>
        </div>

        {/* Dental Examination */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-search mr-2"></i>
            Examen Dental
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor de cabeza:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_cabeza}</p>
            </div>
            {patient.dolor_cabeza_detalle && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Detalles del dolor de cabeza:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.dolor_cabeza_detalle}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Chasquidos:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.chasquidos}</p>
            </div>
            {patient.chasquidos_mandibulares && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Chasquidos mandibulares:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.chasquidos_mandibulares}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor de oído:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_oido}</p>
            </div>
            {patient.dolor_oido_detalle && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Detalles del dolor de oído:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.dolor_oido_detalle}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Succión digital:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.suction_digital}</p>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              <i className="fas fa-notes-medical mr-2"></i>
              Plan de Tratamiento
            </h3>
          
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones:</span>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{patient.observaciones_plan}</p>
            </div>
          </div>
        </div>

        {/* Evaluación Odontológica */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-tooth mr-2"></i>
            Evaluación Odontológica
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Motivo de consulta:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.motivo}</p>
            </div>
            {patient.historial && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Historial dental previo:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.historial}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Sangrado de encías:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.encias}</p>
            </div>
            {patient.sangrado_encia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de sangrado de encía:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.sangrado_encia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor al masticar:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor}</p>
            </div>
            {patient.dolor_masticar && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de dolor:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.dolor_masticar}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor de cabeza frecuente:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_cabeza}</p>
            </div>
            {patient.dolor_cabeza_detalle && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de dolor de cabeza:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.dolor_cabeza_detalle}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Chasquidos mandibulares:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.chasquidos}</p>
            </div>
            {patient.chasquidos_mandibulares && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de chasquidos mandibulares:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.chasquidos_mandibulares}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor de oído frecuente:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_oido}</p>
            </div>
            {patient.dolor_oido_detalle && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de dolor de oído:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.dolor_oido_detalle}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Succión digital:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.suction_digital}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Utilizó ortodoncia:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.ortodoncia}</p>
            </div>
            {patient.orto_finalizado && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Finalizado:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.orto_finalizado}</p>
              </div>
            )}
            {patient.orto_motivo_no_finalizado && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Motivo de no finalizar tratamiento:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.orto_motivo_no_finalizado}</p>
              </div>
            )}
            {patient.protesis && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Prótesis:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.protesis}</p>
              </div>
            )}
            {patient.protesis_tipo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de prótesis:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.protesis_tipo}</p>
              </div>
            )}
            {patient.protesis_nocturno && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Uso nocturno de prótesis:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.protesis_nocturno}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Sensibilidad:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.sensibilidad}</p>
            </div>
            {patient.tipo_sensibilidad && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de sensibilidad:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_sensibilidad}</p>
              </div>
            )}
            {patient.ultima_limpieza && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Última limpieza:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.ultima_limpieza}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia de cepillado diario:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.f_cepillado}</p>
            </div>
            {patient.tipocepillo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de cepillo dental:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipocepillo}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de pasta dental:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.pastadental}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Cambio de cepillo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.cambio_cepillo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Uso de hilo dental:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.hilo_dental}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Uso de enjuague bucal:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.enjuague_bucal}</p>
            </div>
            {patient.enjuague_bucal === 'si' && patient.tipo_enjuague_bucal && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo enjuague bucal:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_enjuague_bucal}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dental Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-tooth mr-2"></i>
            Información Dental General
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Motivo de Consulta:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.motivo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Doctor:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.doctor}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Fecha de Inicio:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.fecha_inicio}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Seguro:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.seguro}</p>
            </div>
            {patient.poliza && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Póliza:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.poliza}</p>
              </div>
            )}
            {patient.contacto && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Contacto del seguro:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.contacto}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          <i className="fas fa-signature mr-2"></i>
          Firma Digital
        </h3>
        
        {patient.firma_digital ? (
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
            <img 
              src={patient.firma_digital} 
              alt="Firma del paciente" 
              className="max-w-full h-auto"
              style={{ maxHeight: '200px' }}
            />
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <i className="fas fa-signature text-gray-300 text-4xl mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">
              No hay firma digital registrada para este paciente
            </p>
          </div>
        )}
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {patient.firma_digital 
            ? `Firma digital del paciente registrada el ${patient.fecha_inicio}`
            : 'Este paciente no tiene firma digital registrada'
          }
        </p>
      </div>

      {/* Documentos Adjuntos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          <i className="fas fa-file-alt mr-2"></i>
          Documentos Adjuntos
        </h3>
        
        {patient.documentos && patient.documentos.length > 0 ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Este paciente tiene {patient.documentos.length} documento(s) adjunto(s)
            </p>
            <div className="min-h-0">
              <IsolatedDocumentDisplay 
                documents={patient.documentos} 
                patientId={patient.paciente_id}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <i className="fas fa-file-alt text-gray-300 text-4xl mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">
              No hay documentos adjuntos para este paciente
            </p>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Exportar Historia Clínica
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Seleccione el formato de exportación:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                Exportar como PDF
              </button>
              <button
                onClick={() => handleExport('html')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <i className="fas fa-file-code mr-2"></i>
                Exportar como HTML
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <i className="fas fa-file-code mr-2"></i>
                Exportar como JSON
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Improved Medical Warning Modal */}
      <MedicalWarningModal 
        patient={patient}
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
      />
    </div>
  );
}
