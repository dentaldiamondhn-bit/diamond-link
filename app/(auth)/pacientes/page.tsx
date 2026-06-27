'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PatientService } from '../../../services/patientService';
import { Patient } from '../../../types/patient';
import Link from 'next/link';
import { useRoleBasedAccess } from '../../../hooks/useRoleBasedAccess';
import { useUser } from '@clerk/nextjs';
import { usePagePreferences } from '../../../hooks/useUserPreferences';
import { supabase } from '../../../lib/supabase';
import LoadingAnimation from '../../../components/LoadingAnimation';
import { SimpleTimezoneFix } from '../../../services/simpleTimezoneFix';
import { useDeviceInfo, getDeviceSpecificStyles } from '@/hooks/useDeviceInfo';
import { useMobileNotifications } from '@/services/mobileNotificationService';
import { useMobileAnalytics } from '@/services/mobileAnalyticsService';
import { useDebounce } from '@/hooks/useDebounce';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientListRow } from '@/components/patients/PatientListRow';
import { DEFAULT_DOCTORS } from '@/config/doctors';

export default function PacientesPage() {
  const router = useRouter();
  const { user } = useUser();
  const { hasPermission } = useRoleBasedAccess();
  
  // Mobile enhancement hooks
  const deviceInfo = useDeviceInfo();
  const deviceStyles = getDeviceSpecificStyles(deviceInfo);
  const { track } = useMobileAnalytics();
  
  // Preferences
  const { preferences: pagePrefs, updatePreferences: updatePagePrefs, loading: prefsLoading } = usePagePreferences('pacientes');
  
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [showWarningModal, setShowWarningModal] = useState<Patient | null>(null);
  const [patientBypassStatus, setPatientBypassStatus] = useState<Record<string, boolean>>({});

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<'nombre_completo' | 'fecha_nacimiento' | 'doctor' | 'fecha_inicio'>('fecha_inicio');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [doctorFilter, setDoctorFilter] = useState<string>('');

  // Initial preferences load
  useEffect(() => {
    if (pagePrefs && !prefsLoading) {
      if (pagePrefs.viewMode) setViewMode(pagePrefs.viewMode);
      if (pagePrefs.recordsPerPage) setRecordsPerPage(pagePrefs.recordsPerPage);
      if (pagePrefs.sortBy) setSortBy(pagePrefs.sortBy);
      if (pagePrefs.sortOrder) setSortOrder(pagePrefs.sortOrder);
    }
  }, [pagePrefs, prefsLoading]);

  // Load patients from server
  const loadPatients = useCallback(async () => {
    if (!hasPermission('canViewPatients')) return;
    
    setLoading(true);
    try {
      const result = await PatientService.getPatients({
        page: currentPage,
        pageSize: recordsPerPage,
        searchTerm: debouncedSearchTerm,
        sortBy: sortBy === 'nombre' ? 'nombre_completo' : sortBy === 'edad' ? 'fecha_nacimiento' : sortBy,
        sortOrder: sortOrder,
        filters: {
          doctor: doctorFilter || undefined
        }
      });

      setPatients(result.patients);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);

      // Load bypass status for newly loaded patients
      if (user) {
        const bypassPromises = result.patients.map(async (patient) => {
          const status = await checkPatientBypassStatus(patient.paciente_id!);
          return { id: patient.paciente_id!, status };
        });
        const statuses = await Promise.all(bypassPromises);
        const statusMap = statuses.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.status }), {});
        setPatientBypassStatus(prev => ({ ...prev, ...statusMap }));
      }

      track('patient_list_loaded', {
        totalPatients: result.totalCount,
        page: currentPage,
        searchTerm: debouncedSearchTerm,
        deviceType: deviceInfo.isMobile ? 'mobile' : deviceInfo.isTablet ? 'tablet' : 'desktop'
      });
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, recordsPerPage, debouncedSearchTerm, sortBy, sortOrder, doctorFilter, hasPermission, user, deviceInfo.isMobile, deviceInfo.isTablet, track]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Check if a specific patient has bypass activated
  const checkPatientBypassStatus = useCallback(async (pacienteId: string) => {
    try {
      const { data: allPatientSettings, error: allSettingsError } = await supabase
        .from('historical_mode_settings')
        .select('bypass_historical_mode, clerk_user_id, updated_at')
        .eq('patient_id', pacienteId);
      
      const { data: globalData, error: globalError } = await supabase
        .from('app_configuration')
        .select('config_value')
        .eq('config_key', 'historical_records_enabled')
        .single();
      
      let globalBypass = false;
      if (globalData && !globalError) {
        globalBypass = globalData.config_value !== 'true';
      }
      
      if (allPatientSettings && allPatientSettings.length > 0 && !allSettingsError) {
        const sortedSettings = allPatientSettings.sort((a, b) => 
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );
        return sortedSettings[sortedSettings.length - 1].bypass_historical_mode;
      }
      return globalBypass;
    } catch (error) {
      return false;
    }
  };

  const calculateAge = (fechaNacimiento: string): string => {
    if (!fechaNacimiento) return 'No especificada';
    try {
      return `${SimpleTimezoneFix.calculateAge(fechaNacimiento)} años`;
    } catch (error) {
      return 'No especificada';
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
    setCurrentPage(1);
    updatePagePrefs({ recordsPerPage: value });
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      updatePagePrefs({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
      updatePagePrefs({ sortBy: newSortBy, sortOrder: 'asc' });
    }
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    updatePagePrefs({ viewMode: mode });
  };

  const getPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (loading && patients.length === 0) {
    return (
      <LoadingAnimation 
        message="Cargando Pacientes"
        subMessage="Obteniendo lista de pacientes"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Search and Filters Bar */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, identidad o teléfono..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-all"
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-all hover:border-teal-400"
            >
              <option value="">Todos los Doctores</option>
              {DEFAULT_DOCTORS.map(doctor => (
                <option key={doctor.id} value={doctor.name}>{doctor.name}</option>
              ))}
            </select>
            
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-teal-600' : 'text-gray-500'}`}
              >
                <i className="fas fa-th-large"></i>
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-teal-600' : 'text-gray-500'}`}
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Sort Chips */}
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">Ordenar por:</span>
          {[
            { id: 'nombre_completo', label: 'Nombre' },
            { id: 'fecha_nacimiento', label: 'Edad' },
            { id: 'fecha_inicio', label: 'Fecha Inicio' },
            { id: 'doctor', label: 'Doctor' }
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => handleSortChange(option.id as any)}
              className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${
                sortBy === option.id
                  ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-300'
                  : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
              }`}
            >
              {option.label}
              {sortBy === option.id && (
                <i className={`fas fa-sort-amount-${sortOrder === 'asc' ? 'up' : 'down'} text-xs`}></i>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <i className="fas fa-user-friends text-5xl text-gray-300 mb-4"></i>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">No se encontraron pacientes</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Intenta ajustar tu búsqueda o filtros.</p>
          <Link href="/patient-form" className="mt-6 inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all">
            <i className="fas fa-plus mr-2"></i> Nuevo Paciente
          </Link>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <PatientCard
                  key={patient.paciente_id}
                  patient={patient}
                  patientBypassStatus={patientBypassStatus[patient.paciente_id!] || false}
                  onShowWarning={setShowWarningModal}
                  calculateAge={calculateAge}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paciente</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prótesis</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teléfono</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Edad</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Doctor</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {patients.map((patient) => (
                      <PatientListRow
                        key={patient.paciente_id}
                        patient={patient}
                        patientBypassStatus={patientBypassStatus[patient.paciente_id!] || false}
                        calculateAge={calculateAge}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {patients.length} de {totalCount} pacientes
            </div>

            <div className="flex items-center gap-2">
              <select
                value={recordsPerPage}
                onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                className="px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                {[10, 25, 50, 100].map(n => (
                  <option key={n} value={n}>{n} por página</option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all"
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>

                {getPaginationNumbers().map((page, i) => (
                  <button
                    key={i}
                    onClick={() => typeof page === 'number' && handlePageChange(page)}
                    disabled={page === '...'}
                    className={`min-w-[36px] h-[36px] rounded-lg border text-sm transition-all ${
                      currentPage === page
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : page === '...' ? 'border-transparent' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all"
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-100 dark:border-red-900/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-exclamation-triangle text-red-500"></i>
                Alertas Médicas
              </h3>
              <button onClick={() => setShowWarningModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="space-y-4">
              {showWarningModal.enfermedades && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
                  <div className="text-sm font-bold text-red-800 dark:text-red-300 uppercase tracking-wider mb-1">Enfermedades</div>
                  <div className="text-red-700 dark:text-red-200">{showWarningModal.enfermedades}</div>
                </div>
              )}
              {showWarningModal.alergias && (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                  <div className="text-sm font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider mb-1">Alergias</div>
                  <div className="text-orange-700 dark:text-orange-200">{showWarningModal.alergias}</div>
                </div>
              )}
              {showWarningModal.medicamentos && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Medicamentos</div>
                  <div className="text-blue-700 dark:text-blue-200">{showWarningModal.medicamentos}</div>
                </div>
              )}
              {showWarningModal.sexo === 'femenino' && showWarningModal.embarazo === 'si' && (
                <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-xl border border-pink-100 dark:border-pink-800">
                  <div className="text-sm font-bold text-pink-800 dark:text-pink-300 uppercase tracking-wider mb-1">Embarazo</div>
                  <div className="text-pink-700 dark:text-pink-200">
                    {showWarningModal.semanas_embarazo ? `${showWarningModal.semanas_embarazo} semanas` : 'Activo'}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowWarningModal(null)}
              className="mt-8 w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
