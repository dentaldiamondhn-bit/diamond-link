'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dentalStudyService } from '../../../services/dentalStudyService';
import { PatientXraySummary } from '../../../types/dental';
import Link from 'next/link';
import { getPatientType } from '../../../utils/patientTypeUtils';
import { usePagePreferences } from '../../../hooks/useUserPreferences';
import LoadingAnimation from '../../../components/LoadingAnimation';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

export default function XrayViewerPage() {
  const { userRole, isLoaded } = useRoleBasedAccess();

  const [patients, setPatients] = useState<PatientXraySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalPatients, setTotalPatients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const router = useRouter();
  
  // Use page preferences for xray viewer
  const { preferences: pagePrefs, updatePreferences: updatePagePrefs, loading: prefsLoading } = usePagePreferences('xray-viewer');
  
  // Initialize state from preferences or defaults
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(pagePrefs?.viewMode || 'grid');
  const [sortBy, setSortBy] = useState<'nombre' | 'fecha' | 'estudios'>(pagePrefs?.sortBy || 'nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(pagePrefs?.sortOrder || 'asc');

  // Utility functions
  const formatDateSpanish = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Load all patients with xray data on mount (for client-side filtering)
  useEffect(() => {
    const loadAllPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load all patients without pagination for client-side filtering
        const { patients: patientsData, total } = await dentalStudyService.getPatientsWithXraySummary(
          1,
          10000, // Get all records
          '',    // No search filter - get everything
          sortBy,
          sortOrder
        );
        
        setPatients(patientsData);
        setTotalPatients(total);
      } catch (err) {
        console.error('Error loading patients with xray data:', err);
        setError('Error al cargar los datos de rayos X');
      } finally {
        setLoading(false);
      }
    };

    if (!prefsLoading) {
      loadAllPatients();
    }
  }, [sortBy, sortOrder, prefsLoading]);

  // Client-side filtering
  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.nombre_completo?.toLowerCase().includes(searchLower) ||
      patient.numero_identidad?.toLowerCase().includes(searchLower) ||
      patient.latest_study_type?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalFiltered = filteredPatients.length;
  const totalPages = Math.ceil(totalFiltered / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
    setCurrentPage(1);
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            <i className="fas fa-redo mr-2"></i>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!userRole || (userRole !== 'admin' && userRole !== 'doctor' && userRole !== 'tech_support')) {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permisos para acceder al visor de rayos X."
        explanation="Esta área es exclusiva para administradores, doctores y personal de soporte técnico que pueden ver imágenes radiográficas de pacientes."
        contactInfo="Si necesitas acceso, contacta a un administrador del sistema."
        onGoBack={() => window.history.back()}
      />
    );
  }

  return (
    <div data-rr-block className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar por nombre, ID o tipo de estudio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
                <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
              </div>
              
              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'nombre' | 'fecha' | 'estudios')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="nombre">Nombre</option>
                  <option value="fecha">Fecha</option>
                  <option value="estudios">Estudios</option>
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

        {/* Patients Display */}
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <i className="fas fa-x-ray text-6xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron pacientes con estudios' : 'No hay pacientes con estudios de rayos X'}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Los estudios de rayos X aparecerán aquí cuando se agreguen'}
            </p>
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {currentPatients.map((patient) => {
                  const patientType = getPatientType(patient);
                  return (
                    <div
                      key={patient.patient_id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      {/* Patient Header */}
                      <div
                        className="p-4 text-white"
                        style={{
                          background: patientType.colors.header
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold border border-white/30 dark:border-white/60">
                            {patient.nombre_completo?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white">
                              {patient.nombre_completo}
                            </h3>
                            <p className="text-white/80 text-sm">
                              ID: {patient.numero_identidad}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Patient Details */}
                      <div className="p-4">
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <i className="fas fa-x-ray w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                            <span>{patient.study_count} estudio{patient.study_count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <i className="fas fa-images w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                            <span>{patient.total_images} imagen{patient.total_images !== 1 ? 'es' : ''}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <i className="fas fa-calendar w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                            <span>
                              Último estudio: {formatDateSpanish(patient.latest_study_date)}
                            </span>
                          </div>
                          {patient.latest_study_type && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <i className="fas fa-tag w-4 mr-2 text-teal-600 dark:text-teal-400"></i>
                              <span>{patient.latest_study_type}</span>
                            </div>
                          )}
                        </div>

                        {/* Thumbnail */}
                        {patient.thumbnail_url && (
                          <div className="mb-4">
                            <img
                              src={patient.thumbnail_url}
                              alt="Última radiografía"
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                            />
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="flex justify-center">
                          <Link
                            href={`/xray-viewer/${patient.patient_id}`}
                            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-center font-medium"
                          >
                            <i className="fas fa-eye mr-2"></i>
                            Ver Estudios
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Estudios
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Imágenes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Último Estudio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {currentPatients.map((patient) => (
                        <tr key={patient.patient_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                                  <span className="text-sm font-medium text-teal-600 dark:text-teal-300">
                                    {patient.nombre_completo?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {patient.nombre_completo}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {patient.numero_identidad}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {patient.study_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {patient.total_images}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDateSpanish(patient.latest_study_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                              {patient.latest_study_type || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/xray-viewer/${patient.patient_id}`}
                              className="text-teal-600 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300"
                            >
                              Ver detalles
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination and Records Counter */}
            {totalFiltered > 0 && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                  {/* Records Counter */}
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Total Pacientes: {totalFiltered}</span>
                    <span className="mx-2">|</span>
                    <span>Mostrando: {startIndex + 1}-{Math.min(endIndex, totalFiltered)} de {totalFiltered}</span>
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
    </div>
  );
}
