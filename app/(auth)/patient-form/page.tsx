'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientService } from '../../../services/patientService';
import { SupabaseDoctorService } from '../../../services/supabaseDoctorService';
import { Patient } from '../../../types/patient';
import { createPatient } from './actions';
import { updatePatient } from './edit-actions';
import { updatePregnancyStatus, calculatePregnancyStatus } from '../../../utils/pregnancyUtils';
import SignaturePadComponent from '../../../components/SignaturePad';
import SignatureDisplay from '../../../components/SignatureDisplay';
import DocumentDisplay from '../../../components/DocumentDisplay';

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
import { useHistoricalMode } from '../../../contexts/HistoricalModeContext';
import { getRecordCategoryInfo } from '../../../utils/recordCategoryUtils';
import { countries, parsePhoneNumber } from '../../../utils/phoneUtils';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../../lib/supabase';
import HistoricalBanner from '../../../components/HistoricalBanner';
import { 
  formatHonduranID, 
  formatPhoneNumber, 
  validatePhoneNumber, 
  getPhonePlaceholder
} from '../../../utils/formatUtils';
import { formatCurrency } from '../../../utils/currencyUtils';
import SmartIDValidation from '../../../components/SmartIDValidation';

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

export default function PatientForm() {
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { bypassHistoricalMode, setBypassHistoricalMode, loadPatientSettings, savePatientSettings } = useHistoricalMode();

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
    
    // Pregnancy (high priority for female patients) - only if active
    if (patient.sexo === 'femenino' && patient.embarazo === 'si' && (!patient.embarazo_activo || patient.embarazo_activo === true)) {
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
  
  // Function to load historical mode setting from Supabase
  const loadHistoricalModeSetting = async () => {
    try {
      const pacienteId = searchParams.get('id');
      if (!pacienteId || !isLoaded || !user) {
        return;
      }
      
      console.log('🔍 Loading historical mode setting for patient:', pacienteId);
      
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

  // Formatting handlers
  const handleIDNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatHonduranID(value);
    setCurrentIdNumber(formatted);
    
    // Update the actual input field
    e.target.value = formatted;
  };
  
  // State for toggles and conditional fields
  const [tipoIdentificacion, setTipoIdentificacion] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [representanteLegal, setRepresentanteLegal] = useState('');
  const [sexo, setSexo] = useState('');
  const [doctor, setDoctor] = useState('');
  const [seguro, setSeguro] = useState('');
  const [edad, setEdad] = useState<number | ''>('');
  
  // Additional Personal Information state variables
  const [otroTipoIdentificacion, setOtroTipoIdentificacion] = useState('');
  const [otroParentesco, setOtroParentesco] = useState('');
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
  const [fechaInicio, setFechaInicio] = useState('');
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
  const [ortodonciaMotivoNoFinalizado, setOrtodonciaMotivoNoFinalizado] = useState('');
  
  // Additional Evaluación Odontológica state variables
  const [ultimaLimpieza, setUltimaLimpieza] = useState('');
  const [fCepillado, setFCepillado] = useState('');
  const [tipocepillo, setTipocepillo] = useState('');
  const [pastadental, setPastadental] = useState('');
  const [cambioCepillo, setCambioCepillo] = useState('');
  const [hiloDental, setHiloDental] = useState('');
  const [enjuagueBucal, setEnjuagueBucal] = useState('');
  const [detallesOrtodoncia, setDetallesOrtodoncia] = useState('');

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
  const [ortodoncia, setOrtodoncia] = useState('');
  const [finalizoTratamiento, setFinalizoTratamiento] = useState('');
  const [protesis, setProtesis] = useState('');
  const [bruxismo, setBruxismo] = useState('');
  const [necesitaOrtodoncia, setNecesitaOrtodoncia] = useState('');
  const [sensibilidad, setSensibilidad] = useState('');
  const [tipoSensibilidad, setTipoSensibilidad] = useState('');
  
  // Examen Intraoral state variables
  const [oclusion, setOclusion] = useState('');
  const [relacionMolar, setRelacionMolar] = useState('');
  const [relacionCanina, setRelacionCanina] = useState('');
  const [tipoMordida, setTipoMordida] = useState('');
  const [apiñamiento, setApiñamiento] = useState('');
  const [espacios, setEspacios] = useState('');
  const [lineamedia, setLineamedia] = useState('');
  const [tipoAparatologia, setTipoAparatologia] = useState('');
  const [otroAparatologia, setOtroAparatologia] = useState('');
  const [diagnostico, setDiagnostico] = useState('');

  // Calculate age from birthdate
  const handleFechaNacimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fecha = e.target.value;
    if (!fecha) {
      setEdad('');
      return;
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
    
    if (fechaInicio) {
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
          console.log('Pregnancy calculation:', calculation);
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
      
      console.log('Patient data loaded:', patient);
      console.log('Signature URL from database:', patient.firma_digital);
      console.log('Document URLs from database:', patient.documentos);
      
      // Load patient historical mode settings
      await loadPatientSettings(patientId);
      
      // Set record category info based on patient's fecha_inicio or fecha_inicio_consulta
      if (patient.fecha_inicio_consulta) {
        console.log('🔍 Using fecha_inicio_consulta:', patient.fecha_inicio_consulta);
        const categoryInfo = await getRecordCategoryInfo(patient.fecha_inicio_consulta);
        setRecordCategoryInfo(categoryInfo);
        console.log('Record category info set:', categoryInfo);
      } else if (patient.fecha_inicio) {
        console.log('🔍 Using fecha_inicio:', patient.fecha_inicio);
        const categoryInfo = await getRecordCategoryInfo(patient.fecha_inicio);
        setRecordCategoryInfo(categoryInfo);
        console.log('Record category info set:', categoryInfo);
      } else {
        console.log('🔍 No fecha_inicio or fecha_inicio_consulta found');
      }
      
      setExistingSignature(patient.firma_digital);
      
      // Set all controlled component states
      setTipoIdentificacion(patient.tipo_identificacion);
      setOtroTipoIdentificacion(patient.otro_tipo_identificacion || '');
      setParentesco(patient.parentesco || '');
      setOtroParentesco(patient.otro_parentesco || '');
      setRepresentanteLegal(patient.representante_legal || '');
      setSexo(patient.sexo);
      setOtroGenero(patient.otro_genero || '');
      setTipoSangre(patient.tipo_sangre);
      setDireccion(patient.direccion);
      setEscolaridad(patient.escolaridad);
      setEstadoCivil(patient.estado_civil);
      setEmail(patient.email);
      setTrabajo(patient.trabajo);
      setContactoEmergencia(patient.contacto_emergencia);
      setContactoTelefono(patient.contacto_telefono);
      setMedicoCabecera(patient.medico_cabecera);
      setDoctor(patient.doctor);
      setFechaInicio(patient.fecha_inicio);
      setSeguro(patient.seguro);
      setContacto(patient.contacto);
      setHospitalizaciones(patient.hospitalizaciones);
      setCirugias(patient.cirugias);
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
      setOtroDoctor(patient.otro_doctor || '');
      setOtroSeguro(patient.otro_seguro || '');
      setPoliza(patient.poliza || '');
      setEdad(patient.edad || '');
      
      // Set dental evaluation states
      setEncias(patient.encias);
      setDolor(patient.dolor);
      setDolorCabeza(patient.dolor_cabeza);
      setChasquidos(patient.chasquidos);
      setDolorOido(patient.dolor_oido);
      setOrtodoncia(patient.ortodoncia);
      setFinalizoTratamiento(patient.orto_finalizado || '');
      setProtesis(patient.protesis);
      setBruxismo(patient.bruxismo);
      setNecesitaOrtodoncia(patient.necesita_ortodoncia);
      setSensibilidad(patient.sensibilidad);
      setTipoSensibilidad(patient.tipo_sensibilidad || '');
      
      // Set Hábitos section states
      setFuma(patient.fuma);
      setFumaCantidad(patient.fuma_cantidad?.toString() || '');
      setFumaFrecuencia(patient.fuma_frecuencia || '');
      setAlcohol(patient.alcohol);
      setAlcoholCantidad(patient.alcohol_cantidad?.toString() || '');
      setAlcoholFrecuencia(patient.alcohol_frecuencia || '');
      setDrogas(patient.drogas);
      setDrogasTipo(patient.tipo_droga || '');
      setDrogasFrecuencia(patient.drogas_frecuencia || '');
      setObjetos(patient.objetos);
      setCafe(patient.cafe);
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
      setOrtodonciaMotivoNoFinalizado(patient.orto_motivo_no_finalizado || '');
      setUltimaLimpieza(patient.ultima_limpieza || '');
      setFCepillado(patient.f_cepillado?.toString() || '');
      setTipocepillo(patient.tipocepillo || '');
      setPastadental(patient.pastadental || '');
      setCambioCepillo(patient.cambio_cepillo || '');
      setHiloDental(patient.hilo_dental || '');
      setEnjuagueBucal(patient.enjuague_bucal || '');
      setDetallesOrtodoncia(patient.detalles_ortodoncia || '');
      
      // Set Examen Intraoral states
      setOclusion(patient.oclusion || '');
      setRelacionMolar(patient.relacion_molar || '');
      setRelacionCanina(patient.relacion_canina || '');
      setTipoMordida(patient.tipo_mordida || '');
      setApiñamiento(patient.apiñamiento || '');
      setEspacios(patient.espacios || '');
      setLineamedia(patient.lineamedia || '');
      setTipoAparatologia(patient.tipo_aparatologia || '');
      setOtroAparatologia(patient.otro_aparatologia || '');
      setDiagnostico(patient.diagnostico || '');
      
      // Populate form inputs after a small delay to ensure DOM is ready
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          // Personal Information
          const nameInput = form.querySelector('#nombre_completo') as HTMLInputElement;
          if (nameInput) nameInput.value = patient.nombre_completo;
          
          const idTypeSelect = form.querySelector('#tipo_identificacion') as HTMLSelectElement;
          if (idTypeSelect) idTypeSelect.value = patient.tipo_identificacion;
          
          const idNumberInput = form.querySelector('#numero_identidad') as HTMLInputElement;
          if (idNumberInput) {
            const idValue = patient.numero_identidad || '';
            idNumberInput.value = idValue;
            setCurrentIdNumber(idValue); // Set current ID for validation
            setOriginalIdNumber(idValue); // Store original ID for smart validation
          }
          
          const birthDateInput = form.querySelector('#fecha_nacimiento') as HTMLInputElement;
          if (birthDateInput) birthDateInput.value = patient.fecha_nacimiento || '';
          
          const ageInput = form.querySelector('#edad') as HTMLInputElement;
          if (ageInput) ageInput.value = patient.edad?.toString() || '';
          
          const sexSelect = form.querySelector('#sexo') as HTMLSelectElement;
          if (sexSelect) sexSelect.value = patient.sexo;
          
          const bloodTypeSelect = form.querySelector('#tipo_sangre') as HTMLSelectElement;
          if (bloodTypeSelect) bloodTypeSelect.value = patient.tipo_sangre;
          
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
          
          const dolorSelect = form.querySelector('#dolorMasticarSelect') as HTMLSelectElement;
          if (dolorSelect) dolorSelect.value = patient.dolor;
          
          const dolorCabezaSelect = form.querySelector('#dolorCabezaSelect') as HTMLSelectElement;
          if (dolorCabezaSelect) dolorCabezaSelect.value = patient.dolor_cabeza;
          
          const chasquidosSelect = form.querySelector('#chasquidosSelect') as HTMLSelectElement;
          if (chasquidosSelect) chasquidosSelect.value = patient.chasquidos;
          
          const dolorOidoSelect = form.querySelector('#dolorOidoSelect') as HTMLSelectElement;
          if (dolorOidoSelect) dolorOidoSelect.value = patient.dolor_oido;
          
          const ortodonciaSelect = form.querySelector('#ortodonciaSelect') as HTMLSelectElement;
          if (ortodonciaSelect) ortodonciaSelect.value = patient.ortodoncia;
          
          const finalizoTratamientoSelect = form.querySelector('#finalizoTratamientoSelect') as HTMLSelectElement;
          if (finalizoTratamientoSelect) finalizoTratamientoSelect.value = patient.orto_finalizado || '';
          
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
          
          const ortoMotivoNoFinalizadoTextarea = form.querySelector('#orto_motivo_no_finalizado') as HTMLTextAreaElement;
          if (ortoMotivoNoFinalizadoTextarea) ortoMotivoNoFinalizadoTextarea.value = patient.orto_motivo_no_finalizado || '';
          
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
          
          const necesitaOrtodonciaSelect = form.querySelector('#necesita_ortodoncia') as HTMLSelectElement;
          if (necesitaOrtodonciaSelect) necesitaOrtodonciaSelect.value = patient.necesita_ortodoncia;
          
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
      
      // Show warning modal if patient has medical conditions and severity is not 'none'
      if ((patient.enfermedades || patient.alergias || patient.medicamentos) || (patient.sexo === 'femenino' && patient.embarazo === 'si' && (!patient.embarazo_activo || patient.embarazo_activo === true))) {
        const severity = getConditionSeverity(patient);
        if (severity.level !== 'none') {
          setShowWarningModal(true);
        }
      }
      
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const form = e.currentTarget;
      const patientId = searchParams.get('id'); // Get patient ID from URL
      
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
          // For new patients, signature is required
          if (!signatureData || !signatureData.startsWith('data:image')) {
            alert('Por favor, firme antes de guardar el paciente.');
            return;
          }
        } else {
          // Editing existing patient with no signature - this shouldn't happen but handle gracefully
          console.error('No signature data available for editing');
          alert('Error: No hay una firma válida disponible.');
          return;
        }
      }
      
      if (isEditing) {
        await updatePatient(patientId, formData);
      } else {
        await createPatient(formData);
      }
      
      // Redirect to menu-navegacion with patient ID after successful submission
      window.location.href = `/menu-navegacion?id=${patientId}`;
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al guardar el paciente. Por favor, inténtelo de nuevo.');
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
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
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
            console.log('✅ Patient bypass setting updated successfully');
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
          <input type="text" id="nombre_completo" name="nombre_completo" required className="input" />

          <label htmlFor="tipo_identificacion" className="block mb-1 font-medium">Tipo de Identificación:</label>
          <select
            id="tipo_identificacion"
            name="tipo_identificacion"
            required
            className="input"
            value={tipoIdentificacion}
            onChange={e => setTipoIdentificacion(e.target.value)}
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
              <input type="text" id="otro_tipo_identificacion" name="otro_tipo_identificacion" className="input" value={otroTipoIdentificacion} onChange={(e) => setOtroTipoIdentificacion(e.target.value)} />
            </>
          )}

          <label htmlFor="numero_identidad" className="block mb-1 font-medium">Número de Identificación:</label>
          <input 
            type="text" 
            id="numero_identidad" 
            name="numero_identidad" 
            required 
            className="input" 
            placeholder="Ingrese el número de identificación"
            value={currentIdNumber}
            onChange={handleIDNumberChange}
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
            className="input px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]" 
            onChange={handleFechaNacimientoChange}
            style={{
              colorScheme: 'dark',
            }}
          />

          <label htmlFor="edad" className="block mb-1 font-medium">Edad:</label>
          <input type="number" id="edad" name="edad" value={edad} readOnly className="input bg-gray-100 cursor-not-allowed" />

          {/* Representante Legal if under 18 */}
          {edad !== '' && edad < 18 && (
            <div className="p-4 bg-gray-50 rounded border border-gray-300 mt-4">
              <label htmlFor="representante_legal" className="block mb-1 font-medium">Representante Legal:</label>
              <input type="text" id="representante_legal" name="representante_legal" className="input" value={representanteLegal} onChange={(e) => setRepresentanteLegal(e.target.value)} />

              <label htmlFor="parentesco" className="block mb-1 font-medium mt-2">Parentesco:</label>
              <select
                id="parentesco"
                name="parentesco"
                className="input"
                value={parentesco}
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
                  <input type="text" id="otro_parentesco" name="otro_parentesco" className="input" value={otroParentesco} onChange={(e) => setOtroParentesco(e.target.value)} />
                </>
              )}

              <label htmlFor="rep_celular" className="block mb-1 font-medium mt-2">Teléfono del Representante:</label>
              <div className="flex gap-0">
                <select 
                  id="codigoPaisRepresentante" 
                  value={selectedLegalRepCountry}
                  onChange={(e) => setSelectedLegalRepCountry(e.target.value)}
                  className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                <div className="px-3 py-2 border border-gray-300 bg-transparent text-gray-700 font-medium flex items-center">
                  +{selectedLegalRepCountry}
                </div>
                <input 
                  type="text" 
                  id="rep_celular" 
                  name="rep_celular" 
                  placeholder={getPhonePlaceholder(selectedLegalRepCountry)}
                  maxLength={getPhonePlaceholder(selectedLegalRepCountry).length}
                  className="flex-1 px-3 py-2 border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900" 
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
            className="input"
            value={sexo}
            onChange={e => setSexo(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro (especificar)</option>
          </select>

          {sexo === 'otro' && (
            <>
              <label htmlFor="otro_genero" className="block mb-1 font-medium mt-2">Especifique el sexo:</label>
              <input type="text" id="otro_genero" name="otro_genero" className="input" value={otroGenero} onChange={(e) => setOtroGenero(e.target.value)} />
            </>
          )}

          <label htmlFor="tipo_sangre" className="block mb-1 font-medium mt-4">Tipo de sangre:</label>
          <select id="tipo_sangre" name="tipo_sangre" required className="input" value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value)}>
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
          <div className="flex gap-2">
            <select
              value={selectedPhoneCountry}
              onChange={(e) => setSelectedPhoneCountry(e.target.value)}
              name="codigopais"
              className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <div className="px-3 py-2 border border-gray-300 bg-transparent text-gray-700 font-medium flex items-center">
              +{selectedPhoneCountry}
            </div>
            <input 
              type="text" 
              id="telefono" 
              name="telefono" 
              placeholder={getPhonePlaceholder(selectedPhoneCountry)} 
              className="flex-1 px-3 py-2 border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900" 
              onChange={(e) => handlePhoneChange(e, selectedPhoneCountry)}
            />
          </div>

          <label htmlFor="direccion" className="block mb-1 font-medium mt-4">Dirección:</label>
          <input type="text" id="direccion" name="direccion" required className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} />

          <label htmlFor="escolaridad" className="block mb-1 font-medium mt-4">Escolaridad:</label>
          <input type="text" id="escolaridad" name="escolaridad" required className="input" value={escolaridad} onChange={(e) => setEscolaridad(e.target.value)} />

          <label htmlFor="estado_civil" className="block mb-1 font-medium mt-4">Estado Civil:</label>
          <select id="estado_civil" name="estado_civil" required className="input" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="Soltero">Soltero(a)</option>
            <option value="Casado">Casado(a)</option>
            <option value="Viudo">Viudo(a)</option>
            <option value="Divorciado">Divorciado(a)</option>
            <option value="Union Libre">Unión Libre</option>
          </select>

          <label htmlFor="email" className="block mb-1 font-medium mt-4">Correo electrónico:</label>
          <input type="email" id="email" name="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label htmlFor="trabajo" className="block mb-1 font-medium mt-4">Lugar de trabajo:</label>
          <input type="text" id="trabajo" name="trabajo" className="input" value={trabajo} onChange={(e) => setTrabajo(e.target.value)} />

          <label htmlFor="contacto_emergencia" className="block mb-1 font-medium mt-4">Contacto de emergencia:</label>
          <input type="text" id="contacto_emergencia" name="contacto_emergencia" required className="input" value={contactoEmergencia} onChange={(e) => setContactoEmergencia(e.target.value)} />

          <label htmlFor="contacto_telefono" className="block mb-1 font-medium mt-4">Teléfono de emergencia:</label>
          <div className="flex gap-2">
            <select
              value={selectedEmergencyCountry}
              onChange={(e) => setSelectedEmergencyCountry(e.target.value)}
              className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <div className="px-3 py-2 border border-gray-300 bg-transparent text-gray-700 font-medium flex items-center">
              +{selectedEmergencyCountry}
            </div>
            <input 
              type="text" 
              id="contacto_telefono" 
              name="contacto_telefono" 
              placeholder={getPhonePlaceholder(selectedEmergencyCountry)} 
              className="flex-1 px-3 py-2 border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900" 
              onChange={(e) => handlePhoneChange(e, selectedEmergencyCountry)}
            />
          </div>

          <label htmlFor="medico_cabecera" className="block mb-1 font-medium mt-4">Medico de cabecera:</label>
          <input type="text" id="medico_cabecera" name="medico_cabecera" className="input" value={medicoCabecera} onChange={(e) => setMedicoCabecera(e.target.value)} />

          <label htmlFor="doctor" className="block mb-1 font-medium mt-4">Atendido por:</label>
          <select
            id="doctor"
            name="doctor"
            required
            className="input"
            value={doctor}
            onChange={e => setDoctor(e.target.value)}
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
            className="input px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]" 
            onChange={handleFechaInicioChange}
            style={{
              colorScheme: 'dark',
            }}
          />

          <label htmlFor="seguro" className="block mb-1 font-medium mt-4">Seguro Medico:</label>
          <select
            id="seguro"
            name="seguro"
            required
            className="input"
            value={seguro}
            onChange={e => setSeguro(e.target.value)}
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
          <input type="text" id="contacto" name="contacto" className="input" value={contacto} onChange={(e) => setContacto(e.target.value)} />
        </section>

        {/* Antecedentes Médicos */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Antecedentes Médicos</h2>

          <label htmlFor="enfermedades" className="block mb-1 font-medium">Enfermedades sistémicas:</label>
          <textarea id="enfermedades" name="enfermedades" required className="textarea" value={enfermedades} onChange={(e) => setEnfermedades(e.target.value)} />

          <label htmlFor="alergias" className="block mb-1 font-medium mt-4">Alergias:</label>
          <textarea id="alergias" name="alergias" required className="textarea" value={alergias} onChange={(e) => setAlergias(e.target.value)} />

          <label htmlFor="medicamentos" className="block mb-1 font-medium mt-4">Medicamentos actuales:</label>
          <textarea id="medicamentos" name="medicamentos" required className="textarea" value={medicamentos} onChange={(e) => setMedicamentos(e.target.value)} />

          <label htmlFor="hospitalizaciones" className="block mb-1 font-medium mt-4">Hospitalizaciones:</label>
          <textarea id="hospitalizaciones" name="hospitalizaciones" required className="textarea" value={hospitalizaciones} onChange={(e) => setHospitalizaciones(e.target.value)} />

          <label htmlFor="cirugias" className="block mb-1 font-medium mt-4">Cirugías previas:</label>
          <textarea id="cirugias" name="cirugias" required className="textarea" value={cirugias} onChange={(e) => setCirugias(e.target.value)} />

          <label htmlFor="embarazo" className="block mb-1 font-medium mt-4">Embarazo (si aplica):</label>
          <select id="embarazo" name="embarazo" className="input" value={embarazo} onChange={(e) => setEmbarazo(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {embarazo === 'si' && (
            <label htmlFor="semanas_embarazo" className="block mb-1 font-medium mt-4">Semanas de embarazo:</label>
          )}
          {embarazo === 'si' && (
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

          {embarazo === 'si' && pregnancyCalculation && !pregnancyCalculation.estaActivo && (
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

          {embarazo === 'si' && pregnancyCalculation && pregnancyCalculation.estaActivo && (
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

          {embarazo === 'si' && (
            <label htmlFor="medicamentos_embarazo" className="block mb-1 font-medium mt-4">Medicamentos durante el embarazo:</label>
          )}
          {embarazo === 'si' && (
            <textarea id="medicamentos_embarazo" name="medicamentos_embarazo" className="textarea" value={medicamentosEmbarazo} onChange={(e) => setMedicamentosEmbarazo(e.target.value)} placeholder="Listar medicamentos tomados durante el embarazo" rows={3} />
          )}

          <label htmlFor="antecedentes_familiares" className="block mb-1 font-medium mt-4">Antecedentes Médicos Familiares:</label>
          <textarea id="antecedentes_familiares" name="antecedentes_familiares" required className="textarea" value={antecedentesFamiliares} onChange={(e) => setAntecedentesFamiliares(e.target.value)} />

          <label htmlFor="vacunas" className="block mb-1 font-medium mt-4">Vacunas:</label>
          <textarea id="vacunas" name="vacunas" className="textarea" value={vacunas} onChange={(e) => setVacunas(e.target.value)} />

          <label htmlFor="observaciones_medicas" className="block mb-1 font-medium mt-4">Observaciones:</label>
          <textarea id="observaciones_medicas" name="observaciones_medicas" className="textarea" value={observacionesMedicas} onChange={(e) => setObservacionesMedicas(e.target.value)} />
        </section>

        {/* Habitos */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Hábitos</h2>

          <label htmlFor="fumaSelect" className="block mb-1 font-medium">¿Fuma?</label>
          <select
            id="fumaSelect"
            name="fuma"
            required
            className="input"
            value={fuma}
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

          <label htmlFor="alcoholSelect" className="block mb-1 font-medium mt-4">¿Consume alcohol?</label>
          <select
            id="alcoholSelect"
            name="alcohol"
            required
            className="input"
            value={alcohol}
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

          <label htmlFor="drogasSelect" className="block mb-1 font-medium mt-4">¿Consume drogas?</label>
          <select
            id="drogasSelect"
            name="drogas"
            required
            className="input"
            value={drogas}
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

          <label htmlFor="cafeSelect" className="block mb-1 font-medium mt-4">Toma cafe:</label>
          <select
            id="cafeSelect"
            name="cafe"
            required
            className="input"
            value={cafe}
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
            </>
          )}

          <label htmlFor="muerdeObjetosSelect" className="block mb-1 font-medium mt-4">Muerde objetos:</label>
          <select
            id="muerdeObjetosSelect"
            name="objetos"
            required
            className="input"
            value={objetos}
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
          <select id="hielo" name="hielo" required className="input" value={hielo} onChange={(e) => setHielo(e.target.value)}>
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
            value={bruxismo}
            onChange={e => setBruxismo(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {bruxismo === 'si' && (
            <>
              <label htmlFor="tipo_bruxismo" className="block mb-1 font-medium mt-2">Tipo de Bruxismo:</label>
              <select id="tipo_bruxismo" name="tipo_bruxismo" className="input" value={tipoBruxismo} onChange={(e) => setTipoBruxismo(e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="diurno">Diurno</option>
                <option value="nocturno">Nocturno</option>
                <option value="ambos">Ambos</option>
              </select>
            </>
          )}

          <label htmlFor="boca" className="block mb-1 font-medium mt-4">Respira por la boca:</label>
          <select id="boca" name="boca" required className="input" value={boca} onChange={(e) => setBoca(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="refrescos" className="block mb-1 font-medium mt-4">Toma refrescos de cola:</label>
          <select id="refrescos" name="refrescos" required className="input" value={refrescos} onChange={(e) => setRefrescos(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="dulces" className="block mb-1 font-medium mt-4">Come dulces:</label>
          <select id="dulces" name="dulces" required className="input" value={dulces} onChange={(e) => setDulces(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="pegajosos" className="block mb-1 font-medium mt-4">Consume alimentos pegajosos (chicles):</label>
          <select id="pegajosos" name="pegajosos" required className="input" value={pegajosos} onChange={(e) => setPegajosos(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="azucarados" className="block mb-1 font-medium mt-4">Consume alimentos azucarados:</label>
          <select id="azucarados" name="azucarados" required className="input" value={azucarados} onChange={(e) => setAzucarados(e.target.value)}>
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
            value={encias}
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
            value={dolor}
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
            value={dolorCabeza}
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
            value={chasquidos}
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
            value={dolorOido}
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
          <select id="suction_digital" name="suction_digital" required className="input" value={suctionDigital} onChange={(e) => setSuctionDigital(e.target.value)}>
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
            value={ortodoncia}
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
                value={finalizoTratamiento}
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

          <label htmlFor="protesisSelect" className="block mb-1 font-medium mt-4">Uso de Prótesis:</label>
          <select
            id="protesisSelect"
            name="protesis"
            required
            className="input"
            value={protesis}
            onChange={e => setProtesis(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {protesis === 'si' && (
            <>
              <label htmlFor="protesis_tipo" className="block mb-1 font-medium mt-2">Tipo de Prótesis:</label>
              <select id="protesis_tipo" name="protesis_tipo" className="input" value={protesisTipo} onChange={(e) => setProtesisTipo(e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="Removible">Removible</option>
                <option value="Fija">Fija</option>
                <option value="Implante">Implante</option>
              </select>

              <label htmlFor="protesis_nocturno" className="block mb-1 font-medium mt-2">Uso nocturno de protesis:</label>
              <select id="protesis_nocturno" name="protesis_nocturno" className="input" value={protesisNocturno} onChange={(e) => setProtesisNocturno(e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Si</option>
              </select>
            </>
          )}

          <label htmlFor="sensibilidad" className="block mb-1 font-medium mt-4">Sensibilidad:</label>
          <select id="sensibilidad" name="sensibilidad" required className="input" value={sensibilidad} onChange={(e) => setSensibilidad(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {sensibilidad === 'si' && (
            <label htmlFor="tipo_sensibilidad" className="block mb-1 font-medium mt-4">Tipo de Sensibilidad:</label>
          )}
          {sensibilidad === 'si' && (
            <select id="tipo_sensibilidad" name="tipo_sensibilidad" className="input" value={tipoSensibilidad} onChange={(e) => setTipoSensibilidad(e.target.value)}>
              <option value="">Seleccionar tipo</option>
              <option value="dulce">Dulce</option>
              <option value="frio">Frío</option>
              <option value="caliente">Caliente</option>
              <option value="acido">Ácido</option>
              <option value="presion">Presión</option>
              <option value="multiple">Múltiple</option>
            </select>
          )}

          <label htmlFor="ultima_limpieza" className="block mb-1 font-medium mt-4">Última Limpieza Dental:</label>
          <input type="text" id="ultima_limpieza" name="ultima_limpieza" className="input" value={ultimaLimpieza} onChange={(e) => setUltimaLimpieza(e.target.value)} />

          <label htmlFor="f_cepillado" className="block mb-1 font-medium mt-4">Frecuencia de cepillado diario:</label>
          <input type="number" id="f_cepillado" name="f_cepillado" required className="input" value={fCepillado} onChange={(e) => setFCepillado(e.target.value)} />

          <label htmlFor="tipocepillo" className="block mb-1 font-medium mt-4">Tipo de cepillo dental:</label>
          <input type="text" id="tipocepillo" name="tipocepillo" className="input" value={tipocepillo} onChange={(e) => setTipocepillo(e.target.value)} />

          <label htmlFor="pastadental" className="block mb-1 font-medium mt-4">Tipo de pasta dental:</label>
          <input type="text" id="pastadental" name="pastadental" required className="input" value={pastadental} onChange={(e) => setPastadental(e.target.value)} />

          <label htmlFor="cambio_cepillo" className="block mb-1 font-medium mt-4">Cada cuanto cambia el cepillo dental?</label>
          <input type="text" id="cambio_cepillo" name="cambio_cepillo" required className="input" value={cambioCepillo} onChange={(e) => setCambioCepillo(e.target.value)} />

          <label htmlFor="hilo_dental" className="block mb-1 font-medium mt-4">Uso de hilo dental:</label>
          <select id="hilo_dental" name="hilo_dental" required className="input" value={hiloDental} onChange={(e) => setHiloDental(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          <label htmlFor="enjuague_bucal" className="block mb-1 font-medium mt-4">Uso de enjuague bucal:</label>
          <select id="enjuague_bucal" name="enjuague_bucal" required className="input" value={enjuagueBucal} onChange={(e) => setEnjuagueBucal(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          <label htmlFor="necesita_ortodoncia" className="block mb-1 font-medium mt-4">¿Desea Ortodoncia?</label>
          <select
            id="necesita_ortodoncia"
            name="necesita_ortodoncia"
            required
            className="input"
            value={necesitaOrtodoncia}
            onChange={e => setNecesitaOrtodoncia(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
            <option value="en_tratamiento">En tratamiento</option>
          </select>

          {(necesitaOrtodoncia === 'si' || necesitaOrtodoncia === 'en_tratamiento') && (
            <>
              <label htmlFor="detalles_ortodoncia_text" className="block mb-1 font-medium mt-2">Diagnóstico Ortodóntico:</label>
              <textarea id="detalles_ortodoncia_text" name="detalles_ortodoncia" className="textarea" rows={3} value={detallesOrtodoncia} onChange={(e) => setDetallesOrtodoncia(e.target.value)} />
            </>
          )}
        </section>

        {/* Examen Intraoral */}
        {necesitaOrtodoncia === 'si' && (
          <section>
          <h3 className="text-lg font-semibold mt-8 mb-4 border-b border-teal-300 pb-1">Examen Intraoral</h3>

          <label htmlFor="oclusion" className="block mb-1 font-medium">Oclusión:</label>
          <select id="oclusion" name="oclusion" className="input" value={oclusion} onChange={(e) => setOclusion(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="clase1">Clase I</option>
            <option value="clase2_div1">Clase II División 1</option>
            <option value="clase2_div2">Clase II División 2</option>
            <option value="clase3">Clase III</option>
          </select>

          <label htmlFor="relacion_molar" className="block mb-1 font-medium mt-4">Relación molar:</label>
          <select id="relacion_molar" name="relacion_molar" className="input" value={relacionMolar} onChange={(e) => setRelacionMolar(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="clase1">Clase I</option>
            <option value="clase2_div1">Clase II División 1</option>
            <option value="clase2_div2">Clase II División 2</option>
            <option value="clase3">Clase III</option>
          </select>

          <label htmlFor="relacion_canina" className="block mb-1 font-medium mt-4">Relación canina:</label>
          <select id="relacion_canina" name="relacion_canina" className="input" value={relacionCanina} onChange={(e) => setRelacionCanina(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="clase1">Clase I</option>
            <option value="clase2">Clase II</option>
            <option value="clase3">Clase III</option>
          </select>

          <label htmlFor="tipo_mordida" className="block mb-1 font-medium mt-4">Tipo de mordida:</label>
          <select id="tipo_mordida" name="tipo_mordida" className="input" value={tipoMordida} onChange={(e) => setTipoMordida(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="normal">Normal</option>
            <option value="abierta">Abierta</option>
            <option value="cruzada">Cruzada</option>
            <option value="bordeaborde">Borde a borde</option>
            <option value="profunda">Profunda</option>
          </select>

          <label htmlFor="apiñamiento" className="block mb-1 font-medium mt-4">Apiñamiento:</label>
          <select id="apiñamiento" name="apiñamiento" className="input" value={apiñamiento} onChange={(e) => setApiñamiento(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="ninguno">Ninguno</option>
            <option value="leve">Leve</option>
            <option value="medio">Moderado</option>
            <option value="grave">Severo</option>
          </select>

          <label htmlFor="espacios" className="block mb-1 font-medium mt-4">Espacio:</label>
          <select id="espacios" name="espacios" className="input" value={espacios} onChange={(e) => setEspacios(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="ninguno">Ninguno</option>
            <option value="diastemas">Diastemas</option>
            <option value="exodonciaprevias">Exodoncias previas</option>
          </select>

          <label htmlFor="lineamedia" className="block mb-1 font-medium mt-4">Línea media dental:</label>
          <select id="lineamedia" name="lineamedia" className="input" value={lineamedia} onChange={(e) => setLineamedia(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="centrada">Centrada</option>
            <option value="desviada_derecha">Desviada a la derecha</option>
            <option value="desviada_izquierda">Desviada a la izquierda</option>
          </select>
        </section>
        )}

        {/* Plan de Tratamiento */}
        {necesitaOrtodoncia === 'si' && (
          <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Plan de Tratamiento</h2>

          <label htmlFor="diagnostico" className="block mb-1 font-medium">Diagnóstico:</label>
          <textarea id="diagnostico" name="diagnostico" className="textarea" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />

          <label htmlFor="tipo_aparatologia_select" className="block mb-1 font-medium mt-4">Seleccione el tipo de aparatología:</label>
          <select id="tipo_aparatologia_select" name="tipo_aparatologia" className="input" value={tipoAparatologia} onChange={(e) => setTipoAparatologia(e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="brackets_metalicos">Brackets Metálicos</option>
            <option value="brackets_esteticos">Brackets Estéticos</option>
            <option value="ortodoncia_lingual">Ortodoncia Lingual</option>
            <option value="alineadores_invisalign">Alineadores (Invisalign)</option>
            <option value="aparato_removible">Aparato Removible</option>
            <option value="expansor_palatino">Expansor Palatino</option>
            <option value="retenedores">Retenedores</option>
            <option value="aparato_funcional">Aparato Funcional</option>
            <option value="otro">Otro (especificar)</option>
          </select>

          {tipoAparatologia === 'otro' && (
            <label htmlFor="otro_aparatologia" className="block mb-1 font-medium mt-4">Especificar otro tipo:</label>
          )}
          {tipoAparatologia === 'otro' && (
            <input type="text" id="otro_aparatologia" name="otro_aparatologia" className="input" value={otroAparatologia} onChange={(e) => setOtroAparatologia(e.target.value)} placeholder="Especificar tipo de aparatología" />
          )}

          <label htmlFor="tratamiento" className="block mb-1 font-medium mt-4">Tratamiento propuesto:</label>
          <textarea id="tratamiento" name="tratamiento" className="textarea" style={{ minHeight: '100px' }} value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} />

          <label htmlFor="observaciones_plan" className="block mb-1 font-medium mt-4">Observaciones:</label>
          <textarea id="observaciones_plan" name="observaciones_plan" className="textarea" value={observacionesPlan} onChange={(e) => setObservacionesPlan(e.target.value)} />
        </section>
        )}

        {/* Always Visible Sections - Inside Form but Outside Conditional Logic */}
        <div className="mt-8">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="confirm_info" name="confirm_info" required />
            <label htmlFor="confirm_info" className="font-medium">Confirmo que la información proporcionada es correcta.</label>
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
                  onRemove={async (index) => {
                    try {
                      // Only update local state - API handles database and storage deletion
                      const updatedDocuments = currentPatient.documentos.filter((_, i) => i !== index);
                      
                      setCurrentPatient(prev => prev ? {
                        ...prev,
                        documentos: updatedDocuments
                      } : null);
                    } catch (error) {
                      console.error('Error updating local state:', error);
                    }
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
      
      {/* Conditions Warning Modal */}
      {showWarningModal && isEditing && currentPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className={`bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 ${getConditionSeverity(currentPatient).color} opacity-80`}
            style={getConditionSeverity(currentPatient).gradient ? {
              background: getConditionSeverity(currentPatient).gradient,
              border: 'none'
            } : {}}
          >
            {/* Warning Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getConditionSeverity(currentPatient).bgColor}`}>
                <i className={`fas ${getConditionSeverity(currentPatient).level === 'pregnancy' ? 'fa-baby' : 'fa-exclamation-triangle'} text-white text-2xl`}></i>
              </div>
            </div>
            
            {/* Warning Title */}
            <h3 className={`text-lg font-semibold mb-3 text-center ${getConditionSeverity(currentPatient).gradient ? 'text-white' : getConditionSeverity(currentPatient).textColor}`}>
              {getConditionSeverity(currentPatient).level === 'pregnancy' ? 'Embarazo Detectado' : 'Alerta Médica Importante'}
            </h3>
            
            {/* Warning Message */}
            <div className={`text-sm mb-6 text-center ${getConditionSeverity(currentPatient).gradient ? 'text-white' : getConditionSeverity(currentPatient).textColor}`}>
              {getConditionSeverity(currentPatient).level === 'pregnancy' && (
                <p>Esta paciente está <strong>embarazada</strong>. Se debe tener especial consideración en los tratamientos odontológicos.</p>
              )}
              {getConditionSeverity(currentPatient).level === 'critical' && (
                <p>Este paciente presenta <strong>condiciones médicas críticas</strong> que requieren atención ESPECIAL.</p>
              )}
              {getConditionSeverity(currentPatient).level === 'high' && (
                <p>Este paciente presenta <strong>condiciones médicas de alto riesgo</strong> que requieren especial atención.</p>
              )}
              {getConditionSeverity(currentPatient).level === 'medium' && (
                <p>Este paciente presenta <strong>condiciones médicas moderadas</strong> que deben ser consideradas en el tratamiento.</p>
              )}
              {getConditionSeverity(currentPatient).level === 'low' && (
                <p>Este paciente presenta <strong>condiciones médicas leves</strong> que deben ser tenidas en cuenta.</p>
              )}
              
              {/* Condition Details */}
              <div className="mt-3 space-y-1 text-xs">
                {currentPatient.sexo === 'femenino' && currentPatient.embarazo === 'si' && (
                  <div><strong>Embarazo:</strong> {currentPatient.embarazo === 'si' ? 'Sí' : 'No'}</div>
                )}
                {currentPatient.enfermedades && (
                  <div><strong>Enfermedades:</strong> {currentPatient.enfermedades}</div>
                )}
                {currentPatient.alergias && (
                  <div><strong>Alergias:</strong> {currentPatient.alergias}</div>
                )}
                {currentPatient.medicamentos && (
                  <div><strong>Medicamentos:</strong> {currentPatient.medicamentos}</div>
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
    </div>
  );
}