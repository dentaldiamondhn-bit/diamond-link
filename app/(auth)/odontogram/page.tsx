'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { PatientService } from '@/services/patientService';
import { OdontogramService } from '@/services/odontogramService';
import { useTheme } from '@/contexts/ThemeContext';

const ESTADOS = [
  { key: "apilado", label: "Apiñamiento", color: "#455A64" },
  { key: "amalgama", label: "Restauración Amalgama", color: "#607D8B" },
  { key: "ausente", label: "Ausente", color: "#9E9E9E" },
  { key: "carilla", label: "Carilla", color: "#00BCD4" },
  { key: "caries-restauracion", label: "Restauración con Caries", color: "#FFC107" },
  { key: "cariado", label: "Cariado", color: "#FF5722" },
  { key: "corona", label: "Corona", color: "#795548" },
  { key: "endodoncia", label: "Endodoncia", color: "#5D4037" },
  { key: "erupcion", label: "En Erupción", color: "#FF7043" },
  { key: "extraccionind", label: "Extracción indicada", color: "#E91E63" },
  { key: "fracturado", label: "Fracturado", color: "#FF9800" },
  { key: "implante", label: "Implante", color: "#3F51B5" },
  { key: "movilidad", label: "Movilidad", color: "#FDD835" },
  { key: "obturado", label: "Obturado", color: "#2196F3" },
  { key: "odontopatia", label: "Odontopatía", color: "#CDDC39" },
  { key: "protesis", label: "Prótesis", color: "#8D6E63" },
  { key: "raiz", label: "Raíz Residual", color: "#5E35B1" },
  { key: "resina", label: "Restauración Resina", color: "#8BC34A" },
  { key: "sano", label: "Sano", color: "#FFFFFF" },
  { key: "sellante", label: "Sellante", color: "#26C6DA" },
  { key: "temporal", label: "Restauración Temporal", color: "#9C27B0" },
  { key: "txpulpar", label: "Trat. pulpar", color: "#1976D2" }
];

interface ToothData {
  numero: number;
  estado: string;
  nota?: string;
}

interface ToothProps {
  numero: number;
  estado: string;
  nota?: string;
  estadoSeleccionado: string;
  onEstadoChange: (numero: number, estado: string) => void;
  onNotaChange: (numero: number, nota: string) => void;
  onShowPopup: (numero: number, show: boolean) => void;
  isLower?: boolean;
}

function Tooth({ numero, estado, nota, estadoSeleccionado, onEstadoChange, onNotaChange, onShowPopup, isLower = false }: ToothProps) {
  let toothType = 'molar';
  const lastDigit = numero % 10;
  
  if ([1, 2].includes(lastDigit)) {
    toothType = 'incisor';
  } else if (lastDigit === 3) {
    toothType = 'canine';
  } else if ([4, 5].includes(lastDigit)) {
    toothType = 'premolar';
  }

  const estadoActual = ESTADOS.find(e => e.key === estado);
  const backgroundColor = estadoActual?.color || '#FFFFFF';

  const handleClick = () => {
    onEstadoChange(numero, estadoSeleccionado);
  };

  const handleDoubleClick = () => {
    onShowPopup(numero, true);
  };

  const hasNote = !!nota;

  return (
    <div
      className={`diente ${hasNote ? 'has-note' : ''}`}
      data-tooth-type={toothType}
      data-estado={estado}
      data-has-note={hasNote}
      style={{
        backgroundColor,
        borderColor: backgroundColor,
        transform: isLower ? 'rotate(180deg)' : 'none'
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={`Diente ${numero}${nota ? ' - ' + nota : ''}`}
    >
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
      `}</style>
      <div className="tooth-container">
        <div className="tooth-number" style={{
          transform: isLower ? 'rotate(180deg)' : 'none',
          color: estado === 'sano' ? '#1F2937' : '#FFFFFF',
          textShadow: estado === 'sano' ? '0 0 2px rgba(255,255,255,0.7)' : '0 0 2px rgba(0,0,0,0.7)',
          position: 'relative'
        }}>
          {numero}
          {hasNote && (
            <div 
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                width: '6px',
                height: '6px',
                backgroundColor: '#FF5252',
                borderRadius: '50%',
                zIndex: 1000,
                boxShadow: '0 0 4px rgba(255, 82, 82, 0.8)',
                border: '1px solid #FFFFFF'
              }}
            ></div>
          )}
        </div>
      </div>
    </div>
  );
}

function OdontogramPageContent() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pacienteId = searchParams.get('id');
  const versionParam = searchParams.get('version');
  const editParam = searchParams.get('edit');

  // Date formatting function (same as pacientes page)
  const formatDateSpanish = (dateString: string): string => {
    let date: Date;
    
    // Handle different date formats
    if (dateString.includes('T') && dateString.includes('Z')) {
      // ISO format with Z: 2022-03-21T00:00:00.000Z
      date = new Date(dateString);
    } else if (dateString.includes('T')) {
      // ISO format without Z: 2022-03-21T00:00:00.000
      date = new Date(dateString + 'Z');
    } else {
      // Simple format: 2022-03-21
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return 'Fecha no disponible';
    
    const day = date.getUTCDate(); // Use UTC methods
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    
    return `${day} de ${month} ${year}`;
  };

  const [tipoOdontograma, setTipoOdontograma] = useState<'adulto' | 'nino'>('adulto');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('sano');
  const [dientesData, setDientesData] = useState<Record<number, { estado: string; nota?: string }>>({});
  const [historialCambios, setHistorialCambios] = useState<Array<{ numero: number; estadoAnterior: string; estadoNuevo: string }>>([]);
  const [notasGenerales, setNotasGenerales] = useState('');
  const [fechaOdontograma, setFechaOdontograma] = useState('');
  const [fechaOdontogramaDisplay, setFechaOdontogramaDisplay] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const [currentOdontogram, setCurrentOdontogram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editVersion, setEditVersion] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [odontogramasGuardados, setOdontogramasGuardados] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [popupState, setPopupState] = useState<{ show: boolean; toothNumber: number; noteText: string }>({
    show: false,
    toothNumber: 0,
    noteText: ''
  });
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for dark mode
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  useEffect(() => {
    if (pacienteId) {
      loadPatientAndOdontogramData();
    } else {
      setLoading(false);
    }
  }, [pacienteId, versionParam, editParam]);

  const loadPatientAndOdontogramData = async () => {
    try {
      setLoading(true);
      setError(null);

      const patientData = await PatientService.getPatientById(pacienteId!);
      if (!patientData) {
        setError('Paciente no encontrado');
        setLoading(false);
        return;
      }
      setPatient(patientData);

      // Load odontogram history
      const history = await OdontogramService.getOdontogramHistory(pacienteId!);
      setOdontogramasGuardados(history.map(h => ({
        id: h.odontograma.id,
        nombre: `Versión ${h.odontograma.version}${h.es_version_actual ? ' (Actual)' : ''}`,
        fecha: (h.odontograma.datos_odontograma as any)?.fecha || h.odontograma.fecha_creacion,
        version: h.odontograma.version,
        esActual: h.es_version_actual
      })));

      if (versionParam && editParam === 'true') {
        const odontogram = await OdontogramService.getOdontogramByVersion(pacienteId!, parseInt(versionParam));
        if (odontogram) {
          setCurrentOdontogram(odontogram);
          setIsEditing(true);
          setEditVersion(parseInt(versionParam));
          setSelectedVersion(parseInt(versionParam));
          loadOdontogramData(odontogram);
        }
      } else if (!editParam) {
        const odontogram = await OdontogramService.getActiveOdontogram(pacienteId!);
        if (odontogram) {
          setCurrentOdontogram(odontogram);
          setSelectedVersion(odontogram.version);
          loadOdontogramData(odontogram);
        }
      } else {
        initializeEmptyOdontogram();
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const loadOdontogramData = (odontogram: any) => {
    const datos: Record<number, { estado: string; nota?: string }> = {};
    let notasData: string = '';
    
    // Handle both data structures
    let odontogramData = odontogram.datos_odontograma;
    
    // Check if data is nested (old format)
    if (odontogramData && odontogramData.datos_odontograma) {
      odontogramData = odontogramData.datos_odontograma;
      // Also check for notas in nested structure
      if (odontogram.datos_odontograma.notas) {
        notasData = odontogram.datos_odontograma.notas;
      }
    }
    
    // Set tipo from loaded odontogram
    if (odontogramData && odontogramData.tipo) {
      setTipoOdontograma(odontogramData.tipo);
    }
    
    // Set fecha from loaded odontogram
    if (odontogramData && odontogramData.fecha) {
      // Use fecha field directly
      const fechaDate = new Date(odontogramData.fecha);
      setFechaOdontograma(fechaDate.toISOString().split('T')[0]);
      setFechaOdontogramaDisplay(formatDateSpanish(odontogramData.fecha));
    } else if (odontogramData.fecha_creacion) {
      // Fallback to creation date
      const fechaDate = new Date(odontogramData.fecha_creacion);
      setFechaOdontograma(fechaDate.toISOString().split('T')[0]);
      setFechaOdontogramaDisplay(formatDateSpanish(odontogramData.fecha_creacion));
    }
    
    if (odontogramData && odontogramData.dientes) {
      Object.entries(odontogramData.dientes).forEach(([numero, diente]: [string, any]) => {
        datos[parseInt(numero)] = {
          estado: diente.estado || 'sano',
          nota: diente.nota
        };
      });
    }
    
    setDientesData(datos);
    setNotasGenerales(notasData || '');
  };

  const initializeEmptyOdontogram = () => {
    const datos: Record<number, { estado: string; nota?: string }> = {};
    
    if (tipoOdontograma === 'adulto') {
      const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
      const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
      
      [...upperTeeth, ...lowerTeeth].forEach(num => {
        datos[num] = { estado: 'sano' };
      });
    } else {
      const upperTeeth = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
      const lowerTeeth = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
      
      [...upperTeeth, ...lowerTeeth].forEach(num => {
        datos[num] = { estado: 'sano' };
      });
    }
    
    setDientesData(datos);
    setNotasGenerales('');
  };

  const handleEstadoChange = (numero: number, nuevoEstado: string) => {
    const estadoAnterior = dientesData[numero]?.estado || 'sano';
    
    setHistorialCambios(prev => [...prev, { numero, estadoAnterior, estadoNuevo: nuevoEstado }]);
    
    setDientesData(prev => ({
      ...prev,
      [numero]: { ...prev[numero], estado: nuevoEstado }
    }));
  };

  const handleNotaChange = (numero: number, nota: string) => {
    setDientesData(prev => ({
      ...prev,
      [numero]: { ...prev[numero], nota: nota || undefined }
    }));
  };

  const handleShowPopup = (numero: number, show: boolean) => {
    if (show) {
      setPopupState({
        show: true,
        toothNumber: numero,
        noteText: dientesData[numero]?.nota || ''
      });
    } else {
      setPopupState({
        show: false,
        toothNumber: 0,
        noteText: ''
      });
    }
  };

  const saveNote = () => {
    handleNotaChange(popupState.toothNumber, popupState.noteText);
    setPopupState({
      show: false,
      toothNumber: 0,
      noteText: ''
    });
  };

  const deleteNote = () => {
    handleNotaChange(popupState.toothNumber, '');
    setPopupState({
      show: false,
      toothNumber: 0,
      noteText: ''
    });
  };

  const limpiarTodo = () => {
    const datosLimpios: Record<number, { estado: string; nota?: string }> = {};
    
    Object.keys(dientesData).forEach(num => {
      const numero = parseInt(num);
      datosLimpios[numero] = { estado: 'sano' };
    });
    
    setDientesData(datosLimpios);
    setNotasGenerales('');
    setHistorialCambios([]);
  };

  const retrocederCambio = () => {
    if (historialCambios.length === 0) return;
    
    const ultimoCambio = historialCambios[historialCambios.length - 1];
    setDientesData(prev => ({
      ...prev,
      [ultimoCambio.numero]: { ...prev[ultimoCambio.numero], estado: ultimoCambio.estadoAnterior }
    }));
    
    setHistorialCambios(prev => prev.slice(0, -1));
  };

  const buildOdontogramData = () => {
    const dientes: Record<string, any> = {};
    
    // Include ALL teeth from dientesData state, regardless of current type
    Object.keys(dientesData).forEach(key => {
      const numero = parseInt(key);
      dientes[key] = dientesData[numero];
    });
    
    // Also ensure all teeth for current type are included with default 'sano' state
    if (tipoOdontograma === 'adulto') {
      for (let i = 18; i <= 48; i++) {
        if (![11, 12, 13, 14, 15, 16, 17, 18].includes(i) && !dientes[i.toString()]) {
          dientes[i.toString()] = { estado: 'sano' };
        }
      }
    } else {
      for (let i = 51; i <= 85; i++) {
        if (![55, 56, 64, 65, 75, 85].includes(i) && !dientes[i.toString()]) {
          dientes[i.toString()] = { estado: 'sano' };
        }
      }
    }

    return {
      tipo: tipoOdontograma,
      dientes,
      fecha: fechaOdontograma
    };
  };

  const cargarVersionOdontograma = async (odontogramId: string, version: number) => {
    try {
      setLoading(true);
      setError(null);

      const odontogram = await OdontogramService.getOdontogramById(odontogramId);
      if (odontogram) {
        setCurrentOdontogram(odontogram);
        setIsEditing(true);
        setEditVersion(version);
        setSelectedVersion(version);
        loadOdontogramData(odontogram);
      }
    } catch (err) {
      console.error('Error loading odontogram version:', err);
      setError('Error al cargar la versión del odontograma');
    } finally {
      setLoading(false);
    }
  };

  const guardarOdontogramaActual = async () => {
    if (!pacienteId) return;

    try {
      setSaving(true);
      setError(null);

      const odontogramData = buildOdontogramData();
      
      // Always update the current active odontogram (don't create new version)
      if (currentOdontogram) {
        await OdontogramService.updateOdontogram(currentOdontogram.id, odontogramData, notasGenerales);
        
        // Reload the updated odontogram to reflect changes
        const updatedOdontogram = await OdontogramService.getActiveOdontogram(pacienteId!);
        if (updatedOdontogram) {
          setCurrentOdontogram(updatedOdontogram);
          loadOdontogramData(updatedOdontogram);
        }
      } else {
        // If no current odontogram, create the first one
        await OdontogramService.createOdontogram(pacienteId, odontogramData, notasGenerales);
        
        // Load the new active odontogram
        const activeOdontogram = await OdontogramService.getActiveOdontogram(pacienteId);
        if (activeOdontogram) {
          setCurrentOdontogram(activeOdontogram);
          loadOdontogramData(activeOdontogram);
          setIsEditing(false);
          setEditVersion(null);
          setSelectedVersion(activeOdontogram.version);
        }
      }

    } catch (err) {
      console.error('Error saving odontogram:', err);
      setError('Error al guardar el odontograma');
    } finally {
      setSaving(false);
    }
  };

  const guardarNuevoOdontograma = async () => {
    if (!pacienteId) return;

    try {
      setSaving(true);
      setError(null);

      const odontogramData = buildOdontogramData();

      // Always create a new version (this creates a copy and increments version)
      await OdontogramService.createNewVersion(pacienteId, odontogramData, notasGenerales);

      // Refresh the odontogram history after saving
      const history = await OdontogramService.getOdontogramHistory(pacienteId);
      setOdontogramasGuardados(history.map(h => ({
        id: h.odontograma.id,
        nombre: `Versión ${h.odontograma.version}${h.es_version_actual ? ' (Actual)' : ''}`,
        fecha: (h.odontograma.datos_odontograma as any)?.fecha || h.odontograma.fecha_creacion,
        version: h.odontograma.version,
        esActual: h.es_version_actual
      })));

      // Load new active odontogram
      const activeOdontogram = await OdontogramService.getActiveOdontogram(pacienteId);
      if (activeOdontogram) {
        setCurrentOdontogram(activeOdontogram);
        loadOdontogramData(activeOdontogram);
        setIsEditing(false);
        setEditVersion(null);
        setSelectedVersion(activeOdontogram.version);
      }
    } catch (err) {
      console.error('Error creating new odontogram version:', err);
      setError('Error al crear nueva versión del odontograma');
    } finally {
      setSaving(false);
    }
  };

  const getContadorEstados = () => {
    const contador: Record<string, number> = {};
    ESTADOS.forEach(estado => {
      contador[estado.key] = 0;
    });
    
    // Get all tooth numbers based on odontogram type
    let allToothNumbers: number[] = [];
    if (tipoOdontograma === 'adulto') {
      allToothNumbers = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    } else {
      // Niño has 20 teeth
      allToothNumbers = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
    }
    
    // Count all teeth, including default "sano" teeth
    allToothNumbers.forEach(numero => {
      const estado = dientesData[numero]?.estado || 'sano';
      contador[estado] = (contador[estado] || 0) + 1;
    });
    
    return contador;
  };

  const contadorEstados = getContadorEstados();

  const filteredEstados = ESTADOS.filter(estado =>
    estado.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        <p className="ml-4 text-gray-600">Cargando datos del odontograma...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <i className="fas fa-exclamation-triangle text-4xl"></i>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => router.push(`/menu-navegacion?id=${pacienteId}`)}
          className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Volver a Registros
        </button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Paciente no encontrado</p>
        <button
          onClick={() => router.push(`/menu-navegacion?id=${pacienteId}`)}
          className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Volver a Registros
        </button>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        /* Theme-aware styles */

        .form-group {
          flex: 1;
          min-width: 220px;
          margin-bottom: 5px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #374151;
          font-size: 0.9em;
          font-weight: 500;
        }

        @media (prefers-color-scheme: dark) {
          .form-group label {
            color: #e2e8f0;
          }
        }

        .dark .form-group label {
          color: #e2e8f0;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #111827;
          font-size: 0.95em;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        @media (prefers-color-scheme: dark) {
          .form-input {
            border-color: #475569;
            background: rgba(15, 23, 42, 0.8);
            color: #e2e8f0;
          }
        }

        .dark .form-input {
          border-color: #475569;
          background: rgba(15, 23, 42, 0.8);
          color: #e2e8f0;
        }

        .form-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        @media (prefers-color-scheme: dark) {
          .form-input:focus {
            background: rgba(15, 23, 42, 0.9);
          }
        }

        .dark .form-input:focus {
          background: rgba(15, 23, 42, 0.9);
        }

        .form-input:disabled {
          background: #f3f4f6;
          color: #6b7280;
          cursor: not-allowed;
        }

        @media (prefers-color-scheme: dark) {
          .form-input:disabled {
            background: rgba(30, 41, 59, 0.5);
            color: #94a3b8;
          }
        }

        .dark .form-input:disabled {
          background: rgba(30, 41, 59, 0.5);
          color: #94a3b8;
        }

        input[type="date"] {
          padding: 8px 10px;
          max-width: 180px;
        }

        .card {
          background: white;
          border-radius: 10px;
          padding: 15px 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        @media (prefers-color-scheme: dark) {
          .card {
            background: rgba(30, 41, 59, 0.8);
            border-color: rgba(255,255,255,0.1);
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          }
        }

        .dark .card {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #10b981;
          color: white;
        }

        .btn-primary:hover {
          background: #059669;
        }

        .btn-secondary {
          background: #3b82f6;
          color: white;
        }

        .btn-secondary:hover {
          background: #2563eb;
        }

        .main-container {
          display: flex;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          gap: 15px;
          padding: 0 15px;
          box-sizing: border-box;
        }

        .left-sidebar {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .main-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .odontograma {
          display: grid;
          grid-template-columns: repeat(16, 1fr);
          grid-template-rows: auto auto;
          gap: 8px;
          justify-content: center;
          margin: 30px auto;
          max-width: 1400px;
          padding: 50px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        @media (prefers-color-scheme: dark) {
          .odontograma {
            background: rgba(30, 41, 59, 0.95);
            border-color: rgba(255,255,255,0.15);
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          }
        }

        .dark .odontograma {
          background: rgba(30, 41, 59, 0.95);
          border-color: rgba(255,255,255,0.15);
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }

        .diente {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          position: relative;
          cursor: pointer;
          border: 2px solid;
          border-radius: 4px;
          margin: 1px;
          font-size: 10px;
          font-weight: bold;
          transition: all 0.2s ease;
          grid-column: auto;
          grid-row: auto;
        }

        .tooth-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        } 

        .diente[data-tooth-type="incisor"] {
          width: 35px;
          height: 75px;
          border-radius: 3px 3px 8px 8px;
        }

        .diente[data-tooth-type="premolar"] {
          width: 40px;
          height: 75px;
          border-radius: 3px 3px 8px 8px;
        }

        .diente[data-tooth-type="molar"] {
          width: 45px;
          height: 70px;
          border-radius: 3px 3px 8px 8px;
        }

        .diente[data-tooth-type="canine"] {
          width: 45px;
          height: 85px;
          border-radius: 3px 3px 10px 10px;
        }

        .diente[data-estado="sano"] {
          background: #ffffff;
          border-color: #aaa;
        }

        .diente:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        }

        .diente:active {
          transform: translateY(0);
          box-shadow: 0 1px 1px rgba(0,0,0,0.05);
        }

        .tooth-number {
          font-size: 0.9rem;
          font-weight: 700;
          color: #1F2937;
          position: relative;
          z-index: 2;
          text-shadow: 0 0 2px rgba(255,255,255,0.7);
        }

        .note-indicator {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 20px;
          height: 20px;
          opacity: 0;
          transition: all 0.2s ease;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF5252'%3E%3Cpath d='M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z'/%3E%3C/svg%3E");
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          z-index: 15;
          border-radius: 3px;
          box-shadow: 0 2px 6px rgba(255, 82, 82, 0.4);
          background-color: rgba(255, 255, 255, 0.9);
        }

        .has-note .note-indicator {
          opacity: 1;
          transform: scale(1.1);
        }

        .has-note .note-indicator:hover {
          transform: scale(1.2);
          filter: brightness(1.2);
        }

        .note-dot {
          position: absolute;
          bottom: -2px;
          left: -2px;
          width: 10px;
          height: 10px;
          background-color: #FF5252;
          border-radius: 50%;
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 15;
          box-shadow: 0 0 6px rgba(255, 82, 82, 0.8);
          border: 2px solid #FFFFFF;
        }

        .has-note .note-dot {
          opacity: 1;
          animation: pulse 2s infinite;
        }

        /* Make sure indicators are always visible for teeth with notes */
        .diente[data-has-note="true"] .note-indicator {
          opacity: 1 !important;
          display: block !important;
        }

        .diente[data-has-note="true"] .note-dot {
          opacity: 1 !important;
          display: block !important;
          animation: pulse 2s infinite !important;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }

        /* Gum line effect */
        .diente::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: -2px;
          right: -2px;
          height: 8px;
          background: #f5f5f5;
          border-radius: 0 0 8px 8px;
          z-index: -1;
          border-top: 1px solid #e0e0e0;
        }

        .tooth-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 99999;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease-out;
          padding: 20px;
          box-sizing: border-box;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .popup-content {
          background: white;
          padding: 24px;
          border-radius: 12px;
          width: 90%;
          max-width: 450px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          animation: slideUp 0.3s ease-out;
          position: relative;
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-color-scheme: dark) {
          .popup-content {
            background: rgba(30, 41, 59, 0.95);
            border-color: rgba(255,255,255,0.1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          }
        }

        .dark .popup-content {
          background: rgba(30, 41, 59, 0.95);
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }

        .popup-title {
          font-size: 1.3em;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @media (prefers-color-scheme: dark) {
          .popup-title {
            color: #f3f4f6;
            border-color: #4b5563;
          }
        }

        .dark .popup-title {
          color: #f3f4f6;
          border-color: #4b5563;
        }

        .popup-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 20px;
          background: #f9fafb;
          color: #1f2937;
          font-family: 'Inter', 'Poppins', sans-serif;
          font-size: 15px;
          line-height: 1.5;
          resize: vertical;
          min-height: 120px;
          transition: all 0.2s ease;
        }

        .popup-textarea:focus {
          outline: none;
          border-color: #10b981;
          background: white;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        @media (prefers-color-scheme: dark) {
          .popup-textarea {
            border-color: #4b5563;
            background: rgba(17, 24, 39, 0.8);
            color: #f3f4f6;
          }
          .popup-textarea:focus {
            background: rgba(17, 24, 39, 0.9);
            border-color: #10b981;
          }
        }

        .dark .popup-textarea {
          border-color: #4b5563;
          background: rgba(17, 24, 39, 0.8);
          color: #f3f4f6;
        }

        .dark .popup-textarea:focus {
          background: rgba(17, 24, 39, 0.9);
          border-color: #10b981;
        }

        .popup-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .popup-save, .popup-close, .popup-delete {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .popup-save {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }

        .popup-save:hover {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
          transform: translateY(-1px);
        }

        .popup-delete {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }

        .popup-delete:hover {
          background: linear-gradient(135deg, #b91c1c, #991b1b);
          box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
          transform: translateY(-1px);
        }

        .popup-close {
          background: #6b7280;
          color: white;
          box-shadow: 0 2px 4px rgba(107, 114, 128, 0.2);
        }

        .popup-close:hover {
          background: #4b5563;
          box-shadow: 0 4px 8px rgba(107, 114, 128, 0.3);
          transform: translateY(-1px);
        }

        @media (prefers-color-scheme: dark) {
          .popup-close {
            background: #4b5563;
            color: #f3f4f6;
          }
          .popup-close:hover {
            background: #374151;
          }
        }

        .dark .popup-close {
          background: #4b5563;
          color: #f3f4f6;
        }

        .dark .popup-close:hover {
          background: #374151;
        }

        .contador {
          margin: 20px auto;
          max-width: 800px;
          text-align: center;
        }

        .contador-inner {
          display: inline-flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
          background: white;
          padding: 15px 25px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          width: auto;
          border: 1px solid #e5e7eb;
        }

        @media (prefers-color-scheme: dark) {
          .contador-inner {
            background: rgba(30, 41, 59, 0.8);
            border-color: rgba(255,255,255,0.1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
        }

        .dark .contador-inner {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .contador table {
          margin: 0 auto;
          border-collapse: collapse;
          width: auto;
        }

        .contador td {
          padding: 8px 15px;
          text-align: left;
          border-bottom: 1px solid #d1d5db;
          color: #374151;
        }

        @media (prefers-color-scheme: dark) {
          .contador td {
            border-color: #475569;
            color: #e2e8f0;
          }
        }

        .dark .contador td {
          border-color: #475569;
          color: #e2e8f0;
        }

        .contador tr:last-child td {
          border-bottom: none;
        }

        .small-box {
          display: inline-block;
          width: 12px;
          height: 12px;
          margin-right: 5px;
          vertical-align: middle;
        }

        .state-search {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #111827;
          font-size: 0.9em;
          margin-bottom: 10px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        @media (prefers-color-scheme: dark) {
          .state-search {
            border-color: #475569;
            background: rgba(15, 23, 42, 0.8);
            color: #e2e8f0;
          }
        }

        .dark .state-search {
          border-color: #475569;
          background: rgba(15, 23, 42, 0.8);
          color: #e2e8f0;
        }

        .state-search:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        @media (prefers-color-scheme: dark) {
          .state-search:focus {
            background: rgba(15, 23, 42, 0.9);
          }
        }

        .dark .state-search:focus {
          background: rgba(15, 23, 42, 0.9);
        }

        .state-search::placeholder {
          color: #9ca3af;
        }

        @media (prefers-color-scheme: dark) {
          .state-search::placeholder {
            color: #94a3b8;
          }
        }

        .dark .state-search::placeholder {
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .form-group {
            min-width: 100%;
          }
        }

        .main-container {
          display: flex;
          gap: 20px;
          margin: 20px auto;
          max-width: 1400px;
          padding: 0 20px;
        }

        .left-sidebar {
          width: 300px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card {
          background: white;
          border-radius: 10px;
          padding: 15px 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .dark .card {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Patient Information */}
      <div className="mx-auto max-w-5xl px-5 mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-wrap gap-8 items-end">
          <div className="form-group flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-black dark:text-gray-100 mb-2">Nombre completo:</label>
            <input
              type="text"
              value={patient?.nombre_completo || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
          </div>
          
          <div className="form-group flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-black dark:text-gray-100 mb-2">Identidad:</label>
            <input
              type="text"
              value={patient?.numero_identidad || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
          </div>
          
          <div className="form-group flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-black dark:text-gray-100 mb-2">Fecha del Odontograma:</label>
            <input
              type="date"
              value={fechaOdontograma}
              onChange={(e) => {
                if (!editParam || editParam !== 'true') {
                  setFechaOdontograma(e.target.value);
                  setFechaOdontogramaDisplay(formatDateSpanish(e.target.value));
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Type Selection */}
      <div className="flex justify-center" style={{ margin: '20px auto', maxWidth: '1000px' }}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6" style={{ marginRight: '20px' }}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Tipo de odontograma
          </label>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={() => setTipoOdontograma('adulto')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
                tipoOdontograma === 'adulto' 
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Adulto
            </button>
            <button
              onClick={() => setTipoOdontograma('nino')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
                tipoOdontograma === 'nino' 
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Niño
            </button>
          </div>
        </div>
        
        {/* State Counter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-4">
            Conteo por Estado
          </h3>
          <div className="contador-inner">
            <table>
              <tbody>
                {ESTADOS.filter(estado => contadorEstados[estado.key] > 0).map(estado => (
                  <tr key={estado.key}>
                    <td>
                      <span className="small-box" style={{ background: estado.color }}></span>
                      {estado.label}: {contadorEstados[estado.key]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="main-container">
        {/* Left Sidebar */}
        <div className="left-sidebar">
          {/* History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-4">
              Historial de Odontogramas
            </h3>
            <div className="max-h-40 overflow-y-auto mb-2 bg-gray-50 dark:bg-gray-700 rounded-md p-2 text-sm">
              {odontogramasGuardados.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 m-0">No hay odontogramas guardados</p>
              ) : (
                odontogramasGuardados.map((odo, index) => (
                  <div 
                    key={index} 
                    className={`mb-1 p-1 rounded cursor-pointer border ${
                      selectedVersion === odo.version 
                        ? 'bg-green-800 border-teal-500' 
                        : 'bg-gray-600 dark:bg-gray-600 border-transparent hover:bg-gray-700'
                    }`}
                    onClick={() => cargarVersionOdontograma(odo.id, odo.version)}
                  >
                    <div className={`font-medium ${
                      selectedVersion === odo.version ? 'text-teal-400' : 'text-gray-100'
                    }`}>
                      {odo.nombre}
                    </div>
                    <div className="text-xs text-gray-300">
                      {formatDateSpanish(odo.fecha)}
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={guardarOdontogramaActual}
              disabled={saving}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ width: '100%', marginBottom: '10px' }}
            >
              <i className="fas fa-save"></i> {saving ? 'Guardando...' : 'Actualizar Versión Actual'}
            </button>
          </div>
          
          {/* State Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-4">
              Seleccionar Estado
            </h3>
            
            <input
              type="text"
              placeholder="Buscar estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            
            <select
              value={estadoSeleccionado}
              onChange={(e) => setEstadoSeleccionado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mt-2"
            >
              {ESTADOS.map(estado => (
                <option key={estado.key} value={estado.key}>
                  {estado.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Odontogram */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6" style={{ width: 'fit-content', maxWidth: '100%', padding: '20px 30px', margin: '0 auto' }}>
            <div className="odontograma">
              {tipoOdontograma === 'adulto' ? (
                <>
                  {/* Upper teeth - direct grid children */}
                  {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((numero, index) => (
                    <Tooth
                      key={numero}
                      numero={numero}
                      estado={dientesData[numero]?.estado || 'sano'}
                      nota={dientesData[numero]?.nota}
                      estadoSeleccionado={estadoSeleccionado}
                      onEstadoChange={handleEstadoChange}
                      onNotaChange={handleNotaChange}
                      onShowPopup={handleShowPopup}
                    />
                  ))}
                  {/* Lower teeth - direct grid children */}
                  {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(numero => (
                    <Tooth
                      key={numero}
                      numero={numero}
                      estado={dientesData[numero]?.estado || 'sano'}
                      nota={dientesData[numero]?.nota}
                      estadoSeleccionado={estadoSeleccionado}
                      onEstadoChange={handleEstadoChange}
                      onNotaChange={handleNotaChange}
                      onShowPopup={handleShowPopup}
                      isLower={true}
                    />
                  ))}
                </>
              ) : (
                <>
                  {/* Child teeth - Upper */}
                  {[55, 54, 53, 52, 51, 61, 62, 63, 64, 65].map(numero => (
                    <Tooth
                      key={numero}
                      numero={numero}
                      estado={dientesData[numero]?.estado || 'sano'}
                      nota={dientesData[numero]?.nota}
                      estadoSeleccionado={estadoSeleccionado}
                      onEstadoChange={handleEstadoChange}
                      onNotaChange={handleNotaChange}
                      onShowPopup={handleShowPopup}
                    />
                  ))}
                  {/* Child teeth - Lower */}
                  {[85, 84, 83, 82, 81, 71, 72, 73, 74, 75].map(numero => (
                    <Tooth
                      key={numero}
                      numero={numero}
                      estado={dientesData[numero]?.estado || 'sano'}
                      nota={dientesData[numero]?.nota}
                      estadoSeleccionado={estadoSeleccionado}
                      onEstadoChange={handleEstadoChange}
                      onNotaChange={handleNotaChange}
                      onShowPopup={handleShowPopup}
                      isLower={true}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
          
          {/* Comments */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Comentarios</h3>
            <textarea
              value={notasGenerales}
              onChange={(e) => setNotasGenerales(e.target.value)}
              placeholder="Escribe tus observaciones generales aquí..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y"
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button
          onClick={guardarNuevoOdontograma}
          disabled={saving}
          style={{ background: 'linear-gradient(135deg, #8fe392ff 0%, #3c9f41ff 100%)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', margin: '0 5px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          className="hover:shadow-lg"
        >
          <i className="fas fa-save"></i> {saving ? 'Guardando...' : 'Crear Nueva Versión'}
        </button>
        <button
          onClick={retrocederCambio}
          disabled={historialCambios.length === 0}
          style={{ background: 'linear-gradient(135deg, #ce54e3ff 0%, #8E24AA 100%)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', margin: '0 5px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          className="hover:shadow-lg"
        >
          <i className="fas fa-step-backward"></i> Retroceder último cambio
        </button>
        <button
          onClick={limpiarTodo}
          style={{ background: 'linear-gradient(135deg, #d27069ff 0%, #E53935 100%)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', margin: '0 5px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          className="hover:shadow-lg"
        >
          <i className="fas fa-broom"></i> Limpiar todo
        </button>
        <button
          onClick={() => router.push(`/menu-navegacion?id=${pacienteId}`)}
          style={{ background: 'linear-gradient(135deg, #53a7ecff 0%, #0f6bc7ff 100%)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', margin: '0 5px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          className="hover:shadow-lg"
        >
          <i className="fas fa-arrow-left"></i> Volver
        </button>
      </div>

      {/* Global Modal */}
      {mounted && popupState.show && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setPopupState({ show: false, toothNumber: 0, noteText: '' })}
        >
          <div 
            style={{
              background: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'white',
              padding: '24px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '450px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: isDarkMode ? '0 10px 25px rgba(0, 0, 0, 0.4)' : '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
              animation: 'slideUp 0.3s ease-out',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: '1.3em',
              fontWeight: '600',
              marginBottom: '20px',
              color: isDarkMode ? '#f3f4f6' : '#1f2937',
              borderBottom: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
              paddingBottom: '12px'
            }}>
              Diente {popupState.toothNumber}
            </div>
            <textarea
              style={{
                width: '100%',
                padding: '12px 16px',
                border: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '20px',
                background: isDarkMode ? 'rgba(17, 24, 39, 0.8)' : '#f9fafb',
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                fontFamily: 'Inter, Poppins, sans-serif',
                fontSize: '15px',
                lineHeight: '1.5',
                resize: 'vertical',
                minHeight: '120px',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              value={popupState.noteText}
              onChange={(e) => setPopupState(prev => ({ ...prev, noteText: e.target.value }))}
              placeholder="Escribe tus notas aquí..."
              rows={4}
              autoFocus
              onFocus={(e) => {
                e.target.style.background = isDarkMode ? 'rgba(17, 24, 39, 0.9)' : 'white';
                e.target.style.borderColor = '#10b981';
                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.background = isDarkMode ? 'rgba(17, 24, 39, 0.8)' : '#f9fafb';
                e.target.style.borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button 
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                  transition: 'all 0.2s ease'
                }}
                onClick={saveNote}
                onMouseOver={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'linear-gradient(135deg, #059669, #047857)';
                  target.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                  target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                  target.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                  target.style.transform = 'translateY(0)';
                }}
              >
                Guardar
              </button>
              <button 
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                  transition: 'all 0.2s ease'
                }}
                onClick={deleteNote}
                onMouseOver={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'linear-gradient(135deg, #b91c1c, #991b1b)';
                  target.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.3)';
                  target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                  target.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
                  target.style.transform = 'translateY(0)';
                }}
              >
                Borrar Nota
              </button>
              <button 
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  background: isDarkMode ? '#4b5563' : '#6b7280',
                  color: isDarkMode ? '#f3f4f6' : 'white',
                  boxShadow: isDarkMode ? '0 2px 4px rgba(75, 85, 99, 0.3)' : '0 2px 4px rgba(107, 114, 128, 0.2)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setPopupState({ show: false, toothNumber: 0, noteText: '' })}
                onMouseOver={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = isDarkMode ? '#374151' : '#4b5563';
                  target.style.boxShadow = isDarkMode ? '0 4px 8px rgba(75, 85, 99, 0.4)' : '0 4px 8px rgba(107, 114, 128, 0.3)';
                  target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = isDarkMode ? '#4b5563' : '#6b7280';
                  target.style.color = isDarkMode ? '#f3f4f6' : 'white';
                  target.style.boxShadow = isDarkMode ? '0 2px 4px rgba(75, 85, 99, 0.3)' : '0 2px 4px rgba(107, 114, 128, 0.2)';
                  target.style.transform = 'translateY(0)';
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function OdontogramPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando odontograma...</p>
        </div>
      </div>
    }>
      <OdontogramPageContent />
    </Suspense>
  );
}