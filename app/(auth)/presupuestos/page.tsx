'use client';
// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHistoricalMode } from '@/contexts/HistoricalModeContext';
import { Patient } from '@/types/patient';
import { Quote, QuoteItem } from '@/types/quote';
import { Treatment } from '@/types/treatment';
import { Odontogram, DienteData } from '@/types/odontogram';

// Define Promotion interface
interface Promotion {
  id: number;
  codigo: string;
  nombre: string;
  descuento: number;
  precio_original: number;
  precio_promocional: number;
  moneda: string;
  notas?: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  veces_realizado: number;
  es_grupal?: boolean;
  tipo_promocion?: 'individual' | '2x1' | 'family' | 'friends';
  max_beneficiarios?: number;
}

export default function PresupuestosPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bypassHistoricalMode, setBypassHistoricalMode, loadPatientSettings, savePatientSettings } = useHistoricalMode();
  
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [treatmentSearch, setTreatmentSearch] = useState<string>('');
  const [odontogram, setOdontogram] = useState<Odontogram | null>(null);
  const [loadingOdontogram, setLoadingOdontogram] = useState(false);
  
  // Promotions state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activeTab, setActiveTab] = useState<'tratamientos' | 'promociones'>('tratamientos');

  // Load treatments from database
  const loadTreatments = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSpecialty) params.append('especialidad', selectedSpecialty);
      if (treatmentSearch) params.append('search', treatmentSearch);

      const response = await fetch(`/api/tratamientos/quotes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTreatments(data.treatments || []);
        setSpecialties(data.specialties || []);
      } else {
        // Failed to load treatments
      }
    } catch (error) {
      // Error loading treatments
    }
  };

  // Load treatments when filters change
  useEffect(() => {
    if (activeTab === 'tratamientos') {
      loadTreatments();
    }
  }, [selectedSpecialty, treatmentSearch, activeTab]);

  // Load promotions
  const loadPromotions = async () => {
    try {
      const response = await fetch('/api/promociones');
      if (response.ok) {
        const promotionsData = await response.json();
        setPromotions(promotionsData);
      }
    } catch (error) {
      setPromotions([]);
    };
  };

  // Load promotions when tab changes
  useEffect(() => {
    if (activeTab === 'promociones') {
      loadPromotions();
    }
  }, [activeTab]);

  // Filter promotions based on search
  const filteredPromotions = promotions.filter(promotion =>
    promotion.nombre.toLowerCase().includes(treatmentSearch.toLowerCase()) ||
    promotion.codigo.toLowerCase().includes(treatmentSearch.toLowerCase())
  );

  // Load odontogram data
  const loadOdontogram = async (pacienteId: string) => {
    if (!pacienteId) return;
    
    setLoadingOdontogram(true);
    try {
      const response = await fetch(`/api/odontogram/active?patient_id=${pacienteId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.odontogram) {
          setOdontogram(data.odontogram);
        }
      }
    } catch (error) {
      // Error loading odontogram
    } finally {
      setLoadingOdontogram(false);
    }
  };

  // Format odontogram data for notes
  const formatOdontogramForNotes = (odontogramData: Odontogram): string => {
    const { datos_odontograma } = odontogramData;
    
    // Check if odontogram data exists
    if (!datos_odontograma || !datos_odontograma.dientes) {
      return '';
    }
    
    const teethWithIssues: string[] = [];
    const teethNotes: string[] = [];
    const statusCount: { [key: string]: number } = {};
    
    // Process each tooth and collect data
    Object.entries(datos_odontograma.dientes).forEach(([toothNumber, diente]) => {
      if (diente) {
        // Count tooth statuses
        const status = diente.estado;
        statusCount[status] = (statusCount[status] || 0) + 1;
        
        // Collect teeth with issues (excluding healthy and absent teeth)
        if (diente.estado !== 'sano' && diente.estado !== 'ausente') {
          let toothInfo = `Diente ${toothNumber}: ${diente.estado}`;
          
          // Add observations if present
          if (diente.observaciones) {
            toothInfo += ` - ${diente.observaciones}`;
          }
          
          // Add planned treatment if present
          if (diente.tratamiento) {
            toothInfo += ` - Tratamiento: ${diente.tratamiento}`;
          }
          
          // Check individual faces for issues
          const facesWithIssues: string[] = [];
          if (diente.caras) {
            Object.entries(diente.caras).forEach(([faceName, face]) => {
              if (face && face.estado !== 'sano') {
                let faceInfo = `${faceName}: ${face.estado}`;
                if (face.tratamiento) {
                  faceInfo += ` - ${face.tratamiento}`;
                }
                if (face.observaciones) {
                  faceInfo += ` (${face.observaciones})`;
                }
                facesWithIssues.push(faceInfo);
              }
            });
          }
          
          if (facesWithIssues.length > 0) {
            toothInfo += ` - Caras: ${facesWithIssues.join(', ')}`;
          }
          
          teethWithIssues.push(toothInfo);
        }
        
        // Collect individual tooth notes (from the notes modal)
        // These can be stored in either 'observaciones' or 'nota' field
        const toothNote = diente.observaciones || (diente as any).nota;
        if (toothNote && toothNote.trim()) {
          teethNotes.push(`Diente ${toothNumber}: ${toothNote}`);
        }
      }
    });
    
    let result = '';
    
    // Section 1: Status Count (moved to top)
    if (Object.keys(statusCount).length > 0) {
      result += '=== CONTEO POR ESTADO ===\n';
      Object.entries(statusCount)
        .sort(([a], [b]) => {
          // Sort by status priority: put problematic statuses first
          const priority = { 'caries': 1, 'obturado': 2, 'fracturado': 3, 'endodoncia': 4, 'extraccion': 5, 'corona': 6, 'implante': 7, 'puente': 8, 'sellante': 9, 'sano': 10, 'ausente': 11 };
          return (priority[a] || 99) - (priority[b] || 99);
        })
        .forEach(([status, count]) => {
          result += `${status.charAt(0).toUpperCase() + status.slice(1)}: ${count} diente(s)\n`;
        });
      result += '\n';
    }
    
    // Section 2: Teeth with Issues
    if (teethWithIssues.length > 0) {
      result += '=== DIENTES CON PROBLEMAS ===\n';
      result += teethWithIssues.join('\n');
      result += '\n\n';
    }
    
    // Section 3: Individual Tooth Notes (from notes modal)
    if (teethNotes.length > 0) {
      result += '=== NOTAS INDIVIDUALES POR DIENTE ===\n';
      result += teethNotes.join('\n');
      result += '\n\n';
    }
    
    // Section 4: General Information
    if (datos_odontograma.informacion_general) {
      result += '=== INFORMACIÓN GENERAL ===\n';
      if (datos_odontograma.informacion_general.motivo_consulta) {
        result += `Motivo de consulta: ${datos_odontograma.informacion_general.motivo_consulta}\n`;
      }
      if (datos_odontograma.informacion_general.observaciones) {
        result += `Observaciones generales: ${datos_odontograma.informacion_general.observaciones}\n`;
      }
      result += '\n';
    }
    
    // Section 5: Planned Treatments
    if (datos_odontograma.tratamientos_planificados && datos_odontograma.tratamientos_planificados.length > 0) {
      result += '=== TRATAMIENTOS PLANIFICADOS ===\n';
      datos_odontograma.tratamientos_planificados.forEach((tratamiento, index) => {
        result += `${index + 1}. ${tratamiento.descripcion}\n`;
      });
    }
    
    // Section 6: Overall Odontogram Comments
    if (odontogramData.notas && odontogramData.notas.trim()) {
      if (result) result += '\n\n';
      result += '=== COMENTARIOS DEL ODONTOGRAMA ===\n';
      result += odontogramData.notas;
    }
    
    return result.trim();
  };

  // Auto-load odontogram data into notes when opening create form
  const autoLoadOdontogramData = () => {
    if (odontogram && !newQuote.notes) {
      const formattedData = formatOdontogramForNotes(odontogram);
      if (formattedData) {
        setNewQuote(prev => ({
          ...prev,
          notes: formattedData
        }));
      }
    }
  };

  // Form state for new quote
  const [newQuote, setNewQuote] = useState({
    treatment_description: '',
    notes: '',
    quote_date: '',
    items: [
      { id: '1', description: '', quantity: 1, unit_price: 0, total_price: 0 }
    ]
  });

  // Get patient ID from URL
  const pacienteId = searchParams.get('id');

  useEffect(() => {
    if (!isLoaded || !user) {
      router.push('/sign-in');
      return;
    }

    if (!pacienteId) {
      alert('No se especificó el ID del paciente');
      router.push('/pacientes');
      return;
    }

    loadPatientData();
    loadQuotes();
    loadOdontogram(pacienteId);
  }, [isLoaded, user, pacienteId]);

  const loadPatientData = async () => {
    try {
      const response = await fetch(`/api/patients/${pacienteId}`);
      if (response.ok) {
        const patient = await response.json();
        setCurrentPatient(patient);
      }
    } catch (error) {
      // Error loading patient data
    };
  };

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/presupuestos?patient_id=${pacienteId}`);
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      }
    } catch (error) {
      // Error loading quotes
    } finally {
      setLoading(false);
    }
  };

  const createQuote = async () => {
    if (!currentPatient) {
      alert('Por favor seleccione un paciente');
      return;
    }

    // Validate items
    const validItems = newQuote.items.filter(item => item.description && item.unit_price > 0);
    if (validItems.length === 0) {
      alert('Por favor agregue al menos un ítem válido al presupuesto');
      return;
    }

    try {
      const total_amount = validItems.reduce((sum, item) => sum + item.total_price, 0);
      
      // Calculate expiration date from quote_date (or current date if no quote_date)
      const quoteDate = newQuote.quote_date ? new Date(newQuote.quote_date) : new Date();
      const expires_at = new Date(quoteDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
      
      const requestBody = {
        patient_id: pacienteId,
        patient_name: currentPatient.nombre_completo,
        treatment_description: newQuote.treatment_description || null,
        notes: newQuote.notes,
        quote_date: newQuote.quote_date,
        items: validItems,
        total_amount,
        doctor_name: `${user.firstName} ${user.lastName}`,
        expires_at: expires_at,
      };
      
      console.log('Request body:', requestBody);
      
      const response = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewQuote({
          treatment_description: '',
          notes: '',
          quote_date: '',
          items: [{ id: Date.now().toString(), description: '', quantity: 1, unit_price: 0, total_price: 0 }]
        });
        await loadQuotes();
        alert('Presupuesto creado exitosamente');
      } else {
        const error = await response.json();
        console.error('API Error:', error);
        alert('Error al crear presupuesto: ' + error.error);
      }
    } catch (error) {
      alert('Error al crear presupuesto');
    };
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote['status']) => {
    try {
      const response = await fetch('/api/presupuestos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId,
          status,
        }),
      });

      if (response.ok) {
        await loadQuotes();
        alert('Estado actualizado exitosamente');
      } else {
        const error = await response.json();
        alert('Error al actualizar estado: ' + error.error);
      }
    } catch (error) {
      alert('Error al actualizar estado');
    };
  };

  // Add treatment to quote
  const addTreatmentToQuote = (treatment: Treatment) => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: `${treatment.codigo} - ${treatment.nombre}`,
      quantity: 1,
      unit_price: treatment.precio,
      total_price: treatment.precio
    };

    setNewQuote(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Add promotion to quote
  const addPromotionToQuote = (promotion: Promotion) => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: `${promotion.codigo} - ${promotion.nombre} (PROMOCIÓN ${promotion.descuento}% OFF)`,
      quantity: 1,
      unit_price: promotion.precio_promocional,
      total_price: promotion.precio_promocional
    };

    setNewQuote(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const addItem = () => {
    setNewQuote(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0, total_price: 0 }]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...newQuote.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    
    setNewQuote(prev => ({ ...prev, items: updatedItems }));
  };

  const removeItem = (index: number) => {
    if (newQuote.items.length > 1) {
      setNewQuote(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const getStatusBadge = (status: Quote['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptado';
      case 'rejected': return 'Rechazado';
      case 'expired': return 'Expirado';
      default: return status;
    }
  };

  const isExpired = (expiresAt: string) => {
    if (!expiresAt) return false;
    
    let date: Date;
    
    // Handle different date formats
    if (expiresAt.includes('T') && expiresAt.includes('Z')) {
      date = new Date(expiresAt);
    } else if (expiresAt.includes('T')) {
      // Remove timezone offset and add Z to force UTC
      const dateWithoutOffset = expiresAt.split(/[+-]\d{2}:\d{2}$/)[0];
      date = new Date(dateWithoutOffset + 'Z');
    } else {
      date = new Date(expiresAt);
    }
    
    return date < new Date();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    
    let date: Date;
    
    // Handle different date formats
    if (dateString.includes('T') && dateString.includes('Z')) {
      // ISO format with Z: 2022-03-21T00:00:00.000Z
      date = new Date(dateString);
    } else if (dateString.includes('T')) {
      // ISO format with timezone offset: 2022-03-21T00:00:00+00:00
      // Remove timezone offset and add Z to force UTC
      const dateWithoutOffset = dateString.split(/[+-]\d{2}:\d{2}$/)[0];
      date = new Date(dateWithoutOffset + 'Z');
    } else {
      // Simple format: 2022-03-21
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString);
      return 'Fecha no disponible';
    }
    
    const day = date.getUTCDate(); // Use UTC methods
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    
    return `${day} de ${month} ${year}`;
  };

  // Get the display date for a quote (quote_date if available, otherwise created_at)
  const getQuoteDisplayDate = (quote: Quote) => {
    return quote.quote_date || quote.created_at;
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate total by currency
  const calculateTotalByCurrency = (currency: string) => {
    return newQuote.items
      .filter(item => {
        // For items from treatments, we need to check the original treatment
        const treatment = treatments.find(t => 
          item.description.includes(`${t.codigo} - ${t.nombre}`)
        );
        if (treatment) {
          return treatment.moneda === currency;
        }
        // For custom items, assume HNL by default
        return currency === 'HNL';
      })
      .reduce((sum, item) => sum + item.total_price, 0);
  };

  // Check if quote has USD items
  const hasUSDCurrency = () => {
    return newQuote.items.some(item => {
      const treatment = treatments.find(t => 
        item.description.includes(`${t.codigo} - ${t.nombre}`)
      );
      return treatment ? treatment.moneda === 'USD' : false;
    });
  };

  // Get currency for an item
  const getItemCurrency = (item: QuoteItem) => {
    const treatment = treatments.find(t => 
      item.description.includes(`${t.codigo} - ${t.nombre}`)
    );
    return treatment ? treatment.moneda : 'HNL'; // Default to HNL for custom items
  };

  // Analyze quote items to determine currencies
  const analyzeQuoteCurrencies = (quote: Quote) => {
    const hnlTotal = quote.items
      .filter(item => {
        const treatment = treatments.find(t => 
          item.description.includes(`${t.codigo} - ${t.nombre}`)
        );
        return (!treatment || treatment.moneda === 'HNL');
      })
      .reduce((sum, item) => sum + item.total_price, 0);

    const usdTotal = quote.items
      .filter(item => {
        const treatment = treatments.find(t => 
          item.description.includes(`${t.codigo} - ${t.nombre}`)
        );
        return treatment && treatment.moneda === 'USD';
      })
      .reduce((sum, item) => sum + item.total_price, 0);

    return { hnlTotal, usdTotal, hasUSD: usdTotal > 0 };
  };

  // Format quote amount display
  const formatQuoteAmount = (quote: Quote) => {
    const { hnlTotal, usdTotal, hasUSD } = analyzeQuoteCurrencies(quote);
    
    if (hasUSD && hnlTotal > 0) {
      return `L ${formatNumber(hnlTotal)} / $${formatNumber(usdTotal)}`;
    } else if (hasUSD) {
      return `$${formatNumber(usdTotal)}`;
    } else {
      return `L ${formatNumber(hnlTotal)}`;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                <i className="fas fa-file-invoice-dollar mr-3 text-teal-600"></i>
                Presupuestos
              </h1>
              <div className="space-y-1">
                <p className="text-gray-600 dark:text-gray-400">
                  {currentPatient ? `Presupuestos para ${currentPatient.nombre_completo}` : 'Cargando...'}
                </p>
                {currentPatient && (
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {/* HN ID Number */}
                    <div className="flex items-center">
                      <i className="fas fa-id-card mr-2 text-gray-400"></i>
                      <span>{currentPatient.tipo_identificacion}: {currentPatient.numero_identidad}</span>
                    </div>
                    
                    {/* Phone with Country Code and WhatsApp Link */}
                    {currentPatient.telefono && (
                      <div className="flex items-center">
                        <a
                          href={`https://wa.me/${currentPatient.codigopais && currentPatient.codigopais !== '+504' 
                            ? `${currentPatient.codigopais.replace('+', '')}${currentPatient.telefono}`
                            : `504${currentPatient.telefono}`
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                          title="Enviar mensaje por WhatsApp"
                        >
                          <i className="fas fa-phone mr-2"></i>
                          <span>
                            {currentPatient.codigopais && currentPatient.codigopais !== '+504' 
                              ? `${currentPatient.codigopais} ${currentPatient.telefono}`
                              : `+504 ${currentPatient.telefono}`
                            }
                          </span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(true);
                autoLoadOdontogramData();
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center"
            >
              <i className="fas fa-plus mr-2"></i>
              Nuevo Presupuesto
            </button>
          </div>
        </div>

        {/* Create Quote Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-file-invoice mr-2 text-teal-600"></i>
              Crear Nuevo Presupuesto
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción del Tratamiento
                </label>
                <textarea
                  value={newQuote.treatment_description}
                  onChange={(e) => setNewQuote(prev => ({ ...prev, treatment_description: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describa el tratamiento a realizar..."
                />
              </div>
              
              {/* Date Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha del Presupuesto *
                </label>
                <input
                  type="date"
                  value={newQuote.quote_date}
                  onChange={(e) => setNewQuote(prev => ({ ...prev, quote_date: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Treatment Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agregar Tratamientos de la Base de Datos
                </label>
                
                {/* Tabs */}
                <div className="flex space-x-1 mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('tratamientos')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'tratamientos'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Tratamientos
                  </button>
                  <button
                    onClick={() => setActiveTab('promociones')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'promociones'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Promociones
                  </button>
                </div>
                
                {/* Treatments Tab */}
                {activeTab === 'tratamientos' && (
                  <div>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <select
                        value={selectedSpecialty}
                        onChange={(e) => setSelectedSpecialty(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">Todas las Especialidades</option>
                        {specialties.map(specialty => (
                          <option key={specialty} value={specialty}>{specialty}</option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        value={treatmentSearch}
                        onChange={(e) => setTreatmentSearch(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        placeholder="Buscar tratamiento..."
                      />
                    </div>

                    {/* Treatments List */}
                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                      {treatments.length > 0 ? (
                        treatments.map(treatment => (
                          <div
                            key={treatment.id}
                            onClick={() => addTreatmentToQuote(treatment)}
                            className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900 dark:text-white">
                                {treatment.codigo} - {treatment.nombre}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {treatment.especialidad}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-teal-600 dark:text-teal-400">
                              {treatment.moneda === 'HNL' ? 'L ' : '$'}{formatNumber(treatment.precio)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          No se encontraron tratamientos
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Promociones Tab */}
                {activeTab === 'promociones' && (
                  <div>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <input
                        type="text"
                        value={treatmentSearch}
                        onChange={(e) => setTreatmentSearch(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        placeholder="Buscar promoción..."
                      />
                    </div>

                    {/* Promotions List */}
                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                      {filteredPromotions.length > 0 ? (
                        filteredPromotions.map(promotion => (
                          <div
                            key={promotion.id}
                            onClick={() => addPromotionToQuote(promotion)}
                            className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900 dark:text-white">
                                {promotion.codigo} - {promotion.nombre}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {promotion.descuento}% OFF - Vigente hasta: {new Date(promotion.fecha_fin).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                {promotion.moneda === 'HNL' ? 'L ' : '$'}{formatNumber(promotion.precio_original)}
                              </div>
                              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                {promotion.moneda === 'HNL' ? 'L ' : '$'}{formatNumber(promotion.precio_promocional)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          No se encontraron promociones
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ítems del Presupuesto
                </label>
                <div className="space-y-2">
                  {newQuote.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        placeholder="Descripción del ítem"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        placeholder="Cant"
                        min="1"
                      />
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        placeholder="Precio unit"
                        min="0"
                        step="0.01"
                      />
                      <div className="w-32 px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm font-medium">
                        {getItemCurrency(item) === 'HNL' ? 'L ' : '$'}{formatNumber(item.total_price)}
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        disabled={newQuote.items.length === 1}
                        className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addItem}
                  className="mt-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  <i className="fas fa-plus mr-1"></i>
                  Agregar Ítem
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas (Opcional)
                  {newQuote.notes && newQuote.notes.includes('=== DATOS DEL ODONTOGRAMA ===') && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      <i className="fas fa-check-circle mr-1"></i>
                      Datos del odontograma cargados
                    </span>
                  )}
                </label>
                <textarea
                  value={newQuote.notes}
                  onChange={(e) => setNewQuote(prev => ({ ...prev, notes: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={4}
                  placeholder="Notas adicionales..."
                />
                {loadingOdontogram && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600 mr-2"></div>
                    Cargando datos del odontograma...
                  </div>
                )}
              </div>

              {/* Totals Section */}
              <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  {/* HNL Total */}
                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Total HNL: L {formatNumber(calculateTotalByCurrency('HNL'))}
                  </div>
                  
                  {/* USD Total - Only show if there are USD items */}
                  {hasUSDCurrency() && (
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      Total USD: ${formatNumber(calculateTotalByCurrency('USD'))}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Válido por 6 meses
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewQuote({
                    treatment_description: '',
                    notes: '',
                    quote_date: '',
                    items: [{ id: Date.now().toString(), description: '', quantity: 1, unit_price: 0, total_price: 0 }]
                  });
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createQuote}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                <i className="fas fa-save mr-2"></i>
                Crear Presupuesto
              </button>
            </div>
          </div>
        )}

        {/* Quotes List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-file-invoice text-gray-400 text-5xl mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400">
                No hay presupuestos para este paciente
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tratamiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Expira
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
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(getQuoteDisplayDate(quote))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate" title={quote.treatment_description}>
                          {quote.treatment_description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatQuoteAmount(quote)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className={isExpired(quote.expires_at) ? 'text-red-600 font-medium' : ''}>
                          {formatDate(quote.expires_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(quote.status)}`}>
                          {getStatusText(quote.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowDetailsModal(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Ver detalles"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          {quote.status === 'pending' && !isExpired(quote.expires_at) && (
                            <>
                              <button
                                onClick={() => updateQuoteStatus(quote.id, 'accepted')}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Aceptar"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={() => updateQuoteStatus(quote.id, 'rejected')}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Rechazar"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quote Details Modal */}
        {showDetailsModal && selectedQuote && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Detalles del Presupuesto
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Paciente:</p>
                          <p className="font-medium">{selectedQuote.patient_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Doctor:</p>
                          <p className="font-medium">{selectedQuote.doctor_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Fecha:</p>
                          <p className="font-medium">{formatDate(getQuoteDisplayDate(selectedQuote))}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Expira:</p>
                          <p className={`font-medium ${isExpired(selectedQuote.expires_at) ? 'text-red-600' : ''}`}>
                            {formatDate(selectedQuote.expires_at)}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">Descripción del Tratamiento:</p>
                        <p className="text-gray-900">{selectedQuote.treatment_description}</p>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">Ítems:</p>
                        <div className="bg-gray-50 rounded-lg p-4">
                          {selectedQuote.items.map((item, index) => (
                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                              <div className="flex-1">
                                <span className="font-medium">{item.description}</span>
                                <span className="text-sm text-gray-500 ml-2">x{item.quantity}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {getItemCurrency(item) === 'HNL' ? 'L ' : '$'}{formatNumber(item.unit_price)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {getItemCurrency(item) === 'HNL' ? 'L ' : '$'}{formatNumber(item.total_price)}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-gray-300">
                            <div>
                              <span className="text-lg font-bold">Total:</span>
                            </div>
                            <div className="text-right">
                              {(() => {
                                const { hnlTotal, usdTotal, hasUSD } = analyzeQuoteCurrencies(selectedQuote);
                                return (
                                  <>
                                    <div className="text-lg font-bold">L {formatNumber(hnlTotal)}</div>
                                    {hasUSD && <div className="text-lg font-bold">${formatNumber(usdTotal)}</div>}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedQuote.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-2">Notas:</p>
                          <p className="text-gray-900">{selectedQuote.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Cerrar
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
