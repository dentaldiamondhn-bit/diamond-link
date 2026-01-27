'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Treatment, Promotion } from '@/types/treatment';
import { formatCurrency, getCurrencySymbol, getAvailableCurrencies } from '../../../utils/currencyUtils';
import { formatPhoneDisplay, createWhatsAppUrl } from '../../../utils/phoneUtils';
import { getPatientType, calculateAge } from '../../../utils/patientTypeUtils';
import { getRecordCategoryInfo, getRecordCategoryInfoSync } from '../../../utils/recordCategoryUtils';
import { CompletedTreatmentService } from '../../../services/completedTreatmentService';
import type { CompletedTreatment, TreatmentItem } from '../../../services/completedTreatmentService';
import { TreatmentService } from '../../../services/treatmentService';
import LoadingAnimation from '../../../components/LoadingAnimation';
import { useHistoricalMode } from '../../../contexts/HistoricalModeContext';
import HistoricalBadge from '../../../components/HistoricalBadge';
import { supabase } from '../../../lib/supabase';

export default function TratamientosPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activeTab, setActiveTab] = useState<'tratamientos' | 'promociones'>('tratamientos');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  // Autocomplete states
  const [codigoSuggestions, setCodigoSuggestions] = useState<string[]>([]);
  const [showCodigoSuggestions, setShowCodigoSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [treatmentFormData, setTreatmentFormData] = useState<Partial<Treatment>>({
    codigo: '',
    nombre: '',
    especialidad: '',
    precio: 0,
    moneda: 'HNL', // Default currency
    notas: '',
    veces_realizado: 0, // Start counter at 0 for new treatments
    activo: true
  });
  const [promotionFormData, setPromotionFormData] = useState<Partial<Promotion>>({
    codigo: '',
    nombre: '',
    descuento: 0,
    precio_original: 0,
    precio_promocional: 0,
    moneda: 'HNL', // Default currency
    fecha_inicio: '',
    fecha_fin: '',
    veces_realizado: 0, // Reset counter to 0 for new promotions
    activo: true
  });
  const router = useRouter();

  // List of dental specialties
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

  useEffect(() => {
    loadTreatments();
    loadPromotions();
  }, []);

  const loadTreatments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tratamientos');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTreatments(data);
    } catch (error) {
      console.error('Error loading treatments:', error);
      // Set empty array if API fails
      setTreatments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPromotions = async () => {
    try {
      const response = await fetch('/api/promociones');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPromotions(data);
    } catch (error) {
      console.error('Error loading promotions:', error);
      // Set empty array if API fails
      setPromotions([]);
    }
  };

  const filteredTreatments = treatments.filter(treatment =>
    treatment.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    treatment.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    treatment.especialidad?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPromotions = promotions.filter(promotion =>
    promotion.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promotion.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const currentData = activeTab === 'tratamientos' ? filteredTreatments : filteredPromotions;
  const totalRecords = currentData.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  // Reset to page 1 when search term or records per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recordsPerPage, activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
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

  const handleAddTreatment = () => {
    setSelectedTreatment(null);
    setSelectedPromotion(null);
    setTreatmentFormData({
      codigo: '',
      nombre: '',
      especialidad: '',
      precio: 0,
      moneda: 'HNL',
      notas: '',
      veces_realizado: 0,
      activo: true
    });
    setShowAddModal(true);
  };

  const handleAddPromotion = () => {
    setSelectedTreatment(null);
    setSelectedPromotion(null);
    setPromotionFormData({
      nombre: '',
      descuento: 0,
      precio_original: 0,
      precio_promocional: 0,
      fecha_inicio: '',
      fecha_fin: '',
      activo: true
    });
    setShowAddModal(true);
  };

  const handleEditTreatment = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setSelectedPromotion(null);
    setTreatmentFormData({
      codigo: treatment.codigo,
      nombre: treatment.nombre,
      especialidad: treatment.especialidad || '',
      precio: treatment.precio,
      moneda: treatment.moneda || 'HNL',
      notas: treatment.notas || '',
      veces_realizado: treatment.veces_realizado || 0,
      activo: treatment.activo !== false
    });
    // Clear autocomplete suggestions when editing
    setShowCodigoSuggestions(false);
    setCodigoSuggestions([]);
    setShowAddModal(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setSelectedTreatment(null);
    setPromotionFormData({
      codigo: promotion.codigo || '',
      nombre: promotion.nombre || '',
      descuento: promotion.descuento || 0,
      precio_original: promotion.precio_original || 0,
      precio_promocional: promotion.precio_promocional || 0,
      moneda: promotion.moneda || 'HNL',
      fecha_inicio: promotion.fecha_inicio || '',
      fecha_fin: promotion.fecha_fin || '',
      veces_realizado: promotion.veces_realizado || 0,
      activo: promotion.activo !== undefined ? promotion.activo : true
    });
    setShowAddModal(true);
  };

  const handleDeleteTreatment = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setSelectedPromotion(null);
    setShowDeleteModal(true);
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setSelectedTreatment(null);
    setShowDeleteModal(true);
  };

  // Autocomplete function for codigo
  const handleCodigoChange = (value: string) => {
    setTreatmentFormData({ ...treatmentFormData, codigo: value });
    
    if (value.length >= 2) {
      // Filter existing treatments based on codigo
      const suggestions = treatments
        .filter(t => t.codigo.toLowerCase().includes(value.toLowerCase()))
        .map(t => t.codigo)
        .slice(0, 5); // Limit to 5 suggestions
      
      setCodigoSuggestions(suggestions);
      setShowCodigoSuggestions(suggestions.length > 0);
    } else {
      setCodigoSuggestions([]);
      setShowCodigoSuggestions(false);
    }
  };

  const handleCodigoSelect = (codigo: string) => {
    const treatment = treatments.find(t => t.codigo === codigo);
    if (treatment) {
      setTreatmentFormData({
        codigo: treatment.codigo,
        nombre: treatment.nombre,
        especialidad: treatment.especialidad || '',
        precio: treatment.precio,
        veces_realizado: treatment.veces_realizado || 0,
        activo: treatment.activo !== false
      });
    }
    setShowCodigoSuggestions(false);
    setCodigoSuggestions([]);
  };

  // Handle specialty change to auto-generate code for new treatments
  const handleSpecialtyChange = async (newSpecialty: string) => {
    setTreatmentFormData({ ...treatmentFormData, especialidad: newSpecialty });
    
    // Only auto-generate code for new treatments (not edits)
    if (!selectedTreatment && newSpecialty) {
      try {
        const nextCode = await TreatmentService.generateNextCode(newSpecialty);
        setTreatmentFormData(prev => ({ ...prev, codigo: nextCode }));
      } catch (error) {
        console.error('Error generating next code:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (activeTab === 'tratamientos') {
        const treatmentData = {
          codigo: treatmentFormData.codigo || '',
          nombre: treatmentFormData.nombre || '',
          especialidad: treatmentFormData.especialidad || '',
          precio: treatmentFormData.precio || 0,
          moneda: treatmentFormData.moneda || 'HNL',
          notas: treatmentFormData.notas || '',
          veces_realizado: treatmentFormData.veces_realizado || 0,
          activo: treatmentFormData.activo !== false
        };

        if (selectedTreatment) {
          // Edit existing treatment
          const response = await fetch(`/api/tratamientos/${selectedTreatment.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(treatmentData),
          });

          if (!response.ok) {
            throw new Error('Failed to update treatment');
          }

          const updatedTreatment = await response.json();
          setTreatments(prev => prev.map(t => 
            t.id === selectedTreatment.id ? updatedTreatment : t
          ));
        } else {
          // Add new treatment
          const response = await fetch('/api/tratamientos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(treatmentData),
          });

          if (!response.ok) {
            throw new Error('Failed to create treatment');
          }

          const newTreatment = await response.json();
          setTreatments(prev => [...prev, newTreatment]);
        }
      } else {
        // Handle promotions
        const promotionData = {
          codigo: promotionFormData.codigo || '',
          nombre: promotionFormData.nombre || '',
          descuento: promotionFormData.descuento || 0,
          precio_original: promotionFormData.precio_original || 0,
          precio_promocional: promotionFormData.precio_promocional || 0,
          fecha_inicio: promotionFormData.fecha_inicio || '',
          fecha_fin: promotionFormData.fecha_fin || '',
          activo: promotionFormData.activo !== false
        };

        if (selectedPromotion) {
          // Edit existing promotion
          const response = await fetch(`/api/promociones/${selectedPromotion.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(promotionData),
          });

          if (!response.ok) {
            throw new Error('Failed to update promotion');
          }

          const updatedPromotion = await response.json();
          setPromotions(prev => prev.map(p => 
            p.id === selectedPromotion.id ? updatedPromotion : p
          ));
        } else {
          // Add new promotion
          const response = await fetch('/api/promociones', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(promotionData),
          });

          if (!response.ok) {
            throw new Error('Failed to create promotion');
          }

          const newPromotion = await response.json();
          setPromotions(prev => [...prev, newPromotion]);
        }
      }

      setShowAddModal(false);
      if (activeTab === 'tratamientos') {
        setTreatmentFormData({
          codigo: '',
          nombre: '',
          especialidad: '',
          precio: 0,
          moneda: 'HNL', // Default currency
          notas: '',
          veces_realizado: 0, // Reset counter to 0 for new treatments
          activo: true
        });
      } else {
        setPromotionFormData({
          codigo: '',
          nombre: '',
          descuento: 0,
          precio_original: 0,
          precio_promocional: 0,
          moneda: 'HNL', // Default currency
          fecha_inicio: '',
          fecha_fin: '',
          veces_realizado: 0, // Reset counter to 0 for new promotions
          activo: true
        });
      }
    } catch (error) {
      console.error('Error saving:', error);
      // You could show a toast notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      if (activeTab === 'tratamientos' && selectedTreatment) {
        const response = await fetch(`/api/tratamientos/${selectedTreatment.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete treatment');
        }

        setTreatments(prev => prev.filter(t => t.id !== selectedTreatment.id));
      } else if (activeTab === 'promociones' && selectedPromotion) {
        const response = await fetch(`/api/promociones/${selectedPromotion.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete promotion');
        }

        setPromotions(prev => prev.filter(p => p.id !== selectedPromotion.id));
      }
      setShowDeleteModal(false);
      setSelectedTreatment(null);
      setSelectedPromotion(null);
    } catch (error) {
      console.error('Error deleting:', error);
      // You could show a toast notification here
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700 mb-8">
            <div className="px-6 py-8 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    <i className="fas fa-procedures mr-3 text-teal-600"></i>
                    Administrar Tratamientos y Promociones
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Gestiona los tratamientos y promociones disponibles en la clínica
                  </p>
                </div>
                <button
                  onClick={activeTab === 'tratamientos' ? handleAddTreatment : handleAddPromotion}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-plus mr-2"></i>
                  {activeTab === 'tratamientos' ? 'Nuevo Tratamiento' : 'Nueva Promoción'}
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('tratamientos')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'tratamientos'
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <i className="fas fa-procedures mr-2"></i>
                    Tratamientos
                  </button>
                  <button
                    onClick={() => setActiveTab('promociones')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'promociones'
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <i className="fas fa-tags mr-2"></i>
                    Promociones
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700 mb-8">
            <div className="px-6 py-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder={activeTab === 'tratamientos' ? 'Buscar tratamientos...' : 'Buscar promociones...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Treatments/Promotions Table */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              {activeTab === 'tratamientos' ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Especialidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Precio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Veces Realizado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="inline-flex items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                            <span className="ml-2 text-gray-500">Cargando...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTreatments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          <i className="fas fa-inbox text-4xl mb-4"></i>
                          <p className="text-lg">No se encontraron tratamientos</p>
                          <p className="text-sm mt-2">
                            {searchTerm ? 'Intenta con otra búsqueda' : 'Agrega tu primer tratamiento para comenzar'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((treatment) => (
                        <tr key={treatment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {treatment.codigo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              {treatment.nombre}
                              {treatment.notas && (
                                <i 
                                  className="fas fa-sticky-note text-amber-500 text-sm cursor-help" 
                                  title={`Notas: ${treatment.notas}`}
                                ></i>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {treatment.especialidad}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatCurrency(treatment.precio, treatment.moneda)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center">
                              <span className="font-medium">{treatment.veces_realizado}</span>
                              <span className="ml-2 text-xs text-gray-500">veces</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              treatment.activo 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {treatment.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditTreatment(treatment)}
                              className="text-teal-600 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300 mr-3"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteTreatment(treatment)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Descuento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Precio Original
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Precio Promocional
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Veces Realizado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Vigencia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center">
                          <div className="inline-flex items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                            <span className="ml-2 text-gray-500">Cargando...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPromotions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          <i className="fas fa-inbox text-4xl mb-4"></i>
                          <p className="text-lg">No se encontraron promociones</p>
                          <p className="text-sm mt-2">
                            {searchTerm ? 'Intenta con otra búsqueda' : 'Agrega tu primera promoción para comenzar'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((promotion) => (
                        <tr key={promotion.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {promotion.codigo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {promotion.nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {promotion.descuento}% OFF
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <span className="line-through">{formatCurrency(promotion.precio_original, promotion.moneda)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(promotion.precio_promocional, promotion.moneda)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center">
                              <span className="font-medium">{promotion.veces_realizado}</span>
                              <span className="ml-2 text-xs text-gray-500">veces</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div>
                              <div>Desde: {promotion.fecha_inicio}</div>
                              <div>Hasta: {promotion.fecha_fin}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              promotion.activo 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {promotion.activo ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditPromotion(promotion)}
                              className="text-teal-600 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300 mr-3"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDeletePromotion(promotion)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pagination and Records Counter */}
          {totalRecords > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                {/* Records Counter */}
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Total {activeTab === 'tratamientos' ? 'Tratamientos' : 'Promociones'}: {totalRecords}</span>
                  <span className="mx-2">|</span>
                  <span>Mostrando: {startIndex + 1}-{Math.min(endIndex, totalRecords)} de {totalRecords}</span>
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
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {activeTab === 'tratamientos' 
                        ? (selectedTreatment ? 'Editar Tratamiento' : 'Nuevo Tratamiento')
                        : (selectedPromotion ? 'Editar Promoción' : 'Nueva Promoción')
                      }
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Código <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="codigo"
                          required
                          readOnly={!selectedTreatment && treatmentFormData.especialidad !== ''}
                          className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                            !selectedTreatment && treatmentFormData.especialidad !== '' ? 'bg-gray-100 dark:bg-gray-600' : ''
                          }`}
                          value={activeTab === 'tratamientos' ? (treatmentFormData.codigo || '') : (promotionFormData.codigo || '')}
                          onChange={(e) => activeTab === 'tratamientos' 
                            ? handleCodigoChange(e.target.value)
                            : setPromotionFormData({ ...promotionFormData, codigo: e.target.value })
                          }
                          onFocus={() => activeTab === 'tratamientos' && treatmentFormData.codigo && treatmentFormData.codigo.length >= 2 && setShowCodigoSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowCodigoSuggestions(false), 200)}
                          placeholder={activeTab === 'tratamientos' && !selectedTreatment ? "Selecciona una especialidad para generar código" : ""}
                        />
                        {/* Autocomplete suggestions dropdown */}
                        {activeTab === 'tratamientos' && showCodigoSuggestions && codigoSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {codigoSuggestions.map((suggestion, index) => {
                              const treatment = treatments.find(t => t.codigo === suggestion);
                              return (
                                <div
                                  key={index}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                  onClick={() => handleCodigoSelect(suggestion)}
                                >
                                  <div className="font-medium">{suggestion}</div>
                                  {treatment && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {treatment.nombre} - {treatment.especialidad}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="nombre"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={activeTab === 'tratamientos' ? (treatmentFormData.nombre || '') : (promotionFormData.nombre || '')}
                        onChange={(e) => activeTab === 'tratamientos' 
                          ? setTreatmentFormData({ ...treatmentFormData, nombre: e.target.value })
                          : setPromotionFormData({ ...promotionFormData, nombre: e.target.value })
                        }
                      />
                    </div>
                    {activeTab === 'tratamientos' ? (
                      <>
                        <div>
                          <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Especialidad <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="especialidad"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={treatmentFormData.especialidad || ''}
                            onChange={async (e) => await handleSpecialtyChange(e.target.value)}
                          >
                            <option value="">Selecciona una especialidad</option>
                            {specialties.map((specialty) => (
                              <option key={specialty} value={specialty}>
                                {specialty}
                              </option>
                            ))}
                          </select>
                          {!selectedTreatment && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              El código se generará automáticamente al seleccionar una especialidad
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="precio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Precio <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">{getCurrencySymbol(treatmentFormData.moneda || 'HNL')}</span>
                              </div>
                              <input
                                type="number"
                                id="precio"
                                required
                                min="0"
                                step="0.01"
                                className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={treatmentFormData.precio || 0}
                                onChange={(e) => setTreatmentFormData({ ...treatmentFormData, precio: parseFloat(e.target.value) || 0 })}
                                style={{ MozAppearance: "textfield", appearance: "textfield" }}
                              />
                              <style jsx>{`
                                input[type="number"]::-webkit-outer-spin-button,
                                input[type="number"]::-webkit-inner-spin-button {
                                  -webkit-appearance: none;
                                  margin: 0;
                                }
                                input[type="number"] {
                                  -moz-appearance: textfield;
                                }
                              `}</style>
                            </div>
                          </div>
                          <div>
                            <label htmlFor="moneda" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Moneda <span className="text-red-500">*</span>
                            </label>
                            <select
                              id="moneda"
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={treatmentFormData.moneda || 'HNL'}
                              onChange={(e) => setTreatmentFormData({ ...treatmentFormData, moneda: e.target.value as 'HNL' | 'USD' })}
                            >
                              {getAvailableCurrencies().map((currency) => (
                                <option key={currency.code} value={currency.code}>
                                  {currency.symbol} - {currency.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="notas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Notas
                          </label>
                          <textarea
                            id="notas"
                            rows={3}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={treatmentFormData.notas || ''}
                            onChange={(e) => setTreatmentFormData({ ...treatmentFormData, notas: e.target.value })}
                            placeholder="Notas adicionales sobre el tratamiento..."
                          />
                          <p className="mt-1 text-xs text-gray-500">Notas internas sobre el tratamiento, similares a comentarios en odontograma</p>
                        </div>
                        <div>
                          <label htmlFor="veces_realizado" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Veces Realizado <span className="text-gray-400 text-xs">(Contador)</span>
                          </label>
                          <input
                            type="number"
                            id="veces_realizado"
                            min="0"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-100"
                            value={treatmentFormData.veces_realizado || 0}
                            readOnly
                          />
                          <p className="mt-1 text-xs text-gray-500">Se incrementa automáticamente cuando se realiza el tratamiento</p>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="descuento" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Descuento (%)
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="number"
                              id="descuento"
                              min="0"
                              max="100"
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-100"
                              value={promotionFormData.descuento || 0}
                              readOnly
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">%</span>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Calculado automáticamente</p>
                        </div>
                        <div>
                          <label htmlFor="precio_original" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Precio Original <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">{getCurrencySymbol(promotionFormData.moneda || 'HNL')}</span>
                            </div>
                            <input
                              type="number"
                              id="precio_original"
                              required
                              min="0"
                              step="0.01"
                              className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={promotionFormData.precio_original || 0}
                              onChange={(e) => {
  const newPrecioOriginal = parseFloat(e.target.value) || 0;
  const newPromotionFormData = { ...promotionFormData, precio_original: newPrecioOriginal };
  
  // Calculate discount automatically if both prices are available
  if (newPrecioOriginal > 0 && promotionFormData.precio_promocional > 0) {
    const descuento = Math.round(((newPrecioOriginal - promotionFormData.precio_promocional) / newPrecioOriginal) * 100);
    newPromotionFormData.descuento = Math.max(0, Math.min(100, descuento));
  }
  
  setPromotionFormData(newPromotionFormData);
}}
                              style={{ MozAppearance: "textfield", appearance: "textfield" }}
                            />
                            <style jsx>{`
                              input[type="number"]::-webkit-outer-spin-button,
                              input[type="number"]::-webkit-inner-spin-button {
                                -webkit-appearance: none;
                                margin: 0;
                              }
                              input[type="number"] {
                                -moz-appearance: textfield;
                              }
                            `}</style>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="precio_promocional" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Precio Promocional <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">{getCurrencySymbol(promotionFormData.moneda || 'HNL')}</span>
                            </div>
                            <input
                              type="number"
                              id="precio_promocional"
                              required
                              min="0"
                              step="0.01"
                              className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={promotionFormData.precio_promocional || 0}
                              onChange={(e) => {
  const newPrecioPromocional = parseFloat(e.target.value) || 0;
  const newPromotionFormData = { ...promotionFormData, precio_promocional: newPrecioPromocional };
  
  // Calculate discount automatically if both prices are available
  if (promotionFormData.precio_original > 0 && newPrecioPromocional > 0) {
    const descuento = Math.round(((promotionFormData.precio_original - newPrecioPromocional) / promotionFormData.precio_original) * 100);
    newPromotionFormData.descuento = Math.max(0, Math.min(100, descuento));
  }
  
  setPromotionFormData(newPromotionFormData);
}}
                              style={{ MozAppearance: "textfield", appearance: "textfield" }}
                            />
                            <style jsx>{`
                              input[type="number"]::-webkit-outer-spin-button,
                              input[type="number"]::-webkit-inner-spin-button {
                                -webkit-appearance: none;
                                margin: 0;
                              }
                              input[type="number"] {
                                -moz-appearance: textfield;
                              }
                            `}</style>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="moneda_promocion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Moneda <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="moneda_promocion"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={promotionFormData.moneda || 'HNL'}
                            onChange={(e) => setPromotionFormData({ ...promotionFormData, moneda: e.target.value as 'HNL' | 'USD' })}
                          >
                            {getAvailableCurrencies().map((currency) => (
                              <option key={currency.code} value={currency.code}>
                                {currency.symbol} - {currency.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Fecha Inicio
                          </label>
                          <input
                            type="date"
                            id="fecha_inicio"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:[color-scheme:dark]"
                            value={promotionFormData.fecha_inicio || ''}
                            onChange={(e) => setPromotionFormData({ ...promotionFormData, fecha_inicio: e.target.value })}
                            style={{
                              colorScheme: 'dark',
                            }}
                          />
                        </div>
                        <div>
                          <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Fecha Fin
                          </label>
                          <input
                            type="date"
                            id="fecha_fin"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:[color-scheme:dark]"
                            value={promotionFormData.fecha_fin || ''}
                            onChange={(e) => setPromotionFormData({ ...promotionFormData, fecha_fin: e.target.value })}
                            style={{
                              colorScheme: 'dark',
                            }}
                          />
                        </div>
                        <div>
                          <label htmlFor="veces_realizado" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Veces Realizado <span className="text-gray-400 text-xs">(Contador)</span>
                          </label>
                          <input
                            type="number"
                            id="veces_realizado"
                            min="0"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-100"
                            value={promotionFormData.veces_realizado || 0}
                            readOnly
                          />
                          <p className="mt-1 text-xs text-gray-500">Se incrementa automáticamente cuando se usa la promoción</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="activo"
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        checked={activeTab === 'tratamientos' ? treatmentFormData.activo : promotionFormData.activo}
                        onChange={(e) => activeTab === 'tratamientos' 
                          ? setTreatmentFormData({ ...treatmentFormData, activo: e.target.checked })
                          : setPromotionFormData({ ...promotionFormData, activo: e.target.checked })
                        }
                      />
                      <label htmlFor="activo" className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Activo
                      </label>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (selectedTreatment || selectedPromotion) && (
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
                      {activeTab === 'tratamientos' ? 'Eliminar Tratamiento' : 'Eliminar Promoción'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ¿Está seguro de que desea eliminar {activeTab === 'tratamientos' 
                          ? `el tratamiento "${selectedTreatment?.nombre}"` 
                          : `la promoción "${selectedPromotion?.nombre}"`
                        }? Esta acción no se puede deshacer.
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
  );
}
