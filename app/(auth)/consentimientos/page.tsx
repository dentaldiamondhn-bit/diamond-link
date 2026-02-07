'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { consentimientoService } from '../../../services/consentimientoService';
import { PatientService } from '../../../services/patientService';
import { createWhatsAppUrl, formatPhoneDisplay } from '../../../utils/phoneUtils';
import { getPatientType } from '../../../utils/patientTypeUtils';
import { CONSENT_TEMPLATES, getConsentTemplate } from '../../../utils/consentTemplates';

function ConsentimientosContent() {
  const [consentimientos, setConsentimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConsentimiento, setSelectedConsentimiento] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    content: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sortBy, setSortBy] = useState<'nombre' | 'fecha' | 'tipo'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Change 'asc' to 'desc'

  const searchParams = useSearchParams();
  const pacienteId = searchParams.get('paciente_id') || searchParams.get('id');

  useEffect(() => {
    const loadConsentimientos = async () => {
      try {
        setLoading(true);
        
        // Load consents for specific patient if pacienteId is provided, otherwise load all
        let data;
        if (pacienteId) {
          data = await consentimientoService.getConsentimientosByPaciente(pacienteId);
        } else {
          data = await consentimientoService.getAllConsentimientos();
        }
        
        // Transform data to match expected format and include patient info
        const transformedData = await Promise.all(data.map(async (consentimiento) => {
          // Fetch patient information
          let patientInfo = null;
          let patientType = null;
          if (consentimiento.paciente_id) {
            try {
              patientInfo = await PatientService.getPatientById(consentimiento.paciente_id);
              
              // Calculate patient type for age-based color coding
              if (patientInfo) {
                const patientTypeData = getPatientType(patientInfo);
                
                // Special case: pregnancy override - use soft pink to blue gradient
                let finalPatientType = patientTypeData;
                if (patientInfo.sexo === 'femenino' && patientInfo.embarazo === 'si') {
                  finalPatientType = {
                    ...patientTypeData,
                    colors: {
                      header: 'from-pink-400 to-blue-400',
                      badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
                      badgeText: 'border-pink-200 text-pink-700 dark:text-pink-300'
                    }
                  };
                }
                
                patientType = finalPatientType;
              }
            } catch (error) {
              console.error('Error fetching patient info:', error);
            }
          }
          
          return {
            id: consentimiento.id,
            nombre: consentimiento.nombre_consentimiento,
            tipo: consentimiento.tipo_consentimiento,
            type: consentimiento.tipo_consentimiento, // Add for backward compatibility
            descripcion: consentimiento.descripcion,
            contenido: consentimiento.contenido,
            fechaCreacion: consentimiento.creado_en,
            lastUpdated: consentimiento.actualizado_en, // Add this field
            paciente_id: consentimiento.paciente_id,
            status: consentimiento.estado || 'active', // Map estado to status
            patientInfo: patientInfo || {
              nombre_completo: 'Paciente no encontrado',
              numero_identidad: 'N/A',
              direccion: 'N/A',
              doctor: 'N/A'
            },
            patientType: patientType
          };
        }));
        
        setConsentimientos(transformedData);
      } catch (error) {
        console.error(' Error loading consentimientos:', error);
        setError('Error loading consentimientos: ' + (error as Error).message);
        // Fallback to mock data if service fails
        setConsentimientos([
          {
            id: 1,
            name: 'Consentimiento de Tratamiento',
            type: 'tratamiento',
            description: 'Consentimiento informado para procedimientos odontológicos',
            date: '2024-01-15',
            status: 'active',
            patientCount: 156,
            lastUpdated: '2024-01-14'
          },
          {
            id: 2,
            name: 'Consentimiento de Radiografía',
            type: 'radiografia',
            description: 'Autorización para toma de radiografías dentales',
            date: '2024-01-12',
            status: 'active',
            patientCount: 89,
            lastUpdated: '2024-01-10'
          },
          {
            id: 3,
            name: 'Consentimiento de Anestesia',
            type: 'anestesia',
            description: 'Consentimiento para procedimientos con anestesia',
            date: '2024-01-08',
            status: 'active',
            patientCount: 67,
            lastUpdated: '2024-01-07'
          },
          {
            id: 4,
            name: 'Consentimiento de Extracción',
            type: 'extraccion',
            description: 'Autorización para extracciones dentales',
            date: '2024-01-05',
            status: 'active',
            patientCount: 45,
            lastUpdated: '2024-01-04'
          },
          {
            id: 5,
            name: 'Consentimiento General',
            type: 'otros',
            description: 'Consentimiento informado general para tratamientos odontológicos',
            date: '2024-01-20',
            status: 'active',
            patientCount: 89,
            lastUpdated: '2024-01-18'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadConsentimientos();
  }, [pacienteId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically save to your backend
    alert('Consentimiento guardado exitosamente');
    setShowForm(false);
    setFormData({
      name: '',
      type: '',
      description: '',
      content: ''
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = getConsentTemplate(templateId);
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        description: template.description,
        content: template.content
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ortodoncia': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'implantes': return 'bg-green-100 text-green-800 border-green-200';
      case 'blanqueamiento': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cirugia': return 'bg-red-100 text-red-800 border-red-200';
      case 'endodoncia': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'periodoncia': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'protesis': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'otros': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ortodoncia': return 'fa-teeth';
      case 'implantes': return 'fa-tooth';
      case 'blanqueamiento': return 'fa-sparkles';
      case 'cirugia': return 'fa-scalpel';
      case 'endodoncia': return 'fa-tooth-medical';
      case 'periodoncia': return 'fa-teeth-open';
      case 'protesis': return 'fa-denture';
      case 'otros': return 'fa-file-signature';
      default: return 'fa-file-signature';
    }
  };

  const filteredConsentimientos = consentimientos.filter(consent => {
    const matchesSearch = (consent.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (consent.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (consent.patientInfo?.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || consent.tipo === selectedType;
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'nombre':
        comparison = (a.nombre || '').localeCompare(b.nombre || '');
        break;
      case 'fecha':
        comparison = new Date(a.fecha_cita || 0).getTime() - new Date(b.fecha_cita || 0).getTime();
        break;
      case 'tipo':
        comparison = (a.tipo || '').localeCompare(b.tipo || '');
        break;
      default:
        comparison = (a.nombre || '').localeCompare(b.nombre || '');
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination calculations
  const totalConsentimientos = filteredConsentimientos.length;
  const totalPages = Math.ceil(totalConsentimientos / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentConsentimientos = filteredConsentimientos.slice(startIndex, endIndex);

  // Reset to page 1 when search term, records per page, sort by, sort order, or type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recordsPerPage, sortBy, sortOrder, selectedType]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
  };

  const handleDelete = (consentimiento: any) => {
    setSelectedConsentimiento(consentimiento);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedConsentimiento) return;
    
    try {
      await consentimientoService.deleteConsentimiento(selectedConsentimiento.id);
      setConsentimientos(consentimientos.filter(c => c.id !== selectedConsentimiento.id));
      setShowDeleteModal(false);
      setSelectedConsentimiento(null);
    } catch (error) {
      console.error('Error deleting consentimiento:', error);
      // You could show a toast notification here
    }
  };

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-600"></div>
          <div className="absolute top-0 left-0 animate-ping rounded-full h-16 w-16 border-4 border-teal-300 opacity-20"></div>
        </div>
        <span className="ml-6 text-lg font-medium text-gray-600">Cargando consentimientos...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          {/* Title moved to main header */}
        </div>
        
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar por nombre, descripción o paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
                <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
              </div>
              
              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos los tipos</option>
                <option value="ortodoncia">Ortodoncia</option>
                <option value="implantes">Implantes</option>
                <option value="blanqueamiento">Blanqueamiento</option>
                <option value="cirugia">Cirugía</option>
                <option value="endodoncia">Endodoncia</option>
                <option value="periodoncia">Periodoncia</option>
                <option value="protesis">Prótesis</option>
                <option value="otros">Otros</option>
              </select>
              
              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar por:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'nombre' | 'fecha' | 'tipo')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="nombre">Nombre</option>
                  <option value="fecha">Fecha</option>
                  <option value="tipo">Tipo</option>
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
            {/* Crear Nuevo Button */}
            <Link
              href={pacienteId ? `/consentimientos/new?id=${pacienteId}` : "/consentimientos/new"}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <i className="fas fa-plus mr-2"></i>
              Crear Nuevo
            </Link>
            
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
        
        {/* Enhanced Consentimientos Display */}
        {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentConsentimientos.map((consentimiento) => (
            <div
              key={consentimiento.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group"
            >
              <div className={`bg-gradient-to-r ${consentimiento.patientType?.colors?.header || 'from-teal-500 to-cyan-500'} p-4 text-white`}>
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(consentimiento.tipo)} bg-white/20 backdrop-blur-sm text-white`}>
                    <i className={`fas ${getTypeIcon(consentimiento.tipo)} mr-1`}></i>
                    {consentimiento.tipo}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Age Badge */}
                    {consentimiento.patientType && (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${consentimiento.patientType.colors.badge} ${consentimiento.patientType.colors.badgeText}`}>
                        {consentimiento.patientType.label}
                      </span>
                    )}
                    {/* Pregnancy Badge */}
                    {consentimiento.patientInfo?.sexo === 'femenino' && consentimiento.patientInfo?.embarazo === 'si' && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold text-white bg-pink-500 flex items-center">
                        <i className="fas fa-baby mr-1"></i>
                        Embarazo
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      consentimiento.status === 'active' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-yellow-500 text-white'
                    }`}>
                      {consentimiento.status === 'active' ? 'Activo' : 'Firmado'}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{consentimiento.name}</h3>
                <p className="text-white/80 text-sm line-clamp-2">{consentimiento.description}</p>
              </div>
              
              <div className="p-4">
                {/* Patient Name - Top */}
                <div className="flex items-center text-sm font-semibold text-gray-900 dark:text-white truncate mb-3">
                  {consentimiento.patientInfo.nombre_completo}
                </div>
                
                {/* ID and Phone - Below Name */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center">
                      <i className="fas fa-id-card w-3 mr-1 text-teal-600 dark:text-teal-400"></i>
                      {consentimiento.patientInfo.numero_identidad}
                    </span>
                    {consentimiento.patientInfo.telefono && (
                      <a 
                        href={createWhatsAppUrl(consentimiento.patientInfo.telefono, consentimiento.patientInfo.codigopais)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors duration-200"
                      >
                        <i className="fab fa-whatsapp w-3 mr-1"></i>
                        {formatPhoneDisplay(consentimiento.patientInfo.telefono, consentimiento.patientInfo.codigopais)}
                      </a>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Actualizado: {consentimiento.lastUpdated ? new Date(consentimiento.lastUpdated).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </div>
                  <div className="flex space-x-2">
                    {consentimiento.tipo === 'otros' && pacienteId ? (
                      <Link
                        href={`/consentimientos/${consentimiento.id}/preview?paciente_id=${pacienteId}`}
                        className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-teal-500 to-cyan-700 text-white text-xs font-medium rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <i className="fas fa-eye mr-1"></i>
                        Ver
                      </Link>
                    ) : (
                      <Link
                        href={`/consentimientos/${consentimiento.id}/preview`}
                        className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-teal-500 to-cyan-700 text-white text-xs font-medium rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <i className="fas fa-eye mr-1"></i>
                        Ver
                      </Link>
                    )}
                    <button 
                      onClick={() => handleDelete(consentimiento)}
                      className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-red-400 to-red-700 text-white text-xs font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <i className="fas fa-trash mr-1"></i>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Consentimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contacto
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
                {currentConsentimientos.map((consentimiento) => (
                  <tr key={consentimiento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {consentimiento.nombre}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(consentimiento.tipo)} bg-gray-100 dark:bg-gray-700`}>
                            <i className={`fas ${getTypeIcon(consentimiento.tipo)} mr-1`}></i>
                            {consentimiento.tipo}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {consentimiento.patientInfo.nombre_completo}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {consentimiento.patientInfo.numero_identidad}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {consentimiento.patientInfo.telefono && (
                        <a 
                          href={createWhatsAppUrl(consentimiento.patientInfo.telefono, consentimiento.patientInfo.codigopais)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-sm flex items-center gap-1"
                        >
                          <i className="fab fa-whatsapp text-xs"></i>
                          {formatPhoneDisplay(consentimiento.patientInfo.telefono, consentimiento.patientInfo.codigopais)}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        consentimiento.status === 'activo' || consentimiento.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {consentimiento.status === 'activo' || consentimiento.status === 'active' ? 'Activo' : 'Firmado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/consentimientos/${consentimiento.id}/preview`}
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

      {currentConsentimientos.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl shadow-xl p-12 text-center border border-gray-200 dark:border-gray-600">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <i className="fas fa-search text-6xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            No se encontraron consentimientos
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Intenta ajustar los filtros de búsqueda o crea un nuevo consentimiento.
          </p>
        </div>
      )}

      {/* Pagination and Records Counter */}
      {totalConsentimientos > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            {/* Records Counter */}
            <div className="text-sm text-gray-700">
              <span className="font-medium">Total Consentimientos: {totalConsentimientos}</span>
              <span className="mx-2">|</span>
              <span>Mostrando: {startIndex + 1}-{Math.min(endIndex, totalConsentimientos)} de {totalConsentimientos}</span>
            </div>

            {/* Records Per Page Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Registros por página:</label>
              <div className="relative">
                <select
                  value={recordsPerPage}
                  onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer transition-colors duration-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
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
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>

                {/* Page Numbers */}
                {getPaginationNumbers().map((page, index) => (
                  <span key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-1 text-sm text-gray-500">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page as number)}
                        className={`px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                          currentPage === page
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'border-gray-300 hover:bg-gray-50'
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
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedConsentimiento && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <i className="fas fa-exclamation-triangle text-red-600"></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Eliminar Consentimiento
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ¿Está seguro de que desea eliminar el consentimiento "{selectedConsentimiento.name}"? Esta acción no se puede deshacer y también eliminará las firmas asociadas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmDelete}
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function Consentimientos() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando consentimientos...</p>
        </div>
      </div>
    }>
      <ConsentimientosContent />
    </Suspense>
  );
}