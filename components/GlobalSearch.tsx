'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { PatientService } from '../services/patientService';
import { OdontogramPilotService } from '../services/odontogramPilotService';
import { consentimientoService } from '../services/consentimientoService';
import { CompletedTreatmentService } from '../services/completedTreatmentService';
import { TreatmentService } from '../services/treatmentService';
import { Patient } from '../types/patient';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/currencyUtils';

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [completedTreatments, setCompletedTreatments] = useState<any[]>([]);
  const [odontograms, setOdontograms] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<{
    patients: any[];
    treatments: any[];
    completedTreatments: any[];
    odontograms: any[];
    consents: any[];
    promotions: any[];
    pages: Array<{
      title: string;
      description: string;
      href: string;
      category: string;
      action?: string;
    }>;
    patientCentric: Array<{
      patient: any;
      completedTreatments: any[];
      odontograms: any[];
      consents: any[];
      matchedFields: string[];
      score: number;
    }>;
  }>({
    patients: [],
    treatments: [],
    completedTreatments: [],
    odontograms: [],
    consents: [],
    promotions: [],
    pages: [],
    patientCentric: []
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load data for search
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [patientsData, treatmentsData, completedTreatmentsData, odontogramsData, consentsData, promosRes] = await Promise.all([
          PatientService.getPatients().catch(() => [] as any[]),
          TreatmentService.getTreatments().catch(() => [] as any[]),
          CompletedTreatmentService.getAllCompletedTreatments().catch(() => [] as any[]),
          OdontogramPilotService.getAllOdontograms().catch(() => [] as any[]),
          consentimientoService.getAllConsentimientos().catch(() => [] as any[]),
          fetch('/api/promociones').then(r => r.ok ? r.json().catch(() => []) : []).catch(() => [])
        ]);

        setPatients(patientsData);
        setTreatments(treatmentsData);
        setCompletedTreatments(completedTreatmentsData);
        setOdontograms(odontogramsData);
        setConsents(consentsData);
        setPromotions(promosRes);
      } catch (error) {
        console.error('Error loading search data:', error);
        setPatients([]);
        setTreatments([]);
        setCompletedTreatments([]);
        setOdontograms([]);
        setConsents([]);
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setShowSearchResults(false);
  }, []);

  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSearch]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setShowSearchResults(false);
      setSearchResults({ patients: [], treatments: [], completedTreatments: [], odontograms: [], consents: [], promotions: [], pages: [], patientCentric: [] });
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Define all app pages
    const allPages = [
      { title: 'Dashboard', description: 'Panel principal', href: '/dashboard', category: 'Navegación' },
      { title: 'Pacientes', description: 'Gestión de pacientes', href: '/pacientes', category: 'Navegación' },
      { title: 'Tratamientos', description: 'Catálogo de tratamientos', href: '/tratamientos', category: 'Navegación' },
      { title: 'Tratamientos Completados', description: 'Historial de tratamientos', href: '/tratamientos-completados', category: 'Navegación' },
      { title: 'Odontograma', description: 'Diagrama dental', href: '/odontogram-pilot', category: 'Herramientas' },
      { title: 'Nueva Historia Clínica', description: 'Formulario de paciente', href: '/patient-form', category: 'Formularios' },
      { title: 'Historial de Pacientes', description: 'Registros médicos', href: '/patient-records', category: 'Registros' },
      { title: 'Menú de Navegación', description: 'Navegación rápida', href: '/menu-navegacion', category: 'Navegación' },
      { title: 'Promociones', description: 'Ofertas y promociones', href: '/promociones', category: 'Promociones' },
      { title: 'Consentimientos', description: 'Formularios de consentimiento', href: '/consentimientos', category: 'Formularios' },
      { title: 'Mi Cuenta', description: 'Configuración de perfil', href: '/account', category: 'Configuración' },
    ];
    
    // Search patients
    const filteredPatients = patients.filter(patient => {
      const searchFields = [
        patient.nombre_completo || '',
        patient.numero_identidad || '',
        patient.codigo_interno || '',
        patient.telefono || '',
        patient.codigopais + (patient.telefono || '') || '',
        patient.email || '',
        patient.contacto_emergencia || '',
        patient.contacto_telefono || '',
        patient.codigopaisemergencia + (patient.contacto_telefono || '') || '',
        patient.rep_celular || '',
        patient.codigopaisrepresentante + (patient.rep_celular || '') || '',
      ].join(' ').toLowerCase();
      
      return searchFields.includes(query);
    });

    // Search treatments
    const filteredTreatments = treatments.filter(treatment =>
      treatment.nombre?.toLowerCase().includes(query) ||
      treatment.codigo?.toLowerCase().includes(query) ||
      treatment.especialidad?.toLowerCase().includes(query)
    );

    // Search completed treatments
    const filteredCompletedTreatments = completedTreatments.filter(treatment => {
      const searchFields = [
        treatment.paciente?.nombre_completo || '',
        treatment.tratamiento?.nombre || '',
        treatment.promocion?.nombre || '',
        treatment.paciente?.numero_identidad || '',
        treatment.paciente?.telefono || '',
        treatment.paciente?.email || '',
        treatment.notas || '',
        treatment.fecha_completado || ''
      ].join(' ').toLowerCase();
      
      return searchFields.includes(query);
    });

    // Search odontograms
    const filteredOdontograms = odontograms.filter(odontogram => {
      const patient = patients.find(p => p.paciente_id === odontogram.paciente_id);
      
      const searchFields = [
        odontogram.paciente_id || '',
        patient?.nombre_completo || '',
        patient?.numero_identidad || '',
        odontogram.notas || '',
        odontogram.fecha_actualizacion || '',
        odontogram.creado_por || ''
      ].join(' ').toLowerCase();
      
      return searchFields.includes(query);
    });

    // Search consents
    const filteredConsents = consents.filter(consent => {
      const patient = patients.find(p => p.paciente_id === consent.paciente_id);
      
      const searchFields = [
        consent.paciente_id || '',
        patient?.nombre_completo || '',
        patient?.numero_identidad || '',
        consent.tipo_consentimiento || '',
        consent.nombre_consentimiento || '',
        consent.descripcion || '',
        consent.estado || '',
        consent.fecha_consentimiento || ''
      ].join(' ').toLowerCase();
      
      return searchFields.includes(query);
    });

    // Search promotions
    const filteredPromotions = promotions.filter(promotion => {
      const searchFields = [
        promotion.titulo || '',
        promotion.descripcion || '',
        promotion.descuento || '',
        promotion.tipo || '',
        promotion.codigo || '',
        promotion.fecha_inicio || '',
        promotion.fecha_fin || ''
      ].join(' ').toLowerCase();
      
      return searchFields.includes(query);
    });

    // Search pages
    const filteredPages = allPages.filter(page =>
      page.title.toLowerCase().includes(query) ||
      page.description.toLowerCase().includes(query) ||
      page.category.toLowerCase().includes(query)
    );

    // Patient-centric search
    const patientCentricResults: Array<{
      patient: any;
      completedTreatments: any[];
      odontograms: any[];
      consents: any[];
      matchedFields: string[];
      score: number;
    }> = [];

    const matchingPatients = filteredPatients.map(patient => {
      const queryLower = query.toLowerCase();
      
      let score = 0;
      const matchedFields: string[] = [];
      
      if (patient.nombre_completo?.toLowerCase().includes(queryLower)) {
        score += 100;
        matchedFields.push('nombre_completo');
      }
      
      if (patient.numero_identidad?.toLowerCase().includes(queryLower)) {
        score += 80;
        matchedFields.push('numero_identidad');
      }
      
      if (patient.codigo_interno?.toLowerCase().includes(queryLower)) {
        score += 60;
        matchedFields.push('codigo_interno');
      }
      if (patient.telefono?.toLowerCase().includes(queryLower)) {
        score += 40;
        matchedFields.push('telefono');
      }
      if (patient.email?.toLowerCase().includes(queryLower)) {
        score += 30;
        matchedFields.push('email');
      }
      if (patient.paciente_id?.toLowerCase().includes(queryLower)) {
        score += 50;
        matchedFields.push('paciente_id');
      }
      
      if (patient.contacto_emergencia?.toLowerCase().includes(queryLower)) {
        score += 10;
        matchedFields.push('contacto_emergencia');
      }
      if (patient.contacto_telefono?.toLowerCase().includes(queryLower)) {
        score += 10;
        matchedFields.push('contacto_telefono');
      }
      if (patient.rep_celular?.toLowerCase().includes(queryLower)) {
        score += 10;
        matchedFields.push('rep_celular');
      }
      
      const matches = score > 0;
      
      return { patient, score, matches, matchedFields };
    })
    .filter(result => result.matches)
    .sort((a, b) => b.score - a.score)
    .map(result => ({ ...result.patient, matchedFields: result.matchedFields, score: result.score }));

    matchingPatients.forEach(patient => {
      const patientId = patient.paciente_id || patient.numero_identidad;
      const patientName = patient.nombre_completo?.toLowerCase() || '';
      
      const patientCompletedTreatments = completedTreatments.filter(treatment => {
        const treatmentPatientName = treatment.paciente?.nombre_completo?.toLowerCase() || '';
        const treatmentPatientId = treatment.paciente?.numero_identidad || '';
        return treatmentPatientName === patientName || treatmentPatientId === patientId;
      });

      const patientOdontograms = odontograms.filter(odontogram => {
        const odontogramPacienteId = odontogram.paciente_id || '';
        if (odontogramPacienteId === patientId) return true;
        return false;
      });

      const patientConsents = consents.filter(consent => {
        const consentPacienteId = consent.paciente_id || '';
        if (consentPacienteId === patientId) return true;
        return false;
      });

      patientCentricResults.push({
        patient,
        completedTreatments: patientCompletedTreatments,
        odontograms: patientOdontograms,
        consents: patientConsents,
        matchedFields: patient.matchedFields || [],
        score: patient.score || 0
      });
    });

    setSearchResults({
      patients: filteredPatients,
      treatments: filteredTreatments,
      completedTreatments: filteredCompletedTreatments,
      odontograms: filteredOdontograms,
      consents: filteredConsents,
      promotions: filteredPromotions,
      pages: filteredPages,
      patientCentric: patientCentricResults
    });
    
    setShowSearchResults(true);
  }, [searchQuery, patients, treatments, completedTreatments, odontograms, consents, promotions]);

  const handleResultClick = (href: string, action?: string) => {
    closeSearch();
    router.push(href);
  };

  const isDirectMatch = (patientData: any, index: number) => {
    return (patientData.matchedFields.includes('nombre_completo') ||
            patientData.matchedFields.includes('numero_identidad') ||
            patientData.matchedFields.includes('telefono') ||
            patientData.matchedFields.includes('email')) && index === 0;
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={openSearch}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title="Búsqueda General"
      >
        <Search size={20} />
      </button>

      {/* Search Modal */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSearch}
          />
          
          {/* Modal */}
          <div
            ref={modalRef}
            className="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
              <div className="pl-5 pr-3 text-gray-400">
                <Search size={20} />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar pacientes, tratamientos, páginas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 py-4 pr-4 text-base text-gray-900 dark:text-gray-100 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
              {loading && (
                <div className="pr-4">
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                </div>
              )}
              <button
                onClick={closeSearch}
                className="mr-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Results */}
            {showSearchResults && searchQuery && (
              <div className="max-h-[60vh] overflow-y-auto">
                {/* Patient-Centric Results */}
                {searchResults.patientCentric.length > 0 && (
                  <div className="p-3">
                    <div className="px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} /> Datos del Paciente
                    </div>
                    {searchResults.patientCentric.slice(0, 3).map((patientData, index) => (
                      <div
                        key={index}
                        className={`mb-2 p-3 rounded-xl border transition-all ${
                          isDirectMatch(patientData, index)
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className={`font-semibold text-sm ${
                            isDirectMatch(patientData, index)
                              ? 'text-emerald-900 dark:text-emerald-100'
                              : 'text-blue-900 dark:text-blue-100'
                          }`}>
                            {patientData.patient.nombre_completo || 'Sin nombre'}
                          </div>
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                          {patientData.patient.numero_identidad && `ID: ${patientData.patient.numero_identidad}`}
                          {patientData.patient.telefono && ` • Tel: ${patientData.patient.codigopais || ''}${patientData.patient.telefono}`}
                        </div>

                        {patientData.matchedFields.includes('telefono') && !isDirectMatch(patientData, index) && (
                          <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                            <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Teléfono:</div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                              {patientData.patient.codigopais || ''}{patientData.patient.telefono || ''}
                            </div>
                          </div>
                        )}

                        {patientData.matchedFields.includes('email') && !isDirectMatch(patientData, index) && (
                          <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                            <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Email:</div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{patientData.patient.email || ''}</div>
                          </div>
                        )}

                        {patientData.matchedFields.includes('contacto_emergencia') && !isDirectMatch(patientData, index) && (
                          <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                            <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Contacto de Emergencia:</div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{patientData.patient.contacto_emergencia || ''}</div>
                          </div>
                        )}

                        {patientData.matchedFields.includes('contacto_telefono') && !isDirectMatch(patientData, index) && (
                          <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                            <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Teléfono de Contacto:</div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                              {patientData.patient.codigopaisemergencia || ''}{patientData.patient.contacto_telefono || ''}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          {patientData.odontograms && patientData.odontograms.length > 0 && (
                            <div
                              className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResultClick(`/odontogram-pilot?id=${patientData.patient.paciente_id}&version=${patientData.odontograms[0].version}`);
                              }}
                            >
                              🦷 {patientData.odontograms.length} odontograma(s)
                            </div>
                          )}
                          <div
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResultClick(`/tratamientos-completados?paciente_id=${patientData.patient.paciente_id}`);
                            }}
                          >
                            📋 Ver Tratamientos Completados
                          </div>
                          <div
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResultClick(`/notas-linea-de-tiempo?id=${patientData.patient.paciente_id}`);
                            }}
                          >
                            📝 Notas - Línea de Tiempo
                          </div>
                          <div
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResultClick(`/presupuestos?id=${patientData.patient.paciente_id}`);
                            }}
                          >
                            💰 Ver Presupuestos
                          </div>
                          <div className="flex items-center space-x-2">
                            <div
                              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResultClick(`/patient-preview/${patientData.patient.paciente_id}`);
                              }}
                            >
                              👁️ Ver ficha completa
                            </div>
                            <div
                              className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResultClick(`/menu-navegacion?id=${patientData.patient.paciente_id}`);
                              }}
                            >
                              📋 Menú
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pages */}
                {searchResults.pages.length > 0 && (
                  <div className={`p-3 ${searchResults.patientCentric.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={12} /> Páginas
                    </div>
                    {searchResults.pages.map((page, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleResultClick(page.href, page.action)}
                      >
                        <div>
                          <div className="font-medium">{page.title}</div>
                          <div className="text-xs text-gray-400">{page.category}</div>
                        </div>
                        <ArrowRight size={14} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Treatments */}
                {searchResults.treatments.length > 0 && (
                  <div className={`p-3 border-t border-gray-100 dark:border-gray-800`}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tratamientos</div>
                    {searchResults.treatments.slice(0, 3).map((treatment) => (
                      <div
                        key={treatment.id}
                        className="flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleResultClick('/tratamientos')}
                      >
                        <div>
                          <div className="font-medium">{treatment.nombre}</div>
                          <div className="text-xs text-gray-400">{treatment.codigo} • {treatment.especialidad}</div>
                        </div>
                        <ArrowRight size={14} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed Treatments */}
                {searchResults.completedTreatments.length > 0 && (
                  <div className={`p-3 border-t border-gray-100 dark:border-gray-800`}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tratamientos Completados</div>
                    {searchResults.completedTreatments.slice(0, 3).map((treatment) => (
                      <div
                        key={treatment.id}
                        className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleResultClick(`/tratamientos-completados/${treatment.id}/view`)}
                      >
                        <div className="font-medium">
                          {treatment.tratamientos_realizados?.[0]?.nombre_tratamiento || 'Tratamiento desconocido'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(treatment.fecha_cita).toLocaleDateString('es-HN')} • {treatment.paciente?.nombre_completo || 'Paciente desconocido'} • {formatCurrency(treatment.total_final)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Odontograms */}
                {searchResults.odontograms.length > 0 && (
                  <div className={`p-3 border-t border-gray-100 dark:border-gray-800`}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Odontogramas</div>
                    {searchResults.odontograms
                      .sort((a: any, b: any) => new Date(b.fecha_actualizacion).getTime() - new Date(a.fecha_actualizacion).getTime())
                      .slice(0, 3)
                      .map((odontogram: any) => {
                        const patient = patients.find(p => p.paciente_id === odontogram.paciente_id);
                        return (
                        <div
                          key={odontogram.id}
                          className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleResultClick(`/odontogram-pilot?id=${odontogram.paciente_id}&version=${odontogram.version}`)}
                        >
                          <div className="font-medium">
                            Odontograma v{odontogram.version} • {patient?.nombre_completo || 'Sin paciente'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {odontogram.fecha_actualizacion} • {odontogram.notas?.substring(0, 50) || 'Sin notas'}
                          </div>
                        </div>
                        );
                      })}
                  </div>
                )}

                {/* Consents */}
                {searchResults.consents.length > 0 && (
                  <div className={`p-3 border-t border-gray-100 dark:border-gray-800`}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Consentimientos</div>
                    {searchResults.consents.slice(0, 3).map((consent: any) => {
                        const patient = patients.find(p => p.paciente_id === consent.paciente_id);
                        return (
                      <div
                        key={consent.id}
                        className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleResultClick(`/consentimientos/${consent.id}/preview`)}
                      >
                        <div className="font-medium">
                          {consent.tipo_consentimiento || 'Consentimiento'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {patient?.nombre_completo || 'Sin paciente'} • {consent.fecha_consentimiento}
                        </div>
                      </div>
                        );
                      })}
                  </div>
                )}

                {/* Promotions */}
                {searchResults.promotions.length > 0 && (
                  <div className={`p-3 border-t border-gray-100 dark:border-gray-800`}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Promociones</div>
                    {searchResults.promotions.slice(0, 3).map((promotion) => (
                      <div
                        key={promotion.id}
                        className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleResultClick('/promociones')}
                      >
                        <div className="font-medium">{promotion.titulo || 'Promoción sin título'}</div>
                        <div className="text-xs text-gray-400">
                          {promotion.descripcion && `${promotion.descripcion.substring(0, 50)}${promotion.descripcion.length > 50 ? '...' : ''}`}
                          {promotion.tipo && ` • ${promotion.tipo}`}
                          {promotion.descuento && ` • ${promotion.descuento}% descuento`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {searchResults.patientCentric.length === 0 && 
                 searchResults.pages.length === 0 && 
                 searchResults.treatments.length === 0 &&
                 searchResults.completedTreatments.length === 0 &&
                 searchResults.odontograms.length === 0 &&
                 searchResults.consents.length === 0 &&
                 searchResults.promotions.length === 0 && (
                  <div className="p-8 text-center text-sm text-gray-400">
                    No se encontraron resultados para &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!searchQuery && (
              <div className="p-8 text-center text-sm text-gray-400 space-y-2">
                <Search size={32} className="mx-auto text-gray-300 dark:text-gray-600" />
                <p>Escribe para buscar pacientes, tratamientos, páginas y más...</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
