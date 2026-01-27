'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '../../../utils/currencyUtils';
import { formatDateForDisplay } from '../../../utils/dateUtils';
import { formatPhoneDisplay, createWhatsAppUrl } from '../../../utils/phoneUtils';
import { getPatientType, calculateAge } from '../../../utils/patientTypeUtils';
import { getRecordCategoryInfo, getRecordCategoryInfoSync } from '../../../utils/recordCategoryUtils';
import { CompletedTreatmentService } from '../../../services/completedTreatmentService';
import type { CompletedTreatment, TreatmentItem } from '../../../services/completedTreatmentService';
import LoadingAnimation from '../../../components/LoadingAnimation';
import { useHistoricalMode } from '../../../contexts/HistoricalModeContext';
import HistoricalBadge from '../../../components/HistoricalBadge';
import { supabase } from '../../../lib/supabase';

export default function TratamientosCompletadosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bypassHistoricalMode, loadPatientSettings } = useHistoricalMode();
  const [completedTreatments, setCompletedTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const [patientBypassStatus, setPatientBypassStatus] = useState<Record<string, boolean>>({});
  
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
    // First filter by historical mode - TEMPORARILY DISABLED FOR DEBUGGING
    if (!bypassHistoricalMode) {
      // Check if this is a historical treatment and filter it out
      const treatmentDate = treatment.fecha_cita;
      if (treatmentDate) {
        console.log('🔍 Filtering treatment:', {
          treatmentId: treatment.id,
          treatmentDate,
          treatmentDateTime: new Date(treatmentDate),
          launchDate: new Date(Date.UTC(2026, 1, 2))
        });
        
        // Use the same launch date as the database config (2026-02-02)
        // This ensures consistency with the record category utils
        const launchDate = new Date(Date.UTC(2026, 1, 2)); // UTC 2026-02-02
        const treatmentDateTime = new Date(treatmentDate);
        const isHistorical = treatmentDateTime < launchDate;
        
        console.log('🔍 Historical check result:', { isHistorical });
        
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
  });

  // Pagination calculations
  const totalTreatments = filteredTreatments.length;
  const totalPages = Math.ceil(totalTreatments / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentTreatments = filteredTreatments.slice(startIndex, endIndex);

  // Reset to page 1 when search term or records per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recordsPerPage]);

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, identidad, teléfono o tratamiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
                <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'grid' | 'list')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="grid">Vista Cuadrícula</option>
                <option value="list">Vista Lista</option>
              </select>
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
                            ID: {treatment.paciente_id}
                          </p>
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm`}>
                              <i className={`fas ${
                                treatment.estado === 'pagado' ? 'fa-dollar-sign' :
                                (treatment.estado === 'firmado' || treatment.firma_paciente_url) ? 'fa-check-circle' :
                                'fa-clock'
                              } mr-1`}></i>
                              {treatment.estado === 'pagado' ? 'Pagado' :
                               (treatment.estado === 'firmado' || treatment.firma_paciente_url) ? 'Firmado' :
                               'Pendiente'}
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
                        
                        {/* Show prices when historical mode is bypassed */}
                        {bypassHistoricalMode && (() => {
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
                            </>
                          );
                        })()}
                        
                        {/* Show message when historical mode is not bypassed */}
                        {!bypassHistoricalMode && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                            Precios ocultos (modo histórico activado)
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-3 mt-4">
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
                              ID: {treatment.paciente_id}
                            </div>
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
                          {formatCurrency(treatment.total_final)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            treatment.estado === 'pagado' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : (treatment.estado === 'firmado' || treatment.firma_paciente_url)
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {treatment.estado === 'pagado' ? 'Pagado' :
                             (treatment.estado === 'firmado' || treatment.firma_paciente_url) ? 'Firmado' :
                             'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
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
                        value={recordsPerPage}
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
    </>
  );
}
