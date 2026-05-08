'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientService } from '@/services/patientService';
import { OlearyService } from '../../../services/oLearyService';

// API helper functions for odontogram-pilot
const getActiveOdontogram = async (patientId: string) => {
  const response = await fetch(`/api/odontogram-pilot/active?patient_id=${patientId}`);
  const data = await response.json();
  return data.odontogram;
};

const getOdontogramHistory = async (patientId: string) => {
  const response = await fetch(`/api/odontogram-pilot/history?patient_id=${patientId}`);
  const data = await response.json();
  return data.history;
};

const getOdontogramById = async (id: string) => {
  const response = await fetch(`/api/odontogram-pilot/${id}`);
  const data = await response.json();
  return data.odontogram;
};

const createOdontogram = async (patientId: string, datosOdontograma: any, notas: string) => {
  const response = await fetch('/api/odontogram-pilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paciente_id: patientId, datos_odontograma: datosOdontograma, notas })
  });
  const data = await response.json();
  return data.odontogram;
};

const updateOdontogram = async (id: string, datosOdontograma: any, notas: string) => {
  const response = await fetch(`/api/odontogram-pilot/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ datos_odontograma: datosOdontograma, notas })
  });
  const data = await response.json();
  return data.odontogram;
};

// Dental quadrant names (matching tooth surfaces)
const CUADRANTES = ['mesial', 'distal', 'buccal', 'lingual'] as const;
type Cuadrante = typeof CUADRANTES[number];

// Statuses that apply to all tooth sections at once
const ALL_SECTION_STATUSES = [
  'ausente',
  'corona', 
  'extraccionind',
  'erupcion',
  'implante',
  'protesis',
  'raiz'
] as const;

interface HistorialCambio {
  numero: number;
  cuadrante: string; // 'mesial'|'distal'|'buccal'|'lingual'|'central'
  estadoAnterior: string;
  estadoNuevo: string;
}

const ESTADOS = [
  { key: "amalgama", label: "Restauración Amalgama", color: "#607D8B" },
  { key: "apilado", label: "Apiñamiento", color: "#455A64" },
  { key: "ausente", label: "Ausente", color: "#9E9E9E" },
  { key: "carilla", label: "Carilla", color: "#00BCD4" },
  { key: "cariado", label: "Cariado", color: "#FF5722" },
  { key: "caries-restauracion", label: "Restauración con Caries", color: "#FFC107" },
  { key: "corona", label: "Corona", color: "#795548" },
  { key: "endodoncia", label: "Endodoncia", color: "#5D4037" },
  { key: "erupcion", label: "En Erupción", color: "#FF7043" },
  { key: "extraccionind", label: "Extracción indicada", color: "#E91E63" },
  { key: "fistula", label: "Fístula", color: "#7E57C2" },
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

// O'Leary-specific statuses (plaque index based)
const ESTADOS_OLEARY = [
  { key: "sano", label: "Sano", color: "#FFFFFF" },
  { key: "placa", label: "Placa", color: "#FFEB3B" },
  { key: "ausente", label: "Ausente", color: "#000000" }
];

const ALL_SECTION_STATUSES_OLEARY = ['placa', 'ausente'];

// Tooth positions in FDI notation for adults (permanent teeth)
const ADULT_TEETH_QUADRANTS = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11], // UR: 8 to 1 (distal to midline)
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],  // UL: 1 to 8 (midline to distal)
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],  // LL: 1 to 8 (midline to distal)
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41]  // LR: 8 to 1 (distal to midline)
};

const CHILD_TEETH_QUADRANTS = {
  upperRight: [55, 54, 53, 52, 51], // Primary UR
  upperLeft: [61, 62, 63, 64, 65],   // Primary UL
  lowerLeft: [71, 72, 73, 74, 75],   // Primary LL
  lowerRight: [85, 84, 83, 82, 81]   // Primary LR
};

interface ToothData {
  cuadrantes: Record<Cuadrante, string>;
  central?: string;
  nota?: string;
}

interface ToothProps {
  numero: number;
  cuadrantes: Record<Cuadrante, string>;
  central?: string;
  nota?: string;
  estadoSeleccionado: string;
  onCuadranteChange: (numero: number, cuadrante: Cuadrante, estado: string) => void;
  onCentralChange: (numero: number, estado: string) => void;
  onAllSectionsChange: (numero: number, estado: string) => void;
  onShowPopup: (numero: number, show: boolean) => void;
  isOlearyMode?: boolean;
}

function CircularTooth({ numero, cuadrantes, central, nota, estadoSeleccionado, onCuadranteChange, onCentralChange, onAllSectionsChange, onShowPopup, isOlearyMode = false }: ToothProps) {
  const hasNote = !!nota;
  const radius = 18;

  const handleQuadrantClick = (cuadrante: Cuadrante) => (e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if this status should apply to all sections
    const currentAllSectionStatuses = isOlearyMode ? ALL_SECTION_STATUSES_OLEARY : ALL_SECTION_STATUSES;
    if (currentAllSectionStatuses.includes(estadoSeleccionado as any)) {
      // Apply to all sections
      onAllSectionsChange(numero, estadoSeleccionado);
    } else {
      // Apply only to this quadrant
      onCuadranteChange(numero, cuadrante, estadoSeleccionado);
    }
  };

  const handleCenterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if this status should apply to all sections
    const currentAllSectionStatuses = isOlearyMode ? ALL_SECTION_STATUSES_OLEARY : ALL_SECTION_STATUSES;
    if (currentAllSectionStatuses.includes(estadoSeleccionado as any)) {
      // Apply to all sections
      onAllSectionsChange(numero, estadoSeleccionado);
    } else {
      // Apply only to center
      onCentralChange(numero, estadoSeleccionado);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowPopup(numero, true);
  };

  // SVG arc path generator for a pie slice
  const pieSlicePath = (startAngle: number, endAngle: number, r: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = 0 + r * Math.cos(startRad);
    const y1 = 0 + r * Math.sin(startRad);
    const x2 = 0 + r * Math.cos(endRad);
    const y2 = 0 + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // Quadrant angles (starting from top, going clockwise) - X pattern
  const quadrantAngles: Record<Cuadrante, [number, number]> = {
    mesial: [45, 135],    // Diagonal top-right to bottom-right
    buccal: [135, 225],   // Diagonal bottom-right to bottom-left
    lingual: [225, 315],  // Diagonal bottom-left to top-left
    distal: [315, 405]    // Diagonal top-left to top-right (405 = 45)
  };

   return (
     <g
       onDoubleClick={handleDoubleClick}
       style={{ cursor: 'pointer' }}
     >
       <title>{`Diente ${numero}${nota ? ' - ' + nota : ''}`}</title>
       {/* Clickable quadrants */}
      {(Object.entries(quadrantAngles) as [Cuadrante, [number, number]][]).map(([cuadrante, [start, end]]) => {
        const estado = cuadrantes[cuadrante];
        const currentEstados = isOlearyMode ? ESTADOS_OLEARY : ESTADOS;
        const estadoActual = currentEstados.find(e => e.key === estado);
        const fillColor = estadoActual?.color || '#FFFFFF';
        return (
          <path
            key={cuadrante}
            d={pieSlicePath(start, end, radius)}
            fill={fillColor}
            stroke="black"
            strokeWidth="0.8"
            opacity="0.9"
            onClick={handleQuadrantClick(cuadrante)}
            style={{ cursor: 'pointer' }}
          />
        );
      })}

       {/* Center circle with tooth number - clickable (only for non-O'Leary mode) */}
       {!isOlearyMode && (
         <>
           <circle
             cx="0"
             cy="0"
             r="7.2"
             fill={central ? ((isOlearyMode ? ESTADOS_OLEARY : ESTADOS).find(e => e.key === central)?.color || '#FFFFFF') : '#FFFFFF'}
             stroke="black"
             strokeWidth="1.5"
             onClick={handleCenterClick}
             style={{ cursor: 'pointer' }}
           />
           <text
             x="0"
             y="0"
             textAnchor="middle"
             dominantBaseline="central"
             fontSize="8"
             fontWeight="bold"
             fill={central && central !== 'sano' ? '#FFFFFF' : '#1F2937'}
             style={{
               pointerEvents: 'none',
               userSelect: 'none'
             }}
           >
             {numero}
           </text>
         </>
       )}

       {/* Tooth number in center for O'Leary mode (no clickable center) */}
       {isOlearyMode && (
         <text
           x="0"
           y="0"
           textAnchor="middle"
           dominantBaseline="central"
           fontSize="10"
           fontWeight="bold"
           fill="#1F2937"
           style={{
             pointerEvents: 'none',
             userSelect: 'none'
           }}
         >
           {numero}
         </text>
       )}

      {/* Note indicator */}
      {hasNote && (
        <circle
          cx={radius - 4}
          cy={-radius + 4}
          r="4"
          fill="#FF5252"
          stroke="#FFFFFF"
          strokeWidth="1"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
}

function OdontogramPilotPageContent() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const pacienteId = searchParams.get('id');
  const versionParam = searchParams.get('version');
  const editParam = searchParams.get('edit');

  const formatDateSpanish = (dateString: string): string => {
    let date: Date;
    
    if (dateString.includes('T') && dateString.includes('Z')) {
      date = new Date(dateString);
    } else if (dateString.includes('T')) {
      date = new Date(dateString + 'Z');
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return 'Fecha no disponible';
    
    const day = date.getUTCDate();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    
    return `${day} de ${month} ${year}`;
  };

  const [tipoOdontograma, setTipoOdontograma] = useState<'adulto' | 'nino' | 'oleary_adulto'>('adulto');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('sano');
  const [dientesData, setDientesData] = useState<Record<number, ToothData>>({});
  const [userSelectedMode, setUserSelectedMode] = useState(false);
   const [historialCambios, setHistorialCambios] = useState<HistorialCambio[]>([]);
  const [notasGenerales, setNotasGenerales] = useState('');
  const [fechaOdontograma, setFechaOdontograma] = useState('');

  const [patient, setPatient] = useState<any>(null);
  const [currentOdontogram, setCurrentOdontogram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [odontogramasGuardados, setOdontogramasGuardados] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [popupState, setPopupState] = useState<{ show: boolean; toothNumber: number; noteText: string }>({
    show: false,
    toothNumber: 0,
    noteText: ''
  });


  const filteredEstados = (tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).filter(estado =>
    estado.label.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const searchLower = searchTerm.toLowerCase();
    const aLabel = a.label.toLowerCase();
    const bLabel = b.label.toLowerCase();

    if (aLabel === searchLower && bLabel !== searchLower) return -1;
    if (bLabel === searchLower && aLabel !== searchLower) return 1;

    if (aLabel.startsWith(searchLower) && !bLabel.startsWith(searchLower)) return -1;
    if (bLabel.startsWith(searchLower) && !aLabel.startsWith(searchLower)) return 1;

    return aLabel.localeCompare(bLabel);
  });

  const handleEstadoSelect = (estadoKey: string) => {
    setEstadoSeleccionado(estadoKey);
    const currentEstados = tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS;
    setSearchTerm(currentEstados.find(e => e.key === estadoKey)?.label || '');
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredEstados.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredEstados.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredEstados.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleEstadoSelect(filteredEstados[highlightedIndex].key);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
   };

  // Helper: create default tooth data with all quadrants = 'sano'
  const crearDienteCuadrantes = (): Record<Cuadrante, string> => ({
    mesial: 'sano',
    distal: 'sano',
    buccal: 'sano',
    lingual: 'sano'
  });

  // Helper: create O'Leary tooth data (no center section)
  const crearDienteOleary = (): ToothData => ({
    cuadrantes: crearDienteCuadrantes()
  });





  useEffect(() => {
    if (pacienteId) {
      loadPatientAndOdontogramData();
    } else {
      setLoading(false);
    }
  }, [pacienteId, versionParam, editParam]);

  // Reset selected state when switching between odontogram types
  useEffect(() => {
    setEstadoSeleccionado('sano');
    setSearchTerm('');
    setUserSelectedMode(false); // Reset flag after handling
  }, [tipoOdontograma]);

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

      // Load different data based on odontogram type
      if (tipoOdontograma === 'oleary_adulto') {
        // Load O'Leary data
        const history = await OlearyService.getOdontogramHistory(pacienteId!);
        setOdontogramasGuardados(history.map(h => ({
          id: h.oleary.id,
          nombre: `Versión ${h.oleary.version}${h.es_version_actual ? ' (Actual)' : ''}`,
          fecha: h.oleary.datos_odontograma.fecha || h.oleary.fecha_creacion,
          version: h.oleary.version,
          esActual: h.es_version_actual,
          tipo: 'oleary_adulto'
        })));

        if (versionParam && editParam === 'true') {
          const oleary = await OlearyService.getOdontogramById(versionParam);
          if (oleary) {
            setCurrentOdontogram(oleary);
            setSelectedVersion(oleary.version);
            loadOlearyData(oleary);
          }
        } else if (!editParam) {
          const oleary = await OlearyService.getActiveOdontogram(pacienteId!);
          if (oleary) {
            setCurrentOdontogram(oleary);
            setSelectedVersion(oleary.version);
            loadOlearyData(oleary);
          } else {
            initializeEmptyOdontogram();
            setFechaOdontograma(new Date().toISOString());
          }
        }
      } else {
        // Load regular odontogram data
        const history = await getOdontogramHistory(pacienteId!);
        setOdontogramasGuardados(history.map(h => ({
          id: h.id,
          nombre: `Versión ${h.version}${h.activo ? ' (Actual)' : ''}`,
          fecha: (h.datos_odontograma as any)?.fecha || h.fecha_creacion,
          version: h.version,
          esActual: h.activo,
          tipo: (h.datos_odontograma as any)?.tipo || 'adulto'
        })));

        if (versionParam && editParam === 'true') {
          const history = await getOdontogramHistory(pacienteId!);
          const odontogram = history.find((o: any) => o.version === parseInt(versionParam));
          if (odontogram) {
            setCurrentOdontogram(odontogram);
            setSelectedVersion(parseInt(versionParam));
            loadOdontogramData(odontogram);
          }
        } else if (!editParam) {
          const odontogram = await getActiveOdontogram(pacienteId!);
          if (odontogram) {
            setCurrentOdontogram(odontogram);
            setSelectedVersion(odontogram.version);
            loadOdontogramData(odontogram);
          } else {
            initializeEmptyOdontogram();
            setFechaOdontograma(new Date().toISOString());
          }
        }
      }
    } catch (err) {
      console.error('Error loading patient and odontogram data:', err);
      setError('Error al cargar datos del paciente');
    } finally {
      setLoading(false);
    }
  };

  const loadOlearyData = (oleary: any) => {
    const datos: Record<number, ToothData> = {};
    const olearyData = oleary.datos_odontograma;
    const defaultCuadrantes = crearDienteCuadrantes();
    
    // Initialize all 32 adult teeth for O'Leary mode
    const allAdultTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    
    // Set all teeth to default sano state first
    allAdultTeeth.forEach(num => {
      datos[num] = { cuadrantes: { ...defaultCuadrantes } };
    });
    
    // Override with actual O'Leary data
    Object.entries(olearyData.dientes).forEach(([numStr, diente]: [string, any]) => {
      const num = parseInt(numStr);
      datos[num] = {
        cuadrantes: diente.cuadrantes,
        nota: diente.nota
      };
    });
    
    setDientesData(datos);
    setNotasGenerales(oleary.notas || '');
    setFechaOdontograma(olearyData.fecha);
  };

  const loadOdontogramData = (odontogram: any) => {
    const datos: Record<number, ToothData> = {};
    let notasData: string = '';
    
    let odontogramData = odontogram.datos_odontograma;
    
    if (odontogramData && odontogramData.datos_odontograma) {
      odontogramData = odontogramData.datos_odontograma;
      if (odontogram.datos_odontograma.notas) {
        notasData = odontogram.datos_odontograma.notas;
      }
    }
    
    if (odontogram.notas) {
      notasData = odontogram.notas;
    }
    
    if (odontogramData && odontogramData.tipo) {
      console.log('Setting tipoOdontograma from loaded data:', odontogramData.tipo);
      setTipoOdontograma(odontogramData.tipo);
    }
    
    if (odontogramData && odontogramData.fecha) {
      const fechaDate = new Date(odontogramData.fecha);
      setFechaOdontograma(fechaDate.toISOString().split('T')[0]);
    } else if (odontogramData.fecha_creacion) {
      const fechaDate = new Date(odontogramData.fecha_creacion);
      setFechaOdontograma(fechaDate.toISOString().split('T')[0]);
    }
    
    if (odontogramData && odontogramData.dientes) {
      Object.entries(odontogramData.dientes).forEach(([numero, diente]: [string, any]) => {
        const toothNum = parseInt(numero);
        
        // Check if new quadrant format (has cuadrantes) or legacy format (has estado)
         if (diente.cuadrantes) {
           // New quadrant format
           datos[toothNum] = {
             cuadrantes: diente.cuadrantes,
             central: diente.central || 'sano',
             nota: diente.nota
           };
          } else if (diente.estado !== undefined) {
            // Legacy format: convert single estado to all cuadrantes
            const estadoLegado = diente.estado || 'sano';
            datos[toothNum] = {
              cuadrantes: {
                mesial: estadoLegado,
                distal: estadoLegado,
                buccal: estadoLegado,
                lingual: estadoLegado
              },
              central: 'sano',
              nota: diente.nota
            };
          } else {
           // Default empty
           datos[toothNum] = {
             cuadrantes: crearDienteCuadrantes(),
             central: 'sano'
           };
         }
      });
    }
    
    setDientesData(datos);
    setNotasGenerales(notasData || '');
  };

  const initializeEmptyOdontogram = () => {
    const datos: Record<number, ToothData> = {};
    const defaultCuadrantes = crearDienteCuadrantes();
    
    if (tipoOdontograma === 'adulto' || tipoOdontograma === 'oleary_adulto') {
      const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
      const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
      
      [...upperTeeth, ...lowerTeeth].forEach(num => {
        if (tipoOdontograma === 'oleary_adulto') {
          // O'Leary mode: no central section
          datos[num] = { cuadrantes: { ...defaultCuadrantes } };
        } else {
          // Regular adult mode: include central section
          datos[num] = { cuadrantes: { ...defaultCuadrantes }, central: 'sano' };
        }
      });
    } else {
      const upperTeeth = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
      const lowerTeeth = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
      
      [...upperTeeth, ...lowerTeeth].forEach(num => {
        datos[num] = { cuadrantes: { ...defaultCuadrantes }, central: 'sano' };
      });
    }
    
    setDientesData(datos);
    setNotasGenerales('');
  };

  const handleCuadranteChange = (numero: number, cuadrante: Cuadrante, nuevoEstado: string) => {
    const estadoAnterior = dientesData[numero]?.cuadrantes?.[cuadrante] || 'sano';
    
    setHistorialCambios(prev => [...prev, { numero, cuadrante: cuadrante as string, estadoAnterior, estadoNuevo: nuevoEstado }]);
    
    setDientesData(prev => ({
      ...prev,
      [numero]: {
        ...prev[numero],
        cuadrantes: {
          ...prev[numero]?.cuadrantes || crearDienteCuadrantes(),
          [cuadrante]: nuevoEstado
        }
      }
    }));
  };

  const handleCentralChange = (numero: number, nuevoEstado: string) => {
    const estadoAnterior = dientesData[numero]?.central || 'sano';
    
    setHistorialCambios(prev => [...prev, { 
      numero, 
      cuadrante: 'central', 
      estadoAnterior, 
      estadoNuevo: nuevoEstado 
    }]);
    
    setDientesData(prev => ({
      ...prev,
      [numero]: {
        ...prev[numero],
        central: nuevoEstado
      }
    }));
  };

  const handleAllSectionsChange = (numero: number, nuevoEstado: string) => {
    const toothData = dientesData[numero] || { cuadrantes: crearDienteCuadrantes() };
    
    // Record changes for all sections
    const cambios = [];
    
    // Record changes for all quadrants
    CUADRANTES.forEach(cuadrante => {
      const estadoAnterior = toothData.cuadrantes[cuadrante] || 'sano';
      if (estadoAnterior !== nuevoEstado) {
        cambios.push({ numero, cuadrante: cuadrante as string, estadoAnterior, estadoNuevo: nuevoEstado });
      }
    });
    
    // Record change for center
    const estadoAnteriorCentral = toothData.central || 'sano';
    if (estadoAnteriorCentral !== nuevoEstado) {
      cambios.push({ numero, cuadrante: 'central', estadoAnterior: estadoAnteriorCentral, estadoNuevo: nuevoEstado });
    }
    
    // Add all changes to history
    if (cambios.length > 0) {
      setHistorialCambios(prev => [...prev, ...cambios]);
    }
    
    // Update all sections at once
    setDientesData(prev => ({
      ...prev,
      [numero]: {
        ...prev[numero],
        cuadrantes: {
          ...toothData.cuadrantes,
          ...Object.fromEntries(CUADRANTES.map(c => [c, nuevoEstado]))
        },
        central: nuevoEstado
      }
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
     const defaultCuadrantes = crearDienteCuadrantes();
     const datosLimpios: Record<number, ToothData> = {};
     
     Object.keys(dientesData).forEach(num => {
       const numero = parseInt(num);
       datosLimpios[numero] = { 
         cuadrantes: { ...defaultCuadrantes },
         central: 'sano'
       };
     });
     
     setDientesData(datosLimpios);
     setNotasGenerales('');
     setHistorialCambios([]);
   };

   const retrocederCambio = () => {
     if (historialCambios.length === 0) return;
     
     const ultimoCambio = historialCambios[historialCambios.length - 1];
     setDientesData(prev => {
       const tooth = prev[ultimoCambio.numero] || { cuadrantes: crearDienteCuadrantes(), central: 'sano' };
       
       if (ultimoCambio.cuadrante === 'central') {
         // Undo central change
         return {
           ...prev,
           [ultimoCambio.numero]: {
             ...tooth,
             central: ultimoCambio.estadoAnterior
           }
         };
       } else {
         // Undo quadrant change
         const cuadrante = ultimoCambio.cuadrante as Cuadrante;
         return {
           ...prev,
           [ultimoCambio.numero]: {
             ...tooth,
             cuadrantes: {
               ...tooth.cuadrantes,
               [cuadrante]: ultimoCambio.estadoAnterior
             }
           }
         };
       }
     });
     
     setHistorialCambios(prev => prev.slice(0, -1));
   };

   const buildOdontogramData = () => {
     const dientes: Record<string, { cuadrantes: Record<Cuadrante, string>; central?: string; nota?: string }> = {};
     const defaultCuudrantes = crearDienteCuadrantes();

     // Get all teeth numbers based on type
     const allTeethNumbers: number[] = (tipoOdontograma === 'adulto' || tipoOdontograma === 'oleary_adulto')
       ? [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
       : [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

     // Ensure all teeth exist with default cuadrantes
     allTeethNumbers.forEach(num => {
       if (!dientesData[num]) {
         if (tipoOdontograma === 'oleary_adulto') {
           // O'Leary mode: no center section
           dientes[num.toString()] = { cuadrantes: { ...defaultCuudrantes } };
         } else {
           // Standard mode: include center section
           dientes[num.toString()] = { cuadrantes: { ...defaultCuudrantes }, central: 'sano' };
         }
       } else {
         const tooth = dientesData[num];
         if (tipoOdontograma === 'oleary_adulto') {
           // O'Leary mode: no center section
           dientes[num.toString()] = {
             cuadrantes: { ...defaultCuudrantes, ...tooth.cuadrantes },
             nota: tooth.nota
           };
         } else {
           // Standard mode: include center section
           dientes[num.toString()] = {
             cuadrantes: { ...defaultCuudrantes, ...tooth.cuadrantes },
             central: tooth.central || 'sano',
             nota: tooth.nota
           };
         }
       }
     });

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

      if (tipoOdontograma === 'oleary_adulto') {
        // Handle O'Leary mode
        const oleary = await OlearyService.getOdontogramById(odontogramId);
        if (oleary) {
          setCurrentOdontogram(oleary);
          setSelectedVersion(version);
          loadOlearyData(oleary);
        }
      } else {
        // Handle regular odontogram mode
        const odontogram = await getOdontogramById(odontogramId);
        if (odontogram) {
          setCurrentOdontogram(odontogram);
          setSelectedVersion(version);
          loadOdontogramData(odontogram);
        }
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

      if (tipoOdontograma === 'oleary_adulto') {
        // Handle O'Leary mode
        const olearyData = buildOdontogramData();
        
        if (currentOdontogram) {
          await OlearyService.updateOdontogram(currentOdontogram.id, olearyData as any, notasGenerales);
          
          const updatedOleary = await OlearyService.getOdontogramById(currentOdontogram.id);
          if (updatedOleary) {
            setCurrentOdontogram(updatedOleary);
            loadOlearyData(updatedOleary);
          }
        } else {
          await OlearyService.createOdontogram(pacienteId, olearyData as any, notasGenerales);
          
          const activeOleary = await OlearyService.getActiveOdontogram(pacienteId);
          if (activeOleary) {
            setCurrentOdontogram(activeOleary);
            loadOlearyData(activeOleary);
            setSelectedVersion(activeOleary.version);
          }
        }
      } else {
        // Handle regular odontogram mode
        const odontogramData = buildOdontogramData();
        
        if (currentOdontogram) {
          await updateOdontogram(currentOdontogram.id, odontogramData as any, notasGenerales);
          
          const updatedOdontogram = await getActiveOdontogram(pacienteId!);
          if (updatedOdontogram) {
            setCurrentOdontogram(updatedOdontogram);
            loadOdontogramData(updatedOdontogram);
          }
        } else {
          await createOdontogram(pacienteId, odontogramData as any, notasGenerales);
          
          const activeOdontogram = await getActiveOdontogram(pacienteId);
          if (activeOdontogram) {
            setCurrentOdontogram(activeOdontogram);
            loadOdontogramData(activeOdontogram);
            setSelectedVersion(activeOdontogram.version);
          }
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

      if (tipoOdontograma === 'oleary_adulto') {
        // Handle O'Leary mode
        const olearyData = buildOdontogramData();
        await OlearyService.createNewVersion(pacienteId, olearyData as any, notasGenerales);

        const history = await OlearyService.getOdontogramHistory(pacienteId);
        setOdontogramasGuardados(history.map(h => ({
          id: h.oleary.id,
          nombre: `Versión ${h.oleary.version}${h.es_version_actual ? ' (Actual)' : ''}`,
          fecha: h.oleary.datos_odontograma.fecha || h.oleary.fecha_creacion,
          version: h.oleary.version,
          esActual: h.es_version_actual,
          tipo: 'oleary_adulto'
        })));

        const activeOleary = await OlearyService.getActiveOdontogram(pacienteId);
        if (activeOleary) {
          setCurrentOdontogram(activeOleary);
          loadOlearyData(activeOleary);
          setSelectedVersion(activeOleary.version);
        }
      } else {
        // Handle regular odontogram mode
        const odontogramData = buildOdontogramData();
        await createOdontogram(pacienteId, odontogramData as any, notasGenerales);

        const history = await getOdontogramHistory(pacienteId);
        setOdontogramasGuardados(history.map(h => ({
          id: h.id,
          nombre: `Versión ${h.version}${h.activo ? ' (Actual)' : ''}`,
          fecha: (h.datos_odontograma as any)?.fecha || h.fecha_creacion,
          version: h.version,
          esActual: h.activo,
          tipo: (h.datos_odontograma as any)?.tipo || 'adulto'
        })));

        const activeOdontogram = await getActiveOdontogram(pacienteId);
        if (activeOdontogram) {
          setCurrentOdontogram(activeOdontogram);
          loadOdontogramData(activeOdontogram);
          setSelectedVersion(activeOdontogram.version);
        }
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
     const currentEstados = tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS;
     currentEstados.forEach(estado => {
       contador[estado.key] = 0;
     });

     let allTeethNumbers: number[] = [];
    if (tipoOdontograma === 'adulto' || tipoOdontograma === 'oleary_adulto') {
      allTeethNumbers = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    } else {
      allTeethNumbers = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
    }
    
    // Count each tooth exactly once
    allTeethNumbers.forEach(numero => {
      const tooth = dientesData[numero];
      if (!tooth) {
        contador['sano'] = (contador['sano'] || 0) + 1;
        return;
      }
      
      let toothState: string;
      
      if (tipoOdontograma === 'oleary_adulto') {
        // O'Leary mode: no central section, use first non-sano quadrant
        const quadrantValues = Object.values(tooth.cuadrantes || {});
        const firstNonSano = quadrantValues.find(q => q !== 'sano');
        toothState = firstNonSano || 'sano';
      } else {
        // Regular mode: priority to central state (if non-sano), else first non-sano quadrant
        if (tooth.central && tooth.central !== 'sano') {
          toothState = tooth.central;
        } else {
          const quadrantValues = Object.values(tooth.cuadrantes || {});
          const firstNonSano = quadrantValues.find(q => q !== 'sano');
          toothState = firstNonSano || 'sano';
        }
      }
      
      contador[toothState] = (contador[toothState] || 0) + 1;
    });
    
    return contador;
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
   }

  return (
    <>
       <style jsx>{`
         .odontogram-container {
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: 15px;
           padding: 0 20px 20px 20px;
           margin-top: -10px;
         }
        
        .odontogram-circle {
          position: relative;
          width: 300px;
          height: 300px;
          margin: 20px auto;
        }
        
        .quadrant-label {
          font-size: 12px;
          font-weight: 600;
          fill: #374151;
          text-anchor: middle;
          dominant-baseline: middle;
        }
        
        @media (prefers-color-scheme: dark) {
          .quadrant-label {
            fill: #e2e8f0;
          }
        }
        
         .center-circle {
           font-size: 14px;
           font-weight: bold;
           fill: #1F2937;
           text-anchor: middle;
           dominant-baseline: central;
         }
         
          @media (prefers-color-scheme: dark) {
            .center-circle {
              fill: #e2e8f0;
            }
          }
          
          .odontogram-arch {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background: white;
            border-radius: 12px;
            width: 100%;
          }
          
          @media (max-width: 1024px) {
            .odontogram-arch {
              padding: 15px;
            }
          }
          
          @media (max-width: 768px) {
            .odontogram-arch {
              padding: 10px;
            }
          }
          
          @media (max-width: 480px) {
            .odontogram-arch {
              padding: 8px;
            }
          }
          
          @media (prefers-color-scheme: dark) {
            .odontogram-arch {
              background: rgba(30, 41, 59, 0.8);
            }
          }
          
          .teeth-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: nowrap;
          }
          
          @media (max-width: 1024px) {
            .teeth-row {
              gap: 6px;
              flex-wrap: wrap;
              justify-content: center;
              max-width: 100%;
            }
          }
          
          @media (max-width: 768px) {
            .teeth-row {
              gap: 6px;
              flex-wrap: wrap;
              justify-content: center;
            }
          }
          
          @media (max-width: 480px) {
            .teeth-row {
              gap: 4px;
            }
          }
          
          .tooth-slot {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2px;
          }
          
          .tooth-slot svg {
            display: block;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          
          .tooth-slot:hover svg {
            transform: translateY(-2px);
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));
          }
        `}</style>

      <div className="odontogram-container">
        {/* Patient Info */}
        <div className="mx-auto max-w-5xl px-5 mt-0">
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
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Main Odontogram - Grid Layout (pilot with circular teeth) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full odontogram-main-container" style={{ maxWidth: '1600px' }}>
          {/* Tipo de odontograma buttons */}
          <div className="flex justify-center mb-4">
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setTipoOdontograma('adulto');
                  setUserSelectedMode(true);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
                  tipoOdontograma === 'adulto'
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Adulto
              </button>
              <button
                onClick={() => {
                  setTipoOdontograma('nino');
                  setUserSelectedMode(true);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
                  tipoOdontograma === 'nino'
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Niño
              </button>
              <button
                onClick={() => {
                  setTipoOdontograma('oleary_adulto');
                  setUserSelectedMode(true);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
                  tipoOdontograma === 'oleary_adulto'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                O'Leary Adulto
              </button>
            </div>
          </div>
          <div className="odontogram-arch">
            {/* Upper Row */}
            <div className="teeth-row upper-row">
              {(tipoOdontograma === 'adulto' || tipoOdontograma === 'oleary_adulto'
                ? [...ADULT_TEETH_QUADRANTS.upperRight, ...ADULT_TEETH_QUADRANTS.upperLeft]
                : [...CHILD_TEETH_QUADRANTS.upperRight, ...CHILD_TEETH_QUADRANTS.upperLeft]
              ).map(toothNum => {
                const toothData = dientesData[toothNum];
                const cuadrantes = toothData?.cuadrantes || crearDienteCuadrantes();
                const nota = toothData?.nota;
                return (
                  <div key={toothNum} className="tooth-slot">
                    <svg width="60" height="60" viewBox="0 0 40 40" style={{ display: 'block' }}>
                      <g transform="translate(20,20)">
                         <CircularTooth
                           numero={toothNum}
                           cuadrantes={cuadrantes}
                           central={toothData?.central}
                           nota={nota}
                           estadoSeleccionado={estadoSeleccionado}
                           onCuadranteChange={handleCuadranteChange}
                           onCentralChange={handleCentralChange}
                           onAllSectionsChange={handleAllSectionsChange}
                           onShowPopup={handleShowPopup}
                           isOlearyMode={tipoOdontograma === 'oleary_adulto'}
                         />
                      </g>
                    </svg>
                  </div>
                );
              })}
            </div>
            
            {/* Lower Row */}
            <div className="teeth-row lower-row">
              {(tipoOdontograma === 'adulto' || tipoOdontograma === 'oleary_adulto'
                ? [...ADULT_TEETH_QUADRANTS.lowerRight, ...ADULT_TEETH_QUADRANTS.lowerLeft]
                : [...CHILD_TEETH_QUADRANTS.lowerRight, ...CHILD_TEETH_QUADRANTS.lowerLeft]
              ).map(toothNum => {
                const toothData = dientesData[toothNum];
                const cuadrantes = toothData?.cuadrantes || crearDienteCuadrantes();
                const nota = toothData?.nota;
                return (
                  <div key={toothNum} className="tooth-slot">
                    <svg width="60" height="60" viewBox="0 0 40 40" style={{ display: 'block' }}>
                      <g transform="translate(20,20)">
                         <CircularTooth
                           numero={toothNum}
                           cuadrantes={cuadrantes}
                           central={toothData?.central}
                           nota={nota}
                           estadoSeleccionado={estadoSeleccionado}
                           onCuadranteChange={handleCuadranteChange}
                           onCentralChange={handleCentralChange}
                           onAllSectionsChange={handleAllSectionsChange}
                           onShowPopup={handleShowPopup}
                           isOlearyMode={tipoOdontograma === 'oleary_adulto'}
                         />
                      </g>
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Type Selection + State Counter + State Selector */}
        <div className="flex justify-center" style={{ margin: '20px auto', maxWidth: '1200px' }}>
           
          {/* State Counter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-4">
              Conteo por Estado
            </h3>
            <div className="contador-inner">
              <table>
                <tbody>
                  {(tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).filter(estado => getContadorEstados()[estado.key] > 0).map(estado => (
                    <tr key={estado.key}>
                      <td>
                        <span className="small-box" style={{ background: estado.color }}></span>
                        {estado.label}: {getContadorEstados()[estado.key]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* State Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6" style={{ marginLeft: '20px' }}>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-4">
              Seleccionar Estado
            </h3>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar estado..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              
              {showDropdown && filteredEstados.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                   {filteredEstados.map((estado, index) => (
                     <div
                       key={estado.key}
                       className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between ${
                         index === highlightedIndex ? 'bg-gray-100 dark:bg-gray-600' : ''
                       }`}
                       onClick={() => handleEstadoSelect(estado.key)}
                       onMouseEnter={() => setHighlightedIndex(index)}
                     >
                      <span className="flex items-center">
                        <span 
                          className="w-4 h-4 rounded mr-2" 
                          style={{ backgroundColor: estado.color }}
                        ></span>
                        {estado.label}
                        {estado.label.toLowerCase() === searchTerm.toLowerCase() && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            <i className="fas fa-check"></i>
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <select
              value={estadoSeleccionado}
              onChange={(e) => setEstadoSeleccionado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {(tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).map(estado => (
                <option key={estado.key} value={estado.key}>
                  {estado.label}
                </option>
              ))}
            </select>
            
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estado seleccionado:
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span
                  className="w-5 h-5 rounded border border-gray-300 dark:border-gray-500"
                  style={{ backgroundColor: (tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).find(e => e.key === estadoSeleccionado)?.color || '#FFFFFF' }}
                ></span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {(tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).find(e => e.key === estadoSeleccionado)?.label || 'Sano'}
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={limpiarTodo}
                className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 text-sm"
              >
                Limpiar Todo
              </button>
              <button
                onClick={retrocederCambio}
                disabled={historialCambios.length === 0}
                className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deshacer
              </button>
            </div>
          </div>
          
          {/* Historial de Odontogramas - moved to right side of State Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6" style={{ marginLeft: '20px', minWidth: '280px' }}>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-4">
              Historial de Odontogramas
            </h3>
            <div className="max-h-40 overflow-y-auto mb-2 bg-gray-50 dark:bg-gray-700 rounded-md p-2 text-sm">
              {odontogramasGuardados.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 m-0">No hay odontogramas guardados</p>
              ) : (
                odontogramasGuardados.map((odo, index) => {
                  const isOleary = odo.tipo === 'oleary_adulto';
                  const isSelected = selectedVersion === odo.version;
                  return (
                    <div
                      key={index}
                      className={`mb-1 p-1 rounded cursor-pointer border ${
                        isSelected
                          ? isOleary
                            ? 'bg-purple-800 border-pink-500'
                            : 'bg-green-800 border-teal-500'
                          : 'bg-gray-600 dark:bg-gray-600 border-transparent hover:bg-gray-700'
                      }`}
                      onClick={() => cargarVersionOdontograma(odo.id, odo.version)}
                    >
                      <div className={`font-medium ${
                        isSelected ? (isOleary ? 'text-pink-400' : 'text-teal-400') : 'text-gray-100'
                      }`}>
                        {odo.nombre}
                      </div>
                      <div className="text-xs text-gray-300">
                        {formatDateSpanish(odo.fecha)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <button
              onClick={guardarOdontogramaActual}
              disabled={saving}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed w-full mb-2"
            >
              <i className="fas fa-save"></i> {saving ? 'Guardando...' : 'Actualizar Versión Actual'}
            </button>
            <button
              onClick={guardarNuevoOdontograma}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              <i className="fas fa-copy"></i> Guardar como Nueva Versión
            </button>
          </div>
        </div>

        {/* General Notes - Same size and position as teeth layout */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full notas-generales-container" style={{ maxWidth: '1600px', margin: '20px auto' }}>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Notas Generales
          </h3>
          <textarea
            value={notasGenerales}
            onChange={(e) => setNotasGenerales(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            placeholder="Escriba notas generales sobre el odontograma..."
          />
        </div>

        {/* Left Sidebar with controls */}
        <div className="main-container" style={{ width: '100%', maxWidth: '1200px' }}>
          <div className="left-sidebar" style={{ width: '300px' }}>
          </div>

          {/* Main Content Area (right side) */}
          <div className="main-content" style={{ flex: 1 }}>
          </div>
        </div>

        {/* Popup for notes */}
        {popupState.show && (
          <div className="tooth-popup" onClick={() => setPopupState({ ...popupState, show: false })}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
              <div className="popup-title">
                Nota para diente {popupState.toothNumber}
                <button
                  onClick={() => setPopupState({ ...popupState, show: false })}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <textarea
                value={popupState.noteText}
                onChange={(e) => setPopupState({ ...popupState, noteText: e.target.value })}
                className="popup-textarea"
                placeholder="Escriba una nota para este diente..."
                rows={4}
                autoFocus
              />
              <div className="popup-buttons">
                <button
                  onClick={deleteNote}
                  className="popup-delete"
                >
                  <i className="fas fa-trash"></i> Eliminar
                </button>
                <button
                  onClick={() => setPopupState({ ...popupState, show: false })}
                  className="popup-close"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveNote}
                  className="popup-save"
                >
                  <i className="fas fa-save"></i> Guardar
                </button>
              </div>
            </div>
          </div>
        )}
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

      <style jsx>{`
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
        
        /* Responsive odontogram containers */
        .odontogram-main-container {
          margin: 20px auto;
        }
        
        .notas-generales-container {
          margin: 20px auto;
        }
        
        @media (max-width: 1024px) {
          .odontogram-main-container,
          .notas-generales-container {
            margin: 15px auto;
            max-width: 100%;
          }
        }
        
        @media (max-width: 768px) {
          .odontogram-main-container,
          .notas-generales-container {
            margin: 10px auto;
            padding: 12px !important;
          }
        }
        
        @media (max-width: 480px) {
          .odontogram-main-container,
          .notas-generales-container {
            margin: 8px auto;
            padding: 8px !important;
          }
        }
        
        /* Touch-friendly buttons for mobile */
        @media (max-width: 768px) {
          .odontogram-main-container button {
            min-height: 44px;
            font-size: 14px;
            padding: 8px 12px;
          }
          
          .notas-generales-container textarea {
            min-height: 80px;
            font-size: 14px;
          }
        }
        
        @media (max-width: 480px) {
          .odontogram-main-container button {
            min-height: 40px;
            font-size: 13px;
            padding: 6px 10px;
          }
          
          .notas-generales-container textarea {
            min-height: 70px;
            font-size: 13px;
          }
        }

        /* Tablet styles */
        @media (max-width: 1024px) {
          .main-container {
            flex-direction: column;
            max-width: 100%;
            padding: 0 15px;
          }
          
          .left-sidebar {
            width: 100%;
            order: 2;
          }
          
          .main-content {
            order: 1;
          }
          
          .odontogram-arch {
            padding: 15px;
            max-width: 100%;
            overflow-x: hidden;
          }
          
          .teeth-row {
            gap: 6px;
            flex-wrap: wrap;
            justify-content: center;
            max-width: 100%;
          }
          
          .tooth-slot svg {
            width: 42px !important;
            height: 42px !important;
          }
          
          .odontogram-main-container {
            max-width: 100% !important;
            overflow-x: hidden;
          }
        }
        
        /* Mobile styles */
        @media (max-width: 768px) {
          .form-group {
            min-width: 100%;
          }
          
          .main-container {
            padding: 0 10px;
            gap: 15px;
          }
          
          .teeth-row {
            gap: 6px;
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .tooth-slot svg {
            width: 45px !important;
            height: 45px !important;
          }
          
          .odontogram-arch {
            padding: 10px;
          }
        }
        
        /* Small mobile styles */
        @media (max-width: 480px) {
          .teeth-row {
            gap: 4px;
          }
          
          .tooth-slot svg {
            width: 40px !important;
            height: 40px !important;
          }
          
          .odontogram-arch {
            padding: 8px;
          }
          
          .main-container {
            padding: 0 8px;
          }
        }

        .main-container {
          display: flex;
          gap: 20px;
          margin: 20px auto;
          max-width: 1400px;
          padding: 0 20px;
        }
        
        @media (max-width: 1024px) {
          .main-container {
            max-width: 100%;
            padding: 0 15px;
          }
        }
        
        @media (max-width: 768px) {
          .main-container {
            padding: 0 10px;
            gap: 15px;
          }
        }
        
        @media (max-width: 480px) {
          .main-container {
            padding: 0 8px;
            gap: 10px;
          }
        }

        .left-sidebar {
          width: 300px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        @media (max-width: 1024px) {
          .left-sidebar {
            width: 100%;
            gap: 15px;
          }
        }
        
        @media (max-width: 768px) {
          .left-sidebar {
            gap: 12px;
          }
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
    </>
  );
}

export default function OdontogramPilotPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    }>
      <OdontogramPilotPageContent />
    </Suspense>
  );
}
