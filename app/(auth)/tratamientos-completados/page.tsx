'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardCheck,
  Coins,
  HandCoins,
  Plus,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react';
import { formatCurrency, Currency } from '../../../utils/currencyUtils';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';
import { getRecordCategoryInfoSync } from '../../../utils/recordCategoryUtils';
import { CompletedTreatmentService } from '../../../services/completedTreatmentService';
import { PaymentService } from '../../../services/paymentService';
import { PatientCreditService } from '../../../services/patientCreditService';
import { currencyConversionService } from '../../../services/currencyConversionService';
import type { CompletedTreatment } from '../../../services/completedTreatmentService';
import type { Payment, PaymentSummary } from '../../../services/paymentService';
import type { PatientCredit } from '../../../services/patientCreditService';
import LoadingAnimation from '../../../components/LoadingAnimation';
import { useHistoricalMode } from '../../../contexts/HistoricalModeContext';
import HistoricalBadge from '../../../components/HistoricalBadge';
import HistoricalBanner from '../../../components/HistoricalBanner';
import { usePagePreferences } from '@/hooks/useUserPreferences';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedRubish from '../../../components/AnimatedRubish';
import { supabase } from '@/lib/supabase';
import TreatmentCard from '../../../components/tratamientos-completados/TreatmentCard';
import TreatmentFiltersBar from '../../../components/tratamientos-completados/TreatmentFiltersBar';
import TreatmentTable from '../../../components/tratamientos-completados/TreatmentTable';
import TreatmentPagination from '../../../components/tratamientos-completados/TreatmentPagination';
import { paymentStatusFor, comparePaymentStatus } from '../../../src/lib/treatments/completedTreatmentSort';
import {
  buildDoctorOptions,
  collectTreatmentDoctors,
  isValidDateRange,
  matchesDateRange,
  matchesDoctorFilter,
} from '../../../src/lib/treatments/completedTreatmentFilters';
import { buildNewTreatmentUrl } from '../../../src/lib/treatments/completedTreatmentNavigation';

function TratamientosCompletadosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bypassHistoricalMode, loadPatientSettings, savePatientSettings } = useHistoricalMode();
  const [completedTreatments, setCompletedTreatments] = useState<any[]>([]);
  // Advance payments with remaining credit balance
  const [advancePayments, setAdvancePayments] = useState<{
    payment: Payment;
    remaining: number;
  }[]>([]);
  // Total positive balance (all available credits)
  const [totalPositiveBalance, setTotalPositiveBalance] = useState<Record<Currency, number>>({ HNL: 0, USD: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [patientBypassStatus, setPatientBypassStatus] = useState<Record<string, boolean>>({});
  const [currentPatient, setCurrentPatient] = useState<string | null>(null);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  
  // Use page preferences for tratamientos-completados page
  const { preferences: pagePrefs, updatePreferences: updatePagePrefs, loading: prefsLoading } = usePagePreferences('tratamientos-completados');
  const { resolvedTheme } = useTheme();
  
  // Initialize state from preferences or defaults
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(pagePrefs?.viewMode || 'grid');
  const [recordsPerPagePref, setRecordsPerPagePref] = useState(pagePrefs?.recordsPerPage || 25);
  const [sortBy, setSortBy] = useState<'paciente' | 'fecha' | 'doctor' | 'total' | 'estado' | 'tratamientos'>(pagePrefs?.sortBy || 'fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(pagePrefs?.sortOrder || 'desc');
  const [doctorFilter, setDoctorFilter] = useState<string>(pagePrefs?.doctorFilter || '');
  const [doctorFilterLabel, setDoctorFilterLabel] = useState<string>(pagePrefs?.doctorFilterLabel || '');
  const [dateFrom, setDateFrom] = useState<string>(pagePrefs?.dateFrom || '');
  const [dateTo, setDateTo] = useState<string>(pagePrefs?.dateTo || '');
  
  // Payment management state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [newPayment, setNewPayment] = useState({ monto_pago: '', moneda: 'HNL' as Currency, metodo_pago: 'efectivo', notas_pago: '' });
  const [conversionInfo, setConversionInfo] = useState<{convertedAmount: number, exchangeRate: number} | null>(null);
  const [applyCredit, setApplyCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [applyingCredit, setApplyingCredit] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [advancePatientName, setAdvancePatientName] = useState('');
  const [advancePayment, setAdvancePayment] = useState({ monto_pago: '', moneda: 'HNL' as Currency, metodo_pago: 'efectivo', notas_pago: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{id: string, amount: number, currency: string, method: string} | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Delete treatment modal state
  const [treatmentToDelete, setTreatmentToDelete] = useState<{id: string, patientName: string, treatmentCount: number} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const pacienteId = searchParams.get('paciente_id');

  // Function to check if a specific patient has bypass activated (same as pacientes page)
  const checkPatientBypassStatus = async (pacienteId: string) => {
    try {
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
      }
      
      // Handle patient-specific settings (use latest setting like other pages)
      if (allPatientSettings && allPatientSettings.length > 0 && !allSettingsError) {
        // Sort by updated_at to get latest setting (same strategy as other pages)
        const sortedSettings = allPatientSettings.sort((a, b) => 
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );
        
        // Use the latest setting
        const latestSetting = sortedSettings[sortedSettings.length - 1];
        const resolvedValue = latestSetting ? latestSetting.bypass_historical_mode : false;
        
        setPatientBypassStatus(prev => ({ ...prev, [pacienteId]: resolvedValue }));
        return resolvedValue;
      } else {
        // No patient-specific setting found, use global setting (historical mode by default)
        setPatientBypassStatus(prev => ({ ...prev, [pacienteId]: globalBypass }));
        return globalBypass;
      }
    } catch (error) {
      console.error('Error checking patient bypass status:', error);
      setPatientBypassStatus(prev => ({ ...prev, [pacienteId]: false }));
      return false;
    }
  };

  const loadAdvancePayments = async () => {
    try {
      if (pacienteId) {
        const advances = await PaymentService.getAdvancePaymentsByPatientId(pacienteId);
        // Fetch remaining credit balance for each advance payment
        const advancesWithRemaining = await Promise.all(
          advances.map(async (payment) => {
            const credit = await PatientCreditService.getCreditByPaymentId(payment.id);
            return {
              payment,
              remaining: credit?.estado === 'disponible' ? Number(credit.monto) || 0 : 0
            };
          })
        );
        // Filter out advance payments with 0 remaining balance
        setAdvancePayments(advancesWithRemaining.filter(a => a.remaining > 0));
        
        // Load total positive balance (all available credits)
        await loadTotalPositiveBalance();
      } else {
        setAdvancePayments([]);
        setTotalPositiveBalance({ HNL: 0, USD: 0 });
      }
    } catch (error) {
      console.error('Error loading advance payments:', error);
      setAdvancePayments([]);
    }
  };

  const loadTotalPositiveBalance = async () => {
    if (!pacienteId) {
      setTotalPositiveBalance({ HNL: 0, USD: 0 });
      return;
    }
    try {
      const credits = await PatientCreditService.getAvailableCredits(pacienteId);
      const hnl = credits
        .filter(c => c.moneda === 'HNL' && c.estado === 'disponible')
        .reduce((sum, c) => sum + Number(c.monto), 0);
      const usd = credits
        .filter(c => c.moneda === 'USD' && c.estado === 'disponible')
        .reduce((sum, c) => sum + Number(c.monto), 0);
      setTotalPositiveBalance({ HNL: hnl, USD: usd });
    } catch (error) {
      console.error('Error loading total positive balance:', error);
      setTotalPositiveBalance({ HNL: 0, USD: 0 });
    }
  };

  const deleteAdvancePayment = async (payment: Payment) => {
    const confirmed = window.confirm(
      `¿Eliminar el pago adelantado de ${formatCurrency(payment.monto_pago, payment.moneda)}? El Saldo Positivo asociado dejará de estar disponible.`
    );
    if (!confirmed) return;
    try {
      await PaymentService.deletePayment(payment.id);
      await loadAdvancePayments();
    } catch (error) {
      console.error('Error deleting advance payment:', error);
      alert(
        'Error al eliminar el pago adelantado: ' +
          (error instanceof Error ? error.message : 'Error desconocido')
      );
    }
  };

  useEffect(() => {
    loadCompletedTreatments();
    loadAdvancePayments();
  }, [pacienteId]);

  // Load patient-specific historical mode settings when pacienteId is available
  useEffect(() => {
    const loadPatientHistoricalMode = async () => {
      if (pacienteId) {
        try {
          setCurrentPatient(pacienteId);
          
          // Load patient-specific historical mode settings
          await loadPatientSettings(pacienteId);
          
          // Get patient data to determine record category
          const { PatientService } = await import('../../../services/patientService');
          const patientData = await PatientService.getPatientById(pacienteId);
          
          if (patientData) {
            // Check record category (historical, active, archived)
            const categoryInfo = getRecordCategoryInfoSync(patientData.fecha_inicio || patientData.fecha_inicio_consulta);
            setRecordCategoryInfo(categoryInfo);
          }
        } catch (error) {
          console.error('Error loading patient historical mode settings:', error);
        }
      }
    };

    loadPatientHistoricalMode();
  }, [pacienteId, loadPatientSettings]);

  // Sync preferences when they load (only on initial load)
  useEffect(() => {
    if (pagePrefs && !prefsLoading) {
      // Only set initial values from preferences, don't override user changes
      if (pagePrefs.viewMode) {
        setViewMode(pagePrefs.viewMode);
      }
      if (pagePrefs.recordsPerPage) {
        setRecordsPerPagePref(pagePrefs.recordsPerPage);
      }
      if (pagePrefs.sortBy) {
        setSortBy(pagePrefs.sortBy);
      }
      if (pagePrefs.sortOrder) {
        setSortOrder(pagePrefs.sortOrder);
      }
      if (pagePrefs.doctorFilter !== undefined) {
        setDoctorFilter(pagePrefs.doctorFilter || '');
        setDoctorFilterLabel(pagePrefs.doctorFilterLabel || '');
      }
      if (pagePrefs.dateFrom !== undefined) {
        setDateFrom(pagePrefs.dateFrom || '');
      }
      if (pagePrefs.dateTo !== undefined) {
        setDateTo(pagePrefs.dateTo || '');
      }
    }
  }, [pagePrefs, prefsLoading]);

  // Save view mode preference when it changes (debounced)
  useEffect(() => {
    if (!prefsLoading && pagePrefs?.viewMode !== viewMode) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ viewMode });
      }, 500); // 500ms delay to prevent rapid saves
      return () => clearTimeout(timeoutId);
    }
  }, [viewMode, prefsLoading, pagePrefs?.viewMode, updatePagePrefs]);

  // Save records per page preference when it changes (debounced)
  useEffect(() => {
    if (!prefsLoading && recordsPerPagePref) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ recordsPerPage: recordsPerPagePref });
      }, 500); // 500ms delay to prevent rapid saves
      return () => clearTimeout(timeoutId);
    }
  }, [recordsPerPagePref, prefsLoading, updatePagePrefs]);

  // Save sort by preference when it changes (debounced)
  useEffect(() => {
    if (!prefsLoading && sortBy) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ sortBy });
      }, 500); // 500ms delay to prevent rapid saves
      return () => clearTimeout(timeoutId);
    }
  }, [sortBy, prefsLoading, updatePagePrefs]);

  // Save sort order preference when it changes (debounced)
  useEffect(() => {
    if (!prefsLoading && sortOrder) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ sortOrder });
      }, 500); // 500ms delay to prevent rapid saves
      return () => clearTimeout(timeoutId);
    }
  }, [sortOrder, prefsLoading, updatePagePrefs]);

  // Save filter preferences when they change (debounced)
  useEffect(() => {
    if (!prefsLoading && (
      (pagePrefs?.doctorFilter || '') !== doctorFilter ||
      (pagePrefs?.doctorFilterLabel || '') !== doctorFilterLabel ||
      (pagePrefs?.dateFrom || '') !== dateFrom ||
      (pagePrefs?.dateTo || '') !== dateTo
    )) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ doctorFilter, doctorFilterLabel, dateFrom, dateTo });
      }, 500); // 500ms delay to prevent rapid saves
      return () => clearTimeout(timeoutId);
    }
  }, [doctorFilter, doctorFilterLabel, dateFrom, dateTo, prefsLoading, pagePrefs?.doctorFilter, pagePrefs?.doctorFilterLabel, pagePrefs?.dateFrom, pagePrefs?.dateTo, updatePagePrefs]);

  // The create-treatment action belongs to a patient context: without one there
  // is nothing to create the treatment for, so the whole action bar stays hidden.
  const newTreatmentUrl = buildNewTreatmentUrl(pacienteId);

  const handleCreateTreatment = () => {
    if (!newTreatmentUrl) return;
    router.push(newTreatmentUrl);
  };

  const loadPatientSettingsForTreatments = async (treatments: any[]) => {
    // Get unique patient IDs from treatments
    const uniquePatientIds = [...new Set(treatments.map(t => t.paciente_id).filter(Boolean))];
    
    // Load settings for each unique patient using the same logic as pacientes page
    for (const patientId of uniquePatientIds) {
      if (!(patientId in patientBypassStatus)) {
        await checkPatientBypassStatus(patientId);
      }
    }
  };

  const loadCompletedTreatments = async () => {
    try {
      let completedTreatmentsData;
      
      if (pacienteId) {
        // Load treatments for specific patient
        completedTreatmentsData = await CompletedTreatmentService.getCompletedTreatmentsByPatientId(pacienteId);
      } else {
        // Load all treatments
        completedTreatmentsData = await CompletedTreatmentService.getAllCompletedTreatments();
      }
      
      setCompletedTreatments(completedTreatmentsData || []);
      
      // Skip patient settings loading for performance - can be loaded on-demand later
      // if (completedTreatmentsData && completedTreatmentsData.length > 0) {
      //   await loadPatientSettingsForTreatments(completedTreatmentsData);
      // }
    } catch (error) {
      console.error('Error loading completed treatments:', error);
      setCompletedTreatments([]);
    } finally {
      setLoading(false);
    }
  };

  // Enrich each treatment with its clinic-local date and the doctors attached to it.
  // Derived once per data load so the filters never recompute it on every render.
  const enrichedTreatments = useMemo(() => (
    completedTreatments.map(treatment => ({
      treatment,
      localDate: SimpleTimezoneFix.toLocalDate(treatment.fecha_cita),
      doctors: collectTreatmentDoctors(treatment),
    }))
  ), [completedTreatments]);

  const dateRangeIsValid = isValidDateRange(dateFrom, dateTo);
  const hasActiveFilters = Boolean(doctorFilter || dateFrom || dateTo);

  // Doctor options come from the treatments that survive the date range, so the
  // count next to each doctor reflects the selected dates.
  const doctorOptions = useMemo(() => {
    const scoped = enrichedTreatments
      .filter(entry => matchesDateRange(entry.localDate, dateFrom, dateTo))
      .map(entry => entry.doctors);
    const options = buildDoctorOptions(scoped);
    if (doctorFilter && !options.some(option => option.value === doctorFilter)) {
      options.push({ value: doctorFilter, label: doctorFilterLabel || doctorFilter, count: 0 });
      options.sort((a, b) => a.label.localeCompare(b.label, 'es'));
    }
    return options;
  }, [enrichedTreatments, dateFrom, dateTo, doctorFilter, doctorFilterLabel]);

  const handleDoctorFilterChange = (value: string) => {
    setDoctorFilter(value);
    const match = doctorOptions.find(option => option.value === value);
    setDoctorFilterLabel(match ? match.label : '');
  };

  const clearFilters = () => {
    setDoctorFilter('');
    setDoctorFilterLabel('');
    setDateFrom('');
    setDateTo('');
  };

  const filteredTreatments = enrichedTreatments.filter(({ treatment, localDate, doctors }) => {
    // Check if this is a historical treatment and filter it out
    if (!bypassHistoricalMode) {
      // Check if this is a historical treatment and filter it out
      const treatmentDate = treatment.fecha_cita;
      if (treatmentDate) {
        // Use the same launch date as the database config (2026-02-02)
        // This ensures consistency with the record category utils
        const launchDate = new Date(Date.UTC(2026, 1, 2)); // UTC 2026-02-02
        const treatmentDateTime = new Date(treatmentDate);
        const isHistorical = treatmentDateTime < launchDate;
        
        // TEMPORARILY DISABLE HISTORICAL FILTERING
        // if (isHistorical) {
        //   return false; // Filter out historical treatments
        // }
      }
    }

    if (!matchesDateRange(localDate, dateFrom, dateTo)) {
      return false;
    }

    if (!matchesDoctorFilter(doctors, doctorFilter)) {
      return false;
    }
    
    // Then filter by search term - handle null paciente data
    if (!searchTerm) {
      return true; // Show all if no search term
    }
    
    return treatment.paciente?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           treatment.paciente?.numero_identidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           treatment.paciente?.telefono?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           treatment.paciente_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           treatment.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           treatment.tratamientos_realizados?.some(tr => 
             tr.nombre_tratamiento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             tr.codigo_tratamiento?.toLowerCase().includes(searchTerm.toLowerCase())
           );
  }).map(({ treatment }) => treatment).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'paciente':
        comparison = (a.paciente?.nombre_completo || '').localeCompare(b.paciente?.nombre_completo || '');
        break;
      case 'fecha':
        comparison = new Date(a.fecha_cita || 0).getTime() - new Date(b.fecha_cita || 0).getTime();
        break;
      case 'doctor':
        comparison = (a.paciente_doctor || a.paciente?.doctor || '').localeCompare(b.paciente_doctor || b.paciente?.doctor || '');
        break;
      case 'tratamientos':
        comparison = ((a.tratamientos_realizados?.length || 0) + (a.tratamientos_inventario?.length || 0)) - ((b.tratamientos_realizados?.length || 0) + (b.tratamientos_inventario?.length || 0));
        break;
      case 'total':
        comparison = (a.total_final || 0) - (b.total_final || 0);
        break;
      case 'estado':
        // Sort by the same payment status the Estado column renders
        // (PaymentService.calculatePaymentStatus: pendiente / parcialmente_pagado
        // / pagado). The previous fields (pagado / pagado_totalmente) did not
        // reflect the column, so the order looked wrong.
        {
          const statusA = paymentStatusFor(a.total_final, a.monto_pagado);
          const statusB = paymentStatusFor(b.total_final, b.monto_pagado);
          comparison = comparePaymentStatus(statusA, statusB, sortOrder);

          // If status is the same, use a secondary sort by fecha to maintain consistent ordering
          if (comparison === 0) {
            const dateA = new Date(a.fecha_cita || 0).getTime();
            const dateB = new Date(b.fecha_cita || 0).getTime();
            comparison = sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          }
        }

        return comparison; // Return early for estado since we handled order here
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Payment management functions
  const loadPaymentInfo = async (treatmentId: string) => {
    setLoadingPayments(true);
    setShowPaymentModal(true);
    try {
      const summary = await PaymentService.getPaymentSummary(treatmentId);
      setPaymentSummary(summary);
    } catch (error) {
      console.error('Error loading payment summary:', error);
      alert('Error al cargar información de pagos');
    } finally {
      setLoadingPayments(false);
    }
  };

  const openPaymentModal = async (treatment: CompletedTreatment) => {
    setSelectedTreatment(treatment);
    await loadPaymentInfo(treatment.id);
  };

  const openAdvancePaymentModal = async () => {
    if (!pacienteId) return;
    setAdvancePayment({ monto_pago: '', moneda: 'HNL' as Currency, metodo_pago: 'efectivo', notas_pago: '' });
    setAdvancePatientName('');
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('nombre_completo')
        .eq('paciente_id', pacienteId)
        .maybeSingle();
      setAdvancePatientName(patient?.nombre_completo || '');
    } catch {
      // Patient name is cosmetic; the modal still works without it.
    }
    setShowAdvanceModal(true);
  };

  const closeAdvanceModal = () => {
    setShowAdvanceModal(false);
    setAdvancePayment({ monto_pago: '', moneda: 'HNL' as Currency, metodo_pago: 'efectivo', notas_pago: '' });
  };

  const submitAdvancePayment = async () => {
    if (!pacienteId || !advancePayment.monto_pago) {
      alert('Por favor ingrese el monto del pago');
      return;
    }

    const monto = parseFloat(advancePayment.monto_pago);
    if (!(monto > 0)) {
      alert('El monto debe ser mayor que cero');
      return;
    }

    try {
      setSavingAdvance(true);
      const result = await PaymentService.addAdvancePayment({
        paciente_id: pacienteId,
        monto_pago: monto,
        moneda: advancePayment.moneda || 'HNL',
        metodo_pago: advancePayment.metodo_pago,
        notas_pago: advancePayment.notas_pago || undefined
      });
      alert(
        `Pago adelantado registrado por ${formatCurrency(result.payment.monto_pago, result.payment.moneda)}. ` +
        `Quedó un Saldo Positivo de ${formatCurrency(result.credit.monto, result.credit.moneda)} disponible para el paciente.`
      );
      setShowAdvanceModal(false);
      await loadCompletedTreatments();
      await loadAdvancePayments();
    } catch (error) {
      console.error('Error adding advance payment:', error);
      const message = error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message)
        : 'Error desconocido';
      if (message.includes('paciente_id') || message.includes('42703')) {
        alert('Error al registrar el pago adelantado: Falta la columna payments.paciente_id. Ejecute la migración database/migrations/add_advance_payments.sql en el editor SQL de Supabase.');
      } else {
        alert('Error al registrar el pago adelantado: ' + message);
      }
      setSavingAdvance(false);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedTreatment(null);
    setPaymentSummary(null);
    setNewPayment({
      monto_pago: '',
      moneda: 'HNL' as Currency,
      metodo_pago: 'efectivo',
      notas_pago: ''
    });
    setApplyCredit(false);
    setCreditAmount('');
  };

  const addPayment = async () => {
    if (!selectedTreatment || !newPayment.monto_pago) {
      alert('Por favor ingrese el monto del pago');
      return;
    }

    try {
      const paymentData = {
        tratamiento_completado_id: selectedTreatment.id,
        monto_pago: parseFloat(newPayment.monto_pago),
        moneda: newPayment.moneda || 'HNL', // Ensure currency is never undefined
        metodo_pago: newPayment.metodo_pago,
        notas_pago: newPayment.notas_pago || undefined,
        fecha_pago: new Date().toISOString()
      };
      
      const result = await PaymentService.addPayment(paymentData, selectedTreatment.moneda || 'HNL');

      const summary = await PaymentService.getPaymentSummary(selectedTreatment.id);
      setPaymentSummary(summary);
      
      // Refresh the treatments list to update payment status badges
      await loadCompletedTreatments();
      await loadAdvancePayments();
      
      setNewPayment({ monto_pago: '', moneda: 'HNL' as Currency, metodo_pago: 'efectivo', notas_pago: '' });
      if (result.advance && result.advance.monto > 0) {
        alert(`Pago registrado como efectivo por ${formatCurrency(result.payment?.monto_pago || result.advance.monto, result.payment?.moneda || result.advance.moneda)}. El excedente de ${formatCurrency(result.advance.monto, result.advance.moneda)} fue guardado como Saldo Positivo del paciente.`);
      } else {
        alert('Pago agregado exitosamente');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error al agregar pago');
    }
  };

  const applyCreditPayment = async () => {
    if (!selectedTreatment || !creditAmount) {
      alert('Por favor ingrese el monto del crédito a aplicar');
      return;
    }

    const amount = parseFloat(creditAmount);
    if (amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    const creditoDisponible = paymentSummary?.credito_disponible;
    const treatmentCurrency = selectedTreatment.moneda || 'HNL';
    const availableInCurrency = treatmentCurrency === 'USD' 
      ? creditoDisponible?.disponible_usd || 0 
      : creditoDisponible?.disponible_hnl || 0;

    if (amount > availableInCurrency) {
      alert(`Crédito insuficiente. Disponible: ${formatCurrency(availableInCurrency, treatmentCurrency)}`);
      return;
    }

    try {
      setApplyingCredit(true);
      await PatientCreditService.applyCredit(
        selectedTreatment.paciente_id,
        selectedTreatment.id,
        amount,
        treatmentCurrency,
        `Crédito aplicado al tratamiento ${selectedTreatment.tratamiento_numero || selectedTreatment.id}`
      );

      const summary = await PaymentService.getPaymentSummary(selectedTreatment.id);
      setPaymentSummary(summary);
      await loadCompletedTreatments();
      await loadAdvancePayments();

      setCreditAmount('');
      setApplyCredit(false);
      alert(`Crédito de ${formatCurrency(amount, treatmentCurrency)} aplicado exitosamente`);
    } catch (error) {
      console.error('Error applying credit:', error);
      alert('Error al aplicar crédito: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setApplyingCredit(false);
    }
  };

    const deletePayment = async (paymentId: string) => {
    if (!selectedTreatment) {
      return;
    }
    
    // Find payment details for modal
    const payment = paymentSummary?.pagos.find(p => p.id === paymentId);
    if (payment) {
      const paymentDetails = {
        id: payment.id,
        amount: payment.monto_pago,
        currency: payment.moneda,
        method: payment.metodo_pago
      };
      setPaymentToDelete(paymentDetails);
      setShowDeleteModal(true);
    }
  };

  // Delete completed treatment function
  const openDeleteTreatmentModal = (treatment: any) => {
    setTreatmentToDelete({
      id: treatment.id,
      patientName: treatment.paciente?.nombre_completo || 'Paciente Desconocido',
      treatmentCount: (treatment.tratamientos_realizados?.length || 0) + (treatment.tratamientos_inventario?.length || 0)
    });
    setDeleteError(null);
  };

  const closeDeleteTreatmentModal = () => {
    setTreatmentToDelete(null);
    setDeleteError(null);
  };

  const deleteCompletedTreatment = async () => {
    if (!treatmentToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/tratamientos-completados/${treatmentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar tratamiento');
      }

      // Show success message
      alert(`Tratamiento completado eliminado exitosamente.\n\nDetalles:\n- ${result.details.itemsDeleted} items eliminados\n- ${result.details.signatureRemoved ? 'Firma eliminada' : 'No había firma'}`);
      
      // Close modal and refresh treatments
      closeDeleteTreatmentModal();
      await loadCompletedTreatments();
      await loadAdvancePayments();
      
    } catch (error) {
      console.error('Error deleting treatment:', error);
      setDeleteError(error instanceof Error ? error.message : 'Error al eliminar tratamiento');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate conversion when payment amount or currency changes
  const calculateConversion = async (amount: string, fromCurrency: Currency, toCurrency: Currency) => {
    if (!amount || parseFloat(amount) <= 0 || fromCurrency === toCurrency) {
      setConversionInfo(null);
      return;
    }

    try {
      const conversion = await currencyConversionService.convertAmount(parseFloat(amount), fromCurrency, toCurrency);
      setConversionInfo({
        convertedAmount: conversion.convertedAmount,
        exchangeRate: conversion.exchangeRate
      });
    } catch (error) {
      console.error('Error calculating conversion:', error);
      setConversionInfo(null);
    }
  };

  // Handle payment amount change with conversion calculation
  const handlePaymentAmountChange = (value: string) => {
    setNewPayment(prev => ({ ...prev, monto_pago: value }));
    if (selectedTreatment) {
      calculateConversion(value, newPayment.moneda, selectedTreatment.moneda);
    }
  };

  // Handle payment currency change with conversion calculation
  const handlePaymentCurrencyChange = (currency: Currency) => {
    setNewPayment(prev => ({ ...prev, moneda: currency }));
    if (selectedTreatment && newPayment.monto_pago) {
      calculateConversion(newPayment.monto_pago, currency, selectedTreatment.moneda);
    }
  };

  // Pagination calculations
  const totalTreatments = filteredTreatments.length;
  const totalPages = Math.ceil(totalTreatments / recordsPerPagePref);
  const startIndex = (currentPage - 1) * recordsPerPagePref;
  const endIndex = startIndex + recordsPerPagePref;
  const currentTreatments = filteredTreatments.slice(startIndex, endIndex);

  // Reset to page 1 when search term, records per page, sort by, sort order, or any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recordsPerPagePref, sortBy, sortOrder, doctorFilter, dateFrom, dateTo]);

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPagePref(value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const paginationProps = {
    totalTreatments,
    startIndex,
    endIndex,
    totalPages,
    currentPage,
    recordsPerPage: recordsPerPagePref,
    onRecordsPerPageChange: handleRecordsPerPageChange,
    onPageChange: handlePageChange,
  };

  if (loading) {
    return (
      <LoadingAnimation 
        message='Cargando Tratamientos'
        subMessage="Obteniendo tratamientos completados"
        customMessages={[
          "• Cargando tratamientos completados...",
          "• Procesando información de pacientes...",
          "• Organizando resultados..."
        ]}
      />
    );
  }

  return (
    <>
      {/* Historical Mode Banner - Only show when viewing specific patient */}
      {pacienteId && recordCategoryInfo && (
        <HistoricalBanner
          isHistorical={recordCategoryInfo?.isHistorical}
          isBypassed={bypassHistoricalMode}
          patientId={pacienteId}
          onBypassChange={async (newBypassValue) => {
            try {
              await savePatientSettings(pacienteId!, newBypassValue);
            } catch (error) {
              console.error('Failed to update bypass setting:', error);
              alert('Error al actualizar la configuración del modo histórico');
            }
          }}
          loading={false}
          compact={true}
        />
      )}
      
      {/* Top Action Bar — only for a selected patient */}
      {newTreatmentUrl && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
            {/* Left side - Nuevo Tratamiento / Pago Adelantado */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleCreateTreatment()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-teal-500 hover:to-cyan-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear Nuevo Tratamiento
              </button>
              <button
                onClick={openAdvancePaymentModal}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                title="Registrar un pago adelantado: el monto queda como Saldo Positivo disponible para el paciente, aunque aún no tenga tratamiento registrado"
              >
                <HandCoins className="h-4 w-4" aria-hidden="true" />
                Pago Adelantado
              </button>
            </div>

            {/* Right side - Volver */}
            <button
              onClick={() => {
                router.push(`/menu-navegacion?id=${encodeURIComponent(pacienteId!)}`);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Patient-specific header */}
        {pacienteId && completedTreatments.length > 0 && (
          <div className="mb-5 rounded-2xl border border-teal-200/80 bg-teal-50/80 p-4 backdrop-blur-xl dark:border-teal-900/60 dark:bg-teal-900/15">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-teal-900 dark:text-teal-100">
                  Tratamientos del Paciente
                </h2>
                <p className="text-sm text-teal-700/80 dark:text-teal-300/80">
                  Paciente ID: {pacienteId}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <TreatmentFiltersBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            doctorFilter={doctorFilter}
            onDoctorChange={handleDoctorFilterChange}
            doctorOptions={doctorOptions}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            dateRangeInvalid={!dateRangeIsValid}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortByChange={(value) => setSortBy(value)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            visibleCount={filteredTreatments.length}
            totalCount={completedTreatments.length}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            colorScheme={resolvedTheme}
          />
        </div>
        {/* Advance payments (no treatment) — visual record that money was received */}
        {pacienteId && advancePayments.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <HandCoins className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                Pagos Adelantados (sin tratamiento)
              </h2>
              <div className="flex flex-wrap gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                {Object.entries(
                  advancePayments.reduce<Record<string, number>>((acc, p) => {
                    const moneda = p.payment.moneda;
                    acc[moneda] = (acc[moneda] || 0) + p.remaining;
                    return acc;
                  }, {})
                ).map(([moneda, total]) => (
                  <span
                    key={moneda}
                    className="rounded-full bg-indigo-500/10 px-3 py-1 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/15"
                  >
                    Disponible {moneda}: {formatCurrency(total, moneda as Currency)}
                  </span>
                ))}
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Pagos recibidos que quedaron como Saldo Positivo del paciente. El monto disponible disminuye al aplicar a tratamientos.
            </p>
            <div className="space-y-3">
              {advancePayments.map(({ payment, remaining }) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-200/70 bg-indigo-50/70 p-4 backdrop-blur-xl dark:border-indigo-900/50 dark:bg-indigo-900/15"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                      <Coins className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        <span>{formatCurrency(remaining, payment.moneda)}</span>
                        <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:text-indigo-200">
                          Disponible
                        </span>
                        {remaining < Number(payment.monto_pago) && (
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            (original: {formatCurrency(Number(payment.monto_pago), payment.moneda)})
                          </span>
                        )}
                      </div>
                      <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                        {SimpleTimezoneFix.formatDateForConsultationAge(payment.fecha_pago)} ·{' '}
                        {PaymentService.formatPaymentMethod(payment.metodo_pago)}
                        {payment.notas_pago ? ` · ${payment.notas_pago}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAdvancePayment(payment)}
                    aria-label="Eliminar pago adelantado"
                    title="Eliminar pago adelantado"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:text-slate-400 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Positive Balance (Saldo Positivo Total) - from all sources */}
        {pacienteId && (totalPositiveBalance.HNL > 0 || totalPositiveBalance.USD > 0) && (
          <div className="mb-6">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Saldo Positivo Total Disponible
              </h2>
              <div className="flex flex-wrap gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {Object.entries(totalPositiveBalance)
                  .filter(([, amount]) => amount > 0)
                  .map(([moneda, amount]) => (
                    <span
                      key={moneda}
                      className="rounded-full bg-emerald-500/10 px-3 py-1 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/15"
                    >
                      {moneda}: {formatCurrency(amount, moneda as Currency)}
                    </span>
                  ))}
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Crédito disponible del paciente (proveniente de pagos adelantados y sobre-pagos en tratamientos).
              Se reduce automáticamente al aplicar a tratamientos.
            </p>
          </div>
        )}

        {currentTreatments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-14 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800/70 dark:text-slate-500">
              <ClipboardCheck className="h-8 w-8" aria-hidden="true" />
            </span>
            <h3 className="mb-2 text-xl font-semibold text-slate-700 dark:text-slate-200">
              No se encontraron tratamientos completados
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm ? 'No hay tratamientos que coincidan con tu búsqueda.' : 'No hay tratamientos completados registrados.'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {currentTreatments.map((treatment) => (
                    <TreatmentCard
                      key={treatment.id}
                      treatment={treatment}
                      patientBypassStatus={patientBypassStatus}
                      onOpenPayments={openPaymentModal}
                      onDelete={openDeleteTreatmentModal}
                    />
                  ))}
                </div>

                {totalTreatments > 0 ? (
                  <div className="mt-6">
                    <TreatmentPagination {...paginationProps} variant="standalone" />
                  </div>
                ) : null}
              </>
            ) : (
              <TreatmentTable
                treatments={currentTreatments}
                patientBypassStatus={patientBypassStatus}
                onOpenPayments={openPaymentModal}
                onDelete={openDeleteTreatmentModal}
                footer={
                  totalTreatments > 0 ? (
                    <TreatmentPagination {...paginationProps} variant="attached" />
                  ) : null
                }
              />
            )}

          </>
        )}
      </main>

      {/* Payment Management Modal */}
      {showPaymentModal && selectedTreatment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      Gestión de Pagos - Tratamiento
                    </h3>

                    {/* Treatment Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Paciente:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedTreatment.paciente?.nombre_completo}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total del Tratamiento:</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {(() => {
                              // Try multiple sources to get the total
                              if (selectedTreatment.total_final) {
                                return formatCurrency(selectedTreatment.total_final, selectedTreatment.moneda || 'HNL');
                              }
                              
                              // Calculate from treatment items if available
                              if (selectedTreatment.tratamientos_realizados?.length > 0) {
                                const calculatedTotal = selectedTreatment.tratamientos_realizados.reduce(
                                  (sum, tr) => sum + ((tr.precio_final || 0) * (tr.cantidad || 0)), 
                                  0
                                );
                                if (calculatedTotal > 0) {
                                  return formatCurrency(calculatedTotal, selectedTreatment.moneda || 'HNL');
                                }
                              }
                              
                              // Use payment summary total if available
                              if (paymentSummary?.total_tratamiento) {
                                return formatCurrency(paymentSummary.total_tratamiento, paymentSummary.moneda_principal || 'HNL');
                              }
                              
                              return 'No definido';
                            })()}
                          </p>
                        </div>
                      </div>
                      
                      {loadingPayments ? (
                        <div className="text-center py-4">
                          <i className="fas fa-spinner fa-spin text-teal-600 text-2xl"></i>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando información de pagos...</p>
                        </div>
                      ) : paymentSummary ? (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Monto Pagado:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(paymentSummary.monto_pagado, paymentSummary.moneda_principal)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Saldo Pendiente:</span>
                            <span className={`font-medium ${paymentSummary.saldo_pendiente > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {formatCurrency(paymentSummary.saldo_pendiente, paymentSummary.moneda_principal)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Estado del Pago:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${PaymentService.getPaymentStatusBadge(paymentSummary.estado_pago)}`}>
                              {PaymentService.getPaymentStatusText(paymentSummary.estado_pago)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Saldo Positivo (Available Credit) */}
                    {paymentSummary?.credito_disponible && selectedTreatment?.paciente_id && (() => {
                      const treatmentCurrency = selectedTreatment.moneda || 'HNL';
                      const availableInCurrency = treatmentCurrency === 'USD'
                        ? paymentSummary.credito_disponible.disponible_usd
                        : paymentSummary.credito_disponible.disponible_hnl;

                      if (availableInCurrency <= 0) return null;

                      return (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg mb-4 border border-emerald-200 dark:border-emerald-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                              <i className="fas fa-coins"></i>
                              Saldo Positivo Disponible
                            </h4>
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(availableInCurrency, treatmentCurrency)}
                            </span>
                          </div>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                            Este paciente tiene credito disponible de sobre-pagos anteriores. Puede aplicarlo a este tratamiento.
                          </p>
                          {!applyCredit ? (
                            <button
                              onClick={() => {
                                setApplyCredit(true);
                                setCreditAmount(String(Math.min(availableInCurrency, paymentSummary.saldo_pendiente || 0)));
                              }}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                              disabled={paymentSummary.saldo_pendiente <= 0}
                            >
                              <i className="fas fa-hand-holding-usd mr-2"></i>
                              Aplicar Saldo Positivo
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                  Monto a aplicar:
                                </label>
                                <input
                                  type="number"
                                  value={creditAmount}
                                  onChange={(e) => setCreditAmount(e.target.value)}
                                  className="w-32 px-3 py-1.5 border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                  min="0"
                                  max={Math.min(availableInCurrency, paymentSummary.saldo_pendiente || 0)}
                                  step="0.01"
                                />
                                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                                  / {formatCurrency(availableInCurrency, treatmentCurrency)}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={applyCreditPayment}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium disabled:opacity-50"
                                  disabled={applyingCredit || !creditAmount || parseFloat(creditAmount) <= 0}
                                >
                                  {applyingCredit ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i>Aplicando...</>
                                  ) : (
                                    <><i className="fas fa-check mr-2"></i>Confirmar</>
                                  )}
                                </button>
                                <button
                                  onClick={() => { setApplyCredit(false); setCreditAmount(''); }}
                                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Add New Payment Form */}
                    {(!paymentSummary || paymentSummary.saldo_pendiente > 0) && (
                      <div className="p-4 rounded-lg mb-4 bg-blue-50 dark:bg-blue-900/20">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Agregar Nuevo Pago
                        </h4>
                        
                        {!paymentSummary && (
                          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              Cargando información de pago...
                            </p>
                          </div>
                        )}
                        
                        {paymentSummary && paymentSummary.saldo_pendiente <= 0 && selectedTreatment?.total_final > 0 && (
                          <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              Este tratamiento ya está completamente pagado.
                            </p>
                          </div>
                        )}
                        
                        
                        {paymentSummary && paymentSummary.saldo_pendiente > 0 && selectedTreatment?.total_final > 0 && (
                          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              Saldo pendiente: {formatCurrency(paymentSummary.saldo_pendiente, paymentSummary.moneda_principal)}
                            </p>
                          </div>
                        )}
                        
                        {/* Currency conversion warning */}
                        {newPayment.moneda && selectedTreatment?.moneda && newPayment.moneda !== selectedTreatment.moneda && (
                          <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                              <i className="fas fa-exchange-alt mr-2"></i>
                              Conversión automática: {newPayment.moneda} → {selectedTreatment.moneda}
                            </p>
                            {conversionInfo && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                  {formatCurrency(parseFloat(newPayment.monto_pago || '0'), newPayment.moneda)} → {formatCurrency(conversionInfo.convertedAmount, selectedTreatment.moneda)}
                                  <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                                    ({conversionInfo.exchangeRate.toFixed(4)})
                                  </span>
                                </p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-300">
                                  El pago será convertido automáticamente a la moneda del tratamiento
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                            <input 
                              type="number" 
                              value={newPayment.monto_pago} 
                              onChange={(e) => handlePaymentAmountChange(e.target.value)} 
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                              placeholder="0.00" 
                              min="0" 
                              max={paymentSummary?.saldo_pendiente || 0} 
                              step="0.01"
                              disabled={!paymentSummary || paymentSummary.saldo_pendiente <= 0}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                            <select 
                              value={newPayment.moneda || 'HNL'} 
                              onChange={(e) => handlePaymentCurrencyChange((e.target.value || 'HNL') as Currency)} 
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              disabled={!paymentSummary || paymentSummary.saldo_pendiente <= 0}
                            >
                              <option value="HNL">HNL</option>
                              <option value="USD">USD</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Pago</label>
                            <select
                              value={newPayment.metodo_pago}
                              onChange={(e) => setNewPayment(prev => ({ ...prev, metodo_pago: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              disabled={!paymentSummary || paymentSummary.saldo_pendiente <= 0}
                            >
                              {PaymentService.getPaymentMethods().map(method => (
                                <option key={method} value={method}>
                                  {PaymentService.formatPaymentMethod(method)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas (Opcional)</label>
                            <input
                              type="text"
                              value={newPayment.notas_pago}
                              onChange={(e) => setNewPayment(prev => ({ ...prev, notas_pago: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Notas del pago"
                              disabled={!paymentSummary || paymentSummary.saldo_pendiente <= 0}
                            />
                          </div>
                        </div>
                        <button
                          onClick={addPayment}
                          className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          disabled={!paymentSummary || paymentSummary.saldo_pendiente <= 0}
                        >
                          <i className="fas fa-plus mr-2"></i>Agregar Pago
                        </button>
                      </div>
                    )}

                    {/* Payment History */}
                    {paymentSummary && paymentSummary.pagos.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Historial de Pagos</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {paymentSummary.pagos.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(payment.monto_pago, payment.moneda)}
                                  </span>
                                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-500 text-gray-700 dark:text-gray-200">
                                    {payment.moneda}
                                  </span>
                                  {payment.monto_convertido && payment.moneda_conversion && payment.moneda_conversion !== payment.moneda && (
                                    <>
                                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                        → {formatCurrency(payment.monto_convertido, payment.moneda_conversion)}
                                      </span>
                                      <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                                        ({payment.tasa_conversion?.toFixed(4)})
                                      </span>
                                    </>
                                  )}
                                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-500 text-gray-700 dark:text-gray-200">
                                    {PaymentService.formatPaymentMethod(payment.metodo_pago)}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-300">
                                  {SimpleTimezoneFix.formatDateForConsultationAge(payment.fecha_pago)}
                                  {payment.notas_pago && ` - ${payment.notas_pago}`}
                                </div>
                              </div>
                              <button
                                onClick={() => deletePayment(payment.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                              >
                                <div className="w-4 h-4 flex items-center justify-center">
                                  <AnimatedRubish />
                                </div>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pago Adelantado Modal (per patient, works without a treatment) */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      Pago Adelantado
                    </h3>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 p-4 rounded-lg mb-4">
                      <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                        <i className="fas fa-user mr-2"></i>
                        {advancePatientName ? advancePatientName : `Paciente #${pacienteId}`}
                      </p>
                      <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-300">
                        El monto se registra como efectivo recibido hoy y queda como Saldo Positivo (crédito) disponible para el paciente, aunque aún no tenga tratamiento completado.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                        <input
                          type="number"
                          value={advancePayment.monto_pago}
                          onChange={(e) => setAdvancePayment(prev => ({ ...prev, monto_pago: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                        <select
                          value={advancePayment.moneda}
                          onChange={(e) => setAdvancePayment(prev => ({ ...prev, moneda: e.target.value as Currency }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="HNL">HNL</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Pago</label>
                        <select
                          value={advancePayment.metodo_pago}
                          onChange={(e) => setAdvancePayment(prev => ({ ...prev, metodo_pago: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {PaymentService.getPaymentMethods().filter(method => method !== 'saldo_positivo').map(method => (
                            <option key={method} value={method}>
                              {PaymentService.formatPaymentMethod(method)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas (Opcional)</label>
                        <input
                          type="text"
                          value={advancePayment.notas_pago}
                          onChange={(e) => setAdvancePayment(prev => ({ ...prev, notas_pago: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Notas del pago"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={submitAdvancePayment}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={savingAdvance || !advancePayment.monto_pago}
                >
                  {savingAdvance ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Registrando...</>
                  ) : (
                    <><i className="fas fa-hand-holding-usd mr-2"></i>Registrar Pago Adelantado</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeAdvanceModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Delete Confirmation Modal */}
      {showDeleteModal && paymentToDelete && (
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
                    deleteSuccess ? 'bg-green-100' : deleteError ? 'bg-red-100' : 'bg-red-100'
                  }`}>
                    <i className={`fas ${deleteSuccess ? 'fa-check-circle text-green-600' : deleteError ? 'fa-times-circle text-red-600' : 'fa-exclamation-triangle text-red-600'}`}></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {deleteSuccess ? 'Pago Eliminado' : deleteError ? 'Error al Eliminar' : 'Eliminar Pago'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {deleteSuccess 
                          ? `El pago de ${formatCurrency(paymentToDelete.amount, paymentToDelete.currency as Currency)} (${PaymentService.formatPaymentMethod(paymentToDelete.method)}) ha sido eliminado exitosamente.`
                          : deleteError
                          ? `Error: ${deleteError}`
                          : `¿Está seguro de que desea eliminar el pago de ${formatCurrency(paymentToDelete.amount, paymentToDelete.currency as Currency)} (${PaymentService.formatPaymentMethod(paymentToDelete.method)})? Esta acción no se puede deshacer.`
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
                      setDeleteError(null);
                      try {
                        await PaymentService.deletePayment(paymentToDelete.id);
                        const summary = await PaymentService.getPaymentSummary(selectedTreatment.id);
                        setPaymentSummary(summary);
                        
                        // Refresh the treatments list to update payment status badges
                        await loadCompletedTreatments();
      await loadAdvancePayments();
                        
                        setDeleteSuccess(true);
                      } catch (error) {
                        console.error('Error deleting payment:', error);
                        setDeleteError((error as Error).message);
                      }
                    }}>Eliminar</button>
                    <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => {
                      setShowDeleteModal(false);
                      setPaymentToDelete(null);
                      setDeleteSuccess(false);
                      setDeleteError(null);
                    }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-white hover:bg-green-700 sm:w-auto sm:text-sm" onClick={() => {
                      setShowDeleteModal(false);
                      setPaymentToDelete(null);
                      setDeleteSuccess(false);
                      setDeleteError(null);
                    }}>
                      <i className="fas fa-check mr-2"></i>Cerrar
                    </button>
                    {deleteError && (
                      <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => {
                        setDeleteError(null);
                        setDeleteSuccess(false);
                      }}>
                        <i className="fas fa-redo mr-2"></i>Reintentar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Treatment Confirmation Modal */}
      {treatmentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <i className={`fas ${isDeleting ? 'fa-spinner fa-spin' : 'fa-exclamation-triangle'} text-red-600 dark:text-red-400`}></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {isDeleting ? 'Eliminando Tratamiento...' : 'Eliminar Tratamiento Completado'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isDeleting 
                          ? 'Por favor espere mientras se elimina el tratamiento y todos sus datos relacionados...'
                          : `¿Está seguro de que desea eliminar el tratamiento completado de ${treatmentToDelete.patientName}?`
                        }
                      </p>
                      {!isDeleting && (
                        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                            <i className="fas fa-exclamation-triangle mr-1"></i>
                            Esta acción eliminará permanentemente:
                          </p>
                          <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 ml-4 list-disc">
                            <li>El tratamiento completado ({treatmentToDelete.treatmentCount} items)</li>
                            <li>Todos los items de tratamiento asociados</li>
                            <li>Los pagos relacionados (si existen)</li>
                            <li>La firma digital del paciente (si existe)</li>
                            <li>Se ajustará el contador de veces_realizado en los tratamientos originales</li>
                          </ul>
                          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mt-2">
                            Esta acción no se puede deshacer.
                          </p>
                        </div>
                      )}
                      {deleteError && (
                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            <i className="fas fa-exclamation-circle mr-1"></i>
                            Error: {deleteError}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!isDeleting ? (
                  <>
                    <button 
                      type="button" 
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" 
                      onClick={deleteCompletedTreatment}
                      disabled={isDeleting}
                    >
                      <div className="w-4 h-4 mr-2 flex items-center justify-center">
                        <AnimatedRubish />
                      </div>
                      Eliminar Tratamiento
                    </button>
                    <button 
                      type="button" 
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" 
                      onClick={closeDeleteTreatmentModal}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <div className="w-full text-center">
                    <div className="inline-flex items-center text-red-600 dark:text-red-400">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Eliminando tratamiento...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function TratamientosCompletadosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingAnimation /></div>}>
      <TratamientosCompletadosPageContent />
    </Suspense>
  );
}