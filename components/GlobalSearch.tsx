'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PatientService } from '../services/patientService';
import { OdontogramService } from '../services/odontogramService';
import { consentimientoService } from '../services/consentimientoService';
import { CompletedTreatmentService } from '../services/completedTreatmentService';
import { TreatmentService } from '../services/treatmentService';
import { Patient } from '../types/patient';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/currencyUtils';
import { useEventModal } from '../contexts/EventModalContext';

export default function GlobalSearch() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [completedTreatments, setCompletedTreatments] = useState<any[]>([]);
  const [odontograms, setOdontograms] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const { openEventModal } = useEventModal();
  const [searchResults, setSearchResults] = useState<{
    events: any[];
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
    events: [],
    patients: [],
    treatments: [],
    completedTreatments: [],
    odontograms: [],
    consents: [],
    promotions: [],
    pages: [],
    patientCentric: []
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load data for search
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [
          patientsData,
          treatmentsData,
          completedTreatmentsData,
          odontogramsData,
          consentsData,
        ] = await Promise.all([
          PatientService.getPatients(),
          TreatmentService.getTreatments(),
          CompletedTreatmentService.getAllCompletedTreatments(),
          OdontogramService.getAllOdontograms(),
          consentimientoService.getAllConsentimientos(),
        ]);
        
        setPatients(patientsData);
        setTreatments(treatmentsData);
        setCompletedTreatments(completedTreatmentsData);
        setOdontograms(odontogramsData);
        setConsents(consentsData);
        setEvents([]); // No events service yet
        
        // Load promotions from API
        try {
          const promotionsResponse = await fetch('/api/promociones');
          if (promotionsResponse.ok) {
            const promotionsData = await promotionsResponse.json();
            setPromotions(promotionsData);
          } else {
            console.error('Promotions API response not ok:', promotionsResponse.status);
            setPromotions([]);
          }
        } catch (error) {
          console.error('Error loading promotions:', error);
          // Handle JSON parsing errors gracefully
          if (error instanceof SyntaxError && error.message.includes('JSON')) {
            console.error('API returned HTML instead of JSON - likely missing promociones table');
          }
          setPromotions([]);
        }
        
      } catch (error) {
        console.error('Error loading search data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setShowSearchResults(false);
      setSearchResults({ events: [], patients: [], treatments: [], completedTreatments: [], odontograms: [], consents: [], promotions: [], pages: [], patientCentric: [] });
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Define all app pages
    const allPages = [
      { title: 'Dashboard', description: 'Panel principal', href: '/dashboard', category: 'Navegación' },
      { title: 'Pacientes', description: 'Gestión de pacientes', href: '/pacientes', category: 'Navegación' },
      { title: 'Calendario', description: 'Citas y eventos', href: '/calendario', category: 'Navegación' },
      { title: 'Tratamientos', description: 'Catálogo de tratamientos', href: '/tratamientos', category: 'Navegación' },
      { title: 'Tratamientos Completados', description: 'Historial de tratamientos', href: '/tratamientos-completados', category: 'Navegación' },
      { title: 'Odontograma', description: 'Diagrama dental', href: '/odontogram', category: 'Herramientas' },
      { title: 'Nueva Historia Clínica', description: 'Formulario de paciente', href: '/patient-form', category: 'Formularios' },
      { title: 'Historial de Pacientes', description: 'Registros médicos', href: '/patient-records', category: 'Registros' },
      { title: 'Menú de Navegación', description: 'Navegación rápida', href: '/menu-navegacion', category: 'Navegación' },
      { title: 'Promociones', description: 'Ofertas y promociones', href: '/promociones', category: 'Promociones' },
      { title: 'Consentimientos', description: 'Formularios de consentimiento', href: '/consentimientos', category: 'Formularios' },
      { title: 'Crear Evento', description: 'Agregar nueva cita o evento', href: '#create-event', category: 'Acciones', action: 'createEvent' },
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
        // Remove paciente_id from search to avoid UUID matches
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

    // Search events
    const filteredEvents = events.filter(event =>
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
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
      // Find patient data for this odontogram
      const patient = patients.find(p => p.paciente_id === odontogram.paciente_id);
      
      const searchFields = [
        odontogram.paciente_id || '',
        patient?.nombre_completo || '', // Add patient name
        patient?.numero_identidad || '', // Add patient ID
        odontogram.notas || '',
        odontogram.fecha_actualizacion || '',
        odontogram.creado_por || ''
      ].join(' ').toLowerCase();
      
      return searchFields.includes(query);
    });

    // Search consents
    const filteredConsents = consents.filter(consent => {
      // Find patient data for this consent
      const patient = patients.find(p => p.paciente_id === consent.paciente_id);
      
      const searchFields = [
        consent.paciente_id || '',
        patient?.nombre_completo || '', // Add patient name
        patient?.numero_identidad || '', // Add patient ID
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

    // Patient-centric search - group all patient data
    const patientCentricResults: Array<{
      patient: any;
      completedTreatments: any[];
      odontograms: any[];
      consents: any[];
      matchedFields: string[];
      score: number;
    }> = [];

    // Find matching patients first with better scoring algorithm
    const matchingPatients = filteredPatients.map(patient => {
      const queryLower = query.toLowerCase();
      
      // Calculate relevance score and track which fields matched
      let score = 0;
      const matchedFields: string[] = [];
      
      // Exact name match gets highest score
      if (patient.nombre_completo?.toLowerCase().includes(queryLower)) {
        score += 100;
        matchedFields.push('nombre_completo');
      }
      
      // ID match gets high score
      if (patient.numero_identidad?.toLowerCase().includes(queryLower)) {
        score += 80;
        matchedFields.push('numero_identidad');
      }
      
      // Other field matches get lower scores
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
      
      // Emergency/contact fields get very low scores
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
    .sort((a, b) => b.score - a.score) // Sort by score (highest first)
    .map(result => ({ ...result.patient, matchedFields: result.matchedFields, score: result.score }));

    // For each matching patient, gather all their related data
    matchingPatients.forEach(patient => {
      const patientId = patient.paciente_id || patient.numero_identidad;
      const patientName = patient.nombre_completo?.toLowerCase() || '';
      
      // Find all completed treatments for this patient
      const patientCompletedTreatments = completedTreatments.filter(treatment => {
        const treatmentPatientName = treatment.paciente?.nombre_completo?.toLowerCase() || '';
        const treatmentPatientId = treatment.paciente?.numero_identidad || '';
        return treatmentPatientName === patientName || treatmentPatientId === patientId;
      });

      // Find all odontograms for this patient
      const patientOdontograms = odontograms.filter(odontogram => {
        const odontogramPacienteId = odontogram.paciente_id || '';
        
        // Match by paciente_id first (most reliable)
        if (odontogramPacienteId === patientId) return true;
        
        return false;
      });

      // Find all consents for this patient
      const patientConsents = consents.filter(consent => {
        const consentPacienteId = consent.paciente_id || '';
        
        // Match by paciente_id first (most reliable)
        if (consentPacienteId === patientId) return true;
        
        return false;
      });

      // Always add matching patients to show their related data (even if empty)
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
      events: filteredEvents,
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
  }, [searchQuery, patients, treatments, completedTreatments, odontograms, consents, events, promotions]);

  // Click outside handler to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    const handleResize = () => {
      setShowSearchResults(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleResultClick = (href: string, action?: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    if (action === 'createEvent') {
      const now = new Date();
      openEventModal({
        id: 'new',
        title: 'Nuevo Evento',
        start: now,
        end: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour later
        allDay: false,
        description: '',
        location: ''
      });
      return;
    }
    
    router.push(href);
  };

  const isDirectMatch = (patientData: any, index: number) => {
    return (patientData.matchedFields.includes('nombre_completo') ||
            patientData.matchedFields.includes('numero_identidad') ||
            patientData.matchedFields.includes('telefono') ||
            patientData.matchedFields.includes('email')) && index === 0;
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="Búsqueda General..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim() !== '' && setShowSearchResults(true)}
          className="w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {showSearchResults && searchQuery && (
        <div 
          className="fixed mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[9999] max-h-96 overflow-y-auto"
          style={{
            top: searchRef.current?.getBoundingClientRect().bottom + window.scrollY + 8 + 'px',
            left: searchRef.current?.getBoundingClientRect().left + window.scrollX + 'px'
          }}>
          
          {/* Patient-Centric Results - Highest Priority */}
          {searchResults.patientCentric.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Datos del Paciente
              </div>
              {searchResults.patientCentric.map((patientData, index) => (
                <div key={index} className={`mb-3 p-2 rounded-lg border ${
                  (patientData.matchedFields.includes('nombre_completo') || 
                   patientData.matchedFields.includes('numero_identidad') || 
                   patientData.matchedFields.includes('telefono') ||
                   patientData.matchedFields.includes('email')) && index === 0
                    ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-600' 
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className={`font-medium ${
                      (patientData.matchedFields.includes('nombre_completo') || 
                       patientData.matchedFields.includes('numero_identidad') || 
                       patientData.matchedFields.includes('telefono') ||
                       patientData.matchedFields.includes('email')) && index === 0
                        ? 'text-green-900 dark:text-green-100 font-bold' 
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
                      <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Teléfono:
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        {patientData.patient.codigopais || ''}{patientData.patient.telefono || ''}
                      </div>
                    </div>
                  )}
                  
                  {patientData.matchedFields.includes('email') && !isDirectMatch(patientData, index) && (
                    <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Email:
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        {patientData.patient.email || ''}
                      </div>
                    </div>
                  )}
                  
                  {patientData.matchedFields.includes('contacto_emergencia') && !isDirectMatch(patientData, index) && (
                    <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Contacto de Emergencia:
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        {patientData.patient.contacto_emergencia || ''}
                      </div>
                    </div>
                  )}
                  
                  {patientData.matchedFields.includes('contacto_telefono') && !isDirectMatch(patientData, index) && (
                    <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Teléfono de Contacto:
                      </div>
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
                          handleResultClick(`/odontogram?id=${patientData.patient.paciente_id}&version=${patientData.odontograms[0].version}`);
                        }}
                      >
                        🦷 {patientData.odontograms.length} odontograma(s)
                      </div>
                    )}
                    {patientData.consents && patientData.consents.length > 0 && (
                      <div 
                        className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResultClick(`/consentimientos?paciente_id=${patientData.patient.paciente_id}`);
                        }}
                      >
                        📄 {patientData.consents.length} consentimiento(s)
                      </div>
                    )}
                    {/* Always show tratamientos-completados link */}
                    <div 
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResultClick(`/tratamientos-completados?paciente_id=${patientData.patient.paciente_id}`);
                      }}
                    >
                      📋 Ver Tratamientos Completados
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

          {/* Pages Results */}
          {searchResults.pages.length > 0 && (
            <div className={`p-2 ${searchResults.patientCentric.length > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Páginas
              </div>
              {searchResults.pages.map((page, index) => (
                <div
                  key={index}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  onClick={() => handleResultClick(page.href, page.action)}
                >
                  <div className="font-medium flex items-center">
                    {page.action === 'createEvent' && <i className="fas fa-plus-circle mr-2 text-blue-500"></i>}
                    {page.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {page.description} • {page.category}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Events Results */}
          {searchResults.events.length > 0 && (
            <div className={`p-2 ${(searchResults.patientCentric.length > 0 || searchResults.pages.length > 0) ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Eventos
              </div>
              {searchResults.events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  onClick={() => handleResultClick('/calendario')}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(event.start), "PPP 'dd' MMM', 'HH:mm")}
                    {event.location && ` • ${event.location}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Treatments Results */}
          {searchResults.treatments.length > 0 && (
            <div className={`p-2 ${(searchResults.patientCentric.length > 0 || searchResults.pages.length > 0 || searchResults.events.length > 0) ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tratamientos
              </div>
              {searchResults.treatments.slice(0, 3).map((treatment) => (
                <div
                  key={treatment.id}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  onClick={() => handleResultClick('/tratamientos')}
                >
                  <div className="font-medium">{treatment.nombre}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {treatment.codigo} • {treatment.especialidad}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Treatments Results */}
          {searchResults.completedTreatments.length > 0 && (
            <div className={`p-2 ${(searchResults.patientCentric.length > 0 || searchResults.pages.length > 0 || searchResults.events.length > 0 || searchResults.treatments.length > 0) ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tratamientos Completados
              </div>
              {searchResults.completedTreatments.slice(0, 3).map((treatment) => (
                <div
                  key={treatment.id}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  onClick={() => handleResultClick(`/tratamientos-completados/${treatment.id}/view`)}
                >
                  <div className="font-medium">
                    {treatment.tratamientos_realizados?.[0]?.nombre_tratamiento || 'Tratamiento desconocido'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(treatment.fecha_cita).toLocaleDateString('es-HN')} • {treatment.paciente?.nombre_completo || 'Paciente desconocido'} • {formatCurrency(treatment.total_final)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Odontograms Results */}
          {searchResults.odontograms.length > 0 && (
            <div className={`p-2 ${(searchResults.patientCentric.length > 0 || searchResults.pages.length > 0 || searchResults.events.length > 0 || searchResults.treatments.length > 0 || searchResults.completedTreatments.length > 0) ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Odontogramas
              </div>
              {searchResults.odontograms
                .sort((a: any, b: any) => new Date(b.fecha_actualizacion).getTime() - new Date(a.fecha_actualizacion).getTime())
                .slice(0, 3)
                .map((odontogram: any) => {
                  // Find patient data for this odontogram
                  const patient = patients.find(p => p.paciente_id === odontogram.paciente_id);
                  return (
                  <div
                    key={odontogram.id}
                    className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                    onClick={() => handleResultClick(`/odontogram?id=${odontogram.paciente_id}&version=${odontogram.version}`)}
                  >
                    <div className="font-medium">
                      Odontograma v{odontogram.version} • {patient?.nombre_completo || 'Sin paciente'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {odontogram.fecha_actualizacion} • {odontogram.notas?.substring(0, 50) || 'Sin notas'}
                    </div>
                  </div>
                  );
                })}
            </div>
          )}

          {/* Consents Results */}
          {searchResults.consents.length > 0 && (
            <div className={`p-2 ${(searchResults.patientCentric.length > 0 || searchResults.pages.length > 0 || searchResults.events.length > 0 || searchResults.treatments.length > 0 || searchResults.completedTreatments.length > 0 || searchResults.odontograms.length > 0) ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Consentimientos
              </div>
              {searchResults.consents.slice(0, 3).map((consent: any) => {
                  // Find patient data for this consent
                  const patient = patients.find(p => p.paciente_id === consent.paciente_id);
                  return (
                <div
                  key={consent.id}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  onClick={() => handleResultClick(`/consentimientos/${consent.id}/preview`)}
                >
                  <div className="font-medium">
                    {consent.tipo_consentimiento || 'Consentimiento'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {patient?.nombre_completo || 'Sin paciente'} • {consent.fecha_consentimiento}
                  </div>
                </div>
                  );
                })}
            </div>
          )}

          {/* Promotions Results */}
          {searchResults.promotions.length > 0 && (
            <div className={`p-2 ${(searchResults.patientCentric.length > 0 || searchResults.pages.length > 0 || searchResults.events.length > 0 || searchResults.treatments.length > 0 || searchResults.completedTreatments.length > 0 || searchResults.odontograms.length > 0 || searchResults.consents.length > 0) ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Promociones
              </div>
              {searchResults.promotions.slice(0, 3).map((promotion) => (
                <div
                  key={promotion.id}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  onClick={() => handleResultClick('/promociones')}
                >
                  <div className="font-medium">{promotion.titulo || 'Promoción sin título'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
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
           searchResults.events.length === 0 &&
           searchResults.treatments.length === 0 &&
           searchResults.completedTreatments.length === 0 &&
           searchResults.odontograms.length === 0 &&
           searchResults.consents.length === 0 &&
           searchResults.promotions.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No se encontraron resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
