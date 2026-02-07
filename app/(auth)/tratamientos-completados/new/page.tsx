'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompletedTreatmentService } from '../../../../services/completedTreatmentService';
import { PatientService } from '../../../../services/patientService';
import { SupabaseDoctorService } from '../../../../services/supabaseDoctorService';
import { Patient } from '../../../../types/patient';
import { AVAILABLE_DOCTORS, getDoctorById, Doctor } from '../../../../config/doctors';
import { getRecordCategoryInfoSync, generateTranscriptionMetadata } from '../../../../utils/recordCategoryUtils';
import { useHistoricalMode } from '../../../../contexts/HistoricalModeContext';
import { getPatientType } from '../../../../utils/patientTypeUtils';
import { supabase } from '../../../../lib/supabase';
import { useUser } from '@clerk/nextjs';
import HistoricalBadge from '../../../../components/HistoricalBadge';
import HistoricalBanner from '../../../../components/HistoricalBanner';
import { useTheme } from '@/contexts/ThemeContext';

// Define Promotion interface locally since it's not exported
interface Promotion {
  id?: number;
  codigo: string;
  nombre: string;
  descuento: number;
  precio_original: number;
  precio_promocional: number;
  moneda: Currency; // Add currency field
  notas?: string; // Add notes field
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  veces_realizado: number;
  es_grupal?: boolean;
  tipo_promocion?: 'individual' | '2x1' | 'family' | 'friends';
  max_beneficiarios?: number;
  creado_en?: string;
  actualizado_en?: string;
}
import Link from 'next/link';
import { formatCurrency, Currency } from '../../../../utils/currencyUtils';
import { formatDateForDisplay, getTodayForDatabase } from '../../../../utils/dateUtils';
import SignatureModal from '../../../../components/SignatureModal';
import LoadingAnimation from '../../../../components/LoadingAnimation';
import { TreatmentModalWrapper } from '../../../../components/TreatmentModalWrapper';
import { useTreatmentModal } from '../../../../contexts/TreatmentModalContext';
import { TreatmentService } from '../../../../services/treatmentService';

interface Treatment {
  id: number;
  nombre: string;
  precio: number;
  codigo: string;
  especialidad?: string;
  descripcion?: string;
  categoria?: string;
  veces_realizado?: number;
  moneda: Currency; // Add currency field
  notas?: string; // Add notes field
}

interface SelectedTreatment {
  tratamiento_id: number;
  nombre_tratamiento: string;
  codigo_tratamiento: string;
  precio_original: number;
  precio_final: number;
  moneda: Currency; // Add currency field
  cantidad: number;
  notas: string;
  doctor_id?: string;
  doctor_name?: string;
  disableElderlyDiscount?: boolean; // Add this for per-treatment control
}


function NuevoTratamientoCompletadoPage() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [availableTreatments, setAvailableTreatments] = useState<Treatment[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([]);
  const [discountType, setDiscountType] = useState<'monto' | 'porcentaje' | 'ninguno'>('ninguno');
  const [discountValue, setDiscountValue] = useState(0);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [activeTab, setActiveTab] = useState<'tratamientos' | 'promociones'>('tratamientos');
  const [showPatientSignatureModal, setShowPatientSignatureModal] = useState(false);
  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const { bypassHistoricalMode, setBypassHistoricalMode, setCurrentPatient, loadPatientSettings, savePatientSettings } = useHistoricalMode();
  const { user, isLoaded } = useUser();

  // List of dental specialties
  const specialties = [
    'Odontología General',
    'Ortodoncia',
    'Endodoncia',
    'Periodoncia',
    'Cirugía Oral y Maxilofacial',
    'Odontopediatría',
    'Rehabilitación Oral',
    'Radiología Oral',
    'Patología Oral',
    'Odontología Estética'
  ];

  // Available doctors - from database with fallback to hardcoded list
  const [availableDoctors, setAvailableDoctors] = useState<any[]>(AVAILABLE_DOCTORS);
  
  // Fetch doctors from database
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctorsList = await SupabaseDoctorService.getDoctors();
        if (doctorsList && doctorsList.length > 0) {
          setAvailableDoctors(doctorsList);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        // Keep fallback to AVAILABLE_DOCTORS if database fetch fails
      }
    };

    fetchDoctors();
  }, []);
  
  // Group promotion states
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Patient[]>([]);
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [treatmentDate, setTreatmentDate] = useState<string>(getTodayForDatabase());

  const pacienteId = searchParams.get('paciente_id');

  useEffect(() => {
    if (pacienteId) {
      loadPatientData();
      loadAvailableTreatments();
      loadPromotions();
    } else {
      router.push('/tratamientos-completados');
    }
  }, [pacienteId]);

  // Separate effect for historical mode setting that depends on user authentication
  useEffect(() => {
    if (pacienteId && isLoaded && user && user.id) {
      // Load patient-specific historical mode settings using new context method
      loadPatientSettings(pacienteId);
    }
  }, [pacienteId, isLoaded, user]);

  const loadPatientData = async () => {
    try {
      const patientData = await PatientService.getPatientById(pacienteId!);
      setPatient(patientData);
      
      // Set current patient for historical mode context
      setCurrentPatient(pacienteId!);
      
      // Check record category (historical, active, archived)
      const categoryInfo = getRecordCategoryInfoSync(patientData.fecha_inicio);
      setRecordCategoryInfo(categoryInfo);
      
      // Show warning modal if patient has medical conditions and severity is not 'none'
    } catch (error) {
      console.error('Error loading patient data:', error);
      router.push('/tratamientos-completados');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTreatments = async () => {
    try {
      const response = await fetch('/api/tratamientos');
      if (response.ok) {
        const treatmentsData = await response.json();
        setAvailableTreatments(treatmentsData);
      } else {
        console.error('Treatments API response not ok:', response.status);
        setAvailableTreatments([]);
      }
    } catch (error) {
      console.error('Error loading treatments:', error);
      // Handle JSON parsing errors gracefully
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        console.error('API returned HTML instead of JSON - likely missing tratamientos table');
      }
      setAvailableTreatments([]);
    }
  };

  const loadPromotions = async () => {
    try {
      const response = await fetch('/api/promociones');
      if (response.ok) {
        const promotionsData = await response.json();
        setPromotions(promotionsData);
      } else {
        console.error('Promotions API response not ok:', response.status);
        setPromotions([]);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
      // Handle JSON parsing errors gracefully
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        console.error('API returned HTML instead of JSON - likely missing promociones table');
      }
      setPromotions([]);
    }
  };

  // Function to handle bypass changes using new context method
  const handleBypassChange = async (newBypassValue: boolean) => {
    try {
      const pacienteId = searchParams.get('paciente_id');
      if (pacienteId) {
        await savePatientSettings(pacienteId, newBypassValue);
        console.log('✅ Patient bypass setting updated successfully');
      }
    } catch (error) {
      console.error('❌ Failed to update bypass setting:', error);
      alert('Error al actualizar la configuración del modo histórico');
    }
  };

  const handleTreatmentSelect = (treatment: Treatment) => {
    // Get doctor from patient data (already saved in database)
    const patientDoctor = patient?.doctor;
    let patientDoctorId = 'otro';
    let defaultDoctorName = 'No especificado';
    
    if (patient?.doctor && patient.doctor !== 'otro') {
      const foundDoctor = availableDoctors.find(d => d.name === patient.doctor);
      if (foundDoctor) {
        patientDoctorId = foundDoctor.id;
        defaultDoctorName = foundDoctor.name;
      } else {
        defaultDoctorName = patient.doctor;
      }
    } else if (patient?.doctor === 'otro') {
      defaultDoctorName = patient.doctor;
    }
    
    setSelectedTreatments(prev => {
      const existing = prev.find(item => item.tratamiento_id === treatment.id);
      
      if (existing) {
        // Remove treatment if already selected
        return prev.filter(item => item.tratamiento_id !== treatment.id);
      } else {
        // Add treatment with default doctor
        return [...prev, {
          tratamiento_id: treatment.id,
          nombre_tratamiento: treatment.nombre,
          codigo_tratamiento: treatment.codigo,
          precio_original: treatment.precio,
          precio_final: treatment.precio,
          moneda: treatment.moneda || 'HNL' as Currency,
          cantidad: 1,
          notas: '',
          doctor_id: patientDoctorId,
          doctor_name: defaultDoctorName
        }];
      }
    });
  };

  const addTreatment = (treatment: Treatment) => {
    // Get doctor from patient data (already saved in database)
    let patientDoctorId = 'otro';
    let defaultDoctorName = 'No especificado';
    
    if (patient?.doctor && patient.doctor !== 'otro') {
      const foundDoctor = availableDoctors.find(d => d.name === patient.doctor);
      if (foundDoctor) {
        patientDoctorId = foundDoctor.id;
        defaultDoctorName = foundDoctor.name;
      } else {
        defaultDoctorName = patient.doctor;
      }
    } else if (patient?.doctor === 'otro') {
      defaultDoctorName = patient.doctor;
    }
    
    setSelectedTreatments(prev => {
      const existing = prev.find(item => item.tratamiento_id === treatment.id);
      
      if (existing) {
        // Remove treatment if already selected
        return prev.filter(item => item.tratamiento_id !== treatment.id);
      } else {
        // Add treatment with default doctor and auto-populated notes
        const newTreatment = {
          tratamiento_id: treatment.id,
          nombre_tratamiento: treatment.nombre,
          codigo_tratamiento: treatment.codigo,
          precio_original: treatment.precio,
          precio_final: treatment.precio,
          moneda: treatment.moneda || 'HNL' as Currency,
          cantidad: 1,
          notas: treatment.notas || '', // Auto-populate with treatment notes if available
          doctor_id: patientDoctorId,
          doctor_name: defaultDoctorName
        };
        
        return [...prev, newTreatment];
      }
    });
  };

  const updateTreatmentQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeTreatment(index);
      return;
    }

    const updated = [...selectedTreatments];
    updated[index].cantidad = quantity;
    setSelectedTreatments(updated);
  };

  const updateTreatmentDoctor = (index: number, doctorId: string) => {
    const updated = [...selectedTreatments];
    const doctorName = availableDoctors.find(d => d.id === doctorId)?.name || 'Dr. Default';
    updated[index].doctor_id = doctorId;
    updated[index].doctor_name = doctorName;
    setSelectedTreatments(updated);
  };

  const updateTreatmentNotes = (index: number, notes: string) => {
    const updated = [...selectedTreatments];
    updated[index].notas = notes;
    setSelectedTreatments(updated);
  };

  const removeTreatment = (index: number) => {
    const updated = selectedTreatments.filter((_, i) => i !== index);
    setSelectedTreatments(updated);
  };

  const addPromotion = (promotion: Promotion) => {
  // Check if this is a group promotion
  if (promotion.es_grupal) {
    setSelectedPromotion(promotion);
    setShowBeneficiaryModal(true);
    return;
  }
  
  // For testing: if promotion name contains 2x1, treat as group promotion
  if (promotion.nombre.toLowerCase().includes('2x1') || 
      promotion.nombre.toLowerCase().includes('2 x 1') ||
      promotion.nombre.toLowerCase().includes('dos por uno')) {
    // Temporarily make it a group promotion
    const groupPromotion = {
      ...promotion,
      es_grupal: true,
      tipo_promocion: '2x1' as const,
      max_beneficiarios: 1
    };
    setSelectedPromotion(groupPromotion);
    setShowBeneficiaryModal(true);
    return;
  }
  
  // Handle individual promotion
  const existingIndex = selectedTreatments.findIndex(t => t.tratamiento_id === promotion.id);
  
  if (existingIndex >= 0) {
    // Update quantity if already exists
    const updated = [...selectedTreatments];
    updated[existingIndex].cantidad += 1;
    setSelectedTreatments(updated);
  } else {
    // Add new promotion as treatment
    const promotionNote = promotion.notas 
      ? `Promoción: ${promotion.descuento}% OFF - ${promotion.notas}`
      : `Promoción: ${promotion.descuento}% OFF`;
    
    setSelectedTreatments([...selectedTreatments, {
      tratamiento_id: promotion.id!,
      nombre_tratamiento: promotion.nombre,
      codigo_tratamiento: promotion.codigo,
      precio_original: promotion.precio_promocional,
      precio_final: promotion.precio_promocional,
      moneda: promotion.moneda || 'HNL' as Currency,
      cantidad: 1,
      notas: promotionNote,
      disableElderlyDiscount: true // Default to disabled for promotions (user can enable)
    }]);
  }
};

  // Group promotion functions
  const searchPatients = async (term: string) => {
    if (term.length < 2) {
      setPatientSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/patients?search=${term}`);
      if (response.ok) {
        const patients = await response.json();
        
        // Apply GlobalSearch-style scoring and highlighting
        const queryLower = term.toLowerCase();
        const scoredPatients = patients.map((patient: any) => {
          let score = 0;
          const matchedFields: string[] = [];
          
          // Exact name match gets highest score
          if (patient.nombre_completo?.toLowerCase().includes(queryLower)) {
            score += 100;
            matchedFields.push('nombre_completo');
          }
          
          // ID match gets high score
          if (patient.numero_identidad?.toLowerCase().includes(queryLower)) {
            score += 80;
            matchedFields.push('numero_identidad');
          }
          
          // Phone match gets medium score
          if (patient.telefono?.toLowerCase().includes(queryLower)) {
            score += 40;
            matchedFields.push('telefono');
          }
          
          // Email match gets lower score
          if (patient.email?.toLowerCase().includes(queryLower)) {
            score += 30;
            matchedFields.push('email');
          }
          
          return { ...patient, score, matchedFields };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score);
        
        // Filter out current patient and already selected beneficiaries
        const filteredPatients = scoredPatients.filter((p: any) => 
          p.paciente_id !== pacienteId && 
          !beneficiaries.find(b => b.paciente_id === p.paciente_id)
        );
        
        setPatientSearchResults(filteredPatients);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  const addBeneficiary = (patient: Patient) => {
    if (selectedPromotion?.max_beneficiarios && beneficiaries.length >= selectedPromotion.max_beneficiarios) {
      alert(`Máximo ${selectedPromotion.max_beneficiarios} beneficiarios permitidos`);
      return;
    }
    
    setBeneficiaries([...beneficiaries, patient]);
    setPatientSearchResults([]);
    setPatientSearchTerm('');
  };

  const removeBeneficiary = (patientId: string) => {
    setBeneficiaries(beneficiaries.filter(b => b.paciente_id !== patientId));
  };

  const confirmGroupPromotion = () => {
    if (!selectedPromotion || beneficiaries.length === 0) return;
    
    // Add the main promotion for the payer
    setSelectedTreatments([...selectedTreatments, {
      tratamiento_id: selectedPromotion.id!,
      nombre_tratamiento: selectedPromotion.nombre,
      codigo_tratamiento: selectedPromotion.codigo,
      precio_original: selectedPromotion.precio_promocional,
      precio_final: selectedPromotion.precio_promocional,
      moneda: selectedPromotion.moneda || 'HNL' as Currency,
      cantidad: 1,
      notas: `Promoción grupal: ${selectedPromotion.descuento}% OFF - Pagador`
    }]);
    
    // Add beneficiary entries
    beneficiaries.forEach(beneficiary => {
      setSelectedTreatments(prev => [...prev, {
        tratamiento_id: selectedPromotion.id!,
        nombre_tratamiento: selectedPromotion.nombre,
        codigo_tratamiento: selectedPromotion.codigo,
        precio_original: 0, // Free for beneficiaries
        precio_final: 0,
        moneda: selectedPromotion.moneda || 'HNL' as Currency,
        cantidad: 1,
        notas: `Promoción grupal: ${selectedPromotion.descuento}% OFF - Beneficiario: ${beneficiary.nombre_completo} ID: ${beneficiary.paciente_id}`
      }]);
    });
    
    // Reset modal state
    setShowBeneficiaryModal(false);
    setSelectedPromotion(null);
    setBeneficiaries([]);
    setPatientSearchResults([]);
    setPatientSearchTerm('');
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let discount = 0;
    const discountReasons = [];
    
    // Check if historical mode is bypassed
    const isHistoricallyBypassed = recordCategoryInfo?.isHistorical && bypassHistoricalMode;
    
    // Calculate totals with per-treatment elderly discount logic
    selectedTreatments.forEach((treatment) => {
      let treatmentSubtotal = treatment.precio_original * treatment.cantidad;
      
      // Historical records have no price unless bypassed
      if (recordCategoryInfo?.isHistorical && !isHistoricallyBypassed) {
        treatmentSubtotal = 0;
      }
      
      subtotal += treatmentSubtotal;
      
      let treatmentDiscount = 0;
      
      // Check if this is a promotional treatment
      const isPromotion = treatment.notas?.toLowerCase().includes('promoción') || 
                          treatment.notas?.toLowerCase().includes('promocion') ||
                          treatment.notas?.toLowerCase().includes('promo');
      
      // Apply elderly discount for regular treatments or promotional treatments with elderly discount enabled (only for non-historical records or bypassed historical records)
      if (patient && (!recordCategoryInfo?.isHistorical || isHistoricallyBypassed) && (!isPromotion || !treatment.disableElderlyDiscount)) {
        const patientType = getPatientType(patient);
        
        if (patientType.category === '4ta') {
          treatmentDiscount = treatmentSubtotal * 0.35; // 35% discount for 4ta edad
          if (treatmentDiscount > 0) {
            discountReasons.push(`Descuento 4ta Edad (35%) - ${treatment.nombre_tratamiento}`);
          }
        } else if (patientType.category === '3ra') {
          treatmentDiscount = treatmentSubtotal * 0.25; // 25% discount for 3ra edad
          if (treatmentDiscount > 0) {
            discountReasons.push(`Descuento 3ra Edad (25%) - ${treatment.nombre_tratamiento}`);
          }
        }
      }
      
      discount += treatmentDiscount;
    });
    
    // Apply additional manual discounts if any (only for non-historical records or bypassed historical records)
    if (!recordCategoryInfo?.isHistorical || isHistoricallyBypassed) {
      if (discountType === 'monto') {
        const manualDiscount = Math.min(discountValue, subtotal - discount);
        discount += manualDiscount;
        if (manualDiscount > 0) {
          discountReasons.push(`Descuento Manual (${formatCurrency(manualDiscount, selectedTreatments[0]?.moneda || 'HNL' as Currency)})`);
        }
      } else if (discountType === 'porcentaje') {
        const manualDiscount = (subtotal - discount) * (discountValue / 100);
        discount += manualDiscount;
        if (manualDiscount > 0) {
          discountReasons.push(`Descuento Manual (${discountValue}%)`);
        }
      }
    }

    const total = subtotal - discount;
    const discountReason = discountReasons.join(' + ');
    
    // Add historical note if applicable
    const finalDiscountReason = recordCategoryInfo?.isHistorical && !isHistoricallyBypassed
      ? 'Registro Histórico - Sin costo' 
      : discountReason;
    
    return { subtotal, discount, total, discountReason: finalDiscountReason };
  };

  // Check if patient is eligible for elderly discount
  const isElderlyPatient = patient && (getPatientType(patient).category === '3ra' || getPatientType(patient).category === '4ta');

  // Function to update elderly discount setting for a specific treatment
  const updateTreatmentElderlyDiscount = (index: number, disableElderlyDiscount: boolean) => {
    const updated = [...selectedTreatments];
    updated[index].disableElderlyDiscount = disableElderlyDiscount;
    setSelectedTreatments(updated);
  };

  const saveTreatment = async () => {
    if (selectedTreatments.length === 0) {
      alert('Debe agregar al menos un tratamiento');
      return;
    }

    // Only require signature for non-historical records OR when bypass is enabled
    const shouldRequireSignature = !recordCategoryInfo?.isHistorical || bypassHistoricalMode;
    
    if (shouldRequireSignature && !patientSignature) {
      alert('Se requiere la firma del paciente');
      return;
    }

    setSaving(true);
    
    try {
      const { subtotal, discount, total, discountReason } = calculateTotals();
      
      // If this is a group promotion with beneficiaries, create separate treatment records
      if (selectedPromotion?.es_grupal && beneficiaries.length > 0) {
        console.log(' Creating group promotion with beneficiaries');
        
        // 1. Create main treatment record for the payer
        const mainTreatmentData = {
          paciente_id: pacienteId!,
          fecha_cita: treatmentDate,
          total_original: subtotal,
          total_descuento: discount,
          total_final: total,
          moneda: selectedTreatments[0]?.moneda || 'HNL' as Currency,
          tipo_descuento: discountType,
          valor_descuento: discountValue,
          notas_doctor: doctorNotes,
          firma_paciente_url: shouldRequireSignature ? patientSignature : null,
          is_historical: recordCategoryInfo?.isHistorical || false,
          especialidad: null,
          estado: 'pagado' as const,
          tipo_participacion: 'pagador' as const,
          tratamientos_realizados: selectedTreatments.map(item => ({
            tratamiento_id: item.tratamiento_id,
            nombre_tratamiento: item.nombre_tratamiento,
            codigo_tratamiento: item.codigo_tratamiento,
            precio_original: item.precio_original,
            precio_final: item.precio_final,
            moneda: item.moneda || 'HNL' as Currency,
            cantidad: item.cantidad,
            notas: item.notas,
            doctor_id: item.doctor_id,
            doctor_name: item.doctor_name
          }))
        };
        
        const mainTreatment = await CompletedTreatmentService.createCompletedTreatment(mainTreatmentData);
        
        // Increment the counter for each treatment that was completed (main payer)
        for (const item of selectedTreatments) {
          try {
            await TreatmentService.incrementTreatmentCounter(item.tratamiento_id, item.cantidad);
          } catch (error) {
            console.error(`Error incrementing counter for treatment ${item.tratamiento_id}:`, error);
          }
        }
        
        // 2. Create separate treatment records for each beneficiary
        for (const beneficiary of beneficiaries) {
          const beneficiaryTreatmentData = {
            paciente_id: beneficiary.paciente_id,
            paciente_beneficiario_id: pacienteId!, // Link to main patient as beneficiary
            tipo_participacion: 'beneficiario' as const,
            tratamiento_padre_id: mainTreatment.id, // Link to main treatment
            fecha_cita: treatmentDate,
            total_original: 0, // Free for beneficiaries
            total_descuento: 0,
            total_final: 0,
            moneda: selectedTreatments[0]?.moneda || 'HNL' as Currency,
            tipo_descuento: 'ninguno' as const,
            valor_descuento: 0,
            notas_doctor: `Promoción grupal: ${selectedPromotion.descuento}% OFF - Beneficiario de ${patient?.nombre_completo} (ID: ${pacienteId})`,
            firma_paciente_url: null, // No signature required for beneficiaries
            is_historical: recordCategoryInfo?.isHistorical || false,
            especialidad: null,
            estado: 'pagado' as const,
            tratamientos_realizados: selectedTreatments.map(item => ({
              tratamiento_id: item.tratamiento_id,
              nombre_tratamiento: item.nombre_tratamiento,
              codigo_tratamiento: item.codigo_tratamiento,
              precio_original: 0, // Free for beneficiaries
              precio_final: 0,
              moneda: item.moneda || 'HNL' as Currency,
              cantidad: 1,
              notas: `Promoción grupal: ${selectedPromotion.descuento}% OFF - Beneficiario: ${beneficiary.nombre_completo} ID: ${beneficiary.paciente_id}`,
              doctor_id: item.doctor_id,
              doctor_name: item.doctor_name
            }))
          };
          
          await CompletedTreatmentService.createCompletedTreatment(beneficiaryTreatmentData);
        }
        
        alert(`Promoción grupal guardada exitosamente para ${patient?.nombre_completo} y ${beneficiaries.length} beneficiario(s)`);
      } else {
        // Regular treatment (no group promotion)
        const treatmentData = {
          paciente_id: pacienteId!,
          fecha_cita: treatmentDate,
          total_original: subtotal,
          total_descuento: discount,
          total_final: total,
          moneda: selectedTreatments[0]?.moneda || 'HNL' as Currency,
          tipo_descuento: discountType,
          valor_descuento: discountValue,
          notas_doctor: doctorNotes,
          firma_paciente_url: shouldRequireSignature ? patientSignature : null,
          is_historical: recordCategoryInfo?.isHistorical || false,
          // Don't force a single doctor for the main record - let each treatment have its own
          especialidad: null,
          estado: 'pagado' as const,
          tratamientos_realizados: selectedTreatments.map(item => ({
            tratamiento_id: item.tratamiento_id,
            nombre_tratamiento: item.nombre_tratamiento,
            codigo_tratamiento: item.codigo_tratamiento,
            precio_original: item.precio_original,
            precio_final: item.precio_final,
            moneda: item.moneda || 'HNL' as Currency,
            cantidad: item.cantidad,
            notas: item.notas,
            doctor_id: item.doctor_id,
            doctor_name: item.doctor_name
          }))
        };
        
        await CompletedTreatmentService.createCompletedTreatment(treatmentData);
        
        // Increment the counter for each treatment that was completed
        for (const item of selectedTreatments) {
          try {
            await TreatmentService.incrementTreatmentCounter(item.tratamiento_id, item.cantidad);
          } catch (error) {
            console.error(`Error incrementing counter for treatment ${item.tratamiento_id}:`, error);
          }
        }
        
        alert('Tratamiento completado guardado exitosamente');
      }
      
      router.push(`/tratamientos-completados?paciente_id=${pacienteId}`);
    } catch (error) {
      console.error('Error saving treatment:', error);
      alert('Error al guardar el tratamiento');
    } finally {
      setSaving(false);
    }
  };

  const filteredTreatments = availableTreatments.filter(treatment =>
    (selectedSpecialty === '' || treatment.especialidad === selectedSpecialty) &&
    (treatment.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
     treatment.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
     treatment.especialidad?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPromotions = promotions.filter(promotion =>
    promotion.activo && (
      promotion.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <LoadingAnimation 
        message="Preparando Tratamiento"
        subMessage="Cargando información del paciente"
        customMessages={[
          "• Cargando datos del paciente...",
          "• Preparando tratamientos disponibles...",
          "• Cargando promociones activas..."
        ]}
      />
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-600 mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400">Paciente no encontrado</p>
        </div>
      </div>
    );
  }

  const { subtotal, discount, total, discountReason } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/tratamientos-completados?paciente_id=${pacienteId}`}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Volver a Tratamientos
              </Link>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nuevo Tratamiento Completado</h1>
                <div className="flex items-center space-x-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Paciente: {patient.nombre_completo}
                  </p>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="treatment-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fecha del Tratamiento:
                    </label>
                    <input
                      id="treatment-date"
                      type="date"
                      value={treatmentDate}
                      onChange={(e) => setTreatmentDate(e.target.value)}
                      max={getTodayForDatabase()}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      style={{
                        colorScheme: resolvedTheme,
                      }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400" title="Útil para transcribir registros históricos">
                      <i className="fas fa-info-circle"></i>
                    </span>
                  </div>
                  {patient && (getPatientType(patient).category === '3ra' || getPatientType(patient).category === '4ta') && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getPatientType(patient).category === '4ta' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      <i className="fas fa-percent mr-1"></i>
                      {getPatientType(patient).category === '4ta' ? '35%' : '25%'} descuento
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={saveTreatment}
              disabled={saving || selectedTreatments.length === 0}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <i className="fas fa-save"></i>
              <span>{saving ? 'Guardando...' : 'Guardar Tratamiento'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical Mode Banner */}
      <HistoricalBanner
        isHistorical={recordCategoryInfo?.isHistorical}
        isBypassed={bypassHistoricalMode}
        patientId={pacienteId}
        onBypassChange={handleBypassChange}
        loading={false}
        compact={true}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Treatment Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Treatment Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agregar Tratamientos de la Base de Datos</h2>
                <div className="flex items-center space-x-3">
                  <CreateTreatmentButton />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('tratamientos')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'tratamientos'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Tratamientos
                </button>
                <button
                  onClick={() => setActiveTab('promociones')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'promociones'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Promociones
                </button>
              </div>

              {/* Treatments Tab */}
              {activeTab === 'tratamientos' && (
                <div>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Todas las Especialidades</option>
                      {specialties.map(specialty => (
                        <option key={specialty} value={specialty}>{specialty}</option>
                      ))}
                    </select>
                    
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="Buscar tratamiento..."
                    />
                  </div>

                  {/* Treatments List */}
                  <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                    {filteredTreatments.length > 0 ? (
                      filteredTreatments.map((treatment) => (
                        <div
                          key={treatment.id}
                          onClick={() => addTreatment(treatment)}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                              {treatment.codigo} - {treatment.nombre}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {treatment.especialidad}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-teal-600 dark:text-teal-400">
                            {treatment.moneda === 'HNL' ? 'L ' : '$'}{formatCurrency(treatment.precio, treatment.moneda || 'HNL' as Currency).replace(/[^\d.,]/g, '')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No se encontraron tratamientos
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Promociones Tab */}
              {activeTab === 'promociones' && (
                <div>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="Buscar promoción..."
                    />
                  </div>

                  {/* Promotions List */}
                  <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                    {filteredPromotions.length > 0 ? (
                      filteredPromotions.map((promotion) => (
                        <div
                          key={promotion.id}
                          onClick={() => addPromotion(promotion)}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                              {promotion.codigo} - {promotion.nombre}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {promotion.descuento}% OFF - Vigencia: {formatDateForDisplay(promotion.fecha_inicio)} a {formatDateForDisplay(promotion.fecha_fin)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-through">
                              {promotion.moneda === 'HNL' ? 'L ' : '$'}{formatCurrency(promotion.precio_original, promotion.moneda || 'HNL' as Currency).replace(/[^\d.,]/g, '')}
                            </div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400">
                              {promotion.moneda === 'HNL' ? 'L ' : '$'}{formatCurrency(promotion.precio_promocional, promotion.moneda || 'HNL' as Currency).replace(/[^\d.,]/g, '')}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No se encontraron promociones
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Treatments */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tratamientos Seleccionados</h2>
              
              {selectedTreatments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <i className="fas fa-clipboard-list text-4xl mb-2"></i>
                  <p>No hay tratamientos seleccionados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedTreatments.map((item, index) => {
                    const isPromotion = item.notas?.toLowerCase().includes('promoción') || 
                                      item.notas?.toLowerCase().includes('promocion') ||
                                      item.notas?.toLowerCase().includes('promo');
                    
                    return (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{item.nombre_tratamiento}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.codigo_tratamiento}</p>
                          <p className="text-sm font-medium text-teal-600">{formatCurrency(item.precio_original, item.moneda || 'HNL' as Currency)}</p>
                          
                          {/* Doctor Selection */}
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Tratado por:
                            </label>
                            <select
                              value={item.doctor_id || 'dr-default'}
                              onChange={(e) => updateTreatmentDoctor(index, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                            >
                              {availableDoctors.map(doctor => (
                                <option key={doctor.id} value={doctor.id}>
                                  {doctor.name} - {doctor.specialty}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Elderly Discount Override Checkbox for Promotional Treatments */}
                          {isElderlyPatient && isPromotion && (
                            <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!item.disableElderlyDiscount}
                                  onChange={(e) => updateTreatmentElderlyDiscount(index, !e.target.checked)}
                                  className="w-3 h-3 text-amber-600 border-gray-300 rounded focus:ring-amber-500 dark:focus:ring-amber-400 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                                    Aplicar descuento de tercera/cuarta edad
                                  </span>
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    {getPatientType(patient!).category === '4ta' ? '35%' : '25%'} adicional
                                  </p>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => updateTreatmentQuantity(index, parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            onClick={() => removeTreatment(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={item.notas || ''}
                        onChange={(e) => updateTreatmentNotes(index, e.target.value)}
                        placeholder="Notas del tratamiento..."
                        className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-sm"
                        rows={2}
                      />
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary and Details */}
          <div className="space-y-6">
            {/* Pricing Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumen de Precios</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal, selectedTreatments[0]?.moneda || 'HNL' as Currency)}</span>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Descuento
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="ninguno">Sin descuento</option>
                    <option value="monto">Monto fijo</option>
                    <option value="porcentaje">Porcentaje</option>
                  </select>
                </div>

                {discountType !== 'ninguno' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {discountType === 'monto' ? 'Monto de descuento:' : 'Porcentaje de descuento:'}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        min="0"
                        max={discountType === 'porcentaje' ? 100 : undefined}
                        step={discountType === 'monto' ? 0.01 : 1}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                      />
                      {discountType === 'porcentaje' && <span>%</span>}
                    </div>
                  </div>
                )}

                {discount > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span className="font-medium">-{formatCurrency(discount, selectedTreatments[0]?.moneda || 'HNL' as Currency)}</span>
                    </div>
                    {discountReason && (
                      <div className="text-xs text-green-600 italic">
                        <i className="fas fa-info-circle mr-1"></i>
                        {discountReason}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
                    <span>Total:</span>
                    <span className="text-teal-600">{formatCurrency(total, selectedTreatments[0]?.moneda || 'HNL' as Currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notas del Doctor</h2>
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Añada notas sobre el tratamiento realizado..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                rows={4}
              />
            </div>

            {/* Signatures */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Firmas</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {!recordCategoryInfo?.isHistorical || bypassHistoricalMode ? 'Firma del Paciente *' : 'Estado de Firma'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      {!recordCategoryInfo?.isHistorical || bypassHistoricalMode ? (
                        // Active record OR bypassed historical record - show signature
                        <>
                          {patientSignature ? (
                            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white">
                              <img 
                                src={patientSignature} 
                                alt="Firma del paciente" 
                                className="w-full h-20 object-contain"
                              />
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
                              <i className="fas fa-signature text-2xl mb-2"></i>
                              <p>Haga clic en "Firmar" para agregar la firma</p>
                            </div>
                          )}
                        </>
                      ) : (
                        // Historical record with no bypass - no signature required
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                          <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-xl mb-2"></i>
                          <p className="text-green-800 dark:text-green-200 font-medium">No se requiere firma para registros históricos</p>
                        </div>
                      )} 
                    </div>
                    {(!recordCategoryInfo?.isHistorical || bypassHistoricalMode) && (
                      <button
                        onClick={() => setShowPatientSignatureModal(true)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                      >
                        <i className="fas fa-pen mr-2"></i>
                        {patientSignature ? 'Cambiar Firma' : 'Añadir Firma'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Modals */}
            <SignatureModal
              isOpen={showPatientSignatureModal}
              onClose={() => setShowPatientSignatureModal(false)}
              onSave={(signatureData) => {
                setPatientSignature(signatureData);
                console.log('Patient signature saved:', signatureData);
              }}
              title="Firma de Paciente"
              isHistorical={recordCategoryInfo?.isHistorical && !bypassHistoricalMode}
              subtitle={patient?.nombre_completo}
            />
          </div>
        </div>
      </div>

      {/* Beneficiary Selection Modal */}
      {showBeneficiaryModal && selectedPromotion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Seleccionar Beneficiarios
                </h3>
                <button
                  onClick={() => setShowBeneficiaryModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              {/* Promotion Info */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-200">
                      {selectedPromotion.nombre}
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {selectedPromotion.descuento}% OFF - {selectedPromotion.tipo_promocion}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-800 dark:text-green-200">
                      {formatCurrency(selectedPromotion.precio_promocional)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Pagador: {patient?.nombre_completo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar Pacientes Beneficiarios
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={patientSearchTerm}
                    onChange={(e) => {
                      setPatientSearchTerm(e.target.value);
                      searchPatients(e.target.value);
                    }}
                    placeholder="Buscar por nombre o número de identidad..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  />
                  <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                </div>

                {/* Search Results */}
                {patientSearchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto">
                    {patientSearchResults.map((patientResult, index) => (
                      <div
                        key={patientResult.paciente_id}
                        onClick={() => addBeneficiary(patientResult)}
                        className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                          index === 0 && (patientResult.matchedFields.includes('nombre_completo') || 
                                         patientResult.matchedFields.includes('numero_identidad'))
                            ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500'
                            : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className={`font-medium ${
                              index === 0 && (patientResult.matchedFields.includes('nombre_completo') || 
                                             patientResult.matchedFields.includes('numero_identidad'))
                                ? 'text-green-900 dark:text-green-100 font-bold text-lg'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {patientResult.nombre_completo}
                            </div>
                            
                            {/* Highlight matched fields */}
                            {patientResult.matchedFields.includes('numero_identidad') && (
                              <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                                <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                  Identidad:
                                </div>
                                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                  {patientResult.numero_identidad}
                                </div>
                              </div>
                            )}
                            
                            {patientResult.matchedFields.includes('telefono') && (
                              <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                                <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                  Teléfono:
                                </div>
                                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                  {patientResult.codigopais || ''}{patientResult.telefono}
                                </div>
                              </div>
                            )}
                            
                            {patientResult.matchedFields.includes('email') && (
                              <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                                <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                  Email:
                                </div>
                                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                  {patientResult.email}
                                </div>
                              </div>
                            )}
                            
                            {/* Always show basic info */}
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <span>ID: {patientResult.numero_identidad}</span>
                              {patientResult.telefono && (
                                <span className="ml-2">• Tel: {patientResult.codigopais || ''}{patientResult.telefono}</span>
                              )}
                              {patientResult.email && (
                                <span className="ml-2">• {patientResult.email}</span>
                              )}
                            </div>
                            
                            {/* Additional info */}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {patientResult.sexo && <span className="mr-2">• {patientResult.sexo}</span>}
                              {patientResult.tipo_sangre && <span className="mr-2">• {patientResult.tipo_sangre}</span>}
                              {patientResult.doctor && <span className="mr-2">• Dr: {patientResult.doctor}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Score: {patientResult.score}
                            </div>
                            <i className="fas fa-plus text-teal-600 hover:text-teal-800"></i>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Beneficiaries */}
              {beneficiaries.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Beneficiarios Seleccionados ({beneficiaries.length})
                  </label>
                  <div className="space-y-2">
                    {beneficiaries.map((beneficiary) => (
                      <div
                        key={beneficiary.paciente_id}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {beneficiary.nombre_completo}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {beneficiary.numero_identidad}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 font-semibold">Gratis</span>
                          <button
                            onClick={() => removeBeneficiary(beneficiary.paciente_id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBeneficiaryModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmGroupPromotion}
                  disabled={beneficiaries.length === 0}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Promoción ({beneficiaries.length + 1} pacientes)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Button component that uses the treatment modal
function CreateTreatmentButton() {
  const { openTreatmentModal } = useTreatmentModal();
  
  return (
    <button
      onClick={() => openTreatmentModal('treatment')}
      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center space-x-2"
    >
      <i className="fas fa-plus"></i>
      <span>Crear Tratamiento</span>
    </button>
  );
}

// Wrapper component that includes the treatment modal functionality
function NuevoTratamientoCompletadoWithModal() {
  // List of dental specialties - matching doctors and treatments pages
  const specialties = [
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
  ];

  const handleTreatmentSubmit = async (e: React.FormEvent, mode: 'treatment' | 'promotion', isEdit: boolean, treatmentData: any, promotionData: any) => {
    e.preventDefault();
    
    try {
      if (mode === 'treatment') {
        const formattedTreatmentData = {
          codigo: treatmentData.codigo || '',
          nombre: treatmentData.nombre || '',
          especialidad: treatmentData.especialidad || '',
          precio: treatmentData.precio || 0,
          moneda: treatmentData.moneda || 'HNL' as Currency,
          notas: treatmentData.notas || '',
          veces_realizado: treatmentData.veces_realizado || 0,
          activo: treatmentData.activo !== false
        };

        if (isEdit && treatmentData.id) {
          // Edit existing treatment using API
          const response = await fetch(`/api/tratamientos/${treatmentData.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedTreatmentData),
          });

          if (!response.ok) {
            throw new Error('Failed to update treatment');
          }

          const updatedTreatment = await response.json();
          // TODO: Update local treatments state if needed
        } else {
          // Add new treatment using API
          const response = await fetch('/api/tratamientos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedTreatmentData),
          });

          if (!response.ok) {
            throw new Error('Failed to create treatment');
          }

          const newTreatment = await response.json();
          // TODO: Add to local treatments state if needed
        }
      } else {
        if (isEdit && promotionData.id) {
          await TreatmentService.updatePromotion(promotionData.id, promotionData);
        } else {
          await TreatmentService.createPromotion(promotionData);
        }
      }
      
      // Success - the context will handle modal closing and form reset
      // No page refresh needed - just like the working tratamientos page
      
    } catch (error) {
      console.error('Error saving treatment/promotion:', error);
      alert('Error al guardar el tratamiento/promoción');
    }
  };

  return (
    <TreatmentModalWrapper specialties={specialties} onSubmit={handleTreatmentSubmit}>
      <NuevoTratamientoCompletadoPage />
    </TreatmentModalWrapper>
  );
}

export default NuevoTratamientoCompletadoWithModal;