'use client';

// Force dynamic rendering for this page

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientService } from '@/services/patientService';
import { SupabaseDoctorService } from '@/services/supabaseDoctorService';
import { Patient } from '@/types/patient';
import { createPatient } from './actions';
import { updatePatient } from './edit-actions';
import { updatePregnancyStatus, calculatePregnancyStatus } from '@/utils/pregnancyUtils';
import SignaturePadComponent from '@/components/SignaturePad';
import SignatureDisplay from '@/components/SignatureDisplay';
import DocumentDisplay from '@/components/DocumentDisplay';
import { useTheme } from '@/contexts/ThemeContext';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';

// Isolated component to prevent authentication conflicts
const IsolatedDocumentDisplay: React.FC<{ documents: string[], patientId: string, removable?: boolean, onRemove?: (index: number) => void }> = React.memo(({ documents, patientId, removable = false, onRemove }) => {
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
      removable={removable}
      onRemove={onRemove}
    />
  );
});

IsolatedDocumentDisplay.displayName = 'IsolatedDocumentDisplay';
import { useHistoricalMode } from '@/contexts/HistoricalModeContext';
import { getRecordCategoryInfo } from '@/utils/recordCategoryUtils';
import { countries, parsePhoneNumber } from '@/utils/phoneUtils';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import HistoricalBanner from '@/components/HistoricalBanner';
import { 
  formatHonduranID, 
  formatPhoneNumber, 
  validatePhoneNumber, 
  getPhonePlaceholder
} from '@/utils/formatUtils';
import { formatCurrency } from '@/utils/currencyUtils';
import SmartIDValidation from '@/components/SmartIDValidation';
import MedicalWarningModal from '@/components/MedicalWarningModal';
import { 
  User, Phone, Mail, MapPin, Heart, Activity, Coffee, 
  FileText, Edit3, ArrowLeft, Download, Printer, 
  AlertTriangle, Calendar, Clock, Stethoscope, Smile,
  Save, X, ChevronLeft, UserPlus, FileCheck, AlertCircle
} from 'lucide-react';

// Medical condition severity calculation (same as menu-navegacion)
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
  
  // Pregnancy (high priority)
  if (patient.embarazo === 'si') {
    severityScore += 2;
    conditions.push('pregnancy');
  }
  
  // Medications (medium severity)
  if (patient.medicamentos && patient.medicamentos.trim() !== '') {
    severityScore += 1;
    conditions.push('medications');
  }
  
  // Determine severity level
  if (severityScore >= 5) {
    return { 
      level: 'critical', 
      color: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800', 
      textColor: 'text-red-700 dark:text-red-300', 
      bgColor: 'bg-red-500',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    };
  } else if (severityScore >= 3) {
    return { 
      level: 'high', 
      color: 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-800', 
      textColor: 'text-orange-700 dark:text-orange-300', 
      bgColor: 'bg-orange-500',
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
    };
  } else if (severityScore >= 1) {
    return { 
      level: 'medium', 
      color: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800', 
      textColor: 'text-yellow-700 dark:text-yellow-300', 
      bgColor: 'bg-yellow-500',
      gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
    };
  } else {
    return { 
      level: 'low', 
      color: 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800', 
      textColor: 'text-green-700 dark:text-green-300', 
      bgColor: 'bg-green-500'
    };
  }
  
  // Special case: pregnancy-only (no other conditions) - use soft pink to blue gradient
  if (conditions.length === 1 && conditions.includes('pregnancy')) {
    return { 
      level: 'pregnancy', 
      color: 'bg-pink-50 dark:bg-pink-900 border-pink-200 dark:border-pink-800', 
      textColor: 'text-pink-700 dark:text-pink-300', 
      bgColor: 'bg-pink-500',
      gradient: patient.sexo === 'femenino' && patient.embarazo === 'si'
        ? 'linear-gradient(to right, rgb(236 72 153), rgb(59 130 246))' // Soft pink to blue gradient for pregnancy
        : 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)'
    };
  };
};

// Helper function to extract clean filename from bucket URL
const getFileName = (url: string) => {
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  
  // Remove patient ID and timestamp prefix for cleaner display
  // Format: patientId_timestamp_filename.ext or patientId_timestamp_filename%20(1).ext
  
  let cleanFileName = fileName;
  
  // Remove patient ID (UUID pattern: 8-4-4-4-12 hex digits)
  cleanFileName = cleanFileName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
  
  // Remove timestamp (digits at start after underscore)
  cleanFileName = cleanFileName.replace(/^[0-9]+_/, '');
  
  // URL decode to handle %20 and other encoded characters
  try {
    cleanFileName = decodeURIComponent(cleanFileName);
  } catch (e) {
    // If decoding fails, use original
    console.warn('Failed to decode filename:', cleanFileName);
  }
  
  // If filename is too long, truncate it intelligently
  if (cleanFileName.length > 30) {
    const nameWithoutExt = cleanFileName.substring(0, cleanFileName.lastIndexOf('.'));
    const extension = cleanFileName.substring(cleanFileName.lastIndexOf('.'));
    
    // Truncate the name part but keep extension
    const truncatedName = nameWithoutExt.substring(0, 25) + '...' + extension;
    return truncatedName;
  }
  
  return cleanFileName;
};

export default function PatientForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Cargando formulario...</p>
      </div>
    }>
      <PatientFormContent />
    </Suspense>
  );
}

function PatientFormContent() {
  const { resolvedTheme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [idValidationResult, setIdValidationResult] = useState<any>(null);
  const [currentIdNumber, setCurrentIdNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{type: 'success' | 'warning', text: string} | null>(null);
  const [originalIdNumber, setOriginalIdNumber] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ index: number; name: string } | null>(null);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [fieldValidationStatus, setFieldValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'neutral'>>({});
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { bypassHistoricalMode, setBypassHistoricalMode, loadPatientSettings, savePatientSettings } = useHistoricalMode();

  // Function to load historical mode setting from Supabase
  const loadHistoricalModeSetting = async () => {
    try {
      const pacienteId = searchParams.get('id');
      if (!pacienteId || !isLoaded || !user) {
        return;
      }
      
      // Get ALL settings for this patient (from any user) and use the latest one
      const { data: allPatientSettings, error: patientError } = await supabase
        .from('historical_mode_settings')
        .select('bypass_historical_mode, updated_at, clerk_user_id')
        .eq('patient_id', pacienteId)
        .order('updated_at', { ascending: false }); // Get latest first
      
      if (patientError) {
        setBypassHistoricalMode(false);
        return;
      }
      
      if (allPatientSettings && allPatientSettings.length > 0) {
        // Use the most recent setting for this patient (regardless of which user created it)
        const latestSetting = allPatientSettings[0];
        const patientBypass = latestSetting.bypass_historical_mode;
        setBypassHistoricalMode(patientBypass);
      } else {
        setBypassHistoricalMode(false);
      }
    } catch (error) {
      console.error('Error loading historical mode setting:', error);
      setBypassHistoricalMode(false);
    }
  };
  
  // State for country codes
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState('504');
  const [selectedEmergencyCountry, setSelectedEmergencyCountry] = useState('504');
  const [selectedLegalRepCountry, setSelectedLegalRepCountry] = useState('504');

  const [tipoIdentificacion, setTipoIdentificacion] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [representanteLegal, setRepresentanteLegal] = useState('');
  const [sexo, setSexo] = useState('');
  const [doctor, setDoctor] = useState('');
  const [seguro, setSeguro] = useState('');
  const [edad, setEdad] = useState<number | ''>('');
  const [edadAlMomentoConsulta, setEdadAlMomentoConsulta] = useState<number | ''>('');
  const [fechaInicio, setFechaInicio] = useState('');
  
  // Additional Personal Information state variables
  const [otroTipoIdentificacion, setOtroTipoIdentificacion] = useState('');
  const [otroParentesco, setOtroParentesco] = useState('');
  const [repTipoIdentificacion, setRepTipoIdentificacion] = useState('');
  const [repOtroTipoIdentificacion, setRepOtroTipoIdentificacion] = useState('');
  const [repNumeroIdentidad, setRepNumeroIdentidad] = useState('');
  const [currentRepIdNumber, setCurrentRepIdNumber] = useState('');
  
  // Additional fields for minors
  const [apodo, setApodo] = useState('');
  const [enfermedadesSistemicasTexto, setEnfermedadesSistemicasTexto] = useState('');
  const [pediatraOtorrinolaringologo, setPediatraOtorrinolaringologo] = useState('');
  const [pediatra, setPediatra] = useState('');
  const [psicologo, setPsicologo] = useState('');
  const [otroMedico, setOtroMedico] = useState('');
  const [frecuenciaCepilladoDetalle, setFrecuenciaCepilladoDetalle] = useState('');
  const [cepilladoAcompanado, setCepilladoAcompanado] = useState('');
  
  // Additional minor-specific fields
  const [peso, setPeso] = useState<number | ''>('');
  const [talla, setTalla] = useState<number | ''>('');
  const [tipoAlimentacion, setTipoAlimentacion] = useState('');
  const [momentosAzucar, setMomentosAzucar] = useState('');
  
  const [otroGenero, setOtroGenero] = useState('');
  const [tipoSangre, setTipoSangre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [escolaridad, setEscolaridad] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('');
  const [email, setEmail] = useState('');
  const [trabajo, setTrabajo] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [medicoCabecera, setMedicoCabecera] = useState('');
  const [contacto, setContacto] = useState('');
  const [hospitalizaciones, setHospitalizaciones] = useState('');
  const [cirugias, setCirugias] = useState('');
  const [embarazo, setEmbarazo] = useState('');
  const [semanasEmbarazo, setSemanasEmbarazo] = useState('');
  const [medicamentosEmbarazo, setMedicamentosEmbarazo] = useState('');
  const [pregnancyCalculation, setPregnancyCalculation] = useState<any>(null);
  const [vacunas, setVacunas] = useState('');
  const [observacionesMedicas, setObservacionesMedicas] = useState('');
  const [antecedentesFamiliares, setAntecedentesFamiliares] = useState('');
  const [enfermedades, setEnfermedades] = useState('');
  const [alergias, setAlergias] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [planTratamiento, setPlanTratamiento] = useState('');
  const [proximoControl, setProximoControl] = useState('');
  const [notasOdontologo, setNotasOdontologo] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [observacionesPlan, setObservacionesPlan] = useState('');
  
  // Additional conditional fields state variables
  const [otroDoctor, setOtroDoctor] = useState('');
  const [otroSeguro, setOtroSeguro] = useState('');
  const [poliza, setPoliza] = useState('');
  const [fuma, setFuma] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]); // Add doctors from database
  const [fumaCantidad, setFumaCantidad] = useState('');
  const [fumaFrecuencia, setFumaFrecuencia] = useState('');
  const [alcoholCantidad, setAlcoholCantidad] = useState('');
  const [alcoholFrecuencia, setAlcoholFrecuencia] = useState('');
  const [drogasTipo, setDrogasTipo] = useState('');
  const [drogasFrecuencia, setDrogasFrecuencia] = useState('');
  const [cafeTazas, setCafeTazas] = useState('');
  const [cafeFrecuencia, setCafeFrecuencia] = useState('');
  
  // Additional conditional fields state variables
  const [morder, setMorder] = useState('');
  const [hielo, setHielo] = useState('');
  const [boca, setBoca] = useState('');
  const [refrescos, setRefrescos] = useState('');
  const [dulces, setDulces] = useState('');
  const [pegajosos, setPegajosos] = useState('');
  const [azucarados, setAzucarados] = useState('');
  const [obs, setObs] = useState('');
  const [visitasDentista, setVisitasDentista] = useState('');
  const [obsgen, setObsgen] = useState('');
  const [motivo, setMotivo] = useState('');
  const [historial, setHistorial] = useState('');
  const [sangradoEncia, setSangradoEncia] = useState('');
  const [dolorMasticar, setDolorMasticar] = useState('');
  const [dolorCabezaDetalle, setDolorCabezaDetalle] = useState('');
  const [chasquidosMandibulares, setChasquidosMandibulares] = useState('');
  const [dolorOidoDetalle, setDolorOidoDetalle] = useState('');
  const [suctionDigital, setSuctionDigital] = useState('');
  const [protesisTipo, setProtesisTipo] = useState('');
  const [protesisNocturno, setProtesisNocturno] = useState('');
  const [tipoBruxismo, setTipoBruxismo] = useState('');
  
  // Additional Evaluación Odontológica state variables
  const [ultimaLimpieza, setUltimaLimpieza] = useState('');
  const [fCepillado, setFCepillado] = useState('');
  const [tipocepillo, setTipocepillo] = useState('');
  const [pastadental, setPastadental] = useState('');
  const [cambioCepillo, setCambioCepillo] = useState('');
  const [hiloDental, setHiloDental] = useState('');
  const [enjuagueBucal, setEnjuagueBucal] = useState('');
  const [tipoEnjuagueBucal, setTipoEnjuagueBucal] = useState('');
  const [ortodoncia, setOrtodoncia] = useState('');
  
  // New dental evaluation fields
  const [reaccionAdversaAnestesico, setReaccionAdversaAnestesico] = useState('');
  const [tipoReaccion, setTipoReaccion] = useState('');
  const [experienciaTraumatica, setExperienciaTraumatica] = useState('');
  const [queSucedio, setQueSucedio] = useState('');
  const [finalizoTratamiento, setFinalizoTratamiento] = useState('');
  const [ortodonciaMotivoNoFinalizado, setOrtodonciaMotivoNoFinalizado] = useState('');
  
  // Observaciones Generales field
  const [observacionesGenerales, setObservacionesGenerales] = useState('');

  // Fetch doctors from database
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctorsData = await SupabaseDoctorService.getDoctors();
        setDoctors(doctorsData);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };

    fetchDoctors();
  }, []);
  const [alcohol, setAlcohol] = useState('');
  const [drogas, setDrogas] = useState('');
  const [objetos, setObjetos] = useState('');
  const [cafe, setCafe] = useState('');
  const [encias, setEncias] = useState('');
  const [dolor, setDolor] = useState('');
  const [dolorCabeza, setDolorCabeza] = useState('');
  const [chasquidos, setChasquidos] = useState('');
  const [dolorOido, setDolorOido] = useState('');
  const [protesis, setProtesis] = useState('');
  const [bruxismo, setBruxismo] = useState('');
  const [sensibilidad, setSensibilidad] = useState('');
  const [tipoSensibilidad, setTipoSensibilidad] = useState('');
  
  // Examen Intraoral state variables
  const [diagnostico, setDiagnostico] = useState('');

  // Calculate age from birthdate
  const handleFechaNacimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fecha = e.target.value;
    if (!fecha) {
      setEdad('');
      return;
    }
    
    // Validate year is exactly 4 digits
    const yearMatch = fecha.match(/(\d{4})/);
    if (!yearMatch) {
      return; // Invalid year format
    }
    
    const birthDate = new Date(fecha);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setEdad(age);
  };
  
  // Real-time historical detection for new patient creation
  const handleFechaInicioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fechaInicio = e.target.value;
    
    // Validate year is exactly 4 digits
    if (fechaInicio) {
      const yearMatch = fechaInicio.match(/(\d{4})/);
      if (!yearMatch) {
        return; // Invalid year format
      }
      
      const categoryInfo = await getRecordCategoryInfo(fechaInicio);
      setRecordCategoryInfo(categoryInfo);
    } else {
      setRecordCategoryInfo(null);
    }
  };

  // Phone formatting handlers
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, countryCode: string) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value, countryCode);
    e.target.value = formatted;
  };

  // ID formatting handlers
  const handleIDNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatHonduranID(value);
    setCurrentIdNumber(formatted);
  };

  const handleRepIDNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatHonduranID(value);
    setRepNumeroIdentidad(formatted);
    setCurrentRepIdNumber(formatted);
  };

  // Load existing patient data if editing
  useEffect(() => {
    const patientId = searchParams.get('id');
    if (patientId) {
      loadPatientData(patientId);
    }
  }, [searchParams]);

  // Calculate pregnancy status when relevant fields change
  useEffect(() => {
    if (embarazo === 'si' && fechaInicio && semanasEmbarazo) {
      const semanasNum = parseInt(semanasEmbarazo);
      if (!isNaN(semanasNum) && semanasNum > 0) {
        try {
          const calculation = calculatePregnancyStatus(fechaInicio, semanasNum);
          setPregnancyCalculation(calculation);
        } catch (error) {
          console.error('Error calculating pregnancy status:', error);
          setPregnancyCalculation(null);
        }
      } else {
        setPregnancyCalculation(null);
      }
    } else {
      setPregnancyCalculation(null);
    }
  }, [embarazo, fechaInicio, semanasEmbarazo]);

  const loadPatientData = async (patientId: string) => {
    try {
      const patient = await PatientService.getPatientById(patientId);
      setIsEditing(true);
      
      // Load patient historical mode settings
      await loadPatientSettings(patientId);
      
      // Set record category info based on patient's fecha_inicio or fecha_inicio_consulta
      if (patient.fecha_inicio_consulta) {
        const categoryInfo = await getRecordCategoryInfo(patient.fecha_inicio_consulta);
        setRecordCategoryInfo(categoryInfo);
      } else if (patient.fecha_inicio) {
        const categoryInfo = await getRecordCategoryInfo(patient.fecha_inicio);
        setRecordCategoryInfo(categoryInfo);
      }
      
      setExistingSignature(patient.firma_digital);
      
      // Set all controlled component states
      setTipoIdentificacion(patient.tipo_identificacion || '');
      setOtroTipoIdentificacion(patient.otro_tipo_identificacion || '');
      setParentesco(patient.parentesco || '');
      setOtroParentesco(patient.otro_parentesco || '');
      setRepresentanteLegal(patient.representante_legal || '');
      setRepTipoIdentificacion(patient.rep_tipo_identificacion || '');
      setRepOtroTipoIdentificacion(patient.rep_otro_tipo_identificacion || '');
      setRepNumeroIdentidad(patient.rep_numero_identidad || '');
      setCurrentRepIdNumber(patient.rep_numero_identidad || '');
      setSexo(patient.sexo);
      setOtroGenero(patient.otro_genero || '');
      setTipoSangre(patient.tipo_sangre);
      setDireccion(patient.direccion);
      setEscolaridad(patient.escolaridad);
      setEstadoCivil(patient.estado_civil || '');
      setEmail(patient.email);
      setTrabajo(patient.trabajo);
      setContactoEmergencia(patient.contacto_emergencia);
      setContactoTelefono(patient.contacto_telefono);
      setMedicoCabecera(patient.medico_cabecera || '');
      
      // Additional fields for minors
      setApodo(patient.apodo || '');
      setEnfermedadesSistemicasTexto(patient.enfermedades_sistemicas_texto || '');
      setPediatraOtorrinolaringologo(patient.pediatra_otorrinolaringologo || '');
      setPediatra(patient.pediatra || '');
      setPsicologo(patient.psicologo || '');
      setOtroMedico(patient.otro_medico || '');
      setFrecuenciaCepilladoDetalle(patient.frecuencia_cepillado_detalle || '');
      setCepilladoAcompanado(patient.cepillado_acompanado || '');
      
      // Additional minor-specific fields
      setPeso(patient.peso || '');
      setTalla(patient.talla || '');
      setTipoAlimentacion(patient.tipo_alimentacion || '');
      setMomentosAzucar(patient.momentos_azucar || '');
      
      setDoctor(patient.doctor || '');
      setFechaInicio(patient.fecha_inicio);
      setSeguro(patient.seguro || '');
      setContacto(patient.contacto || '');
      setHospitalizaciones(patient.hospitalizaciones || '');
      setCirugias(patient.cirugias || '');
      setEmbarazo(patient.embarazo);
      setSemanasEmbarazo(patient.semanas_embarazo?.toString() || '');
      setMedicamentosEmbarazo(patient.medicamentos_embarazo || '');
      
      // Load pregnancy calculation if patient is pregnant
      if (patient.embarazo === 'si' && patient.fecha_inicio && patient.semanas_embarazo) {
        try {
          const calculation = calculatePregnancyStatus(patient.fecha_inicio, patient.semanas_embarazo);
          setPregnancyCalculation(calculation);
        } catch (error) {
          console.error('Error loading pregnancy calculation:', error);
          setPregnancyCalculation(null);
        }
      }
      
      setVacunas(patient.vacunas);
      setObservacionesMedicas(patient.observaciones_medicas);
      setAntecedentesFamiliares(patient.antecedentes_familiares);
      setEnfermedades(patient.enfermedades);
      setAlergias(patient.alergias);
      setMedicamentos(patient.medicamentos);
      setMotivoConsulta(patient.motivo_consulta);
      setPlanTratamiento(patient.plan_tratamiento);
      setProximoControl(patient.proximo_control);
      setNotasOdontologo(patient.notas_odontologo);
      setTratamiento(patient.tratamiento);
      setObservacionesPlan(patient.observaciones_plan);
      setEdad(patient.edad || '');
      setEdadAlMomentoConsulta(patient.edad_al_momento_consulta || '');
      setFechaInicio(patient.fecha_inicio || '');
      setOtroDoctor(patient.otro_doctor || '');
      setOtroSeguro(patient.otro_seguro || '');
      setPoliza(patient.poliza || '');
      
      // Set dental evaluation states
      setEncias(patient.encias);
      setTipoSensibilidad(patient.tipo_sensibilidad || '');
      
      // Set Hábitos section states
      setFuma(patient.fuma || '');
      setFumaCantidad(patient.fuma_cantidad || '');
      setFumaFrecuencia(patient.fuma_frecuencia || '');
      setAlcohol(patient.alcohol || '');
      setAlcoholCantidad(patient.alcohol_cantidad || '');
      setAlcoholFrecuencia(patient.alcohol_frecuencia || '');
      setDrogas(patient.drogas || '');
      setDrogasTipo(patient.tipo_droga || '');
      setDrogasFrecuencia(patient.drogas_frecuencia || '');
      setObjetos(patient.objetos || '');
      setCafe(patient.cafe || '');
      setCafeTazas(patient.cantidad_tazas?.toString() || '');
      setCafeFrecuencia(patient.cafe_frecuencia || '');
      
      // Set additional conditional fields
      setMorder(patient.morder || '');
      setHielo(patient.hielo || '');
      setBoca(patient.boca || '');
      setRefrescos(patient.refrescos || '');
      setDulces(patient.dulces || '');
      setPegajosos(patient.pegajosos || '');
      setAzucarados(patient.azucarados || '');
      setObs(patient.obs || '');
      setVisitasDentista(patient.visitas_dentista || '');
      setObsgen(patient.obsgen || '');
      setMotivo(patient.motivo || '');
      setHistorial(patient.historial || '');
      setSangradoEncia(patient.sangrado_encia || '');
      setDolorMasticar(patient.dolor_masticar || '');
      setDolorCabezaDetalle(patient.dolor_cabeza_detalle || '');
      setChasquidosMandibulares(patient.chasquidos_mandibulares || '');
      setDolorOidoDetalle(patient.dolor_oido_detalle || '');
      setSuctionDigital(patient.suction_digital || '');
      setProtesisTipo(patient.protesis_tipo || '');
      setProtesisNocturno(patient.protesis_nocturno || '');
      setTipoBruxismo(patient.tipo_bruxismo || '');
      setUltimaLimpieza(patient.ultima_limpieza || '');
      setFCepillado(patient.f_cepillado?.toString() || '');
      setTipocepillo(patient.tipocepillo || '');
      setPastadental(patient.pastadental || '');
      setCambioCepillo(patient.cambio_cepillo || '');
      setHiloDental(patient.hilo_dental || '');
      setEnjuagueBucal(patient.enjuague_bucal || '');
      setTipoEnjuagueBucal(patient.tipo_enjuague_bucal || '');
      setOrtodoncia(patient.ortodoncia || '');
      setFinalizoTratamiento(patient.orto_finalizado || '');
      setOrtodonciaMotivoNoFinalizado(patient.orto_motivo_no_finalizado || '');
      setDiagnostico(patient.diagnostico || '');
      
      // Set missing fields that were not being loaded
      setBruxismo(patient.bruxismo || '');
      setDolorCabeza(patient.dolor_cabeza || '');
      setChasquidos(patient.chasquidos || '');
      setDolorOido(patient.dolor_oido || '');
      setProtesis(patient.protesis || '');
      setSensibilidad(patient.sensibilidad || '');
      
      // Set new dental evaluation fields
      setReaccionAdversaAnestesico(patient.reaccion_adversa_anestesico || '');
      setTipoReaccion(patient.tipo_reaccion || '');
      setExperienciaTraumatica(patient.experiencia_traumatica || '');
      setQueSucedio(patient.que_sucedio || '');
      setObservacionesGenerales(patient.observaciones_generales || '');
      
      // Populate form inputs after a small delay to ensure DOM is ready
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          // Personal Information
          const nameInput = form.querySelector('#nombre_completo') as HTMLInputElement;
          if (nameInput) nameInput.value = patient?.nombre_completo || '';
          
          const idTypeSelect = form.querySelector('#tipo_identificacion') as HTMLSelectElement;
          if (idTypeSelect) idTypeSelect.value = patient?.tipo_identificacion || '';
          
          const idNumberInput = form.querySelector('#numero_identidad') as HTMLInputElement;
          if (idNumberInput) {
            const idValue = patient?.numero_identidad || '';
            idNumberInput.value = idValue;
            setCurrentIdNumber(idValue); // Set current ID for validation
            setOriginalIdNumber(idValue); // Store original ID for smart validation
          }
          
          const birthDateInput = form.querySelector('#fecha_nacimiento') as HTMLInputElement;
          if (birthDateInput) birthDateInput.value = patient?.fecha_nacimiento || '';
          
          const ageInput = form.querySelector('#edad') as HTMLInputElement;
          if (ageInput) ageInput.value = patient?.edad?.toString() || '';
          
          const sexSelect = form.querySelector('#sexo') as HTMLSelectElement;
          if (sexSelect) sexSelect.value = patient?.sexo || '';
          
          const bloodTypeSelect = form.querySelector('#tipo_sangre') as HTMLSelectElement;
          if (bloodTypeSelect) bloodTypeSelect.value = patient?.tipo_sangre || '';
          
          const phoneInput = form.querySelector('#telefono') as HTMLInputElement;
          if (phoneInput) phoneInput.value = patient.telefono || '';
          
          // Set phone country codes if phone data exists
          if (patient.telefono) {
            const phoneData = parsePhoneNumber(patient.telefono, patient.codigopais);
            setSelectedPhoneCountry(phoneData.countryCode);
          }
          
          const addressInput = form.querySelector('#direccion') as HTMLInputElement;
          if (addressInput) addressInput.value = patient.direccion;
          
          const emailInput = form.querySelector('#email') as HTMLInputElement;
          if (emailInput) emailInput.value = patient.email || '';
          
          const emergencyContactInput = form.querySelector('#contacto_emergencia') as HTMLInputElement;
          if (emergencyContactInput) emergencyContactInput.value = patient.contacto_emergencia || '';
          
          const emergencyPhoneInput = form.querySelector('#contacto_telefono') as HTMLInputElement;
          if (emergencyPhoneInput && patient.contacto_telefono) {
            const emergencyPhoneData = parsePhoneNumber(patient.contacto_telefono, patient.codigopaisemergencia);
            setSelectedEmergencyCountry(emergencyPhoneData.countryCode);
            emergencyPhoneInput.value = emergencyPhoneData.number;
          } else if (emergencyPhoneInput) {
            emergencyPhoneInput.value = patient.contacto_telefono || '';
          }
          
          const doctorSelect = form.querySelector('#doctor') as HTMLSelectElement;
          if (doctorSelect) doctorSelect.value = patient.doctor;
          
          const startDateInput = form.querySelector('#fecha_inicio') as HTMLInputElement;
          if (startDateInput) {
            startDateInput.value = patient.fecha_inicio;
            // Trigger the change handler to update historical banner
            if (patient.fecha_inicio) {
              handleFechaInicioChange({ target: { value: patient.fecha_inicio } } as any);
            }
          }
          
          const insuranceSelect = form.querySelector('#seguro') as HTMLSelectElement;
          if (insuranceSelect) insuranceSelect.value = patient.seguro;
          
          const legalRepPhoneInput = form.querySelector('#rep_celular') as HTMLInputElement;
          if (legalRepPhoneInput && patient.rep_celular) {
            const legalRepPhoneData = parsePhoneNumber(patient.rep_celular, patient.codigopaisrepresentante);
            setSelectedLegalRepCountry(legalRepPhoneData.countryCode);
            legalRepPhoneInput.value = legalRepPhoneData.number;
          } else if (legalRepPhoneInput) {
            legalRepPhoneInput.value = patient.rep_celular || '';
          }
          
          // Medical Information
          const diseasesInput = form.querySelector('#enfermedades') as HTMLInputElement;
          if (diseasesInput) diseasesInput.value = patient.enfermedades || '';
          
          const allergiesInput = form.querySelector('#alergias') as HTMLInputElement;
          if (allergiesInput) allergiesInput.value = patient.alergias || '';
          
          const medicationsInput = form.querySelector('#medicamentos') as HTMLInputElement;
          if (medicationsInput) medicationsInput.value = patient.medicamentos || '';
          
          const hospitalizationsInput = form.querySelector('#hospitalizaciones') as HTMLInputElement;
          if (hospitalizationsInput) hospitalizationsInput.value = patient.hospitalizaciones || '';
          
          const surgeriesInput = form.querySelector('#cirugias') as HTMLInputElement;
          if (surgeriesInput) surgeriesInput.value = patient.cirugias || '';
          
          const familyHistoryInput = form.querySelector('#antecedentes_familiares') as HTMLInputElement;
          if (familyHistoryInput) familyHistoryInput.value = patient.antecedentes_familiares || '';
          
          // Habits
          const fumaSelect = form.querySelector('#fuma') as HTMLSelectElement;
          if (fumaSelect) fumaSelect.value = patient.fuma;
          
          const alcoholSelect = form.querySelector('#alcohol') as HTMLSelectElement;
          if (alcoholSelect) alcoholSelect.value = patient.alcohol;
          
          const drogasSelect = form.querySelector('#drogas') as HTMLSelectElement;
          if (drogasSelect) drogasSelect.value = patient.drogas;
          
          const cafeSelect = form.querySelector('#cafe') as HTMLSelectElement;
          if (cafeSelect) cafeSelect.value = patient.cafe;
          
          // Dental Information - Evaluación Odontológica
          const motivoTextarea = form.querySelector('#motivo') as HTMLTextAreaElement;
          if (motivoTextarea) motivoTextarea.value = patient.motivo;
          
          const historialTextarea = form.querySelector('#historial') as HTMLTextAreaElement;
          if (historialTextarea) historialTextarea.value = patient.historial || '';
          
          // For controlled selects, the state should already handle this
          // But let's also try to set the DOM value as backup
          const enciasSelect = form.querySelector('#sangradoEnciasSelect') as HTMLSelectElement;
          if (enciasSelect) enciasSelect.value = patient.encias;
          
          const dolorMasticarSelect = form.querySelector('#dolorMasticarSelect') as HTMLSelectElement;
          if (dolorMasticarSelect) dolorMasticarSelect.value = patient.dolor;
          
          const dolorCabezaSelect = form.querySelector('#dolorCabezaSelect') as HTMLSelectElement;
          if (dolorCabezaSelect) dolorCabezaSelect.value = patient.dolor_cabeza;
          
          const chasquidosSelect = form.querySelector('#chasquidosSelect') as HTMLSelectElement;
          if (chasquidosSelect) chasquidosSelect.value = patient.chasquidos;
          
          const dolorOidoSelect = form.querySelector('#dolorOidoSelect') as HTMLSelectElement;
          if (dolorOidoSelect) dolorOidoSelect.value = patient.dolor_oido;
          
          // Textareas for conditional fields
          const sangradoEnciaTextarea = form.querySelector('#sangrado_encia') as HTMLTextAreaElement;
          if (sangradoEnciaTextarea) sangradoEnciaTextarea.value = patient.sangrado_encia || '';
          
          const dolorMasticarTextarea = form.querySelector('#dolor_masticar') as HTMLTextAreaElement;
          if (dolorMasticarTextarea) dolorMasticarTextarea.value = patient.dolor_masticar || '';
          
          const dolorCabezaDetalleTextarea = form.querySelector('#dolor_cabeza_detalle') as HTMLTextAreaElement;
          if (dolorCabezaDetalleTextarea) dolorCabezaDetalleTextarea.value = patient.dolor_cabeza_detalle || '';
          
          const chasquidosMandibularesTextarea = form.querySelector('#chasquidos_mandibulares') as HTMLTextAreaElement;
          if (chasquidosMandibularesTextarea) chasquidosMandibularesTextarea.value = patient.chasquidos_mandibulares || '';
          
          const dolorOidoDetalleTextarea = form.querySelector('#dolor_oido_detalle') as HTMLTextAreaElement;
          if (dolorOidoDetalleTextarea) dolorOidoDetalleTextarea.value = patient.dolor_oido_detalle || '';
          
          // Other fields
          const fCepilladoInput = form.querySelector('#f_cepillado') as HTMLInputElement;
          if (fCepilladoInput) fCepilladoInput.value = patient.f_cepillado?.toString() || '';
          
          const hiloDentalSelect = form.querySelector('#hilo_dental') as HTMLSelectElement;
          if (hiloDentalSelect) hiloDentalSelect.value = patient.hilo_dental;
          
          const protesisSelect = form.querySelector('#protesis') as HTMLSelectElement;
          if (protesisSelect) protesisSelect.value = patient.protesis;
          
          const sensibilidadSelect = form.querySelector('#sensibilidad') as HTMLSelectElement;
          if (sensibilidadSelect) sensibilidadSelect.value = patient.sensibilidad;
          
          const tipoSensibilidadSelect = form.querySelector('#tipo_sensibilidad') as HTMLSelectElement;
          if (tipoSensibilidadSelect) tipoSensibilidadSelect.value = patient.tipo_sensibilidad || '';
          
          const bruxismoSelect = form.querySelector('#bruxismo') as HTMLSelectElement;
          if (bruxismoSelect) bruxismoSelect.value = patient.bruxismo;
          
          // Additional fields that were missing
          const escolaridadSelect = form.querySelector('#escolaridad') as HTMLSelectElement;
          if (escolaridadSelect) escolaridadSelect.value = patient.escolaridad;
          
          const estadoCivilSelect = form.querySelector('#estado_civil') as HTMLSelectElement;
          if (estadoCivilSelect) estadoCivilSelect.value = patient.estado_civil;
          
          const trabajoInput = form.querySelector('#trabajo') as HTMLInputElement;
          if (trabajoInput) trabajoInput.value = patient.trabajo || '';
          
          const vacunasInput = form.querySelector('#vacunas') as HTMLInputElement;
          if (vacunasInput) vacunasInput.value = patient.vacunas || '';
          
          const observacionesMedicasInput = form.querySelector('#observaciones_medicas') as HTMLInputElement;
          if (observacionesMedicasInput) observacionesMedicasInput.value = patient.observaciones_medicas || '';
          
          // Habits frequency fields
          const fumaCantidadInput = form.querySelector('#fuma_cantidad') as HTMLInputElement;
          if (fumaCantidadInput) fumaCantidadInput.value = patient.fuma_cantidad || '';
          
          const fumaFrecuenciaSelect = form.querySelector('#fuma_frecuencia') as HTMLSelectElement;
          if (fumaFrecuenciaSelect) fumaFrecuenciaSelect.value = patient.fuma_frecuencia || '';
          
          const alcoholFrecuenciaSelect = form.querySelector('#alcohol_frecuencia') as HTMLSelectElement;
          if (alcoholFrecuenciaSelect) alcoholFrecuenciaSelect.value = patient.alcohol_frecuencia || '';
          
          const tipoDrogaInput = form.querySelector('#tipo_droga') as HTMLInputElement;
          if (tipoDrogaInput) tipoDrogaInput.value = patient.tipo_droga || '';
          
          const drogasFrecuenciaInput = form.querySelector('#drogas_frecuencia') as HTMLInputElement;
          if (drogasFrecuenciaInput) drogasFrecuenciaInput.value = patient.drogas_frecuencia || '';
          
          const cantidadTazasInput = form.querySelector('#cantidad_tazas') as HTMLInputElement;
          if (cantidadTazasInput) cantidadTazasInput.value = patient.cantidad_tazas?.toString() || '';
          
          // Diet fields
          const objetosSelect = form.querySelector('#objetos') as HTMLSelectElement;
          if (objetosSelect) objetosSelect.value = patient.objetos;
          
          const morderSelect = form.querySelector('#morder') as HTMLSelectElement;
          if (morderSelect) morderSelect.value = patient.morder || '';
          
          const hieloSelect = form.querySelector('#hielo') as HTMLSelectElement;
          if (hieloSelect) hieloSelect.value = patient.hielo;
          
          const bocaSelect = form.querySelector('#boca') as HTMLSelectElement;
          if (bocaSelect) bocaSelect.value = patient.boca;
          
          const refrescosSelect = form.querySelector('#refrescos') as HTMLSelectElement;
          if (refrescosSelect) refrescosSelect.value = patient.refrescos;
          
          const dulcesSelect = form.querySelector('#dulces') as HTMLSelectElement;
          if (dulcesSelect) dulcesSelect.value = patient.dulces;
          
          const pegajososSelect = form.querySelector('#pegajosos') as HTMLSelectElement;
          if (pegajososSelect) pegajososSelect.value = patient.pegajosos;
          
          const azucaradosSelect = form.querySelector('#azucarados') as HTMLSelectElement;
          if (azucaradosSelect) azucaradosSelect.value = patient.azucarados;
          
          const obsInput = form.querySelector('#obs') as HTMLInputElement;
          if (obsInput) obsInput.value = patient.obs || '';
          
          // Other important fields
          const diagnosticoInput = form.querySelector('#diagnostico') as HTMLInputElement;
          if (diagnosticoInput) diagnosticoInput.value = patient.diagnostico || '';
          
          const tratamientoInput = form.querySelector('#tratamiento') as HTMLInputElement;
          if (tratamientoInput) tratamientoInput.value = patient.tratamiento || '';
          
          const observacionesPlanInput = form.querySelector('#observaciones_plan') as HTMLInputElement;
          if (observacionesPlanInput) observacionesPlanInput.value = patient.observaciones_plan || '';
          
          // Missing fields that need to be populated
          const medicoCabeceraInput = form.querySelector('#medico_cabecera') as HTMLInputElement;
          if (medicoCabeceraInput) medicoCabeceraInput.value = patient.medico_cabecera || '';
          
          const polizaInput = form.querySelector('#poliza') as HTMLInputElement;
          if (polizaInput) polizaInput.value = patient.poliza || '';
          
          const contactoInput = form.querySelector('#contacto') as HTMLInputElement;
          if (contactoInput) contactoInput.value = patient.contacto || '';
          
          const embarazoSelect = form.querySelector('#embarazo') as HTMLSelectElement;
          if (embarazoSelect) embarazoSelect.value = patient.embarazo || '';
          
          const semanasEmbarazoInput = form.querySelector('#semanas_embarazo') as HTMLInputElement;
          if (semanasEmbarazoInput) semanasEmbarazoInput.value = patient.semanas_embarazo?.toString() || '';
          
          const medicamentosEmbarazoTextarea = form.querySelector('#medicamentos_embarazo') as HTMLTextAreaElement;
          if (medicamentosEmbarazoTextarea) medicamentosEmbarazoTextarea.value = patient.medicamentos_embarazo || '';
          
          const visitasDentistaInput = form.querySelector('#visitas_dentista') as HTMLInputElement;
          if (visitasDentistaInput) visitasDentistaInput.value = patient.visitas_dentista || '';
          
          const obsgenInput = form.querySelector('#obsgen') as HTMLInputElement;
          if (obsgenInput) obsgenInput.value = patient.obsgen || '';
          
          const suctionDigitalSelect = form.querySelector('#suction_digital') as HTMLSelectElement;
          if (suctionDigitalSelect) suctionDigitalSelect.value = patient.suction_digital;
          
          const ultimaLimpiezaInput = form.querySelector('#ultima_limpieza') as HTMLInputElement;
          if (ultimaLimpiezaInput) ultimaLimpiezaInput.value = patient.ultima_limpieza || '';
          
          const tipocepilloSelect = form.querySelector('#tipocepillo') as HTMLSelectElement;
          if (tipocepilloSelect) tipocepilloSelect.value = patient.tipocepillo || '';
          
          const pastadentalSelect = form.querySelector('#pastadental') as HTMLSelectElement;
          if (pastadentalSelect) pastadentalSelect.value = patient.pastadental || '';
          
          const cambioCepilloSelect = form.querySelector('#cambio_cepillo') as HTMLSelectElement;
          if (cambioCepilloSelect) cambioCepilloSelect.value = patient.cambio_cepillo;
          
          const enjuagueBucalSelect = form.querySelector('#enjuague_bucal') as HTMLSelectElement;
          if (enjuagueBucalSelect) enjuagueBucalSelect.value = patient.enjuague_bucal;
        }
      }, 100);
      
      // Set current patient for warning modal and historical mode
      setCurrentPatient(patient);
      
      // Load historical mode setting for this patient
      await loadHistoricalModeSetting();
      
      // Show warning modal using improved algorithm - only if significant conditions exist
      const hasSignificantConditions = 
        (patient.enfermedades && patient.enfermedades.trim() !== '' && 
           !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patient.enfermedades.toLowerCase().trim())) ||
        (patient.alergias && patient.alergias.trim() !== '' && 
           !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patient.alergias.toLowerCase().trim())) ||
        (patient.medicamentos && patient.medicamentos.trim() !== '' && 
           !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patient.medicamentos.toLowerCase().trim())) ||
        (patient.sexo === 'femenino' && patient.embarazo === 'si' && (!patient.embarazo_activo || patient.embarazo_activo === true));
      
      if (hasSignificantConditions) {
        setShowWarningModal(true);
      }
      
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  // Helper function to validate a single field
  const validateSingleField = (fieldName: string, value: string): 'valid' | 'invalid' | 'neutral' => {
    if (!value || value.trim() === '') {
      return 'invalid';
    }
    return 'valid';
  };

  // Helper function to update field validation status in real-time
  const updateFieldValidation = (fieldName: string, value: string) => {
    setFieldValidationStatus(prev => ({
      ...prev,
      [fieldName]: validateSingleField(fieldName, value)
    }));
  };

  // Helper function to clear validation highlighting
  const clearValidationHighlighting = () => {
    setFieldValidationStatus({});
  };

  // Helper function to get field styling based on validation status
  const getFieldStyle = (fieldName: string) => {
    const status = fieldValidationStatus[fieldName];
    if (status === 'valid') {
      return 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 focus:ring-green-500 focus:border-green-500';
    } else if (status === 'invalid') {
      return 'border-2 border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-red-500 focus:border-red-500';
    }
    return 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-teal-500 focus:border-teal-500';
  };

  // Form validation function
  const validateRequiredFields = (form: HTMLFormElement): string[] => {
    const missing: string[] = [];
    const validationStatus: Record<string, 'valid' | 'invalid' | 'neutral'> = {};
    
    // Personal Information fields
    const nombreCompleto = form.nombre_completo?.value?.trim();
    const tipoIdentificacion = form.tipo_identificacion?.value?.trim();
    const numeroIdentidad = form.numero_identidad?.value?.trim();
    const fechaNacimiento = form.fecha_nacimiento?.value?.trim();
    const sexo = form.sexo?.value?.trim();
    const tipoSangre = form.tipo_sangre?.value?.trim();
    const direccion = form.direccion?.value?.trim();
    const escolaridad = form.escolaridad?.value?.trim();
    const estadoCivil = form.estado_civil?.value?.trim();
    const contactoEmergencia = form.contacto_emergencia?.value?.trim();
    const contactoTelefono = form.contacto_telefono?.value?.trim();
    
    // Calculate age to determine if patient is a minor (for conditional fields)
    const edadValue = parseInt(form.edad?.value?.trim() || '0');
    
    // Clinical Information fields
    const doctor = form.doctor?.value?.trim();
    const fechaInicio = form.fecha_inicio?.value?.trim();
    const seguro = form.seguro?.value?.trim();
    
    // Medical History fields
    const enfermedades = form.enfermedades?.value?.trim();
    const alergias = form.alergias?.value?.trim();
    const medicamentos = form.medicamentos?.value?.trim();
    const hospitalizaciones = form.hospitalizaciones?.value?.trim();
    const cirugias = form.cirugias?.value?.trim();
    const antecedentesFamiliares = form.antecedentes_familiares?.value?.trim();
    
    // Check each required field and set validation status
    if (!nombreCompleto) {
      missing.push('Nombre completo');
      validationStatus['nombre_completo'] = 'invalid';
    } else {
      validationStatus['nombre_completo'] = 'valid';
    }
    
    if (!tipoIdentificacion) {
      missing.push('Tipo de Identificación');
      validationStatus['tipo_identificacion'] = 'invalid';
    } else {
      validationStatus['tipo_identificacion'] = 'valid';
    }
    
    if (!numeroIdentidad) {
      missing.push('Número de Identificación');
      validationStatus['numero_identidad'] = 'invalid';
    } else {
      validationStatus['numero_identidad'] = 'valid';
    }
    
    if (!fechaNacimiento) {
      missing.push('Fecha de nacimiento');
      validationStatus['fecha_nacimiento'] = 'invalid';
    } else {
      validationStatus['fecha_nacimiento'] = 'valid';
    }
    
    if (!sexo) {
      missing.push('Género');
      validationStatus['sexo'] = 'invalid';
    } else {
      validationStatus['sexo'] = 'valid';
    }
    
    if (!tipoSangre) {
      missing.push('Tipo de sangre');
      validationStatus['tipo_sangre'] = 'invalid';
    } else {
      validationStatus['tipo_sangre'] = 'valid';
    }
    
    if (!direccion) {
      missing.push('Dirección');
      validationStatus['direccion'] = 'invalid';
    } else {
      validationStatus['direccion'] = 'valid';
    }
    
    if (!escolaridad) {
      missing.push('Escolaridad');
      validationStatus['escolaridad'] = 'invalid';
    } else {
      validationStatus['escolaridad'] = 'valid';
    }
    
    if (edadValue >= 18 && !estadoCivil) {
      missing.push('Estado Civil');
      validationStatus['estado_civil'] = 'invalid';
    } else {
      validationStatus['estado_civil'] = 'valid';
    }
    
    if (edadValue >= 18 && !contactoEmergencia) {
      missing.push('Contacto de emergencia');
      validationStatus['contacto_emergencia'] = 'invalid';
    } else {
      validationStatus['contacto_emergencia'] = 'valid';
    }
    
    if (edadValue >= 18 && !contactoTelefono) {
      missing.push('Teléfono de emergencia');
      validationStatus['contacto_telefono'] = 'invalid';
    } else {
      validationStatus['contacto_telefono'] = 'valid';
    }
    
    if (!doctor) {
      missing.push('Doctor asignado');
      validationStatus['doctor'] = 'invalid';
    } else {
      validationStatus['doctor'] = 'valid';
    }
    
    if (!fechaInicio) {
      missing.push('Fecha de inicio de consulta');
      validationStatus['fecha_inicio'] = 'invalid';
    } else {
      validationStatus['fecha_inicio'] = 'valid';
    }
    
    if (!seguro) {
      missing.push('Seguro Médico');
      validationStatus['seguro'] = 'invalid';
    } else {
      validationStatus['seguro'] = 'valid';
    }
    
    if (!enfermedades) {
      missing.push('Enfermedades sistémicas');
      validationStatus['enfermedades'] = 'invalid';
    } else {
      validationStatus['enfermedades'] = 'valid';
    }
    
    if (!alergias) {
      missing.push('Alergias');
      validationStatus['alergias'] = 'invalid';
    } else {
      validationStatus['alergias'] = 'valid';
    }
    
    if (!medicamentos) {
      missing.push('Medicamentos actuales');
      validationStatus['medicamentos'] = 'invalid';
    } else {
      validationStatus['medicamentos'] = 'valid';
    }
    
    if (!hospitalizaciones) {
      missing.push('Hospitalizaciones');
      validationStatus['hospitalizaciones'] = 'invalid';
    } else {
      validationStatus['hospitalizaciones'] = 'valid';
    }
    
    if (!cirugias) {
      missing.push('Cirugías previas');
      validationStatus['cirugias'] = 'invalid';
    } else {
      validationStatus['cirugias'] = 'valid';
    }
    
    if (!antecedentesFamiliares) {
      missing.push('Antecedentes Médicos Familiares');
      validationStatus['antecedentes_familiares'] = 'invalid';
    } else {
      validationStatus['antecedentes_familiares'] = 'valid';
    }
    
    // Validate representative fields if patient is a minor
    if (edadValue < 18) {
      const representanteLegal = form.representante_legal?.value?.trim();
      const parentesco = form.parentesco?.value?.trim();
      const repTipoIdentificacion = form.rep_tipo_identificacion?.value?.trim();
      const repNumeroIdentidad = form.rep_numero_identidad?.value?.trim();
      
      if (!representanteLegal) {
        missing.push('Nombre del Representante Legal');
        validationStatus['representante_legal'] = 'invalid';
      } else {
        validationStatus['representante_legal'] = 'valid';
      }
      
      if (!parentesco) {
        missing.push('Parentesco');
        validationStatus['parentesco'] = 'invalid';
      } else {
        validationStatus['parentesco'] = 'valid';
        
        // Validate otro_parentesco if parentesco is 'otro'
        if (parentesco === 'otro') {
          const otroParentesco = form.otro_parentesco?.value?.trim();
          if (!otroParentesco) {
            missing.push('Especificar parentesco');
            validationStatus['otro_parentesco'] = 'invalid';
          } else {
            validationStatus['otro_parentesco'] = 'valid';
          }
        }
      }
      
      if (!repTipoIdentificacion) {
        missing.push('Tipo de Identificación del Representante');
        validationStatus['rep_tipo_identificacion'] = 'invalid';
      } else {
        validationStatus['rep_tipo_identificacion'] = 'valid';
        
        // Validate rep_otro_tipo_identificacion if rep_tipo_identificacion is 'OTRO'
        if (repTipoIdentificacion === 'OTRO') {
          const repOtroTipoIdentificacion = form.rep_otro_tipo_identificacion?.value?.trim();
          if (!repOtroTipoIdentificacion) {
            missing.push('Especificar tipo de identificación del representante');
            validationStatus['rep_otro_tipo_identificacion'] = 'invalid';
          } else {
            validationStatus['rep_otro_tipo_identificacion'] = 'valid';
          }
        }
      }
      
      if (!repNumeroIdentidad) {
        missing.push('Número de Identificación del Representante');
        validationStatus['rep_numero_identidad'] = 'invalid';
      } else {
        // Validate Honduran DNI format if representative ID type is HN
        if (repTipoIdentificacion === 'HN') {
          const cleaned = repNumeroIdentidad.replace(/\D/g, '');
          if (cleaned.length !== 13 || !/^\d{13}$/.test(cleaned)) {
            missing.push('Número de Identificación del Representante debe tener 13 dígitos (formato: XXXX-XXXX-XXXXX)');
            validationStatus['rep_numero_identidad'] = 'invalid';
          } else {
            validationStatus['rep_numero_identidad'] = 'valid';
          }
        } else {
          validationStatus['rep_numero_identidad'] = 'valid';
        }
      }
    }
    
    // New Dental Evaluation fields validation
    const reaccionAdversaAnestesico = form.reaccion_adversa_anestesico?.value?.trim();
    if (!reaccionAdversaAnestesico) {
      missing.push('Reacción adversa al anestésico');
      validationStatus['reaccion_adversa_anestesico'] = 'invalid';
    } else {
      validationStatus['reaccion_adversa_anestesico'] = 'valid';
      
      // Validate tipo_reaccion only if reaccion is 'si'
      if (reaccionAdversaAnestesico === 'si') {
        const tipoReaccion = form.tipo_reaccion?.value?.trim();
        if (!tipoReaccion) {
          missing.push('Tipo de reacción');
          validationStatus['tipo_reaccion'] = 'invalid';
        } else {
          validationStatus['tipo_reaccion'] = 'valid';
        }
      }
    }
    
    const experienciaTraumatica = form.experiencia_traumatica?.value?.trim();
    if (!experienciaTraumatica) {
      missing.push('Experiencia odontológica traumática');
      validationStatus['experiencia_traumatica'] = 'invalid';
    } else {
      validationStatus['experiencia_traumatica'] = 'valid';
      
      // Validate que_sucedio only if experiencia is 'si' (not for 'es_1ra_consulta')
      if (experienciaTraumatica === 'si') {
        const queSucedio = form.que_sucedio?.value?.trim();
        if (!queSucedio) {
          missing.push('Que sucedio');
          validationStatus['que_sucedio'] = 'invalid';
        } else {
          validationStatus['que_sucedio'] = 'valid';
        }
      }
    }
    
    // Check signature requirement
    const shouldRequireSignature = !recordCategoryInfo?.isHistorical || bypassHistoricalMode;
    if (shouldRequireSignature && !isEditing) {
      if (!signatureData || !signatureData.startsWith('data:image')) {
        missing.push('Firma digital');
        validationStatus['signature'] = 'invalid';
      } else {
        validationStatus['signature'] = 'valid';
      }
    }
    
    // Set the validation status state
    setFieldValidationStatus(validationStatus);
    
    return missing;
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const form = e.currentTarget;
      const patientId = searchParams.get('id'); // Get patient ID from URL
      
      // Validate required fields first
      const missingRequiredFields = validateRequiredFields(form);
      if (missingRequiredFields.length > 0) {
        setMissingFields(missingRequiredFields);
        setShowValidationErrorModal(true);
        setIsSubmitting(false);
        return;
      }
      
      // Create FormData from form elements to ensure all current values are captured
      const formData = new FormData();
      
      // Manually collect all form data to ensure updated values are included
      const formElements = form.elements;
      
      for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (element.name && element.type !== 'file') {
          // Handle checkboxes
          if (element.type === 'checkbox') {
            formData.set(element.name, (element as HTMLInputElement).checked ? 'true' : 'false');
          } else {
            formData.set(element.name, element.value || '');
          }
        }
      }
      
      // Add signature data to form
      // Handle signature based on record category and bypass mode
      const shouldRequireSignature = !recordCategoryInfo?.isHistorical || bypassHistoricalMode;
      
      if (!shouldRequireSignature) {
        // Historical record or bypassed - no signature required
        formData.set('firma_digital', '');
        formData.set('transcription_notes', bypassHistoricalMode ? 'Modo histórico desactivado temporalmente' : 'Transcrito de registro físico');
      } else {
        // Active record - signature required
        if (signatureData && signatureData.startsWith('data:image')) {
          formData.set('firma_digital', signatureData);
        } else if (isEditing && existingSignature) {
          // Keep existing signature when editing and no new signature provided
          formData.set('firma_digital', existingSignature);
        } else if (!isEditing) {
          // For new patients, signature is required - this should be caught by validation
          console.error('Signature validation failed - this should not happen');
          return;
        } else {
          // Editing existing patient with no signature - this shouldn't happen but handle gracefully
          console.error('No signature data available for editing');
          return;
        }
      }
      
      if (isEditing) {
        await updatePatient(patientId, formData);
      } else {
        await createPatient(formData);
      }
      
      // Clear validation highlighting on successful submission
      clearValidationHighlighting();
      
      // Server action handles redirect, so no need for client-side redirect
    } catch (error: any) {
      console.error('Error submitting form:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Ignore redirect errors - they're intentional and handled by the server action
      // Next.js redirect throws an error with 'NEXT_REDIRECT' in the message
      const errorMessage = error?.message || '';
      if (errorMessage.includes('NEXT_REDIRECT') || errorMessage.includes('redirect')) {
        return;
      }
      
      alert(`Error al guardar el paciente: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle quick document upload without form submission
  const handleQuickUpload = async () => {
    const fileInput = document.getElementById('documentos') as HTMLInputElement;
    const files = fileInput?.files;

    if (!files || files.length === 0) {
      setUploadMessage({
        type: 'warning',
        text: 'Por favor selecciona al menos un archivo para subir'
      });
      return;
    }

    if (!currentPatient?.paciente_id) {
      setUploadMessage({
        type: 'warning',
        text: 'Error: No se puede identificar al paciente'
      });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append('patientId', currentPatient.paciente_id);
      
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch('/api/upload-documents', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir documentos');
      }

      // Update current patient with new documents
      if (result.allDocuments) {
        setCurrentPatient(prev => prev ? {
          ...prev,
          documentos: result.allDocuments
        } : null);
      }

      // Show success message
      let message = `Se subieron ${result.uploadedUrls.length} archivo(s) correctamente.`;
      if (result.duplicateFiles && result.duplicateFiles.length > 0) {
        message += ` ${result.duplicateFiles.length} archivo(s) eran duplicados: ${result.duplicateFiles.join(', ')}`;
      }
      
      setUploadMessage({
        type: 'success',
        text: message
      });

      // Clear file input
      fileInput.value = '';

      // Clear message after 5 seconds
      setTimeout(() => {
        setUploadMessage(null);
      }, 5000);

    } catch (error) {
      console.error('Quick upload error:', error);
      setUploadMessage({
        type: 'warning',
        text: 'Error al subir documentos: ' + error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      {/* Modern Form Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${isEditing ? 'bg-amber-500' : 'bg-teal-500'} rounded-xl flex items-center justify-center shadow-md`}>
              {isEditing ? <Edit3 className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEditing ? 'Actualiza la información del paciente' : 'Ingresa los datos del nuevo paciente'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl transition-all hover:shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <button
              type="submit"
              form="patient-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-6 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-teal-600/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Actualizar' : 'Crear Paciente'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <h1 className="text-3xl font-bold text-center mb-8 text-teal-700">
        {isEditing ? 'Editar Historia Clínica' : 'Nueva Historia Clínica'}
      </h1>
      
      {/* Historical Mode Banner */}
      <HistoricalBanner
        isHistorical={recordCategoryInfo?.isHistorical}
        isBypassed={bypassHistoricalMode}
        patientId={currentPatient?.paciente_id}
        onBypassChange={async (newBypassValue) => {
          try {
            await savePatientSettings(currentPatient?.paciente_id, newBypassValue);
          } catch (error) {
            console.error('❌ Failed to update bypass setting:', error);
            alert('Error al actualizar la configuración del modo histórico');
          }
        }}
        loading={false}
      />
      
      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Datos Personales */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Datos Personales</h2>

          <label htmlFor="nombre_completo" className="block mb-1 font-medium">Nombre completo:</label>
          <input 
            type="text" 
            id="nombre_completo" 
            name="nombre_completo" 
            required 
            className={`input text-gray-900 dark:text-white ${getFieldStyle('nombre_completo')}`} 
            onChange={(e) => {
              updateFieldValidation('nombre_completo', e.target.value);
            }}
          />

          {/* Conditional field for minors - Apodo */}
          {edad !== '' && edad < 18 && (
            <label htmlFor="apodo" className="block mb-1 font-medium mt-2">Apodo:</label>
          )}
          {edad !== '' && edad < 18 && (
            <input 
              type="text" 
              id="apodo" 
              name="apodo" 
              className={`input text-gray-900 dark:text-white ${getFieldStyle('apodo')}`} 
              value={apodo || ''} 
              onChange={(e) => {
                setApodo(e.target.value);
                updateFieldValidation('apodo', e.target.value);
              }} 
            />
          )}

          <label htmlFor="tipo_identificacion" className="block mb-1 font-medium">Tipo de Identificación:</label>
          <select
            id="tipo_identificacion"
            name="tipo_identificacion"
            required
            className={`input text-gray-900 dark:text-white ${getFieldStyle('tipo_identificacion')}`}
            value={tipoIdentificacion || ''}
            onChange={e => {
              setTipoIdentificacion(e.target.value);
              updateFieldValidation('tipo_identificacion', e.target.value);
            }}
          >
            <option value="">Seleccionar</option>
            <option value="HN">Honduras (RTN/Identidad)</option>
            <option value="US">Estados Unidos (Licencia)</option>
            <option value="GT">Guatemala (DPI)</option>
            <option value="SV">El Salvador (DUI/NIT)</option>
            <option value="NI">Nicaragua (Cédula)</option>
            <option value="ES">España (DNI/NIE)</option>
            <option value="OTRO">Otro (especificar)</option>
          </select>

          {tipoIdentificacion === 'OTRO' && (
            <>
              <label htmlFor="otro_tipo_identificacion" className="block mb-1 font-medium mt-2">Especifique el tipo de identificación:</label>
              <input type="text" id="otro_tipo_identificacion" name="otro_tipo_identificacion" className="input" value={otroTipoIdentificacion || ''} onChange={(e) => setOtroTipoIdentificacion(e.target.value)} />
            </>
          )}

          <label htmlFor="numero_identidad" className="block mb-1 font-medium">Número de Identificación:</label>
          <input 
            type="text" 
            id="numero_identidad" 
            name="numero_identidad" 
            required 
            className={`input text-gray-900 dark:text-white ${getFieldStyle('numero_identidad')}`} 
            placeholder="Ingrese el número de identificación"
            value={currentIdNumber || ''}
            onChange={(e) => {
              handleIDNumberChange(e);
              updateFieldValidation('numero_identidad', e.target.value);
            }}
          />

          {/* Smart ID validation */}
          <SmartIDValidation 
            idNumber={currentIdNumber}
            originalIdNumber={originalIdNumber}
            patientId={searchParams.get('id') || undefined}
            onValidationChange={setIdValidationResult}
          />

          <label htmlFor="fecha_nacimiento" className="block mb-1 font-medium">Fecha de nacimiento:</label>
          <input 
            type="date" 
            id="fecha_nacimiento" 
            name="fecha_nacimiento" 
            required 
            className={`input px-3 py-2 text-gray-900 dark:text-white ${getFieldStyle('fecha_nacimiento')}`} 
            onChange={(e) => {
              handleFechaNacimientoChange(e);
              updateFieldValidation('fecha_nacimiento', e.target.value);
            }}
            style={{
              colorScheme: resolvedTheme,
            }}
          />

          <label htmlFor="edad" className="block mb-1 font-medium">Edad:</label>
          <input type="number" id="edad" name="edad" value={edad} readOnly className="input bg-gray-100 cursor-not-allowed" />
          {edadAlMomentoConsulta && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-green-700">Edad al momento de consulta:</span> 
                <span className="text-green-600 font-semibold">{edadAlMomentoConsulta} años</span>
                {fechaInicio && <span className="text-xs text-green-500 ml-2">(al {SimpleTimezoneFix.formatDateForConsultationAge(fechaInicio)})</span>}
              </div>
            </div>
          )}

          {/* Representante Legal if under 18 */}
          {edad !== '' && edad < 18 && (
            <div className="p-4 bg-gray-50 rounded border border-gray-300 mt-4">
              <label htmlFor="representante_legal" className="block mb-1 font-medium">Representante Legal:</label>
              <input type="text" id="representante_legal" name="representante_legal" className="input" value={representanteLegal || ''} onChange={(e) => setRepresentanteLegal(e.target.value)} />

              <label htmlFor="rep_tipo_identificacion" className="block mb-1 font-medium mt-2">Tipo de Identificación del Representante:</label>
              <select
                id="rep_tipo_identificacion"
                name="rep_tipo_identificacion"
                className="input"
                value={repTipoIdentificacion || ''}
                onChange={e => setRepTipoIdentificacion(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="HN">Honduras (DNI)</option>
                <option value="US">Estados Unidos (SSN)</option>
                <option value="GT">Guatemala (DPI)</option>
                <option value="SV">El Salvador (DUI)</option>
                <option value="NI">Nicaragua (Cédula)</option>
                <option value="ES">España (DNI)</option>
                <option value="OTRO">Otro</option>
              </select>

              {repTipoIdentificacion === 'OTRO' && (
                <>
                  <label htmlFor="rep_otro_tipo_identificacion" className="block mb-1 font-medium mt-2">Especifique el tipo de identificación del representante:</label>
                  <input type="text" id="rep_otro_tipo_identificacion" name="rep_otro_tipo_identificacion" className="input" value={repOtroTipoIdentificacion || ''} onChange={(e) => setRepOtroTipoIdentificacion(e.target.value)} />
                </>
              )}

              <label htmlFor="rep_numero_identidad" className="block mb-1 font-medium mt-2">Número de Identificación del Representante:</label>
              <input 
                type="text" 
                id="rep_numero_identidad" 
                name="rep_numero_identidad" 
                className="input" 
                value={currentRepIdNumber || ''} 
                onChange={(e) => {
                  handleRepIDNumberChange(e);
                  updateFieldValidation('rep_numero_identidad', e.target.value);
                }} 
              />

              <label htmlFor="parentesco" className="block mb-1 font-medium mt-2">Parentesco:</label>
              <select
                id="parentesco"
                name="parentesco"
                className="input"
                value={parentesco || ''}
                onChange={e => setParentesco(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="padre">Padre</option>
                <option value="madre">Madre</option>
                <option value="tutor">Tutor Legal</option>
                <option value="otro">Otro (especificar)</option>
              </select>

              {parentesco === 'otro' && (
                <>
                  <label htmlFor="otro_parentesco" className="block mb-1 font-medium mt-2">Especifique el parentesco:</label>
                  <input type="text" id="otro_parentesco" name="otro_parentesco" className="input" value={otroParentesco || ''} onChange={(e) => setOtroParentesco(e.target.value)} />
                </>
              )}

              <label htmlFor="rep_celular" className="block mb-1 font-medium mt-2">Teléfono del Representante:</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select 
                    id="codigoPaisRepresentante" 
                    value={selectedLegalRepCountry}
                    onChange={(e) => setSelectedLegalRepCountry(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent flex-1"
                  >
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <div className="px-3 py-2 border border-gray-300 bg-transparent text-gray-700 font-medium flex items-center rounded-lg">
                    +{selectedLegalRepCountry}
                  </div>
                </div>
                <input 
                  type="text" 
                  id="rep_celular" 
                  name="rep_celular" 
                  placeholder={getPhonePlaceholder(selectedLegalRepCountry)}
                  maxLength={getPhonePlaceholder(selectedLegalRepCountry).length}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900" 
                  onChange={(e) => handlePhoneChange(e, selectedLegalRepCountry)}
                />
              </div>
            </div>
          )}

          <label htmlFor="genero" className="block mb-1 font-medium mt-4">Sexo:</label>
          <select
            id="genero"
            name="sexo"
            required
            className={`input text-gray-900 dark:text-white ${getFieldStyle('sexo')}`}
            value={sexo || ''}
            onChange={e => {
              setSexo(e.target.value);
              updateFieldValidation('sexo', e.target.value);
            }}
          >
            <option value="">Seleccionar</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro (especificar)</option>
          </select>

          {sexo === 'otro' && (
            <>
              <label htmlFor="otro_genero" className="block mb-1 font-medium mt-2">Especifique el sexo:</label>
              <input type="text" id="otro_genero" name="otro_genero" className="input" value={otroGenero || ''} onChange={(e) => setOtroGenero(e.target.value)} />
            </>
          )}

          <label htmlFor="tipo_sangre" className="block mb-1 font-medium mt-4">Tipo de sangre:</label>
          <select id="tipo_sangre" name="tipo_sangre" required className={`input text-gray-900 dark:text-white ${getFieldStyle('tipo_sangre')}`} value={tipoSangre || ''} onChange={(e) => {
            setTipoSangre(e.target.value);
            updateFieldValidation('tipo_sangre', e.target.value);
          }}>
            <option value="">Seleccionar</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="Desconocido">Desconocido</option>
          </select>

          <label htmlFor="telefono" className="block mb-1 font-medium mt-4">Teléfono:</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={selectedPhoneCountry || ''}
                onChange={(e) => setSelectedPhoneCountry(e.target.value)}
                name="codigopais"
                className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent flex-1"
              >
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              <div className="px-3 py-2 border border-gray-300 bg-transparent text-gray-700 font-medium flex items-center rounded-lg">
                +{selectedPhoneCountry}
              </div>
            </div>
            <input 
              type="text" 
              id="telefono" 
              name="telefono" 
              placeholder={getPhonePlaceholder(selectedPhoneCountry)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900" 
              onChange={(e) => handlePhoneChange(e, selectedPhoneCountry)}
            />
          </div>

          <label htmlFor="direccion" className="block mb-1 font-medium mt-4">Dirección:</label>
          <input type="text" id="direccion" name="direccion" required className={`input text-gray-900 dark:text-white ${getFieldStyle('direccion')}`} value={direccion || ''} onChange={(e) => {
            setDireccion(e.target.value);
            updateFieldValidation('direccion', e.target.value);
          }} />

          <label htmlFor="escolaridad" className="block mb-1 font-medium mt-4">Escolaridad:</label>
          <input type="text" id="escolaridad" name="escolaridad" required className={`input text-gray-900 dark:text-white ${getFieldStyle('escolaridad')}`} value={escolaridad || ''} onChange={(e) => {
            setEscolaridad(e.target.value);
            updateFieldValidation('escolaridad', e.target.value);
          }} />

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="estado_civil" className="block mb-1 font-medium mt-4">Estado Civil:</label>
              <select id="estado_civil" name="estado_civil" className={`input text-gray-900 dark:text-white ${getFieldStyle('estado_civil')}`} value={estadoCivil || ''} onChange={(e) => {
                setEstadoCivil(e.target.value);
                updateFieldValidation('estado_civil', e.target.value);
              }}>
                <option value="">Seleccionar</option>
                <option value="Soltero">Soltero(a)</option>
                <option value="Casado">Casado(a)</option>
                <option value="Viudo">Viudo(a)</option>
                <option value="Divorciado">Divorciado(a)</option>
                <option value="Union Libre">Unión Libre</option>
                <option value="Desconocido">Desconocido</option>
              </select>
            </>
          )}

          <label htmlFor="email" className="block mb-1 font-medium mt-4">Correo electrónico:</label>
          <input type="email" id="email" name="email" className="input" value={email || ''} onChange={(e) => setEmail(e.target.value)} />

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="trabajo" className="block mb-1 font-medium mt-4">Lugar de trabajo:</label>
              <input type="text" id="trabajo" name="trabajo" className="input" value={trabajo || ''} onChange={(e) => setTrabajo(e.target.value)} />
            </>
          )}

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="contacto_emergencia" className="block mb-1 font-medium mt-4">Contacto de emergencia:</label>
              <input type="text" id="contacto_emergencia" name="contacto_emergencia" className={`input text-gray-900 dark:text-white ${getFieldStyle('contacto_emergencia')}`} value={contactoEmergencia || ''} onChange={(e) => {
                setContactoEmergencia(e.target.value);
                updateFieldValidation('contacto_emergencia', e.target.value);
              }} />
            </>
          )}

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="contacto_telefono" className="block mb-1 font-medium mt-4">Teléfono de emergencia:</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={selectedEmergencyCountry}
                    onChange={(e) => setSelectedEmergencyCountry(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent flex-1"
                  >
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <div className="px-3 py-2 border border-gray-300 bg-transparent text-gray-700 font-medium flex items-center rounded-lg">
                    +{selectedEmergencyCountry}
                  </div>
                </div>
                <input 
                  type="text" 
                  id="contacto_telefono" 
                  name="contacto_telefono" 
                  placeholder={getPhonePlaceholder(selectedEmergencyCountry)} 
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900 ${getFieldStyle('contacto_telefono')}`} 
                  onChange={(e) => {
                    handlePhoneChange(e, selectedEmergencyCountry);
                    updateFieldValidation('contacto_telefono', e.target.value);
                  }}
                />
              </div>
            </>
          )}

          <label htmlFor="medico_cabecera" className="block mb-1 font-medium mt-4">Medico de cabecera:</label>
          <input type="text" id="medico_cabecera" name="medico_cabecera" className="input" value={medicoCabecera} onChange={(e) => setMedicoCabecera(e.target.value)} />

          {/* Conditional fields for minors - Doctor types */}
          {edad !== '' && edad < 18 && (
            <>
              <label htmlFor="pediatra_otorrinolaringologo" className="block mb-1 font-medium mt-2">Pediatra Otorrinolaringólogo:</label>
              <input 
                type="text" 
                id="pediatra_otorrinolaringologo" 
                name="pediatra_otorrinolaringologo" 
                className={`input text-gray-900 dark:text-white ${getFieldStyle('pediatra_otorrinolaringologo')}`} 
                value={pediatraOtorrinolaringologo || ''} 
                onChange={(e) => {
                  setPediatraOtorrinolaringologo(e.target.value);
                  updateFieldValidation('pediatra_otorrinolaringologo', e.target.value);
                }} 
              />

              <label htmlFor="pediatra" className="block mb-1 font-medium mt-2">Pediatra:</label>
              <input 
                type="text" 
                id="pediatra" 
                name="pediatra" 
                className={`input text-gray-900 dark:text-white ${getFieldStyle('pediatra')}`} 
                value={pediatra || ''} 
                onChange={(e) => {
                  setPediatra(e.target.value);
                  updateFieldValidation('pediatra', e.target.value);
                }} 
              />

              <label htmlFor="psicologo" className="block mb-1 font-medium mt-2">Psicólogo:</label>
              <input 
                type="text" 
                id="psicologo" 
                name="psicologo" 
                className={`input text-gray-900 dark:text-white ${getFieldStyle('psicologo')}`} 
                value={psicologo || ''} 
                onChange={(e) => {
                  setPsicologo(e.target.value);
                  updateFieldValidation('psicologo', e.target.value);
                }} 
              />

              <label htmlFor="otro_medico" className="block mb-1 font-medium mt-2">Otro:</label>
              <input 
                type="text" 
                id="otro_medico" 
                name="otro_medico" 
                className={`input text-gray-900 dark:text-white ${getFieldStyle('otro_medico')}`} 
                value={otroMedico || ''} 
                onChange={(e) => {
                  setOtroMedico(e.target.value);
                  updateFieldValidation('otro_medico', e.target.value);
                }} 
                placeholder="Especifique tipo de médico"
              />
            </>
          )}

          <label htmlFor="doctor" className="block mb-1 font-medium mt-4">Atendido por:</label>
          <select
            id="doctor"
            name="doctor"
            required
            className={`input text-gray-900 dark:text-white ${getFieldStyle('doctor')}`}
            value={doctor}
            onChange={e => {
              setDoctor(e.target.value);
              updateFieldValidation('doctor', e.target.value);
            }}
          >
            <option value="">Seleccionar</option>
            {doctors.map((doc: any) => (
              <option key={doc.id} value={doc.name}>
                {doc.name}
              </option>
            ))}
            <option value="otro">Otro (especificar)</option>
          </select>

          {doctor === 'otro' && (
            <>
              <label htmlFor="otro_doctor" className="block mb-1 font-medium mt-2">Especifique el nombre del doctor:</label>
              <input type="text" id="otro_doctor" name="otro_doctor" className="input" value={otroDoctor} onChange={(e) => setOtroDoctor(e.target.value)} />
            </>
          )}

          <label htmlFor="fecha_inicio" className="block mb-1 font-medium mt-4">Fecha inicio de consulta:</label>
          <input 
            type="date" 
            id="fecha_inicio" 
            name="fecha_inicio" 
            required 
            className={`input px-3 py-2 text-gray-900 dark:text-white ${getFieldStyle('fecha_inicio')}`} 
            onChange={(e) => {
              handleFechaInicioChange(e);
              updateFieldValidation('fecha_inicio', e.target.value);
            }}
            style={{
              colorScheme: resolvedTheme,
            }}
          />

          <label htmlFor="seguro" className="block mb-1 font-medium mt-4">Seguro Medico:</label>
          <select
            id="seguro"
            name="seguro"
            required
            className={`input text-gray-900 dark:text-white ${getFieldStyle('seguro')}`}
            value={seguro || ''}
            onChange={e => {
              setSeguro(e.target.value);
              updateFieldValidation('seguro', e.target.value);
            }}
          >
            <option value="Ninguno">Ninguno</option>
            <option value="IHSS">IHSS</option>
            <option value="Mapfre">Mapfre</option>
            <option value="Palic">Palic</option>
            <option value="ficohsa_seguros">Ficohsa Seguros</option>
            <option value="otro">Otro (especificar)</option>
          </select>

          {seguro === 'otro' && (
            <>
              <label htmlFor="otro_seguro" className="block mb-1 font-medium mt-2">Especifique el nombre del seguro:</label>
              <input type="text" id="otro_seguro" name="otro_seguro" className="input" value={otroSeguro} onChange={(e) => setOtroSeguro(e.target.value)} />
            </>
          )}

          {seguro !== 'Ninguno' && seguro !== '' && (
            <>
              <label htmlFor="poliza" className="block mb-1 font-medium mt-4"># Poliza:</label>
              <input type="text" id="poliza" name="poliza" className="input" value={poliza} onChange={(e) => setPoliza(e.target.value)} />
            </>
          )}

          <label htmlFor="contacto" className="block mb-1 font-medium mt-4">Como nos contacto?</label>
          <select id="contacto" name="contacto" className="input" value={contacto} onChange={(e) => setContacto(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="Recomendación de amigo/familiar">Recomendación de amigo/familiar</option>
            <option value="Recomendación de doctor/médico">Recomendación de doctor/médico</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Llamada telefónica">Llamada telefónica</option>
            <option value="Google/Búsqueda web">Google/Búsqueda web</option>
            <option value="Página web">Página web</option>
            <option value="Referido de otro paciente">Referido de otro paciente</option>
            <option value="Publicidad/Folleto">Publicidad/Folleto</option>
            <option value="Otro">Otro</option>
          </select>
        </section>

        {/* Antecedentes Médicos */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Antecedentes Médicos</h2>

          <label htmlFor="enfermedades" className="block mb-1 font-medium">Enfermedades sistémicas:</label>
          <textarea id="enfermedades" name="enfermedades" required className={`textarea text-gray-900 dark:text-white ${getFieldStyle('enfermedades')}`} value={enfermedades} onChange={(e) => {
            setEnfermedades(e.target.value);
            updateFieldValidation('enfermedades', e.target.value);
          }} />

          {/* Reminder text for minors */}
          {edad !== '' && edad < 18 && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Ejemplos de enfermedades sistémicas:</p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 ml-4 list-disc">
                <li>a) Respiratorios</li>
                <li>b) Cardiovasculares</li>
                <li>c) Trastornos Nutricionales</li>
                <li>d) Otros (Genéticos, Neurológicos, Infecciosos, Endocrinos, Hematológicos, etc.)</li>
              </ul>
            </div>
          )}

          <label htmlFor="alergias" className="block mb-1 font-medium mt-4">Alergias:</label>
          <textarea id="alergias" name="alergias" required className={`textarea text-gray-900 dark:text-white ${getFieldStyle('alergias')}`} value={alergias} onChange={(e) => {
            setAlergias(e.target.value);
            updateFieldValidation('alergias', e.target.value);
          }} />

          <label htmlFor="medicamentos" className="block mb-1 font-medium mt-4">Medicamentos actuales:</label>
          <textarea id="medicamentos" name="medicamentos" required className={`textarea text-gray-900 dark:text-white ${getFieldStyle('medicamentos')}`} value={medicamentos} onChange={(e) => {
            setMedicamentos(e.target.value);
            updateFieldValidation('medicamentos', e.target.value);
          }} />

          <label htmlFor="hospitalizaciones" className="block mb-1 font-medium mt-4">Hospitalizaciones:</label>
          <textarea id="hospitalizaciones" name="hospitalizaciones" required className={`textarea text-gray-900 dark:text-white ${getFieldStyle('hospitalizaciones')}`} value={hospitalizaciones} onChange={(e) => {
            setHospitalizaciones(e.target.value);
            updateFieldValidation('hospitalizaciones', e.target.value);
          }} />

          <label htmlFor="cirugias" className="block mb-1 font-medium mt-4">Cirugías previas:</label>
          <textarea id="cirugias" name="cirugias" required className={`textarea text-gray-900 dark:text-white ${getFieldStyle('cirugias')}`} value={cirugias} onChange={(e) => {
            setCirugias(e.target.value);
            updateFieldValidation('cirugias', e.target.value);
          }} />

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="embarazo" className="block mb-1 font-medium mt-4">Embarazo (si aplica):</label>
              <select id="embarazo" name="embarazo" className="input" value={embarazo || ''} onChange={(e) => setEmbarazo(e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </>
          )}

          {edad !== '' && edad >= 18 && embarazo === 'si' && (
            <label htmlFor="semanas_embarazo" className="block mb-1 font-medium mt-4">Semanas de embarazo:</label>
          )}
          {edad !== '' && edad >= 18 && embarazo === 'si' && (
            <div className="relative">
              <input 
                type="number" 
                id="semanas_embarazo" 
                name="semanas_embarazo" 
                className="input pr-24" 
                value={semanasEmbarazo} 
                onChange={(e) => setSemanasEmbarazo(e.target.value)} 
                min="1" 
                max="42" 
                placeholder="Número de semanas" 
              />
              {pregnancyCalculation && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">
                  <span className={`px-2 py-1 rounded font-medium ${
                    pregnancyCalculation.estaActivo 
                      ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {pregnancyCalculation.estaActivo 
                      ? `${pregnancyCalculation.semanasRestantes} sem. restantes`
                      : 'Finalizado'
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          {edad !== '' && edad >= 18 && embarazo === 'si' && pregnancyCalculation && !pregnancyCalculation.estaActivo && (
            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Estado de Embarazo: Finalizado
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    El período de embarazo ha concluido. La categoría especial de embarazo será desactivada automáticamente en el sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {edad !== '' && edad >= 18 && embarazo === 'si' && pregnancyCalculation && pregnancyCalculation.estaActivo && (
            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Estado de Embarazo: Activo
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Semana actual: {pregnancyCalculation.semanasTranscurridas} de 40 | 
                    Fecha estimada de parto: {new Date(pregnancyCalculation.fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {edad !== '' && edad >= 18 && embarazo === 'si' && (
            <label htmlFor="medicamentos_embarazo" className="block mb-1 font-medium mt-4">Medicamentos durante el embarazo:</label>
          )}
          {edad !== '' && edad >= 18 && embarazo === 'si' && (
            <textarea id="medicamentos_embarazo" name="medicamentos_embarazo" className="textarea" value={medicamentosEmbarazo} onChange={(e) => setMedicamentosEmbarazo(e.target.value)} placeholder="Listar medicamentos tomados durante el embarazo" rows={3} />
          )}

          <label htmlFor="antecedentes_familiares" className="block mb-1 font-medium mt-4">Antecedentes Médicos Familiares:</label>
          <textarea id="antecedentes_familiares" name="antecedentes_familiares" required className={`textarea text-gray-900 dark:text-white ${getFieldStyle('antecedentes_familiares')}`} value={antecedentesFamiliares} onChange={(e) => {
            setAntecedentesFamiliares(e.target.value);
            updateFieldValidation('antecedentes_familiares', e.target.value);
          }} />

          <label htmlFor="vacunas" className="block mb-1 font-medium mt-4">Vacunas:</label>
          <textarea id="vacunas" name="vacunas" className="textarea" value={vacunas} onChange={(e) => setVacunas(e.target.value)} />

          <label htmlFor="observaciones_medicas" className="block mb-1 font-medium mt-4">Observaciones:</label>
          <textarea id="observaciones_medicas" name="observaciones_medicas" className="textarea" value={observacionesMedicas} onChange={(e) => setObservacionesMedicas(e.target.value)} />
        </section>

        {/* Habitos */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Hábitos</h2>

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="fumaSelect" className="block mb-1 font-medium">¿Fuma?</label>
              <select
                id="fumaSelect"
                name="fuma"
                className="input"
                value={fuma || ''}
                onChange={e => setFuma(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>

              {fuma === 'si' && (
                <>
                  <label htmlFor="fuma_cantidad" className="block mb-1 font-medium mt-2">Cantidad de cigarrillos:</label>
                  <input type="number" id="fuma_cantidad" name="fuma_cantidad" className="input" value={fumaCantidad} onChange={(e) => setFumaCantidad(e.target.value)} />

                  <label htmlFor="fuma_frecuencia" className="block mb-1 font-medium mt-2">Frecuencia:</label>
                  <select id="fuma_frecuencia" name="fuma_frecuencia" className="input" value={fumaFrecuencia} onChange={(e) => setFumaFrecuencia(e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="Social">Social</option>
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Ocasional">Ocasional</option>
                  </select>
                </>
              )}
            </>
          )}

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="alcoholSelect" className="block mb-1 font-medium mt-4">¿Consume alcohol?</label>
              <select
                id="alcoholSelect"
                name="alcohol"
                className="input"
                value={alcohol || ''}
                onChange={e => setAlcohol(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>

              {alcohol === 'si' && (
                <>
                  <label htmlFor="alcohol_frecuencia" className="block mb-1 font-medium mt-2">Frecuencia alcohol:</label>
                  <select id="alcohol_frecuencia" name="alcohol_frecuencia" className="input" value={alcoholFrecuencia} onChange={(e) => setAlcoholFrecuencia(e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="Social">Social</option>
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Ocasional">Ocasional</option>
                  </select>
                </>
              )}
            </>
          )}

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="drogasSelect" className="block mb-1 font-medium mt-4">¿Consume drogas?</label>
              <select
                id="drogasSelect"
                name="drogas"
                className="input"
                value={drogas || ''}
                onChange={e => setDrogas(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>

              {drogas === 'si' && (
                <>
                  <label htmlFor="tipo_droga" className="block mb-1 font-medium mt-2">Tipo de droga:</label>
                  <input type="text" id="tipo_droga" name="tipo_droga" className="input" value={drogasTipo} onChange={(e) => setDrogasTipo(e.target.value)} />

                  <label htmlFor="drogas_frecuencia" className="block mb-1 font-medium mt-2">Frecuencia drogas:</label>
                  <select id="drogas_frecuencia" name="drogas_frecuencia" className="input" value={drogasFrecuencia} onChange={(e) => setDrogasFrecuencia(e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="Social">Social</option>
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Ocasional">Ocasional</option>
                  </select>
                </>
              )}
            </>
          )}

          <label htmlFor="cafeSelect" className="block mb-1 font-medium mt-4">Toma cafe:</label>
          <select
            id="cafeSelect"
            name="cafe"
            required
            className="input"
            value={cafe || ''}
            onChange={e => setCafe(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {cafe === 'si' && (
            <>
              <label htmlFor="cantidad_tazas" className="block mb-1 font-medium mt-2">Cantidad de tazas:</label>
              <input type="number" id="cantidad_tazas" name="cantidad_tazas" min={1} className="input" value={cafeTazas} onChange={(e) => setCafeTazas(e.target.value)} />
              
              <label htmlFor="cafe_frecuencia" className="block mb-1 font-medium mt-2">Frecuencia:</label>
              <select id="cafe_frecuencia" name="cafe_frecuencia" className="input" value={cafeFrecuencia} onChange={(e) => setCafeFrecuencia(e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="Social">Social</option>
                <option value="Diario">Diario</option>
                <option value="Semanal">Semanal</option>
                <option value="Mensual">Mensual</option>
                <option value="Ocasional">Ocasional</option>
              </select>
            </>
          )}

          {/* Conditional field for minors - Tipo de Alimentación */}
          {edad !== '' && edad < 18 && (
            <label htmlFor="tipo_alimentacion" className="block mb-1 font-medium mt-2">Tipo de Alimentación:</label>
          )}
          {edad !== '' && edad < 18 && (
            <input 
              type="text" 
              id="tipo_alimentacion" 
              name="tipo_alimentacion" 
              className={`input text-gray-900 dark:text-white ${getFieldStyle('tipo_alimentacion')}`} 
              value={tipoAlimentacion || ''} 
              onChange={(e) => {
                setTipoAlimentacion(e.target.value);
                updateFieldValidation('tipo_alimentacion', e.target.value);
              }} 
              placeholder="Ej: Balanceada, vegetariana, etc."
            />
          )}

          <label htmlFor="muerdeObjetosSelect" className="block mb-1 font-medium mt-4">Muerde objetos:</label>
          <select
            id="muerdeObjetosSelect"
            name="objetos"
            required
            className="input"
            value={objetos || ''}
            onChange={e => setObjetos(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {objetos === 'si' && (
            <>
              <label htmlFor="morder" className="block mb-1 font-medium mt-2">Tipo de objetos:</label>
              <textarea id="morder" name="morder" className="textarea" value={morder} onChange={(e) => setMorder(e.target.value)} />
            </>
          )}

          <label htmlFor="hielo" className="block mb-1 font-medium mt-4">Muerde Hielo:</label>
          <select id="hielo" name="hielo" required className="input" value={hielo || ''} onChange={(e) => setHielo(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="bruxismoSelect" className="block mb-1 font-medium mt-4">Bruxismo:</label>
          <select
            id="bruxismoSelect"
            name="bruxismo"
            required
            className="input"
            value={bruxismo || ''}
            onChange={e => setBruxismo(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {bruxismo === 'si' && (
            <>
              <label htmlFor="tipo_bruxismo" className="block mb-1 font-medium mt-2">Tipo de Bruxismo:</label>
              <select id="tipo_bruxismo" name="tipo_bruxismo" className="input" value={tipoBruxismo || ''} onChange={(e) => setTipoBruxismo(e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="diurno">Diurno</option>
                <option value="nocturno">Nocturno</option>
                <option value="ambos">Ambos</option>
              </select>
            </>
          )}

          <label htmlFor="boca" className="block mb-1 font-medium mt-4">Respira por la boca:</label>
          <select id="boca" name="boca" required className="input" value={boca || ''} onChange={(e) => setBoca(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="refrescos" className="block mb-1 font-medium mt-4">Toma refrescos de cola:</label>
          <select id="refrescos" name="refrescos" required className="input" value={refrescos || ''} onChange={(e) => setRefrescos(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="dulces" className="block mb-1 font-medium mt-4">Come dulces:</label>
          <select id="dulces" name="dulces" required className="input" value={dulces || ''} onChange={(e) => setDulces(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {/* Conditional field for minors - Momentos de Azúcar */}
          {edad !== '' && edad < 18 && (
            <label htmlFor="momentos_azucar" className="block mb-1 font-medium mt-2">Momentos de Azúcar:</label>
          )}
          {edad !== '' && edad < 18 && (
            <input 
              type="text" 
              id="momentos_azucar" 
              name="momentos_azucar" 
              className={`input text-gray-900 dark:text-white ${getFieldStyle('momentos_azucar')}`} 
              value={momentosAzucar || ''} 
              onChange={(e) => {
                setMomentosAzucar(e.target.value);
                updateFieldValidation('momentos_azucar', e.target.value);
              }} 
              placeholder="Ej: Después de comer, entre comidas, etc."
            />
          )}

          <label htmlFor="pegajosos" className="block mb-1 font-medium mt-4">Consume alimentos pegajosos (chicles):</label>
          <select id="pegajosos" name="pegajosos" required className="input" value={pegajosos || ''} onChange={(e) => setPegajosos(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="azucarados" className="block mb-1 font-medium mt-4">Consume alimentos azucarados:</label>
          <select id="azucarados" name="azucarados" required className="input" value={azucarados || ''} onChange={(e) => setAzucarados(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="obs" className="block mb-1 font-medium mt-4">Observaciones Adicionales:</label>
          <input type="text" id="obs" name="obs" className="input" value={obs} onChange={(e) => setObs(e.target.value)} />

          <label htmlFor="visitas_dentista" className="block mb-1 font-medium mt-4">Visitas al dentista (frecuencia):</label>
          <input type="text" id="visitas_dentista" name="visitas_dentista" className="input" />

          <label htmlFor="obsgen" className="block mb-1 font-medium mt-4">Observaciones generales:</label>
          <textarea id="obsgen" name="obsgen" className="textarea" />
        </section>

        {/* Evaluación Odontológica */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Evaluación Odontológica</h2>

          <label htmlFor="motivo" className="block mb-1 font-medium">Motivo de consulta:</label>
          <textarea id="motivo" name="motivo" required className="textarea" value={motivo} onChange={(e) => setMotivo(e.target.value)} />

          <label htmlFor="historial" className="block mb-1 font-medium mt-4">Historial dental previo:</label>
          <textarea id="historial" name="historial" className="textarea" value={historial} onChange={(e) => setHistorial(e.target.value)} />

          <label htmlFor="sangradoEnciasSelect" className="block mb-1 font-medium mt-4">Sangrado de Encias:</label>
          <select
            id="sangradoEnciasSelect"
            name="encias"
            required
            className="input"
            value={encias || ''}
            onChange={e => setEncias(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {encias === 'si' && (
            <>
              <label htmlFor="sangrado_encia" className="block mb-1 font-medium mt-2">Tipo de sangrado de encia:</label>
              <textarea id="sangrado_encia" name="sangrado_encia" className="textarea" value={sangradoEncia} onChange={(e) => setSangradoEncia(e.target.value)} />
            </>
          )}

          <label htmlFor="dolorMasticarSelect" className="block mb-1 font-medium mt-4">Dolor al masticar:</label>
          <select
            id="dolorMasticarSelect"
            name="dolor"
            required
            className="input"
            value={dolor || ''}
            onChange={e => setDolor(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {dolor === 'si' && (
            <>
              <label htmlFor="dolor_masticar" className="block mb-1 font-medium mt-2">Tipo de dolor:</label>
              <textarea id="dolor_masticar" name="dolor_masticar" className="textarea" value={dolorMasticar} onChange={(e) => setDolorMasticar(e.target.value)} />
            </>
          )}

          <label htmlFor="dolorCabezaSelect" className="block mb-1 font-medium mt-4">Dolor de cabeza frecuente:</label>
          <select
            id="dolorCabezaSelect"
            name="dolor_cabeza"
            required
            className="input"
            value={dolorCabeza || ''}
            onChange={e => setDolorCabeza(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {dolorCabeza === 'si' && (
            <>
              <label htmlFor="dolor_cabeza_detalle" className="block mb-1 font-medium mt-2">Tipo de dolor de cabeza:</label>
              <textarea id="dolor_cabeza_detalle" name="dolor_cabeza_detalle" className="textarea" value={dolorCabezaDetalle} onChange={(e) => setDolorCabezaDetalle(e.target.value)} />
            </>
          )}

          <label htmlFor="chasquidosSelect" className="block mb-1 font-medium mt-4">Chasquidos mandibulares:</label>
          <select
            id="chasquidosSelect"
            name="chasquidos"
            required
            className="input"
            value={chasquidos || ''}
            onChange={e => setChasquidos(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {chasquidos === 'si' && (
            <>
              <label htmlFor="chasquidos_mandibulares" className="block mb-1 font-medium mt-2">Tipo de chasquidos mandibulares:</label>
              <textarea id="chasquidos_mandibulares" name="chasquidos_mandibulares" className="textarea" value={chasquidosMandibulares} onChange={(e) => setChasquidosMandibulares(e.target.value)} />
            </>
          )}

          <label htmlFor="dolorOidoSelect" className="block mb-1 font-medium mt-4">Dolor de oido frecuente:</label>
          <select
            id="dolorOidoSelect"
            name="dolor_oido"
            required
            className="input"
            value={dolorOido || ''}
            onChange={e => setDolorOido(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {dolorOido === 'si' && (
            <>
              <label htmlFor="dolor_oido_detalle" className="block mb-1 font-medium mt-2">Tipo de dolor de oido:</label>
              <textarea id="dolor_oido_detalle" name="dolor_oido_detalle" className="textarea" value={dolorOidoDetalle} onChange={(e) => setDolorOidoDetalle(e.target.value)} />
            </>
          )}

          <label htmlFor="suction_digital" className="block mb-1 font-medium mt-4">Succión digital:</label>
          <select id="suction_digital" name="suction_digital" required className="input" value={suctionDigital || ''} onChange={(e) => setSuctionDigital(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          <label htmlFor="ortodonciaSelect" className="block mb-1 font-medium mt-4">Utilizo ortodoncia?</label>
          <select
            id="ortodonciaSelect"
            name="ortodoncia"
            required
            className="input"
            value={ortodoncia || ''}
            onChange={e => setOrtodoncia(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {ortodoncia === 'si' && (
            <>
              <label htmlFor="finalizoTratamientoSelect" className="block mb-1 font-medium mt-2">Finalizó tratamiento:</label>
              <select
                id="finalizoTratamientoSelect"
                name="orto_finalizado"
                className="input"
                value={finalizoTratamiento || ''}
                onChange={e => setFinalizoTratamiento(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Si</option>
              </select>

              {finalizoTratamiento === 'no' && (
                <>
                  <label htmlFor="orto_motivo_no_finalizado" className="block mb-1 font-medium mt-2">Motivo de no finalizar tratamiento:</label>
                  <textarea id="orto_motivo_no_finalizado" name="orto_motivo_no_finalizado" className="textarea" value={ortodonciaMotivoNoFinalizado} onChange={(e) => setOrtodonciaMotivoNoFinalizado(e.target.value)} />
                </>
              )}
            </>
          )}

          {/* New Dental Evaluation Fields */}
          <label htmlFor="reaccionAdversaAnestesicoSelect" className="block mb-1 font-medium mt-4">Reacción adversa al Anestésico:</label>
          <select
            id="reaccionAdversaAnestesicoSelect"
            name="reaccion_adversa_anestesico"
            required
            className="input"
            value={reaccionAdversaAnestesico || ''}
            onChange={e => setReaccionAdversaAnestesico(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
            <option value="no_aplicada">No Aplicada</option>
          </select>

          {reaccionAdversaAnestesico === 'si' && (
            <>
              <label htmlFor="tipoReaccion" className="block mb-1 font-medium mt-2">Tipo de Reacción:</label>
              <textarea id="tipoReaccion" name="tipo_reaccion" className="textarea" value={tipoReaccion} onChange={(e) => setTipoReaccion(e.target.value)} />
            </>
          )}

          <label htmlFor="experienciaTraumaticaSelect" className="block mb-1 font-medium mt-4">Ha Tenido Experiencia Odontológica Traumatica:</label>
          <select
            id="experienciaTraumaticaSelect"
            name="experiencia_traumatica"
            required
            className="input"
            value={experienciaTraumatica || ''}
            onChange={e => setExperienciaTraumatica(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
            <option value="es_1ra_consulta">Es 1ra Consulta</option>
          </select>

          {(experienciaTraumatica === 'si') && (
            <>
              <label htmlFor="queSucedio" className="block mb-1 font-medium mt-2">Que sucedio?</label>
              <textarea id="queSucedio" name="que_sucedio" className="textarea" value={queSucedio} onChange={(e) => setQueSucedio(e.target.value)} />
            </>
          )}

          {edad !== '' && edad >= 18 && (
            <>
              <label htmlFor="protesisSelect" className="block mb-1 font-medium mt-4">Uso de Prótesis:</label>
              <select
                id="protesisSelect"
                name="protesis"
                className="input"
                value={protesis || ''}
                onChange={e => setProtesis(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Si</option>
              </select>

              {protesis === 'si' && (
                <>
                  <label htmlFor="protesis_tipo" className="block mb-1 font-medium mt-2">Tipo de Prótesis:</label>
                  <select id="protesis_tipo" name="protesis_tipo" className="input" value={protesisTipo || ''} onChange={(e) => setProtesisTipo(e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="Removible">Removible</option>
                    <option value="Parcial Removible">Parcial Removible</option>
                    <option value="Total">Total</option>
                    <option value="Fija">Fija</option>
                    <option value="Implante">Implante</option>
                  </select>

                  <label htmlFor="protesis_nocturno" className="block mb-1 font-medium mt-2">Uso nocturno de protesis:</label>
                  <select id="protesis_nocturno" name="protesis_nocturno" className="input" value={protesisNocturno || ''} onChange={(e) => setProtesisNocturno(e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="no">No</option>
                    <option value="si">Si</option>
                  </select>
                </>
              )}
            </>
          )}

          <label htmlFor="sensibilidad" className="block mb-1 font-medium mt-4">Sensibilidad:</label>
          <select id="sensibilidad" name="sensibilidad" required className="input" value={sensibilidad || ''} onChange={(e) => setSensibilidad(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {sensibilidad === 'si' && (
            <label htmlFor="tipo_sensibilidad" className="block mb-1 font-medium mt-4">Tipo de Sensibilidad:</label>
          )}
          {sensibilidad === 'si' && (
            <select id="tipo_sensibilidad" name="tipo_sensibilidad" className="input" value={tipoSensibilidad || ''} onChange={(e) => setTipoSensibilidad(e.target.value)}>
              <option value="">Seleccionar tipo</option>
              <option value="dulce">Dulce</option>
              <option value="frio">Frío</option>
              <option value="caliente">Caliente</option>
              <option value="acido">Ácido</option>
              <option value="presion">Presión</option>
              <option value="multiple">Múltiple</option>
              <option value="desconocido">Desconocido</option>
            </select>
          )}

          <label htmlFor="ultima_limpieza" className="block mb-1 font-medium mt-4">Última Limpieza Dental:</label>
          <input type="text" id="ultima_limpieza" name="ultima_limpieza" className="input" value={ultimaLimpieza} onChange={(e) => setUltimaLimpieza(e.target.value)} />

          <label htmlFor="f_cepillado" className="block mb-1 font-medium mt-4">Frecuencia de cepillado diario:</label>
          <input type="number" id="f_cepillado" name="f_cepillado" required className="input" value={fCepillado} onChange={(e) => setFCepillado(e.target.value)} />

          {/* Conditional field for minors - ¿Cuándo? */}
          {edad !== '' && edad < 18 && (
            <label htmlFor="frecuencia_cepillado_detalle" className="block mb-1 font-medium mt-2">¿Cuándo?</label>
          )}
          {edad !== '' && edad < 18 && (
            <input 
              type="text" 
              id="frecuencia_cepillado_detalle" 
              name="frecuencia_cepillado_detalle" 
              className={`input text-gray-900 dark:text-white ${getFieldStyle('frecuencia_cepillado_detalle')}`} 
              value={frecuenciaCepilladoDetalle || ''} 
              onChange={(e) => {
                setFrecuenciaCepilladoDetalle(e.target.value);
                updateFieldValidation('frecuencia_cepillado_detalle', e.target.value);
              }} 
              placeholder="Ej: Después de cada comida, antes de dormir, etc."
            />
          )}

          {/* Conditional field for minors - ¿Se realiza acompañado? */}
          {edad !== '' && edad < 18 && (
            <label htmlFor="cepillado_acompanado" className="block mb-1 font-medium mt-2">¿Se realiza acompañado?</label>
          )}
          {edad !== '' && edad < 18 && (
            <input 
              type="text" 
              id="cepillado_acompanado" 
              name="cepillado_acompanado" 
              className={`input text-gray-900 dark:text-white ${getFieldStyle('cepillado_acompanado')}`} 
              value={cepilladoAcompanado || ''} 
              onChange={(e) => {
                setCepilladoAcompanado(e.target.value);
                updateFieldValidation('cepillado_acompanado', e.target.value);
              }} 
              placeholder="Ej: Solo, con ayuda de padres, con supervisión, etc."
            />
          )}

          <label htmlFor="tipocepillo" className="block mb-1 font-medium mt-4">Tipo de cepillo dental:</label>
          <input type="text" id="tipocepillo" name="tipocepillo" className="input" value={tipocepillo} onChange={(e) => setTipocepillo(e.target.value)} />

          <label htmlFor="pastadental" className="block mb-1 font-medium mt-4">Tipo de pasta dental:</label>
          <input type="text" id="pastadental" name="pastadental" required className="input" value={pastadental} onChange={(e) => setPastadental(e.target.value)} />

          <label htmlFor="cambio_cepillo" className="block mb-1 font-medium mt-4">Cada cuanto cambia el cepillo dental?</label>
          <input type="text" id="cambio_cepillo" name="cambio_cepillo" required className="input" value={cambioCepillo} onChange={(e) => setCambioCepillo(e.target.value)} />

          <label htmlFor="hilo_dental" className="block mb-1 font-medium mt-4">Uso de hilo dental:</label>
          <select id="hilo_dental" name="hilo_dental" required className="input" value={hiloDental || ''} onChange={(e) => setHiloDental(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          <label htmlFor="enjuague_bucal" className="block mb-1 font-medium mt-4">Uso de enjuague bucal:</label>
          <select id="enjuague_bucal" name="enjuague_bucal" required className="input" value={enjuagueBucal || ''} onChange={(e) => setEnjuagueBucal(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {enjuagueBucal === 'si' && (
            <>
              <label htmlFor="tipo_enjuague_bucal" className="block mb-1 font-medium mt-4">Tipo enjuague bucal:</label>
              <input type="text" id="tipo_enjuague_bucal" name="tipo_enjuague_bucal" className="input" value={tipoEnjuagueBucal} onChange={(e) => setTipoEnjuagueBucal(e.target.value)} />
            </>
          )}

          {/* Conditional field for minors - Peso */}
          {edad !== '' && edad < 18 && (
            <label htmlFor="peso" className="block mb-1 font-medium mt-4">Peso:</label>
          )}
          {edad !== '' && edad < 18 && (
            <input 
              type="number" 
              id="peso" 
              name="peso" 
              className={`input text-gray-900 dark:text-white ${getFieldStyle('peso')}`} 
              value={peso || ''} 
              onChange={(e) => {
                setPeso(e.target.value ? parseFloat(e.target.value) : '');
                updateFieldValidation('peso', e.target.value);
              }} 
              placeholder="Ej: 25.5"
              step="0.1"
            />
          )}

          {/* Conditional field for minors - Talla */}
          {edad !== '' && edad < 18 && (
            <label htmlFor="talla" className="block mb-1 font-medium mt-2">Talla:</label>
          )}
          {edad !== '' && edad < 18 && (
            <input 
              type="number" 
              id="talla" 
              name="talla" 
              className={`input text-gray-900 dark:text-white ${getFieldStyle('talla')}`} 
              value={talla || ''} 
              onChange={(e) => {
                setTalla(e.target.value ? parseFloat(e.target.value) : '');
                updateFieldValidation('talla', e.target.value);
              }} 
              placeholder="Ej: 120"
              step="0.1"
            />
          )}

        </section>

        <div className="mt-8">
          {/* Observaciones Generales Section */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 border-b-2 border-teal-300 pb-2">Observaciones Generales</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="observaciones_generales" className="block mb-1 font-medium">Observaciones Generales:</label>
                <textarea 
                  id="observaciones_generales" 
                  name="observaciones_generales" 
                  className="textarea w-full" 
                  rows={4}
                  value={observacionesGenerales} 
                  onChange={(e) => setObservacionesGenerales(e.target.value)} 
                  placeholder="Ingrese observaciones generales del paciente..."
                />
              </div>
            </div>
          </div>

          {/* Signature Section */}
          {recordCategoryInfo?.isHistorical && !bypassHistoricalMode ? (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="text-yellow-600">
                  <i className="fas fa-history text-xl"></i>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Registro Histórico</h4>
                  <p className="text-xs text-yellow-600">Este es un registro transcrito de un documento físico. No se requiere firma digital.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {isEditing && existingSignature ? (
                <SignatureDisplay signatureUrl={existingSignature} />
              ) : (
                <SignaturePadComponent 
                  onChange={setSignatureData}
                  value={signatureData}
                />
              )}
            </>
          )}

          {/* Document Upload Section */}
          <div className="mt-6">
            <label htmlFor="documentos" className="block mb-1 font-medium mt-4">Documentos adjuntos:</label>
            
            {/* File input and upload button in same row */}
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                id="documentos" 
                name="documentos" 
                multiple 
                accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" 
                className="input flex-1" 
              />
              
              {/* Upload Button for Edit Mode */}
              {isEditing && currentPatient?.paciente_id && (
                <button
                  type="button"
                  onClick={handleQuickUpload}
                  disabled={isUploading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Subir Documentos
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Upload message below the input row */}
            {uploadMessage && (
              <div className={`mt-2 p-3 rounded-md text-sm ${
                uploadMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              }`}>
                {uploadMessage.text}
              </div>
            )}
            
            {/* Show existing documents in edit mode */}
            {isEditing && currentPatient?.documentos && currentPatient.documentos.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Documentos existentes ({currentPatient.documentos.length}):
                </h4>
                <IsolatedDocumentDisplay 
                  documents={currentPatient.documentos} 
                  patientId={currentPatient.paciente_id}
                  removable={true}
                  onRemove={(index) => {
                    if (!currentPatient || !currentPatient.documentos[index]) return;
                    
                    const docUrl = currentPatient.documentos[index];
                    const fileName = getFileName(docUrl);
                    
                    setDocumentToDelete({ index, name: fileName });
                    setShowDeleteModal(true);
                  }}
                />
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <button 
              type="submit" 
              className="btn btn-primary px-6 py-2 rounded bg-teal-700 text-white hover:bg-teal-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
      
      {/* Improved Medical Warning Modal */}
      <MedicalWarningModal 
        patient={currentPatient}
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
      />

      {/* Validation Error Modal */}
      {showValidationErrorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 sm:mx-0 sm:h-10 sm:w-10">
                    <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400"></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Campos Requeridos Faltantes
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Por favor, complete los siguientes campos obligatorios antes de guardar el paciente:
                      </p>
                      <div className="max-h-60 overflow-y-auto">
                        <ul className="list-disc list-inside space-y-1">
                          {missingFields.map((field, index) => (
                            <li key={index} className="text-sm text-red-600 dark:text-red-400 font-medium">
                              {field}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowValidationErrorModal(false)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                    deleteSuccess ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <i className={`fas ${deleteSuccess ? 'fa-check-circle text-green-600' : 'fa-exclamation-triangle text-red-600'}`}></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {deleteSuccess ? 'Documento Eliminado' : 'Eliminar Documento'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {deleteSuccess 
                          ? `El documento "${documentToDelete?.name}" ha sido eliminado exitosamente.`
                          : `¿Está seguro de que desea eliminar el documento "${documentToDelete?.name}"? Esta acción no se puede deshacer.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!deleteSuccess ? (
                  <>
                    <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm" onClick={async () => {
                      // Delete logic here
                      const docUrl = currentPatient!.documentos[documentToDelete!.index];
                      const fileName = decodeURIComponent(docUrl.split('/').pop()!);
                      const filePath = `${currentPatient!.paciente_id}/${fileName}`;
                      
                      const response = await fetch('/api/delete-document', {
                        method: 'DELETE',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({patientId: currentPatient!.paciente_id, filePath, documentIndex: documentToDelete!.index, documents: currentPatient!.documentos})
                      });
                      
                      if (response.ok) {
                        const updatedDocuments = currentPatient!.documentos.filter((_, i) => i !== documentToDelete!.index);
                        setCurrentPatient(prev => prev ? {...prev, documentos: updatedDocuments} : null);
                        setDeleteSuccess(true);
                      } else {
                        const result = await response.json();
                        alert('Error: ' + result.error);
                      }
                    }}>Eliminar</button>
                    <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => {setShowDeleteModal(false); setDocumentToDelete(null);}}>Cancelar</button>
                  </>
                ) : (
                  <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-white hover:bg-green-700 sm:w-auto sm:text-sm" onClick={() => {setShowDeleteModal(false); setDocumentToDelete(null); setDeleteSuccess(false);}}>
                    <i className="fas fa-check mr-2"></i>Eliminado Exitosamente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
