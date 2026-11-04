'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Info,
  Package,
  PenLine,
  Percent,
  Plus,
  Save,
  Search,
  Signature as SignatureIcon,
  Trash2,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import GlassModal from '@/components/tratamientos-completados/GlassModal';
import SelectedTreatmentsPanel from '@/components/tratamientos-completados/SelectedTreatmentsPanel';
import {
  BTN_PRIMARY,
  BTN_SECONDARY_DARK,
  GLASS_DIVIDER,
  GLASS_INSET,
  GLASS_INSET_DARK,
  GLASS_MUTED,
  GLASS_PANEL,
  GLASS_SUMMARY,
} from '@/components/tratamientos-completados/glassTheme';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';
import { PatientService } from '../../../../services/patientService';
import { SupabaseDoctorService } from '../../../../services/supabaseDoctorService';
import { Patient } from '../../../../types/patient';
import { AVAILABLE_DOCTORS, getDoctorById, Doctor } from '../../../../config/doctors';
import { getRecordCategoryInfoSync, generateTranscriptionMetadata } from '../../../../utils/recordCategoryUtils';
import { useHistoricalMode } from '../../../../contexts/HistoricalModeContext';
import AnimatedRubish from '@/components/AnimatedRubish';
import { getPatientType } from '../../../../utils/patientTypeUtils';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import HistoricalBadge from '../../../../components/HistoricalBadge';
import HistoricalBanner from '../../../../components/HistoricalBanner';
import { useTheme } from '@/contexts/ThemeContext';

interface Paquete {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio_total: number;
  moneda: Currency;
  max_pacientes: number;
  veces_vendido: number;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

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
  tratamiento_id: number | string;
  nombre_tratamiento: string;
  codigo_tratamiento: string;
  precio_original: number;
  precio_final: number;
  moneda: Currency;
  cantidad: number;
  notas: string;
  doctor_id?: string;
  doctor_name?: string;
  disableElderlyDiscount?: boolean;
  imagen_url?: string;
}

const SELECTOR_TABS: { id: 'tratamientos' | 'promociones' | 'paquetes' | 'insumos'; label: string }[] = [
  { id: 'tratamientos', label: 'Tratamientos' },
  { id: 'promociones', label: 'Promociones' },
  { id: 'paquetes', label: 'Paquetes' },
  { id: 'insumos', label: 'Insumos' },
];


function NuevoTratamientoCompletadoPageContent() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [availableTreatments, setAvailableTreatments] = useState<Treatment[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([]);
  const [discountType, setDiscountType] = useState<'monto' | 'porcentaje' | 'ninguno'>('ninguno');
  const [discountValue, setDiscountValue] = useState(0);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [activeTab, setActiveTab] = useState<'tratamientos' | 'promociones' | 'paquetes' | 'insumos'>('tratamientos');
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
      loadPaquetes();
      loadInsumos();
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

  const loadPaquetes = async () => {
    try {
      const response = await fetch('/api/paquetes');
      if (response.ok) {
        const paquetesData = await response.json();
        setPaquetes(paquetesData);
      } else {
        console.error('Paquetes API response not ok:', response.status);
        setPaquetes([]);
      }
    } catch (error) {
      console.error('Error loading paquetes:', error);
      setPaquetes([]);
    }
  };

  const loadInsumos = async () => {
    try {
      const [invRes, insumosRes] = await Promise.all([
        fetch('/api/inventario'),
        fetch('/api/insumos'),
      ]);
      let combined: any[] = [];
      if (invRes.ok) {
        const data = await invRes.json();
        combined = data.filter((i: any) => i.activo !== false);
      }
      if (insumosRes.ok) {
        const oldInsumos = await insumosRes.json();
        for (const ins of oldInsumos) {
          if (ins.activo === false) continue;
          const exists = combined.some((i: any) => i.insumo_id === ins.id || i.id === ins.id);
          if (!exists) {
            combined.push(ins);
          }
        }
      }
      setInsumos(combined);
    } catch (error) {
      console.error('Error loading insumos:', error);
      setInsumos([]);
    }
  };

  // Function to handle bypass changes using new context method
  const handleBypassChange = async (newBypassValue: boolean) => {
    try {
      const pacienteId = searchParams.get('paciente_id');
      if (pacienteId) {
        await savePatientSettings(pacienteId, newBypassValue);
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
          if (String(item.tratamiento_id).startsWith('inv_')) continue;
          try {
            await TreatmentService.incrementTreatmentCounter(Number(item.tratamiento_id), item.cantidad);
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
          if (String(item.tratamiento_id).startsWith('inv_')) continue;
          try {
            await TreatmentService.incrementTreatmentCounter(Number(item.tratamiento_id), item.cantidad);
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

  const filteredTreatments = availableTreatments
    .filter(treatment =>
      treatment.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.especialidad?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredPromotions = promotions
    .filter(promotion =>
      promotion.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredPaquetes = paquetes
    .filter(paquete =>
      paquete.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paquete.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredInsumos = insumos
    .filter(inv => {
      if (inv.activo === false) return false;
      const name = (inv.nombre || inv.insumo?.nombre || '').toLowerCase();
      const code = (inv.codigo || inv.insumo?.codigo || '').toLowerCase();
      const q = searchTerm.toLowerCase();
      return name.includes(q) || code.includes(q);
    });

  const addPaquete = (paquete: any) => {
    setSelectedTreatments(prev => {
      const existing = prev.find(item => item.tratamiento_id === paquete.id);
      if (existing) {
        return prev.filter(item => item.tratamiento_id !== paquete.id);
      }
      const newItem: SelectedTreatment = {
        tratamiento_id: paquete.id,
        nombre_tratamiento: paquete.nombre,
        codigo_tratamiento: paquete.codigo,
        precio_original: paquete.precio_total,
        precio_final: paquete.precio_total,
        moneda: paquete.moneda || 'HNL' as Currency,
        cantidad: 1,
        notas: paquete.descripcion || '',
        doctor_id: '',
        doctor_name: '',
      };
      return [...prev, newItem];
    });
  };

  const addInsumo = (invItem: any) => {
    const nombre = invItem.nombre || invItem.insumo?.nombre || '';
    const codigo = invItem.codigo || invItem.insumo?.codigo || '';
    const precio = invItem.precio ?? invItem.insumo?.precio ?? 0;
    const moneda = invItem.moneda || invItem.insumo?.moneda || 'HNL';
    const descripcion = invItem.descripcion || invItem.insumo?.descripcion || '';
    setSelectedTreatments(prev => {
      const existing = prev.find(item => item.tratamiento_id === `inv_${invItem.id}`);
      if (existing) {
        return prev.filter(item => item.tratamiento_id !== `inv_${invItem.id}`);
      }
      const newItem: SelectedTreatment = {
        tratamiento_id: `inv_${invItem.id}`,
        nombre_tratamiento: nombre,
        codigo_tratamiento: codigo,
        precio_original: precio,
        precio_final: precio,
        moneda: moneda as Currency,
        cantidad: 1,
        notas: descripcion,
        doctor_id: '',
        doctor_name: '',
        imagen_url: invItem.imagen_url || undefined,
      };
      return [...prev, newItem];
    });
  };

  if (loading) {
    return (
      <LoadingAnimation 
        message='Preparando Tratamiento'
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className={cn(GLASS_PANEL, 'px-8 py-10 text-center')}>
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-rose-500" aria-hidden="true" />
          <p className="text-slate-600 dark:text-slate-300">Paciente no encontrado</p>
        </div>
      </div>
    );
  }

  const { subtotal, discount, total, discountReason } = calculateTotals();

  return (
    <>
      {/* Save Button at Bottom */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={saveTreatment}
          disabled={saving || selectedTreatments.length === 0}
          className={cn(BTN_PRIMARY, 'px-6 py-3')}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>{saving ? 'Guardando...' : 'Guardar Tratamiento'}</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-lg backdrop-blur-md sm:p-6 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
              href={`/tratamientos-completados?paciente_id=${pacienteId}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-sm font-medium text-slate-600 backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </Link>

            <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-800" aria-hidden="true" />

            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Nuevo Tratamiento Completado
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {patient.nombre_completo}
                </span>

                {(getPatientType(patient).category === '3ra' || getPatientType(patient).category === '4ta') && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    getPatientType(patient).category === '4ta'
                      ? 'bg-purple-500/10 text-purple-700 ring-purple-500/20 dark:bg-purple-500/15 dark:text-purple-300'
                      : 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300'
                  }`}>
                    <Percent className="h-3.5 w-3.5" aria-hidden="true" />
                    {getPatientType(patient).category === '4ta' ? '35%' : '25%'} descuento
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <label htmlFor="treatment-date" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Fecha:
                  </label>
                  <input
                    id="treatment-date"
                    type="date"
                    value={treatmentDate}
                    onChange={(e) => setTreatmentDate(e.target.value)}
                    max={getTodayForDatabase()}
                    className={cn(GLASS_INSET, 'px-2.5 py-1 text-xs')}
                    style={{
                      colorScheme: resolvedTheme,
                    }}
                  />
                  <span className="text-slate-500 dark:text-slate-400" title="Útil para transcribir registros históricos">
                    <Info className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </div>
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

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Treatment Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Treatment Selector */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-md backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Agregar Tratamientos de la Base de Datos</h2>
                <div className="flex items-center space-x-3">
                  <CreateTreatmentButton />
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-4 flex gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1 dark:border-slate-800/80 dark:bg-slate-950/60">
                {SELECTOR_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                      activeTab === tab.id
                        ? 'bg-emerald-600/90 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Treatments Tab */}
              {activeTab === 'tratamientos' && (
                <div>
                  {/* Filters */}
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className={cn(GLASS_INSET, 'flex-1 cursor-pointer px-3 py-2 text-sm')}
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
                      className={cn(GLASS_INSET, 'flex-1 px-3 py-2 text-sm')}
                      placeholder="Buscar tratamiento..."
                    />
                  </div>

                  {/* Treatments List */}
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {filteredTreatments.length > 0 ? (
                      filteredTreatments.map((treatment) => (
                        <div
                          key={treatment.id}
                          onClick={() => addTreatment(treatment)}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {treatment.codigo} - {treatment.nombre}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {treatment.especialidad}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                            {treatment.moneda === 'HNL' ? 'L ' : '$'}{formatCurrency(treatment.precio, treatment.moneda || 'HNL' as Currency).replace(/[^\d.,]/g, '')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
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
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(GLASS_INSET, 'flex-1 px-3 py-2 text-sm')}
                      placeholder="Buscar promoción..."
                    />
                  </div>

                  {/* Promotions List */}
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {filteredPromotions.length > 0 ? (
                      filteredPromotions.map((promotion) => (
                        <div
                          key={promotion.id}
                          onClick={() => addPromotion(promotion)}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {promotion.codigo} - {promotion.nombre}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {promotion.descuento}% OFF - Vigencia: {formatDateForDisplay(promotion.fecha_inicio)} a {formatDateForDisplay(promotion.fecha_fin)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500 dark:text-slate-400 line-through">
                              {promotion.moneda === 'HNL' ? 'L ' : '$'}{formatCurrency(promotion.precio_original, promotion.moneda || 'HNL' as Currency).replace(/[^\d.,]/g, '')}
                            </div>
                            <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              {promotion.moneda === 'HNL' ? 'L ' : '$'}{formatCurrency(promotion.precio_promocional, promotion.moneda || 'HNL' as Currency).replace(/[^\d.,]/g, '')}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        No se encontraron promociones
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Paquetes Tab */}
              {activeTab === 'paquetes' && (
                <div>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(GLASS_INSET, 'flex-1 px-3 py-2 text-sm')}
                      placeholder="Buscar paquete..."
                    />
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {filteredPaquetes.length > 0 ? (
                      filteredPaquetes.map((paquete) => (
                        <div
                          key={paquete.id}
                          onClick={() => addPaquete(paquete)}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {paquete.codigo} - {paquete.nombre}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {paquete.descripcion}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                            {formatCurrency(paquete.precio_total, paquete.moneda || 'HNL' as Currency)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        No se encontraron paquetes
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Insumos Tab */}
              {activeTab === 'insumos' && (
                <div>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(GLASS_INSET, 'flex-1 px-3 py-2 text-sm')}
                      placeholder="Buscar insumo..."
                    />
                  </div>
                  <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
                    {filteredInsumos.length > 0 ? (
                      filteredInsumos.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => addInsumo(inv)}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                        >
                          <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800/60">
                            {inv.imagen_url ? (
                              <img
                                src={inv.imagen_url}
                                alt={inv.nombre || inv.insumo?.nombre}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Package className="h-5 w-5" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                              {inv.codigo || inv.insumo?.codigo} - {inv.nombre || inv.insumo?.nombre}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {inv.insumo?.descripcion}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                              {formatCurrency(inv.precio ?? inv.insumo?.precio ?? 0, (inv.moneda || inv.insumo?.moneda || 'HNL') as Currency)}
                            </div>
                            <div className={`text-xs ${inv.stock_actual < inv.stock_minimo ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                              Stock: {inv.stock_actual}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        No se encontraron items en inventario
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <SelectedTreatmentsPanel
              treatments={selectedTreatments}
              doctors={availableDoctors}
              elderlyDiscountPercent={
                isElderlyPatient
                  ? getPatientType(patient!).category === '4ta'
                    ? 35
                    : 25
                  : null
              }
              onDoctorChange={updateTreatmentDoctor}
              onQuantityChange={updateTreatmentQuantity}
              onElderlyDiscountToggle={updateTreatmentElderlyDiscount}
              onNotesChange={updateTreatmentNotes}
              onRemove={removeTreatment}
            />
          </div>

          {/* Right Column - Summary and Details */}
          <div className="space-y-6">
            {/* Pricing Summary */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-md backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Resumen de Precios</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Subtotal:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(subtotal, selectedTreatments[0]?.moneda || 'HNL' as Currency)}</span>
                </div>
                
                <div className={cn('border-t pt-3', GLASS_DIVIDER)}>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tipo de Descuento
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className={cn(GLASS_INSET, 'w-full cursor-pointer px-3 py-2')}
                  >
                    <option value="ninguno">Sin descuento</option>
                    <option value="monto">Monto fijo</option>
                    <option value="porcentaje">Porcentaje</option>
                  </select>
                </div>

                {discountType !== 'ninguno' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className={cn(GLASS_INSET, 'flex-1 px-3 py-2')}
                      />
                      {discountType === 'porcentaje' && <span className="text-slate-600 dark:text-slate-300">%</span>}
                    </div>
                  </div>
                )}

                {discount > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Descuento:</span>
                      <span className="font-medium">-{formatCurrency(discount, selectedTreatments[0]?.moneda || 'HNL' as Currency)}</span>
                    </div>
                    {discountReason && (
                      <div className="flex items-start gap-1 text-xs italic text-emerald-600 dark:text-emerald-400">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {discountReason}
                      </div>
                    )}
                  </div>
                )}

                <div className={cn('border-t pt-3', GLASS_DIVIDER)}>
                  <div
                    className={cn(
                      GLASS_SUMMARY,
                      'flex items-center justify-between gap-3 text-lg font-semibold',
                      'border-emerald-200/80 bg-emerald-50/80 text-emerald-700',
                      'dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400'
                    )}
                  >
                    <span>Total:</span>
                    <span>{formatCurrency(total, selectedTreatments[0]?.moneda || 'HNL' as Currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor Notes */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-md backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Notas del Doctor</h2>
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Añada notas sobre el tratamiento realizado..."
                className={cn(GLASS_INSET, 'w-full px-3 py-2')}
                rows={4}
              />
            </div>

            {/* Signatures */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-md backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Firmas</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {!recordCategoryInfo?.isHistorical || bypassHistoricalMode ? 'Firma del Paciente *' : 'Estado de Firma'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      {!recordCategoryInfo?.isHistorical || bypassHistoricalMode ? (
                        // Active record OR bypassed historical record - show signature
                        <>
                          {patientSignature ? (
                            <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700">
                              <img 
                                src={patientSignature} 
                                alt="Firma del paciente" 
                                className="w-full h-20 object-contain"
                              />
                            </div>
                          ) : (
                            <div className="rounded-lg border-2 border-dashed border-slate-300 p-4 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                              <SignatureIcon className="mb-2 h-7 w-7" aria-hidden="true" />
                              <p>Haga clic en "Firmar" para agregar la firma</p>
                            </div>
                          )}
                        </>
                      ) : (
                        // Historical record with no bypass - no signature required
                        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/20">
                          <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <p className="font-medium text-emerald-800 dark:text-emerald-200">No se requiere firma para registros históricos</p>
                        </div>
                      )} 
                    </div>
                    {(!recordCategoryInfo?.isHistorical || bypassHistoricalMode) && (
                      <button
                        onClick={() => setShowPatientSignatureModal(true)}
                        className={BTN_PRIMARY}
                      >
                        <PenLine className="h-4 w-4" aria-hidden="true" />
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
                  <div className="w-5 h-5 flex items-center justify-center">
                    <AnimatedRubish />
                  </div>
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
                    className={cn(GLASS_INSET, 'w-full pl-10 pr-4 py-2')}
                  />
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
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
                            <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
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
                            <div className="w-4 h-4 flex items-center justify-center">
                              <AnimatedRubish />
                            </div>
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Promoción ({beneficiaries.length + 1} pacientes)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Button component that uses the treatment modal
function CreateTreatmentButton() {
  const { openTreatmentModal } = useTreatmentModal();
  
  return (
    <button
      onClick={() => openTreatmentModal('treatment')}
      className={cn(BTN_PRIMARY, 'px-4 py-2')}
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
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
        // Handle promotions
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
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingAnimation /></div>}>
        <NuevoTratamientoCompletadoPageContent />
      </Suspense>
    </TreatmentModalWrapper>
  );
}

export default NuevoTratamientoCompletadoWithModal;