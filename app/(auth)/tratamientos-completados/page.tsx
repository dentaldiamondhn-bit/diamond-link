'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, Currency } from '../../../utils/currencyUtils';
import { formatDateForDisplay } from '../../../utils/dateUtils';
import { formatPhoneDisplay, createWhatsAppUrl } from '../../../utils/phoneUtils';
import { getPatientType, calculateAge } from '../../../utils/patientTypeUtils';
import { getRecordCategoryInfo, getRecordCategoryInfoSync } from '../../../utils/recordCategoryUtils';
import { CompletedTreatmentService } from '../../../services/completedTreatmentService';
import { PaymentService } from '../../../services/paymentServiceFixed';
import { currencyConversionService } from '../../../services/currencyConversionService';
import type { CompletedTreatment, TreatmentItem } from '../../../services/completedTreatmentService';
import type { Payment, PaymentSummary } from '../../../services/paymentServiceFixed';
import LoadingAnimation from '../../../components/LoadingAnimation';
import { useHistoricalMode } from '../../../contexts/HistoricalModeContext';
import HistoricalBadge from '../../../components/HistoricalBadge';
import { usePagePreferences } from '../../../hooks/useUserPreferences';
import { supabase } from '../../../lib/supabase';

export default function TratamientosCompletadosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bypassHistoricalMode, loadPatientSettings } = useHistoricalMode();
  const [completedTreatments, setCompletedTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [patientBypassStatus, setPatientBypassStatus] = useState<Record<string, boolean>>({});
  
  // Use page preferences for tratamientos-completados page
  const { preferences: pagePrefs, updatePreferences: updatePagePrefs, loading: prefsLoading } = usePagePreferences('tratamientos-completados');
  
  // Initialize state from preferences or defaults
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(pagePrefs?.viewMode || 'grid');
  const [recordsPerPagePref, setRecordsPerPagePref] = useState(pagePrefs?.recordsPerPage || 25);
  const [sortBy, setSortBy] = useState<'paciente' | 'fecha' | 'doctor' | 'total' | 'estado'>(pagePrefs?.sortBy || 'fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(pagePrefs?.sortOrder || 'desc');
  
  // Payment management state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [newPayment, setNewPayment] = useState({ monto_pago: '', moneda: 'HNL' as Currency, metodo_pago: 'efectivo', notas_pago: '' });
  const [conversionInfo, setConversionInfo] = useState<{convertedAmount: number, exchangeRate: number} | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{id: string, amount: number, currency: string, method: string} | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
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

  useEffect(() => {
    loadCompletedTreatments();
  }, [pacienteId]);

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

  const handleCreateTreatment = (treatment?: CompletedTreatment) => {
    if (treatment) {
      router.push(`/tratamientos-completados/${treatment.id}/view`);
    } else {
      // Get paciente_id from URL parameter first, then from first treatment if needed
      let targetPacienteId = pacienteId;
      
      if (!targetPacienteId && completedTreatments.length > 0) {
        targetPacienteId = completedTreatments[0].paciente_id;
      }
      
      // Pass the paciente_id when creating a new treatment
      const newTreatmentUrl = targetPacienteId 
        ? `/tratamientos-completados/new?paciente_id=${targetPacienteId}`
        : '/tratamientos-completados/new';
      router.push(newTreatmentUrl);
    }
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
      
      // Load patient-specific historical mode settings
      if (completedTreatmentsData && completedTreatmentsData.length > 0) {
        await loadPatientSettingsForTreatments(completedTreatmentsData);
      }
    } catch (error) {
      console.error('Error loading completed treatments:', error);
      setCompletedTreatments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTreatments = completedTreatments.filter(treatment => {
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
    
    // Then filter by search term
    return treatment.paciente?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           treatment.paciente?.numero_identidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           treatment.paciente?.telefono?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           treatment.tratamientos_realizados?.some(tr => 
             tr.nombre_tratamiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
             tr.codigo_tratamiento.toLowerCase().includes(searchTerm.toLowerCase())
           );
  }).sort((a, b) => {
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
      case 'total':
        comparison = (a.total_final || 0) - (b.total_final || 0);
        break;
      case 'estado':
        // Sort by payment status - pagado vs pendiente
        const statusA = (a.pagado || a.pagado_totalmente) ? 'pagado' : 'pendiente';
        const statusB = (b.pagado || b.pagado_totalmente) ? 'pagado' : 'pendiente';
        
        // For string comparisons, we need to handle the order explicitly
        if (sortOrder === 'asc') {
          comparison = statusA.localeCompare(statusB);
        } else {
          comparison = statusB.localeCompare(statusA);
        }
        
        // If status is the same, use a secondary sort by fecha to maintain consistent ordering
        if (comparison === 0) {
          const dateA = new Date(a.fecha_cita || 0).getTime();
          const dateB = new Date(b.fecha_cita || 0).getTime();
          comparison = sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        return comparison; // Return early for estado since we handled order here
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Payment management functions
  const openPaymentModal = async (treatment: CompletedTreatment) => {
    setSelectedTreatment(treatment);
    setLoadingPayments(true);
    try {
      const summary = await PaymentService.getPaymentSummary(treatment.id);
      setPaymentSummary(summary);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error loading payment summary:', error);
      alert('Error al cargar información de pagos');
    } finally {
      setLoadingPayments(false);
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
      
      await PaymentService.addPayment(paymentData, selectedTreatment.moneda || 'HNL');

      const summary = await PaymentService.getPaymentSummary(selectedTreatment.id);
      setPaymentSummary(summary);
      
      // Refresh the treatments list to update payment status badges
      await loadCompletedTreatments();
      
      setNewPayment({ monto_pago: '', moneda: 'HNL' as Currency, metodo_pago: 'efectivo', notas_pago: '' });
      alert('Pago agregado exitosamente');
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error al agregar pago');
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

  const getPaymentStatusBadge = (treatment: CompletedTreatment) => {
    // Calculate payment status like the modal does
    const totalPaid = treatment.monto_pagado || 0;
    const totalFinal = treatment.total_final || 0;
    const paymentStatus = totalFinal <= 0 ? 'pagado' : 
      totalPaid >= totalFinal ? 'pagado' : 
      totalPaid > 0 ? 'parcialmente_pagado' : 'pendiente';
    
    // Use calculated payment status
    if (paymentStatus === 'pagado') {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    } else if (paymentStatus === 'parcialmente_pagado') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    } else {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getPaymentStatusText = (treatment: CompletedTreatment) => {
    // Calculate payment status like the modal does
    const totalPaid = treatment.monto_pagado || 0;
    const totalFinal = treatment.total_final || 0;
    const paymentStatus = totalFinal <= 0 ? 'pagado' : 
      totalPaid >= totalFinal ? 'pagado' : 
      totalPaid > 0 ? 'parcialmente_pagado' : 'pendiente';
    
    // Use calculated payment status
    if (paymentStatus === 'pagado') {
      return 'Pagado';
    } else if (paymentStatus === 'parcialmente_pagado') {
      return 'Parcialmente Pagado';
    } else {
      return 'Pendiente';
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

  // Reset to page 1 when search term, records per page, sort by, or sort order changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recordsPerPagePref, sortBy, sortOrder]);

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPagePref(value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <LoadingAnimation 
        message="Cargando Tratamientos"
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
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Nuevo Tratamiento */}
            <button
              onClick={() => handleCreateTreatment()}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <i className="fas fa-plus mr-2"></i>
              Crear Nuevo Tratamiento
            </button>
            
            {/* Right side - Volver */}
            <button
              onClick={() => {
                const url = pacienteId ? `/menu-navegacion?id=${encodeURIComponent(pacienteId)}` : '/menu-navegacion';
                router.push(url);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Volver
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Patient-specific header */}
          {pacienteId && completedTreatments.length > 0 && (
            <div className="mb-4 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
              <div className="flex items-center">
                <i className="fas fa-user-injured text-teal-600 dark:text-teal-400 mr-3"></i>
                <div>
                  <h2 className="text-lg font-semibold text-teal-800 dark:text-teal-200">
                    Tratamientos del Paciente
                  </h2>
                  <p className="text-sm text-teal-600 dark:text-teal-400">
                    Paciente ID: {pacienteId}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, identidad, teléfono o tratamiento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  />
                  <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
                </div>
                
                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar por:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'paciente' | 'fecha' | 'doctor' | 'total' | 'estado')}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="fecha">Fecha</option>
                    <option value="paciente">Paciente</option>
                    <option value="doctor">Doctor</option>
                    <option value="total">Total</option>
                    <option value="estado">Estado</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                    title={`Orden ${sortOrder === 'asc' ? 'ascendente' : 'descendente'}`}
                  >
                    <i className={`fas fa-sort-amount-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTreatments.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-clipboard-check text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No se encontraron tratamientos completados
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No hay tratamientos que coincidan con tu búsqueda.' : 'No hay tratamientos completados registrados.'}
            </p>
          </div>
        ) : (
          <>
            {/* Treatment Cards */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentTreatments.map((treatment) => {
                  // Try to get patient type, fallback to adult if no birth date
                  let patientType = null;
                  if (treatment.paciente?.fecha_nacimiento) {
                    patientType = getPatientType(treatment.paciente);
                  } else if (treatment.paciente?.edad) {
                    // Create a mock patient object with age
                    const mockPatient = {
                      nombre_completo: treatment.paciente.nombre_completo,
                      fecha_nacimiento: new Date(Date.now() - (treatment.paciente.edad * 365.25 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
                    };
                    patientType = getPatientType(mockPatient);
                  }
                  
                  const recordCategoryInfo = treatment.fecha_cita ? getRecordCategoryInfoSync(treatment.fecha_cita) : null;
                  
                  return (
                  <div key={treatment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                    {/* Treatment Header */}
                    <div 
                      className={`bg-gradient-to-r p-4 ${
                        patientType?.colors.header || 'from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {treatment.paciente?.nombre_completo || 'Paciente Desconocido'}
                          </h3>
                          <p className="text-white/80 text-sm">
                            {treatment.paciente?.identificacion || treatment.paciente?.numero_identidad || 'Sin identificación'}
                          </p>
                          {treatment.paciente?.telefono && (
                            <p className="text-white/70 text-xs mt-1">
                              <i className="fas fa-phone mr-1"></i>
                              {formatPhoneDisplay(treatment.paciente.telefono, treatment.paciente.codigopais)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col gap-1">
                            {/* Patient Type Badge */}
                            {patientType && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patientType.colors.badge} border ${patientType.colors.badgeText}`}>
                                {patientType.label}
                              </span>
                            )}
                            {/* Historical Badge - only show if historical and NOT bypassed */}
                            {recordCategoryInfo?.isHistorical && !patientBypassStatus[treatment.paciente_id] && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
                                Histórico
                              </span>
                            )}
                            {/* Status Badge */}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(treatment)}`}>
                              <i className={`fas ${
                                treatment.estado_pago === 'pagado' || treatment.estado === 'pagado' ? 'fa-dollar-sign' :
                                (treatment.estado_pago === 'parcialmente_pagado' || treatment.estado === 'firmado' || treatment.firma_paciente_url) ? 'fa-check-circle' :
                                'fa-clock'
                              } mr-1`}></i>
                              {getPaymentStatusText(treatment)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Treatment Details */}
                    <div className="p-4">
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <i className="fas fa-calendar w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                          <span>{formatDateForDisplay(treatment.fecha_cita)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <i className="fas fa-phone w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                          {treatment.paciente?.telefono ? (
                            <a 
                              href={createWhatsAppUrl(treatment.paciente.telefono, treatment.paciente.codigopais)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 underline flex items-center gap-1"
                            >
                              <i className="fab fa-whatsapp text-xs"></i>
                              {formatPhoneDisplay(treatment.paciente.telefono, treatment.paciente.codigopais)}
                            </a>
                          ) : (
                            <span>No especificado</span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <i className="fas fa-user-md w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                          <span>{treatment.paciente?.doctor || treatment.paciente_doctor || 'No especificado'}</span>
                        </div>
                      </div>

                      {/* Treatment Items */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Tratamientos Realizados ({treatment.tratamientos_realizados.length})
                        </div>
                        {treatment.tratamientos_realizados.map((tr) => (
                          <div key={tr.id} className="flex items-center justify-between py-1">
                            <div className="flex-1">
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {tr.cantidad}x {tr.nombre_tratamiento}
                                </span>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {tr.codigo_tratamiento}
                                </div>
                                {/* Doctor Information */}
                                <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                                  <i className="fas fa-user-md mr-1"></i>
                                  Tratado por: {tr.doctor_name || 'No especificado'}
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                              {formatCurrency(tr.precio_final * tr.cantidad)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Pricing Summary */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Resumen de Precios</h4>
                        
                        {/* Show prices when historical mode is bypassed for this patient */}
                        {(!recordCategoryInfo?.isHistorical || patientBypassStatus[treatment.paciente_id]) && (() => {
                          const itemsTotal = treatment.tratamientos_realizados?.reduce(
                            (sum, tr) => {
                              const itemTotal = (tr.precio_final || 0) * (tr.cantidad || 0);
                              return sum + itemTotal;
                            }, 0
                          ) || 0;
                          
                          const subtotal = treatment.subtotal || itemsTotal;
                          const descuento = treatment.total_descuento || 0;
                          const total = treatment.total_final || (subtotal - descuento);
                          
                          return (
                            <>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(subtotal)}
                                </span>
                              </div>
                              {(descuento > 0) && (
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Descuento:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    -{formatCurrency(descuento)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">Total:</span>
                                <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                                  {formatCurrency(total)}
                                </span>
                              </div>
                              
                              {/* Payment Information - Use same logic as payment modal */}
                              {(() => {
                                // Calculate payment summary like the modal does
                                const totalPaid = treatment.monto_pagado || 0;
                                const totalFinal = treatment.total_final || 0;
                                const pendingBalance = totalFinal - totalPaid;
                                const paymentStatus = totalFinal <= 0 ? 'pagado' : 
                                  totalPaid >= totalFinal ? 'pagado' : 
                                  totalPaid > 0 ? 'parcialmente_pagado' : 'pendiente';
                                
                                return (totalPaid > 0 || pendingBalance > 0 || paymentStatus !== 'pendiente') && (
                                  <>
                                    <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-green-600 dark:text-green-400">Pagado:</span>
                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                          {formatCurrency(totalPaid)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-red-600 dark:text-red-400">Pendiente:</span>
                                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                          {formatCurrency(pendingBalance)}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </>
                          );
                        })()}
                        
                        {/* Show message when historical mode is not bypassed for this patient */}
                        {recordCategoryInfo?.isHistorical && !patientBypassStatus[treatment.paciente_id] && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                            Precios ocultos (modo histórico activado)
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-3 mt-4">
                        <button
                          onClick={() => openPaymentModal(treatment)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <i className="fas fa-dollar-sign mr-2"></i>
                          Pagos
                        </button>
                        <Link
                          href={`/tratamientos-completados/${treatment.id}/view`}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <i className="fas fa-eye mr-2"></i>
                          Ver Detalles
                        </Link>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Doctor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tratamientos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentTreatments.map((treatment) => {
                      // Get patient type information for color coding
                      // Try to get patient type, fallback to adult if no birth date
                      let patientType = null;
                      if (treatment.paciente?.fecha_nacimiento) {
                        patientType = getPatientType(treatment.paciente);
                      } else if (treatment.paciente?.edad) {
                        // Create a mock patient object with age
                        const mockPatient = {
                          ...treatment.paciente,
                          fecha_nacimiento: new Date(Date.now() - (treatment.paciente.edad * 365.25 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
                        };
                        patientType = getPatientType(mockPatient);
                      }
                      
                      const recordCategoryInfo = treatment.fecha_cita ? getRecordCategoryInfoSync(treatment.fecha_cita) : null;
                      
                      return (
                      <tr key={treatment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {treatment.paciente?.nombre_completo || 'Paciente Desconocido'}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              {treatment.paciente?.identificacion || treatment.paciente?.numero_identidad || 'Sin identificación'}
                            </div>
                            {treatment.paciente?.telefono && (
                              <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                                <a 
                                  href={createWhatsAppUrl(treatment.paciente.telefono, treatment.paciente.codigopais)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 underline"
                                >
                                  <i className="fab fa-whatsapp text-xs"></i>
                                  <i className="fas fa-phone mr-1"></i>
                                  {formatPhoneDisplay(treatment.paciente.telefono, treatment.paciente.codigopais)}
                                </a>
                              </div>
                            )}
                            {/* Patient Type and Historical Badges */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {patientType && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${patientType.colors.badge} border ${patientType.colors.badgeText}`}>
                                  {patientType.label}
                                </span>
                              )}
                              {/* Historical Badge - only show if historical and NOT bypassed */}
                              {recordCategoryInfo?.isHistorical && !patientBypassStatus[treatment.paciente_id] && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
                                  Histórico
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDateForDisplay(treatment.fecha_cita)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {treatment.paciente_doctor || treatment.paciente?.doctor || 'No especificado'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {treatment.tratamientos_realizados.length} tratamiento(s)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          <div>
                            {formatCurrency(treatment.total_final, treatment.moneda)}
                            {/* Payment Information - Use same logic as grid view */}
                            {(() => {
                              const totalPaid = treatment.monto_pagado || 0;
                              const totalFinal = treatment.total_final || 0;
                              const pendingBalance = totalFinal - totalPaid;
                              const paymentStatus = totalFinal <= 0 ? 'pagado' : 
                                totalPaid >= totalFinal ? 'pagado' : 
                                totalPaid > 0 ? 'parcialmente_pagado' : 'pendiente';
                              
                              return (totalPaid > 0 || pendingBalance > 0 || paymentStatus !== 'pendiente') && (
                                <div className="mt-1 space-y-0.5">
                                  {totalPaid > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-green-600 dark:text-green-400">Pagado:</span>
                                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                        {formatCurrency(totalPaid)}
                                      </span>
                                    </div>
                                  )}
                                  {pendingBalance > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-red-600 dark:text-red-400">Pendiente:</span>
                                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                        {formatCurrency(pendingBalance)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(treatment)}`}>
                            {getPaymentStatusText(treatment)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openPaymentModal(treatment)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            >
                              <i className="fas fa-dollar-sign"></i>
                            </button>
                            <Link
                              href={`/tratamientos-completados/${treatment.id}/view`}
                              className="text-teal-600 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300"
                            >
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination and Records Counter */}
            {totalTreatments > 0 && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                  {/* Records Counter */}
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Total Tratamientos: {totalTreatments}</span>
                    <span className="mx-2">|</span>
                    <span>Mostrando: {startIndex + 1}-{Math.min(endIndex, totalTreatments)} de {totalTreatments}</span>
                  </div>

                  {/* Records Per Page Dropdown */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Registros por página:</label>
                    <div className="relative">
                      <select
                        value={recordsPerPagePref}
                        onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                        className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer transition-colors duration-200"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
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
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>

                      {/* Page Numbers */}
                      {getPaginationNumbers().map((page, index) => (
                        <span key={index}>
                          {page === '...' ? (
                            <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">...</span>
                          ) : (
                            <button
                              onClick={() => handlePageChange(page as number)}
                              className={`px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                                currentPage === page
                                  ? 'bg-teal-600 text-white border-teal-600'
                                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
                            <span className="font-medium text-red-600 dark:text-red-400">
                              {formatCurrency(-(paymentSummary.saldo_pendiente || 0), paymentSummary.moneda_principal)}
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

                    {/* Add New Payment Form */}
                    {(!paymentSummary || paymentSummary.saldo_pendiente > 0) && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Agregar Nuevo Pago</h4>
                        
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
                              Saldo pendiente: {formatCurrency(-(paymentSummary.saldo_pendiente), paymentSummary.moneda_principal)}
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
                                  {new Date(payment.fecha_pago).toLocaleDateString('es-ES')}
                                  {payment.notas_pago && ` - ${payment.notas_pago}`}
                                </div>
                              </div>
                              <button
                                onClick={() => deletePayment(payment.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                              >
                                <i className="fas fa-trash"></i>
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
    </>
  );
}