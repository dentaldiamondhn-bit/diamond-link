'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { dentalStudyService } from '../../../services/dentalStudyService';
import { PatientXraySummary } from '../../../types/dental';
import Link from 'next/link';
import { getPatientType } from '../../../utils/patientTypeUtils';
import { usePagePreferences } from '../../../hooks/useUserPreferences';
import LoadingAnimation from '../../../components/LoadingAnimation';

export default function XrayViewerPage() {
  const [patients, setPatients] = useState<PatientXraySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const router = useRouter();
  
  // Use page preferences for xray viewer
  const { preferences: pagePrefs, updatePreferences: updatePagePrefs, loading: prefsLoading } = usePagePreferences('xray-viewer');
  
  // Initialize state from preferences or defaults
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(pagePrefs?.viewMode || 'grid');
  const [recordsPerPage, setRecordsPerPage] = useState(pagePrefs?.recordsPerPage || 25);
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

  // Simple debounce function
  const useDebounce = (callback: Function, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout>();
    
    return (...args: any[]) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    };
  };

  // Debounced search handler
  const debouncedSearch = useDebounce((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to page 1 when searching
  }, 500);

  // Load patients with xray data
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { patients: patientsData, total } = await dentalStudyService.getPatientsWithXraySummary(
          currentPage,
          recordsPerPage,
          searchTerm,
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
      loadPatients();
    }
  }, [currentPage, recordsPerPage, searchTerm, sortBy, sortOrder, prefsLoading]);

  // Calculate pagination
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const totalPages = Math.ceil(totalPatients / recordsPerPage);

  // Note: No need for client-side filtering since search is now handled server-side

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <i className="fas fa-x-ray mr-3 text-teal-600"></i>
                Visor de Rayos X
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gestiona y visualiza estudios radiográficos de pacientes
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, ID o tipo de estudio..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
                <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
              </div>
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
          
          <div className="flex items-center justify-end mt-4">
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

        {/* Patients Display */}
        {patients.length === 0 ? (
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
                {patients.map((patient) => {
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
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold border border-white/30">
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
                      {patients.map((patient) => (
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
            {totalPatients > 0 && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                  {/* Records Counter and Per Page Selector */}
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Total Pacientes: {totalPatients}</span>
                      <span className="mx-2">|</span>
                      <span>Mostrando: {startIndex + 1}-{Math.min(endIndex, totalPatients)} de {totalPatients}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">
                        Mostrar:
                      </label>
                      <select
                        value={recordsPerPage}
                        onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
                    >
                      <i className="fas fa-angle-double-left"></i>
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
                    >
                      <i className="fas fa-angle-left"></i>
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm border rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
                    >
                      <i className="fas fa-angle-right"></i>
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
                    >
                      <i className="fas fa-angle-double-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
