'use client';
// Force dynamic rendering for this page

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientService } from '@/services/patientService';
import { ExportService } from '@/services/exportService';
import { consentimientoService, Consentimiento } from '@/services/consentimientoService';
import { CompletedTreatmentService, CompletedTreatment } from '@/services/completedTreatmentService';
import { Presupuesto, parseConteoPorEstado } from '@/services/presupuestoService';
import { getClinicLogoPng, getWhatsappIconPng, SvgPngResult, drawConteoBadges } from '@/services/pdfAssets';
import { OdontogramPilotService } from '@/services/odontogramPilotService';
import { Odontogram } from '@/types/odontogram';
import { formatCurrency } from '@/utils/currencyUtils';
import jsPDF from 'jspdf';
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
import OdontogramPreview from '@/components/OdontogramPreview';
import ProgressBar from '@/components/ProgressBar';
import { OrthodonticVersion, sortVersionsByDate, formatVersionDisplay } from '@/utils/versionUtils';
import { orthodonticVersionService } from '@/services/orthodonticVersionService';
import {
  translateMordida,
  translateAparato,
  translateRadiografias,
  translateModelos,
  formatRetainer,
} from '@/utils/orthodonticLabels';
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
  const [consentimientos, setConsentimientos] = useState<Consentimiento[]>([]);
  const [consentimientosLoading, setConsentimientosLoading] = useState(false);
  const [tratamientosCompletados, setTratamientosCompletados] = useState<CompletedTreatment[]>([]);
  const [tratamientosCompletadosLoading, setTratamientosCompletadosLoading] = useState(false);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestosLoading, setPresupuestosLoading] = useState(false);
  const [presupuestosCurrencyMap, setPresupuestosCurrencyMap] = useState<Record<string, string>>({});
  const [sharingQuoteId, setSharingQuoteId] = useState<string | null>(null);
  const [odontogram, setOdontogram] = useState<Odontogram | null>(null);
  const [orthoVersions, setOrthoVersions] = useState<OrthodonticVersion[]>([]);
  const [orthoVersionsLoading, setOrthoVersionsLoading] = useState(false);
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

      // Load consentimientos for this patient
      loadConsentimientos(patientData.paciente_id);

      // Load completed treatments for this patient
      loadTratamientosCompletados(patientData.paciente_id);

      // Load presupuestos for this patient
      loadPresupuestos(patientData.paciente_id);

      // Load active odontogram for this patient
      try {
        const odontogramData = await OdontogramPilotService.getActiveOdontogram(patientData.paciente_id);
        setOdontogram(odontogramData);
      } catch (err) {
        console.error('Error loading odontogram:', err);
        setOdontogram(null);
      }

      // Load orthodontic versions for this patient
      loadOrthodonticVersions(patientData.paciente_id);
      
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

  const loadConsentimientos = async (pacienteId: string) => {
    setConsentimientosLoading(true);
    try {
      const data = await consentimientoService.getConsentimientosByPaciente(pacienteId);
      setConsentimientos(data);
    } catch (err) {
      console.error('Error loading consentimientos:', err);
      setConsentimientos([]);
    } finally {
      setConsentimientosLoading(false);
    }
  };

  const loadOrthodonticVersions = async (pacienteId: string) => {
    setOrthoVersionsLoading(true);
    try {
      const versions = await orthodonticVersionService.getVersionsByPatientId(pacienteId);
      setOrthoVersions(sortVersionsByDate(versions));
    } catch (err) {
      console.error('Error loading orthodontic versions:', err);
      setOrthoVersions([]);
    } finally {
      setOrthoVersionsLoading(false);
    }
  };

  // Keep the orthodontic data fresh: refetch whenever the page regains focus
  // (tab switch, back from the ortodoncia page, browser back/forward cache).
  useEffect(() => {
    const refreshOrthoOnVisible = () => {
      if (document.visibilityState === 'visible' && patient) {
        loadOrthodonticVersions(patient.paciente_id);
      }
    };
    document.addEventListener('visibilitychange', refreshOrthoOnVisible);
    window.addEventListener('pageshow', refreshOrthoOnVisible);
    window.addEventListener('focus', refreshOrthoOnVisible);
    return () => {
      document.removeEventListener('visibilitychange', refreshOrthoOnVisible);
      window.removeEventListener('pageshow', refreshOrthoOnVisible);
      window.removeEventListener('focus', refreshOrthoOnVisible);
    };
  }, [patient?.paciente_id]);

  const loadTratamientosCompletados = async (pacienteId: string) => {
    setTratamientosCompletadosLoading(true);
    try {
      const data = await CompletedTreatmentService.getCompletedTreatmentsByPatientId(pacienteId);
      setTratamientosCompletados(data);
    } catch (err) {
      console.error('Error loading tratamientos completados:', err);
      setTratamientosCompletados([]);
    } finally {
      setTratamientosCompletadosLoading(false);
    }
  };

  const loadPresupuestos = async (pacienteId: string) => {
    setPresupuestosLoading(true);
    try {
      const response = await fetch(`/api/presupuestos?patient_id=${pacienteId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch presupuestos');
      const data = await response.json();
      const quotes: Presupuesto[] = data.quotes || [];

      // Load catalogs to detect item currencies (HNL/USD)
      const [treatmentsRes, paquetesRes, insumosRes] = await Promise.all([
        fetch('/api/tratamientos/quotes', { cache: 'no-store' }),
        fetch('/api/paquetes', { cache: 'no-store' }),
        fetch('/api/insumos', { cache: 'no-store' })
      ]);
      const treatmentsData = treatmentsRes.ok ? await treatmentsRes.json() : { treatments: [] };
      const paquetes = paquetesRes.ok ? await paquetesRes.json() : [];
      const insumos = insumosRes.ok ? await insumosRes.json() : [];
      const treatments = treatmentsData.treatments || [];

      const currencyMap: Record<string, string> = {};
      quotes.forEach((quote) => {
        (quote.items || []).forEach((item: any) => {
          if (!item || item.id === undefined || item.isExample) return;
          const treatment = treatments.find((t: any) => item.description?.includes(`${t.codigo} - ${t.nombre}`));
          if (treatment) { currencyMap[item.id] = treatment.moneda === 'USD' ? 'USD' : 'HNL'; return; }
          const paquete = paquetes.find((p: any) => item.description?.includes(`${p.codigo} - ${p.nombre}`));
          if (paquete) { currencyMap[item.id] = paquete.moneda === 'USD' ? 'USD' : 'HNL'; return; }
          const insumo = insumos.find((i: any) => item.description?.includes(`${i.codigo} - ${i.nombre}`));
          currencyMap[item.id] = insumo ? (insumo.moneda === 'USD' ? 'USD' : 'HNL') : 'HNL';
        });
      });

      setPresupuestos(quotes);
      setPresupuestosCurrencyMap(currencyMap);
    } catch (err) {
      console.error('Error loading presupuestos:', err);
      setPresupuestos([]);
    } finally {
      setPresupuestosLoading(false);
    }
  };

  const getPresupuestoItemCurrency = (item: any) => {
    if (item && item.id !== undefined && presupuestosCurrencyMap[item.id] === 'USD') return 'USD';
    return 'HNL';
  };

  const formatPresupuestoNumber = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const analyzePresupuestoCurrencies = (quote: Presupuesto) => {
    const hnlTotal = (quote.items || [])
      .filter((item: any) => getPresupuestoItemCurrency(item) === 'HNL')
      .reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
    const usdTotal = (quote.items || [])
      .filter((item: any) => getPresupuestoItemCurrency(item) === 'USD')
      .reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
    return { hnlTotal, usdTotal, hasUSD: usdTotal > 0 };
  };

  const getPresupuestoStatusInfo = (status: string) => {
    switch (status) {
      case 'accepted':
        return { badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Aceptado' };
      case 'rejected':
        return { badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Rechazado' };
      case 'expired':
        return { badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', text: 'Expirado' };
      default:
        return { badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Pendiente' };
    }
  };

  const formatPresupuestoDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    let date: Date;
    if (dateString.includes('T') && dateString.includes('Z')) {
      date = new Date(dateString);
    } else if (dateString.includes('T')) {
      const dateWithoutOffset = dateString.split(/[+-]\d{2}:\d{2}$/)[0];
      date = new Date(dateWithoutOffset + 'Z');
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return 'Fecha no disponible';
    const day = date.getUTCDate();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${day} de ${month} ${year}`;
  };

  const generateQuotePdf = async (quote: Presupuesto): Promise<jsPDF> => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let y = 30;

    const ensureSpace = (needed: number) => {
      if (y + needed > 278) {
        pdf.addPage();
        y = 25;
      }
    };

    // Header
    let headerY = 30;
    try {
      const logoPng = await getClinicLogoPng();
      const logoSize = 24;
      pdf.addImage(logoPng.dataUrl, 'PNG', pageWidth / 2 - logoSize / 2, 8, logoSize, logoSize);
      headerY = 44;
    } catch (error) {
      console.error('Error cargando el logo para el PDF:', error);
    }
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CLINICA DENTAL DIAMOND', pageWidth / 2, headerY, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text('DETALLES DEL PRESUPUESTO', pageWidth / 2, headerY + 10, { align: 'center' });
    pdf.setDrawColor(10, 77, 74);
    pdf.setLineWidth(0.8);
    pdf.line(margin, headerY + 15, pageWidth - margin, headerY + 15);
    y = headerY + 25;

    const label = (text: string) => {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120);
      pdf.text(text, margin, y);
    };
    const value = (text: string) => {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(20);
      pdf.text(text, margin + 60, y);
    };
    const fieldRow = (l: string, v: string) => {
      ensureSpace(12);
      label(l);
      value(v);
      y += 12;
    };

    fieldRow('Paciente:', quote.patient_name || 'N/A');
    fieldRow('Doctor:', quote.doctor_name || 'N/A');
    fieldRow('Fecha:', formatPresupuestoDate(quote.quote_date || quote.created_at));
    fieldRow('Expira:', formatPresupuestoDate(quote.expires_at));

    // Description
    ensureSpace(20);
    y += 4;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120);
    pdf.text('Descripcion del Tratamiento:', margin, y);
    y += 6;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(20);
    const descLines = pdf.splitTextToSize(quote.treatment_description || 'Sin descripcion', pageWidth - margin * 2);
    ensureSpace(descLines.length * 5 + 8);
    pdf.text(descLines, margin, y);
    y += descLines.length * 5 + 8;

    // Items
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120);
    pdf.text('Items:', margin, y);
    y += 5;

    const items = (quote.items || []).filter((item: any) => !item.isExample);
    if (items.length === 0) {
      ensureSpace(10);
      pdf.setTextColor(150);
      pdf.text('Sin items registrados.', margin, y);
      y += 10;
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(90);
      pdf.text('Descripcion', margin + 4, y);
      pdf.text('P. Unit.', pageWidth - margin - 60, y, { align: 'right' });
      pdf.text('P. Total', pageWidth - margin - 20, y, { align: 'right' });
      y += 5;
      pdf.setDrawColor(220);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;

      items.forEach((item: any) => {
        const qty = item.quantity ? ` x${item.quantity}` : '';
        const currencyPrefix = getPresupuestoItemCurrency(item) === 'HNL' ? 'L ' : '$';
        const descLines = pdf.splitTextToSize(`${item.description}${qty}`, pageWidth - margin * 2 - 90);
        const unitPrice = `${currencyPrefix}${formatPresupuestoNumber(item.unit_price)}`;
        const totalPrice = `${currencyPrefix}${formatPresupuestoNumber(item.total_price)}`;
        ensureSpace(descLines.length * 5 + 4);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(30);
        pdf.text(descLines, margin + 4, y);
        pdf.setFont('helvetica', 'bold');
        pdf.text(unitPrice, pageWidth - margin - 60, y, { align: 'right' });
        pdf.text(totalPrice, pageWidth - margin - 20, y, { align: 'right' });
        y += descLines.length * 5 + 4;
      });

      const { hnlTotal, usdTotal, hasUSD } = analyzePresupuestoCurrencies(quote);
      ensureSpace(20);
      y += 4;
      pdf.setDrawColor(200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(20);
      pdf.text('Total:', margin, y);
      pdf.text(`L ${formatPresupuestoNumber(hnlTotal)}`, pageWidth - margin - 20, y, { align: 'right' });
      y += 6;
      if (hasUSD) {
        pdf.text(`$${formatPresupuestoNumber(usdTotal)}`, pageWidth - margin - 20, y, { align: 'right' });
        y += 6;
      }
    }

    // Notas (conteo por estado badges)
    const conteoEntries = parseConteoPorEstado(quote.notes);
    if (conteoEntries.length > 0) {
      ensureSpace(20);
      y += 4;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120);
      pdf.text('Notas:', margin, y);
      y += 7;
      y = drawConteoBadges(pdf, conteoEntries, margin, y, pageWidth - margin, ensureSpace);
    }

    // Footer
    let whatsappPng: SvgPngResult | null = null;
    try {
      whatsappPng = await getWhatsappIconPng();
    } catch (error) {
      console.error('Error cargando el icono de WhatsApp para el PDF:', error);
    }
    const footerLegend = (pdf: jsPDF, y: number) => {
      const fontSize = 9;
      const boldPart = 'Sistema de Gestion Diamond Link';
      const midPart = ' - Clinica Dental Diamond - app.dentaldiamondhn.com - ';
      const phonePart = ' +504 9498-5346';
      const iconSize = 4.25;
      const gap = 1;
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'bold');
      const boldW = pdf.getTextWidth(boldPart);
      pdf.setFont('helvetica', 'normal');
      const midW = pdf.getTextWidth(midPart);
      const phoneW = pdf.getTextWidth(phonePart);
      const iconW = whatsappPng ? iconSize + gap : 0;
      const totalW = boldW + midW + phoneW + iconW + gap;
      let x = (pageWidth - totalW) / 2;
      pdf.setFont('helvetica', 'bold');
      pdf.text(boldPart, x, y);
      x += boldW;
      pdf.setFont('helvetica', 'normal');
      pdf.text(midPart, x, y);
      x += midW + gap;
      if (whatsappPng) {
        const iconH = (whatsappPng.height / whatsappPng.width) * iconSize;
        pdf.addImage(whatsappPng.dataUrl, 'PNG', x, y - iconH + 1.5, iconSize, iconH);
        x += iconSize + gap;
      }
      pdf.text(phonePart, x, y);
    };
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(150);
      pdf.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, 284, { align: 'center' });
      pdf.setTextColor(140);
      footerLegend(pdf, 288);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        'SPS, Barrio Guamilito 6 calle entre 9 y 10 avenida, Plaza Insolh, Local A3',
        pageWidth / 2,
        292,
        { align: 'center' }
      );
    }

    return pdf;
  };

  const handleShareQuote = async (quote: Presupuesto) => {
    if (!quote) return;
    setSharingQuoteId(quote.id || null);
    try {
      const pdf = await generateQuotePdf(quote);
      const filename = `presupuesto_${(quote.patient_name || 'paciente').replace(/\s+/g, '_')}.pdf`;
      const pdfBlob = pdf.output('blob');

      const { hnlTotal, usdTotal, hasUSD } = analyzePresupuestoCurrencies(quote);
      const totals = hasUSD && hnlTotal > 0
        ? `L ${formatPresupuestoNumber(hnlTotal)} / $${formatPresupuestoNumber(usdTotal)}`
        : hasUSD ? `$${formatPresupuestoNumber(usdTotal)}` : `L ${formatPresupuestoNumber(hnlTotal)}`;

      const statusText = getPresupuestoStatusInfo(quote.status).text;
      const message = `Hola ${(quote.patient_name || '').split(' ')[0]}, le comparto su presupuesto de la Clinica Dental Diamond:\n\nFecha: ${formatPresupuestoDate(quote.quote_date || quote.created_at)}\n${quote.treatment_description ? `Tratamiento: ${quote.treatment_description}\n` : ''}Total: ${totals}\nEstado: ${statusText}\n\nQuedamos a su disposicion.`;

      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      const nav = navigator as any;

      // Mobile: share the PDF file directly to WhatsApp via the Web Share API
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: 'Presupuesto - Clinica Dental Diamond', text: message });
          return;
        } catch (shareError: any) {
          if (shareError?.name === 'AbortError') return;
          // Fall through to wa.me fallback if share failed for another reason
        }
      }

      // Fallback: download the PDF so the user can attach it manually, and open WhatsApp with the summary
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const phone = patient?.telefono;
      const countryCode = patient?.codigopais || patient?.pais_codigo;
      if (phone) {
        const waNumber = countryCode && countryCode !== '+504'
          ? `${countryCode.replace('+', '')}${phone}`
          : `504${phone}`;
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank');
      } else {
        alert('No se encontro el numero de telefono del paciente. El PDF se descargo para que pueda compartirlo manualmente.');
      }
    } catch (error) {
      console.error('Error sharing quote:', error);
      alert('No se pudo generar el PDF del presupuesto');
    } finally {
      setSharingQuoteId(null);
    }
  };

  const getTreatmentPaymentStatus = (treatment: CompletedTreatment) => {
    const totalPaid = treatment.monto_pagado || 0;
    const totalFinal = treatment.total_final || 0;
    if (totalFinal <= 0 || totalPaid >= totalFinal) return 'pagado';
    if (totalPaid > 0) return 'parcialmente_pagado';
    return 'pendiente';
  };

  const getTreatmentPaymentStatusInfo = (status: string) => {
    switch (status) {
      case 'pagado':
        return { badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Pagado' };
      case 'parcialmente_pagado':
        return { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', text: 'Parcialmente Pagado' };
      default:
        return { badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Pendiente' };
    }
  };

  const processTemplateContent = (content: string, fechaConsentimiento?: string) => {
    if (!content || !patient) return content;

    const field = (value: string) =>
      `<span class="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">${value || ''}</span>`;

    const formatConsentDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const consentDate = fechaConsentimiento
      ? formatConsentDate(fechaConsentimiento) || new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    return content
      .replace(/\{\{PATIENT_NAME\}\}/g, field(patient.nombre_completo || '_________________________'))
      .replace(/\{\{PATIENT_ID\}\}/g, field(patient.numero_identidad || '_____________________'))
      .replace(/\{\{PATIENT_ADDRESS\}\}/g, field(patient.direccion || '__________________________________________'))
      .replace(/\{\{DOCTOR_NAME\}\}/g, field(patient.doctor || '_________________________'))
      .replace(/\{\{CURRENT_DATE\}\}/g, field(`San Pedro Sula, ${consentDate}`))
      .replace(/\{\{REPRESENTANTE_LEGAL\}\}/g, field(patient.representante_legal || '_________________________________________'))
      .replace(/\{\{REP_NUMERO_IDENTIDAD\}\}/g, field(patient.rep_numero_identidad || '_________________________'))
      .replace(/\{\{CLINIC_NAME\}\}/g, 'Clínica Dental Diamond HN')
      .replace(/\n/g, '<br>');
  };

  const handlePrint = () => {
    if (patient) {
      ExportService.exportToPDF(patient, consentimientos, odontogram, tratamientosCompletados, presupuestos, presupuestosCurrencyMap, orthoVersions);
    }
  };

  const handleExport = (format: 'pdf' | 'html' | 'json') => {
    if (!patient) return;
    
    switch (format) {
      case 'pdf':
        ExportService.exportToPDF(patient, consentimientos, odontogram, tratamientosCompletados, presupuestos, presupuestosCurrencyMap, orthoVersions);
        break;
      case 'html':
        ExportService.exportToHTML(patient, consentimientos, odontogram, tratamientosCompletados, presupuestos, presupuestosCurrencyMap, orthoVersions);
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
      <div className="grid grid-cols-1 gap-6 lg:block lg:columns-2 lg:gap-x-6 lg:[&>*]:mb-6">
        {/* Datos Personales */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 break-inside-avoid">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <div className="w-5 h-5 mr-2 flex items-center justify-center">
              <AnimatedUser />
            </div>
            Datos Personales
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
            {/* Legal Representative Information - only relevant for minors */}
            {patient.edad && patient.edad < 18 && (
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

        {/* Antecedentes Médicos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 break-inside-avoid">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-heartbeat mr-2"></i>
            Antecedentes Médicos
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

        {/* Hábitos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 break-inside-avoid">
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
              <span className="font-medium text-gray-700 dark:text-gray-300">Bruxismo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.bruxismo}</p>
            </div>
            {patient.tipo_bruxismo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de bruxismo:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_bruxismo}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Visitas al dentista:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.visitas_dentista || 'No especificado'}</p>
            </div>
            {patient.obsgen && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones generales:</span>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{patient.obsgen}</p>
              </div>
            )}
          </div>
        </div>

        {/* Evaluación Odontológica */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 break-inside-avoid">
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
              <p className="text-gray-600 dark:text-gray-400">{patient.f_cepillado} veces al día</p>
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

        {/* Observaciones Generales */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 break-inside-avoid">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-comment-dots mr-2"></i>
            Observaciones Generales
          </h3>
          <div className="space-y-3">
            {patient.observaciones_generales && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones Generales:</span>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{patient.observaciones_generales}</p>
              </div>
            )}
            {!patient.observaciones_generales && (
              <p className="text-gray-500 dark:text-gray-400">Sin observaciones generales registradas.</p>
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

      {/* Consentimientos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          <i className="fas fa-file-signature mr-2"></i>
          Consentimientos
        </h3>

        {consentimientosLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : consentimientos.length > 0 ? (
          <div className="space-y-8">
            {consentimientos.map((consentimiento, index) => (
              <div key={consentimiento.id} className="border border-gray-200 dark:border-gray-700 rounded-xl">
                {/* Consent Header */}
                <div className="flex items-start justify-between gap-4 px-6 pt-6">
                  <div className="flex items-center space-x-3">
                    <img 
                      src="/Logo.svg" 
                      alt="Clínica Dental Diamond" 
                      className="w-10 h-10"
                    />
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        CLINICA DENTAL DIAMOND
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {consentimiento.nombre_consentimiento}
                      </p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                    consentimiento.estado === 'firmado'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : consentimiento.estado === 'cancelado'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {consentimiento.estado === 'firmado'
                      ? 'Firmado'
                      : consentimiento.estado === 'cancelado'
                      ? 'Cancelado'
                      : 'Activo'}
                  </span>
                </div>

                {/* Consent Document */}
                <div className="px-6 py-4">
                  <h5 className="text-base font-bold text-center mb-6 text-gray-900 dark:text-white">
                    {consentimiento.tipo_consentimiento === 'pediatrico' ? 'CONSENTIMIENTO INFORMADO PEDIATRICO' : 'CONSENTIMIENTO INFORMADO'}
                  </h5>

                  <div 
                    className="space-y-6 text-base leading-relaxed text-gray-800 dark:text-gray-200"
                    dangerouslySetInnerHTML={{ 
                      __html: processTemplateContent(consentimiento.contenido, consentimiento.fecha_consentimiento) || 
                        '<p>El contenido del consentimiento no está disponible.</p>' 
                    }}
                  />

                  <div className="mt-4 text-center text-gray-800 dark:text-white">
                    <p className="text-base font-semibold">
                      <strong>Fecha:</strong> {consentimiento.fecha_consentimiento}
                    </p>
                  </div>

                  {/* Signatures Section */}
                  <div className="mt-16 flex justify-between items-start">
                    <div className="flex-1 mr-4">
                      <div className="bg-transparent p-2 min-h-[80px] flex items-end justify-center">
                        {consentimiento.firma_paciente_url ? (
                          <img 
                            src={consentimiento.firma_paciente_url} 
                            alt="Firma del paciente" 
                            className="max-h-16 max-w-full"
                          />
                        ) : (
                          <div className="w-full border-b-2 border-gray-400"></div>
                        )}
                      </div>
                      <div className="w-full border-b-2 border-gray-400 mt-2"></div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-4 text-center">
                        Firma de paciente:
                      </label>
                    </div>

                    <div className="flex-1 ml-4">
                      <div className="bg-transparent p-2 min-h-[80px] flex items-end justify-center">
                        {consentimiento.firma_doctor_url ? (
                          <img 
                            src={consentimiento.firma_doctor_url} 
                            alt="Firma del doctor" 
                            className="max-h-16 max-w-full"
                          />
                        ) : (
                          <div className="w-full border-b-2 border-gray-400"></div>
                        )}
                      </div>
                      <div className="w-full border-b-2 border-gray-400 mt-2"></div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-4 text-center">
                        Firma de doctor/a:
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  <p>Este es un consentimiento informado firmado digitalmente.</p>
                  <p>
                    Generado el {new Date(consentimiento.creado_en || consentimiento.fecha_consentimiento).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <i className="fas fa-file-signature text-gray-300 text-4xl mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">
              No hay consentimientos registrados para este paciente
            </p>
          </div>
        )}
      </div>

      {/* Historia Clínica Ortodóncica (latest version) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            <i className="fas fa-braces mr-2"></i>
            Historia Clínica Ortodóncica
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push(`/historia-clinica-ortodoncia?id=${patient.paciente_id}&view=true`)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <i className="fas fa-eye mr-1"></i>
              Ver completa
            </button>
            <button
              onClick={() => router.push(`/historia-clinica-ortodoncia?id=${patient.paciente_id}`)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg hover:from-teal-700 hover:to-cyan-700"
            >
              <i className="fas fa-edit mr-1"></i>
              Editar
            </button>
          </div>
        </div>

        {orthoVersionsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : orthoVersions.length > 0 ? (() => {
          const version = orthoVersions[0];
          const notes = version.notes;
          const details: { label: string; value?: string | number | null }[] = [
            { label: 'Doctor Tratante', value: version.doctorId },
            { label: 'Motivo de Consulta Ortodóncica', value: version.motivoConsultaOrtodoncia },
            { label: 'Diagnóstico Ortodóncico', value: version.diagnosticoOrtodoncia },
            { label: 'Plan de Tratamiento Ortodóncico', value: version.planTratamientoOrtodoncia },
            { label: 'Tipo de Mordida', value: translateMordida(version.tipoMordida || '') },
            { label: 'Tipo de Aparato', value: translateAparato(version.tipoAparato || '') },
            { label: 'Duración Estimada', value: version.duracionTratamiento },
            { label: 'Fecha Inicio Tratamiento', value: version.fechaInicioTratamiento ? SimpleTimezoneFix.formatDisplayDate(version.fechaInicioTratamiento) : null },
            { label: 'Fecha Fin Tratamiento', value: version.fechaFinTratamiento ? SimpleTimezoneFix.formatDisplayDate(version.fechaFinTratamiento) : null },
            { label: 'Radiografías Realizadas', value: translateRadiografias(version.radiografiasRealizadas) },
            { label: 'Modelos de Estudio', value: translateModelos(version.modelosEstudio || '') },
            { label: 'Análisis Cefalométrico', value: version.analisisCefalometrico },
            { label: 'Extracciones Realizadas', value: version.extraccionesRealizadas },
            ...(version.retenedorTipo || version.retenedorUso
              ? [{ label: 'Retenedor Superior', value: formatRetainer(version.retenedorTipo || '', version.retenedorUso || '') }]
              : []),
            ...(version.retenedorInferiorTipo || version.retenedorInferiorUso
              ? [{ label: 'Retenedor Inferior', value: formatRetainer(version.retenedorInferiorTipo || '', version.retenedorInferiorUso || '') }]
              : []),
            { label: 'Observaciones Ortodóncicas', value: version.observacionesOrtodoncia },
            { label: 'Seguimiento Post-Tratamiento', value: version.seguimientoPostTratamiento },
          ];

          return (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-braces text-white"></i>
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {formatVersionDisplay(version)}
                      {version.isCurrent && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/20">{version.progressPercentage || 0}%</span>
                      )}
                    </p>
                    <p className="text-white/80 text-sm">
                      {version.createdBy ? `Creado por: ${version.createdBy}` : `Registro: ${version.recordDate ? SimpleTimezoneFix.formatDisplayDate(version.recordDate) : ''}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <ProgressBar
                  percentage={version.progressPercentage || 0}
                  showLabel={true}
                  showStatus={true}
                  size="sm"
                />

                {(details.filter(item => item.value).length > 0 || notes) && (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {details.slice(0, 1).filter(item => item.value).map((item) => (
                    <div key={item.label}>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{item.value}</p>
                    </div>
                  ))}
                  {notes && (
                    <div className="md:col-span-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                        <i className="fas fa-sticky-note text-amber-500"></i>
                        Notas de la Versión
                      </h4>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notes}</p>
                    </div>
                  )}
                  {details.slice(1).filter(item => item.value).map((item) => (
                    <div key={item.label} className={item.label === 'Motivo de Consulta Ortodóncica' || item.label === 'Diagnóstico Ortodóncico' || item.label === 'Plan de Tratamiento Ortodóncico' || item.label === 'Análisis Cefalométrico' || item.label === 'Observaciones Ortodóncicas' || item.label === 'Seguimiento Post-Tratamiento' ? 'md:col-span-2' : ''}>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

                {version.documentosOrtodoncia && version.documentosOrtodoncia.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Documentos Subidos</p>
                    <IsolatedDocumentDisplay documents={version.documentosOrtodoncia} patientId={patient.paciente_id} />
                  </div>
                )}

                {version.firmaDigitalOrtodoncia && (
                  <div className="mt-6 flex items-end gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Firma del Paciente</p>
                      <img
                        src={version.firmaDigitalOrtodoncia}
                        alt="Firma del doctor"
                        className="max-h-20 max-w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No hay historia clínica ortodóncica registrada para este paciente.
          </p>
        )}
      </div>

      {/* Odontograma */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          <i className="fas fa-tooth mr-2"></i>
          Odontograma
        </h3>
        <OdontogramPreview pacienteId={patient.paciente_id} />
      </div>

      {/* Tratamientos Completados */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          <i className="fas fa-check-circle mr-2"></i>
          Tratamientos Completados
        </h3>

        {tratamientosCompletadosLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : tratamientosCompletados.length > 0 ? (
          <div className="space-y-4">
            {tratamientosCompletados.map((treatment) => {
              const paymentStatus = getTreatmentPaymentStatus(treatment);
              const paymentInfo = getTreatmentPaymentStatusInfo(paymentStatus);
              return (
                <div key={treatment.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* Treatment Header */}
                  <div className="flex items-start justify-between gap-4 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <i className="fas fa-tooth text-white"></i>
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {SimpleTimezoneFix.formatDisplayDate(treatment.fecha_cita)}
                        </p>
                        <p className="text-white/80 text-sm">
                          {(treatment.tratamientos_realizados?.length || 0) + (treatment.tratamientos_inventario?.length || 0)} tratamiento(s)
                        </p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${paymentInfo.badge}`}>
                      {paymentInfo.text}
                    </span>
                  </div>

                  {/* Treatment Items */}
                  <div className="px-6 py-4">
                    {treatment.tratamientos_realizados?.map((tr) => (
                      <div key={tr.id} className="flex items-center justify-between py-1">
                        <div className="flex-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {tr.cantidad}x {tr.nombre_tratamiento}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tr.codigo_tratamiento}
                            {tr.doctor_name && (
                              <span className="text-teal-600 dark:text-teal-400">
                                {' '}· Tratado por: {tr.doctor_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                          {formatCurrency(tr.precio_final * tr.cantidad, tr.moneda)}
                        </span>
                      </div>
                    ))}
                    {treatment.tratamientos_inventario?.map((item) => (
                      <div key={`inv-${item.id}`} className="flex items-center justify-between py-1 pl-4 border-l-2 border-amber-300 dark:border-amber-700">
                        <div className="flex-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.cantidad}x {item.nombre}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.codigo} <span className="text-amber-600 dark:text-amber-400">(Inventario)</span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                          {formatCurrency(item.precio * item.cantidad, item.moneda)}
                        </span>
                      </div>
                    ))}
                    {(treatment.tratamientos_realizados?.length === 0) && (treatment.tratamientos_inventario?.length === 0) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sin tratamientos registrados.</p>
                    )}

                    {/* Pricing Summary */}
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3 space-y-1">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Total Original</span>
                        <span>{formatCurrency(treatment.total_original, treatment.moneda)}</span>
                      </div>
                      {treatment.total_descuento > 0 && (
                        <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                          <span>Descuento</span>
                          <span>- {formatCurrency(treatment.total_descuento, treatment.moneda)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold text-gray-900 dark:text-white">
                        <span>Total Final</span>
                        <span>{formatCurrency(treatment.total_final, treatment.moneda)}</span>
                      </div>
                      {treatment.monto_pagado > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Monto Pagado</span>
                          <span>{formatCurrency(treatment.monto_pagado, treatment.moneda)}</span>
                        </div>
                      )}
                      {treatment.saldo_pendiente > 0 && (
                        <div className="flex justify-between text-sm text-yellow-600 dark:text-yellow-400">
                          <span>Saldo Pendiente</span>
                          <span>{formatCurrency(treatment.saldo_pendiente, treatment.moneda)}</span>
                        </div>
                      )}
                    </div>

                    {/* View Link */}
                    <div className="mt-4 text-right">
                      <button
                        onClick={() => router.push(`/tratamientos-completados/${treatment.id}/view`)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                      >
                        <i className="fas fa-eye mr-1"></i>
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <i className="fas fa-check-circle text-gray-300 text-4xl mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">
              No hay tratamientos completados registrados para este paciente
            </p>
          </div>
        )}
      </div>

      {/* Presupuestos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          <i className="fas fa-file-invoice-dollar mr-2"></i>
          Presupuestos
        </h3>

        {presupuestosLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : presupuestos.length > 0 ? (
          <div className="space-y-4">
            {presupuestos.map((quote) => {
              const statusInfo = getPresupuestoStatusInfo(quote.status);
              const { hnlTotal, usdTotal, hasUSD } = analyzePresupuestoCurrencies(quote);
              const items = (quote.items || []).filter((item: any) => !item.isExample);
              const conteoEntries = parseConteoPorEstado(quote.notes);
              const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date();
              return (
                <div key={quote.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 px-6 py-4 bg-gradient-to-r from-violet-500 to-indigo-500">
                    <h4 className="text-base font-bold text-white">Detalles del Presupuesto</h4>
                    <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${statusInfo.badge}`}>
                      {statusInfo.text}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Paciente:</p>
                        <p className="font-medium text-gray-900 dark:text-white">{quote.patient_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Doctor:</p>
                        <p className="font-medium text-gray-900 dark:text-white">{quote.doctor_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Fecha:</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatPresupuestoDate(quote.quote_date || quote.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Expira:</p>
                        <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                          {formatPresupuestoDate(quote.expires_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Descripción del Tratamiento:</p>
                      <p className="text-gray-900 dark:text-white">{quote.treatment_description || 'Sin descripción'}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Ítems:</p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        {items.length > 0 ? items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600 last:border-0">
                            <div className="flex-1">
                              <span className="font-medium text-gray-900 dark:text-white">{item.description}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">x{item.quantity}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {getPresupuestoItemCurrency(item) === 'HNL' ? 'L ' : '$'}{formatPresupuestoNumber(item.unit_price)}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {getPresupuestoItemCurrency(item) === 'HNL' ? 'L ' : '$'}{formatPresupuestoNumber(item.total_price)}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Sin ítems registrados.</p>
                        )}
                        <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-gray-300 dark:border-gray-600">
                          <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">L {formatPresupuestoNumber(hnlTotal)}</div>
                            {hasUSD && <div className="text-lg font-bold text-gray-900 dark:text-white">${formatPresupuestoNumber(usdTotal)}</div>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {conteoEntries.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Notas:</p>
                        <div className="flex flex-wrap gap-2">
                          {conteoEntries.map((entry) => (
                            <div key={entry.key} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-100 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                              <span
                                className="w-3 h-3 rounded-full inline-block"
                                style={{ background: entry.color, border: entry.color === '#FFFFFF' ? '1px solid #ccc' : 'none' }}
                              />
                              <span className="text-xs font-semibold">{entry.label}</span>
                              <span className="text-xs font-semibold">{entry.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View Link */}
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleShareQuote(quote)}
                        disabled={sharingQuoteId !== null}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <i className={`fab fa-whatsapp ${sharingQuoteId === quote.id ? 'animate-pulse' : ''}`}></i>
                        {sharingQuoteId === quote.id ? 'Generando PDF...' : 'Compartir'}
                      </button>
                      <button
                        onClick={() => router.push(`/presupuestos?id=${patient.paciente_id}`)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                      >
                        <i className="fas fa-eye mr-1"></i>
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <i className="fas fa-file-invoice-dollar text-gray-300 text-4xl mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">
              No hay presupuestos registrados para este paciente
            </p>
          </div>
        )}
      </div>

      <footer className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Sistema de Gestion Diamond Link</span>
          {' - '}Clinica Dental Diamond - app.dentaldiamondhn.com - +504 9498-5346
        </p>
        <p>SPS, Barrio Guamilito 6 calle entre 9 y 10 avenida, Plaza Insolh, Local A3</p>
      </footer>

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
