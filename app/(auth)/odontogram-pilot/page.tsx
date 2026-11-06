'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientService } from '@/services/patientService';
import { OdontogramPilotService } from '@/services/odontogramPilotService';
import { OlearyService } from '@/services/oLearyService';
import {
  buscarRegistroPorId,
  buscarRegistroPorVersion,
  construirHistorialOleary,
  construirHistorialRegular,
  detectarTipoPorHistorial,
  obtenerRegistroActual,
  obtenerTipoOdontograma,
  type EntradaHistorialOdontograma,
  type RegistroOdontograma,
  type TipoOdontograma,
} from '@/lib/odontogram/odontogramLayout';

const getOdontogramHistory = async (patientId: string) => {
  const history = await OdontogramPilotService.getOdontogramHistory(patientId);
  return history.map((entry) => entry.odontograma);
};

const getOdontogramById = async (id: string) => {
  return await OdontogramPilotService.getOdontogramById(id);
};

const createOdontogram = async (patientId: string, datosOdontograma: any, notas: string) => {
  return await OdontogramPilotService.createOdontogram(patientId, datosOdontograma, notas);
};

const updateOdontogram = async (id: string, datosOdontograma: any, notas: string) => {
  return await OdontogramPilotService.updateOdontogram(id, datosOdontograma, notas);
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
  { key: "abfraccion", label: "Abfracción", color: "#BA68C8" },
  { key: "abrasion", label: "Abrasión", color: "#4FC3F7" },
  { key: "amalgama", label: "Restauración Amalgama", color: "#607D8B" },
  { key: "apilado", label: "Apiñamiento", color: "#455A64" },
  { key: "atricion", label: "Atrición", color: "#FFD54F" },
  { key: "ausente", label: "Ausente", color: "#9E9E9E" },
  { key: "carilla", label: "Carilla", color: "#00BCD4" },
  { key: "carilla_resina", label: "Carilla de Resina", color: "#4DD0E1" },
  { key: "carilla_defectuosa", label: "Carilla Defectuosa", color: "#E57373" },
  { key: "carilla_disilicato", label: "Carilla de Disilicato", color: "#B0BEC5" },
  { key: "cariado", label: "Cariado", color: "#FF5722" },
  { key: "caries-restauracion", label: "Restauración con Caries", color: "#FFC107" },
  { key: "corona", label: "Corona", color: "#795548" },
  { key: "endodoncia_con_restauracion", label: "Endodoncia con Restauración", color: "#5D4037" },
  { key: "endodoncia_con_caries", label: "Endodoncia con Caries", color: "#6D4C41" },
  { key: "endodoncia_con_corona", label: "Endodoncia con Corona", color: "#4E342E" },
  { key: "endodoncia_abierta", label: "Endodoncia Abierta", color: "#3E2723" },
  { key: "endodoncia_con_provisional", label: "Endodoncia con Provisional", color: "#8D6E63" },
  { key: "erosion", label: "Erosión", color: "#FF8A65" },
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
  estado?: string;
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

  const [tipoOdontograma, setTipoOdontograma] = useState<TipoOdontograma>('adulto');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('sano');
  const [dientesData, setDientesData] = useState<Record<number, ToothData>>({});
   const [historialCambios, setHistorialCambios] = useState<HistorialCambio[]>([]);
  const [notasGenerales, setNotasGenerales] = useState('');
  const [fechaOdontograma, setFechaOdontograma] = useState('');

  const [patient, setPatient] = useState<any>(null);
  const [currentOdontogram, setCurrentOdontogram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [versionLoading, setVersionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cargandoLayout, setCargandoLayout] = useState(false);
  const [tipoRegistroActual, setTipoRegistroActual] = useState<TipoOdontograma | null>(null);
  const layoutRequestRef = useRef(0);
  const versionRequestRef = useRef(0);
  const [error, setError] = useState<string | null>(null);


  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [odontogramasGuardados, setOdontogramasGuardados] = useState<EntradaHistorialOdontograma[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mordidas, setMordidas] = useState<string[]>([]);
  const [gingivitis, setGingivitis] = useState<{ tipo: string; detalle?: string }[]>([]);
  const [prospectoOrto, setProspectoOrto] = useState(false);
  const [popupState, setPopupState] = useState<{ show: boolean; toothNumber: number; noteText: string }>({
    show: false,
    toothNumber: 0,
    noteText: ''
  });


  const filteredEstados = (tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).filter(estado =>
    estado.label.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

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
  }, [tipoOdontograma]);

  const aplicarLayoutOdontograma = (
    tipo: TipoOdontograma,
    historialRegular: RegistroOdontograma[],
    historialOleary: RegistroOdontograma[],
    registroForzado?: RegistroOdontograma
  ) => {
    if (tipo === 'oleary_adulto') {
      setOdontogramasGuardados(construirHistorialOleary(historialOleary));
    } else {
      setOdontogramasGuardados(construirHistorialRegular(historialRegular, tipo));
    }

    let actual = registroForzado;
    if (!actual) {
      actual = tipo === 'oleary_adulto'
        ? historialOleary[0]
        : obtenerRegistroActual(historialRegular, tipo);
    }

    setHistorialCambios([]);

    if (actual) {
      setCurrentOdontogram(actual);
      setTipoRegistroActual(tipo);
      setSelectedVersion(actual.version);
      if (tipo === 'oleary_adulto') {
        loadOlearyData(actual);
      } else {
        loadOdontogramData(actual);
      }
    } else {
      setCurrentOdontogram(null);
      setTipoRegistroActual(null);
      setSelectedVersion(null);
      initializeEmptyOdontogram(tipo);
      setFechaOdontograma(new Date().toISOString().split('T')[0]);
    }
  };

  const cargarLayoutOdontograma = async (tipo: TipoOdontograma) => {
    if (!pacienteId) return;

    const requestId = ++layoutRequestRef.current;
    setCargandoLayout(true);

    try {
      if (tipo === 'oleary_adulto') {
        const history = await OlearyService.getOdontogramHistory(pacienteId);
        if (requestId !== layoutRequestRef.current) return;
        aplicarLayoutOdontograma(tipo, [], history.map(h => h.oleary));
      } else {
        const history = await getOdontogramHistory(pacienteId);
        if (requestId !== layoutRequestRef.current) return;
        aplicarLayoutOdontograma(tipo, history, []);
      }
    } catch (err) {
      console.error('Error cargando el odontograma del tipo seleccionado:', err);
      if (requestId === layoutRequestRef.current) {
        setTipoOdontograma(tipoOdontograma);
      }
    } finally {
      if (requestId === layoutRequestRef.current) {
        setCargandoLayout(false);
      }
    }
  };

  const cargarHistorialPorTipo = async (tipo: TipoOdontograma) => {
    if (!pacienteId) return;

    try {
      if (tipo === 'oleary_adulto') {
        const history = await OlearyService.getOdontogramHistory(pacienteId);
        setOdontogramasGuardados(construirHistorialOleary(history.map(h => h.oleary)));
      } else {
        const history = await getOdontogramHistory(pacienteId);
        setOdontogramasGuardados(construirHistorialRegular(history, tipo));
      }
    } catch (err) {
      console.error('Error al cargar el historial de odontogramas:', err);
    }
  };

  const cambiarTipoOdontograma = async (tipo: TipoOdontograma) => {
    if (tipo === tipoOdontograma || cargandoLayout) return;

    setTipoOdontograma(tipo);
    setHistorialCambios([]);
    await cargarLayoutOdontograma(tipo);
  };

  const loadPatientAndOdontogramData = async () => {
    const requestId = ++layoutRequestRef.current;
    setCargandoLayout(false);

    try {
      setLoading(true);
      setError(null);

      const patientData = await PatientService.getPatientById(pacienteId!);
      if (requestId !== layoutRequestRef.current) return;
      if (!patientData) {
        setError('Paciente no encontrado');
        setLoading(false);
        return;
      }
      setPatient(patientData);

      const [historialRegular, historialOleary] = await Promise.all([
        getOdontogramHistory(pacienteId!),
        OlearyService.getOdontogramHistory(pacienteId!).catch(err => {
          console.error('Error al cargar el historial de O\'Leary:', err);
          return [];
        })
      ]);
      if (requestId !== layoutRequestRef.current) return;
      const registrosOleary = historialOleary.map(h => h.oleary);

      const versionEditada = versionParam && editParam === 'true' ? versionParam : null;
      const versionNumerica = versionEditada ? parseInt(versionEditada, 10) : NaN;
      const registroEditado = versionEditada
        ? (buscarRegistroPorId(historialRegular, registrosOleary, versionEditada)
          ?? buscarRegistroPorVersion(historialRegular, registrosOleary, versionNumerica))
        : undefined;

      const tipoDetectado: TipoOdontograma | null = registroEditado
        ? (registrosOleary.some(registro => registro.id === registroEditado.id)
            ? 'oleary_adulto'
            : obtenerTipoOdontograma(registroEditado.datos_odontograma))
        : detectarTipoPorHistorial(historialRegular, registrosOleary);

      const tipo: TipoOdontograma = tipoDetectado ?? 'adulto';
      setTipoOdontograma(tipo);
      aplicarLayoutOdontograma(tipo, historialRegular, registrosOleary, registroEditado);
    } catch (err) {
      if (requestId !== layoutRequestRef.current) return;
      console.error('Error loading patient and odontogram data:', err);
      setError('Error al cargar datos del paciente');
    } finally {
      if (requestId === layoutRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const loadOlearyData = (oleary: any) => {
    const datos: Record<number, ToothData> = {};
    const olearyData = oleary.datos_odontograma;

    // Initialize all 32 adult teeth for O'Leary mode
    const allAdultTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    
    // Set all teeth to default sano state first
    allAdultTeeth.forEach(num => {
      datos[num] = crearDienteOleary();
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
    setMordidas(olearyData.mordidas || []);
    setGingivitis(olearyData.gingivitis || []);
    setProspectoOrto(olearyData.prospecto_orto !== undefined ? !!olearyData.prospecto_orto : false);
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

    if (odontogramData?.mordidas) {
      setMordidas(odontogramData.mordidas);
    } else {
      setMordidas([]);
    }

    if (odontogramData?.gingivitis) {
      setGingivitis(odontogramData.gingivitis);
    } else {
      setGingivitis([]);
    }

    if (odontogramData?.prospecto_orto !== undefined) {
      setProspectoOrto(!!odontogramData.prospecto_orto);
    } else {
      setProspectoOrto(false);
    }

    setDientesData(datos);
    setNotasGenerales(notasData || '');
  };

  const initializeEmptyOdontogram = (tipo: TipoOdontograma) => {
    const datos: Record<number, ToothData> = {};
    const defaultCuadrantes = crearDienteCuadrantes();
    
    if (tipo === 'adulto' || tipo === 'oleary_adulto') {
      const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
      const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
      
      [...upperTeeth, ...lowerTeeth].forEach(num => {
        if (tipo === 'oleary_adulto') {
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
    setMordidas([]);
    setGingivitis([]);
    setProspectoOrto(false);
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

     // Preserve every tooth currently stored in state, even if it belongs to the other layout.
     Object.keys(dientesData).forEach(key => {
        const numero = parseInt(key);
        const tooth = dientesData[numero];

        dientes[key] = {
          cuadrantes: {
            ...defaultCuudrantes,
            ...Object.fromEntries(
              Object.entries(tooth.cuadrantes || {})
                .filter(([, v]) => typeof v === 'string')
                .map(([k, v]) => [k, v as string])
            )
          },
          ...(tooth.central !== undefined ? { central: (typeof tooth.central === 'string' && tooth.central) || 'sano' } : {}),
          ...(tooth.nota ? { nota: tooth.nota } : {})
        };
     });

     // Ensure all teeth for the current type exist with defaults.
     const currentTypeTeeth: number[] = (tipoOdontograma === 'adulto' || tipoOdontograma === 'oleary_adulto')
       ? [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
       : [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

     currentTypeTeeth.forEach(num => {
       if (!dientes[num.toString()]) {
         if (tipoOdontograma === 'oleary_adulto') {
           dientes[num.toString()] = { cuadrantes: { ...defaultCuudrantes } };
         } else {
           dientes[num.toString()] = { cuadrantes: { ...defaultCuudrantes }, central: 'sano' };
         }
       }
     });

      return {
         tipo: tipoOdontograma,
         dientes,
         fecha: fechaOdontograma,
         mordidas,
         gingivitis,
         prospecto_orto: prospectoOrto
       };
    };

  const cargarVersionOdontograma = async (odontogramId: string, version: number, tipo: TipoOdontograma) => {
      if (!odontogramId) return;

      const requestId = ++versionRequestRef.current;

      try {
        setVersionLoading(true);
        setError(null);

        if (tipo === 'oleary_adulto') {
          // Handle O'Leary mode
          const oleary = await OlearyService.getOdontogramById(odontogramId);
          if (requestId !== versionRequestRef.current) return;
          if (oleary) {
            setCurrentOdontogram(oleary);
            setTipoRegistroActual('oleary_adulto');
            setSelectedVersion(version);
            setHistorialCambios([]);
            loadOlearyData(oleary);
          }
        } else {
          // Handle regular odontogram mode
          const odontogram = await getOdontogramById(odontogramId);
          if (requestId !== versionRequestRef.current) return;
          if (odontogram) {
            setCurrentOdontogram(odontogram);
            setTipoRegistroActual(obtenerTipoOdontograma(odontogram.datos_odontograma));
            setSelectedVersion(version);
            setHistorialCambios([]);
            loadOdontogramData(odontogram);
          }
        }
      } catch (err) {
        if (requestId !== versionRequestRef.current) return;
        console.error('Error loading odontogram version:', err);
        setError('Error al cargar la versión del odontograma');
      } finally {
        if (requestId === versionRequestRef.current) {
          setVersionLoading(false);
        }
      }
    };

  const guardarOdontogramaActual = async () => {
    if (!pacienteId) return;
    if (cargandoLayout) return;
    if (currentOdontogram && tipoRegistroActual && tipoRegistroActual !== tipoOdontograma) {
      console.error('Se bloqueó el guardado: el odontograma cargado no corresponde al tipo seleccionado');
      return;
    }

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
          const createdOleary = await OlearyService.createOdontogram(pacienteId, olearyData as any, notasGenerales);
          
          setCurrentOdontogram(createdOleary);
          setSelectedVersion(createdOleary.version);
          loadOlearyData(createdOleary);
        }

        setTipoRegistroActual('oleary_adulto');
        await cargarHistorialPorTipo(tipoOdontograma);
      } else {
        // Handle regular odontogram mode
        const odontogramData = buildOdontogramData();
        
        if (currentOdontogram) {
          await updateOdontogram(currentOdontogram.id, odontogramData as any, notasGenerales);
          
          const updatedOdontogram = await getOdontogramById(currentOdontogram.id);

          if (updatedOdontogram) {
            setCurrentOdontogram(updatedOdontogram);
            setSelectedVersion(updatedOdontogram.version);
            loadOdontogramData(updatedOdontogram);
          }
        } else {
          const createdOdontogram = await createOdontogram(pacienteId, odontogramData as any, notasGenerales);
          
          setCurrentOdontogram(createdOdontogram);
          setSelectedVersion(createdOdontogram.version);
          loadOdontogramData(createdOdontogram);
        }

        setTipoRegistroActual(tipoOdontograma);
        await cargarHistorialPorTipo(tipoOdontograma);
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
    if (cargandoLayout) return;

    try {
      setSaving(true);
      setError(null);

      if (tipoOdontograma === 'oleary_adulto') {
        // Handle O'Leary mode
        const olearyData = buildOdontogramData();
        const createdOleary = await OlearyService.createNewVersion(pacienteId, olearyData as any, notasGenerales);

        setCurrentOdontogram(createdOleary);
        setTipoRegistroActual('oleary_adulto');
        setSelectedVersion(createdOleary.version);
        loadOlearyData(createdOleary);

        await cargarHistorialPorTipo(tipoOdontograma);
      } else {
        // Handle regular odontogram mode
        const odontogramData = buildOdontogramData();
        const createdOdontogram = await createOdontogram(pacienteId, odontogramData as any, notasGenerales);

        setCurrentOdontogram(createdOdontogram);
        setTipoRegistroActual(tipoOdontograma);
        setSelectedVersion(createdOdontogram.version);
        loadOdontogramData(createdOdontogram);

        await cargarHistorialPorTipo(tipoOdontograma);
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

      // Collect all non-sano statuses across quadrants and center
      const allStatuses: string[] = [];

      if (tipoOdontograma === 'oleary_adulto') {
        // O'Leary mode: no central section, check only quadrants
        if (tooth.estado !== undefined) {
          allStatuses.push(tooth.estado || 'sano');
        } else {
          const quadrantValues = Object.values(tooth.cuadrantes || {}).filter((q) => typeof q === 'string');
          allStatuses.push(...quadrantValues);
        }
      } else {
        // Regular mode: check central AND all quadrants
        if (tooth.estado !== undefined) {
          allStatuses.push(tooth.estado || 'sano');
        } else {
          if (tooth.central && typeof tooth.central === 'string') {
            allStatuses.push(tooth.central);
          }
          const quadrantValues = Object.values(tooth.cuadrantes || {}).filter((q) => typeof q === 'string');
          allStatuses.push(...quadrantValues);
        }
      }

      // Count each unique non-sano status found on this tooth
      const uniqueNonSano = new Set(allStatuses.filter(s => s !== 'sano'));
      if (uniqueNonSano.size === 0) {
        contador['sano'] = (contador['sano'] || 0) + 1;
      } else {
        uniqueNonSano.forEach(status => {
          contador[status] = (contador[status] || 0) + 1;
        });
      }
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
           width: 100%;
           max-width: 100%;
           min-width: 0;
           box-sizing: border-box;
           padding: 16px 16px 24px;
         }
         
         @media (min-width: 640px) {
           .odontogram-container {
             padding-left: 24px;
             padding-right: 24px;
           }
         }
         
         @media (min-width: 1024px) {
           .odontogram-container {
             padding-left: 32px;
             padding-right: 32px;
           }
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

        .dark .quadrant-label {
          fill: #e2e8f0;
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

          .dark .center-circle {
            fill: #e2e8f0;
          }
          
          .odontogram-arch {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.55);
            border: 1px solid rgba(148, 163, 184, 0.25);
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
              background: rgba(2, 6, 23, 0.45);
              border-color: rgba(255, 255, 255, 0.06);
            }
          }

          .dark .odontogram-arch {
            background: rgba(2, 6, 23, 0.45);
            border-color: rgba(255, 255, 255, 0.06);
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

      <div data-rr-block className="odontogram-container relative isolate h-auto w-full max-w-full box-border overflow-x-hidden pb-6 bg-slate-100 dark:bg-slate-950">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-teal-500 opacity-20 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-indigo-500 opacity-20 blur-3xl" />
        </div>
        {/* Patient Info + Action Buttons */}
        <div className="mx-auto max-w-5xl w-full px-5 mt-0">
          <div className="flex w-full min-w-0 max-w-full flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
            {/* Patient metadata */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
              <div className="form-group flex-1 min-w-[180px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-100 mb-2">Nombre completo:</label>
                <input
                  type="text"
                  value={patient?.nombre_completo || ''}
                  disabled
                  className="w-full rounded-lg border border-slate-200/70 bg-white/70 px-4 py-2 text-slate-900 backdrop-blur-sm disabled:bg-slate-100/60 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-400"
                />
              </div>
              
              <div className="form-group shrink-0">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-100 mb-2">Identidad:</label>
                <input
                  type="text"
                  value={patient?.numero_identidad || ''}
                  disabled
                  className="w-full min-w-0 sm:w-[160px] rounded-lg border border-slate-200/70 bg-white/70 px-4 py-2 text-slate-900 backdrop-blur-sm disabled:bg-slate-100/60 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-400"
                />
              </div>
              
              <div className="min-w-0 basis-full sm:basis-[280px] sm:shrink-0">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-100 mb-2">Fecha del Odontograma:</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={fechaOdontograma}
                    onChange={(e) => {
                      if (!editParam || editParam !== 'true') {
                        setFechaOdontograma(e.target.value);
                      }
                    }}
                    className="w-full min-w-0 sm:w-auto sm:min-w-[180px] rounded-lg border border-slate-200/70 bg-white/70 px-4 py-2 text-slate-900 backdrop-blur-sm focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100"
                  />
                  <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={prospectoOrto}
                      onChange={(e) => setProspectoOrto(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-950/50 accent-teal-500 text-teal-500 focus:ring-teal-400/40"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-100">Prospecto para Orto</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
              <button
                onClick={() => router.push(`/menu-navegacion?id=${pacienteId}`)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-600/80 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-blue-500/10 backdrop-blur-sm transition-colors hover:bg-blue-500/90"
              >
                <i className="fas fa-bars" aria-hidden="true"></i> Menu
              </button>
              <button
                onClick={() => router.push(`/notas-linea-de-tiempo?id=${pacienteId}`)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-600/80 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-purple-500/10 backdrop-blur-sm transition-colors hover:bg-purple-500/90"
              >
                <i className="fas fa-sticky-note" aria-hidden="true"></i> Notas
              </button>
            </div>
          </div>
        </div>

        {/* Main Odontogram - Grid Layout (pilot with circular teeth) */}
        <div className="odontogram-main-container w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60" style={{ maxWidth: '1600px' }}>
          {/* Tipo de odontograma buttons */}
          <div className="flex justify-center mb-4">
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => cambiarTipoOdontograma('adulto')}
                disabled={saving || cargandoLayout}
                className={`rounded-lg border px-4 py-2 font-medium shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                  tipoOdontograma === 'adulto'
                    ? 'border-teal-400/30 bg-teal-600/80 text-white backdrop-blur-sm'
                    : 'border-slate-200/70 bg-slate-100/60 text-slate-700 hover:bg-slate-200/70 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/60'
                }`}
              >
                Adulto
              </button>
              <button
                onClick={() => cambiarTipoOdontograma('nino')}
                disabled={saving || cargandoLayout}
                className={`rounded-lg border px-4 py-2 font-medium shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                  tipoOdontograma === 'nino'
                    ? 'border-teal-400/30 bg-teal-600/80 text-white backdrop-blur-sm'
                    : 'border-slate-200/70 bg-slate-100/60 text-slate-700 hover:bg-slate-200/70 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/60'
                }`}
              >
                Niño
              </button>
              <button
                onClick={() => cambiarTipoOdontograma('oleary_adulto')}
                disabled={saving || cargandoLayout}
                className={`rounded-lg border px-4 py-2 font-medium shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                  tipoOdontograma === 'oleary_adulto'
                    ? 'border-purple-400/30 bg-purple-600/80 text-white backdrop-blur-sm'
                    : 'border-slate-200/70 bg-slate-100/60 text-slate-700 hover:bg-slate-200/70 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/60'
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

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {(tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS)
                .filter(estado => getContadorEstados()[estado.key] > 0)
                .map(estado => (
                  <div key={estado.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-slate-700 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: estado.color }} />
                    <span className="text-xs font-semibold">{estado.label}</span>
                    <span className="text-xs font-semibold">{getContadorEstados()[estado.key]}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Mordidas + State Selector + Historial + Gingivitis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full items-start" style={{ margin: '20px auto', maxWidth: '1600px' }}>
          {/* Mordidas Section */}
          <div className="relative z-0 w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60 sm:p-6">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 text-center mb-4">
              Mordida
            </h3>
            <div className="space-y-3">
              {[
                { key: 'mordida_abierta_anterior', label: 'Mordida abierta anterior' },
                { key: 'mordida_abierta_posterior', label: 'Mordida abierta posterior' },
                { key: 'mordida_cruzada_anterior', label: 'Mordida cruzada anterior' },
                { key: 'mordida_cruzada_posterior', label: 'Mordida cruzada posterior' },
                { key: 'mordida_bis_a_bis', label: 'Mordida bis a bis' },
              ].map(item => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={mordidas.includes(item.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMordidas(prev => [...prev, item.key]);
                      } else {
                        setMordidas(prev => prev.filter(k => k !== item.key));
                      }
                    }}
                    className="h-4 w-4 rounded border-white/20 bg-slate-950/50 accent-teal-500 text-teal-500 focus:ring-teal-400/40"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200 select-none">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* State Selector */}
          <div className="relative z-10 w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60 sm:p-6">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 text-center mb-4">
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
                className="w-full rounded-lg border border-slate-200/70 bg-white/70 px-4 py-2 text-slate-900 placeholder-slate-400 backdrop-blur-sm focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100"
              />
              
              {showDropdown && filteredEstados.length > 0 && (
                <div className="absolute z-50 w-full mt-1 rounded-lg border border-slate-200/70 bg-white/90 shadow-lg backdrop-blur-md max-h-60 overflow-y-auto dark:border-white/10 dark:bg-slate-900/80 dark:shadow-xl">
                   {filteredEstados.map((estado, index) => (
                     <div
                       key={estado.key}
                       className={`px-4 py-2 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/10 flex items-center justify-between ${
                         index === highlightedIndex ? 'bg-slate-100/70 dark:bg-white/10' : ''
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
                          <span className="ml-2 text-xs text-slate-400">
                            <i className="fas fa-check" aria-hidden="true"></i>
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
              className="w-full rounded-lg border border-slate-200/70 bg-white/70 px-4 py-2 text-slate-900 backdrop-blur-sm focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100"
            >
              {(tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).slice().sort((a, b) => a.label.localeCompare(b.label)).map(estado => (
                <option key={estado.key} value={estado.key}>
                  {estado.label}
                </option>
              ))}
            </select>
            
            <div className="mt-4">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Estado seleccionado:
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/70 bg-slate-100/60 backdrop-blur-sm dark:border-white/5 dark:bg-slate-950/40">
                <span
                  className="w-5 h-5 rounded border border-slate-300 dark:border-slate-500"
                  style={{ backgroundColor: (tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).find(e => e.key === estadoSeleccionado)?.color || '#FFFFFF' }}
                ></span>
                <span className="text-sm text-slate-800 dark:text-slate-100">
                  {(tipoOdontograma === 'oleary_adulto' ? ESTADOS_OLEARY : ESTADOS).find(e => e.key === estadoSeleccionado)?.label || 'Sano'}
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={limpiarTodo}
                className="flex-1 rounded-lg border border-slate-200/70 bg-slate-100/60 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm transition-colors hover:bg-slate-200/70 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-700/60"
              >
                Limpiar Todo
              </button>
              <button
                onClick={retrocederCambio}
                disabled={historialCambios.length === 0}
                className="flex-1 rounded-lg border border-slate-200/70 bg-slate-100/60 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm transition-colors hover:bg-slate-200/70 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-700/60"
              >
                Deshacer
              </button>
            </div>
          </div>
          
          {/* Historial de Odontogramas */}
          <div className="relative z-0 w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 text-center flex-1">
                Historial de Odontogramas
              </h3>
              {versionLoading && (
                <div className="text-xs text-slate-400 ml-2">
                  Cargando versión...
                </div>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto mb-2 rounded-md border border-slate-200/70 bg-slate-100/60 p-2 text-sm backdrop-blur-sm dark:border-white/5 dark:bg-slate-950/40">
              {odontogramasGuardados.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 m-0">No hay odontogramas guardados</p>
              ) : (
                odontogramasGuardados.map((odo, index) => {
                  const isOleary = odo.tipo === 'oleary_adulto';
                  const isSelected = selectedVersion === odo.version;
                  return (
                    <div
                      key={index}
                      className={`mb-1 p-1 rounded cursor-pointer border backdrop-blur-sm ${
                        isSelected
                          ? isOleary
                            ? 'bg-purple-600/40 border-purple-400/40'
                            : 'bg-teal-600/40 border-teal-400/40'
                          : 'bg-white/40 border-white/5 hover:bg-white/10 dark:bg-slate-900/50'
                      }`}
                      onClick={() => cargarVersionOdontograma(odo.id, odo.version, odo.tipo)}
                    >
                      <div className={`font-medium ${
                        isSelected ? (isOleary ? 'text-purple-300' : 'text-teal-300') : 'text-slate-200'
                      }`}>
                        {odo.nombre}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateSpanish(odo.fecha)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <button
              onClick={guardarOdontogramaActual}
              disabled={saving || cargandoLayout || !currentOdontogram}
              className="w-full mb-2 rounded-lg border border-teal-400/30 bg-teal-600/80 px-6 py-2 font-medium text-white shadow-lg shadow-teal-500/10 backdrop-blur-sm transition-colors hover:bg-teal-500/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-save" aria-hidden="true"></i> {saving ? 'Guardando...' : 'Actualizar Versión'}
            </button>
            <button
              onClick={guardarNuevoOdontograma}
              disabled={saving || cargandoLayout}
              className="w-full rounded-lg border border-indigo-400/30 bg-indigo-600/80 px-6 py-2 font-medium text-white shadow-lg shadow-indigo-500/10 backdrop-blur-sm transition-colors hover:bg-indigo-500/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-copy"></i> Nueva Versión
            </button>
          </div>

          {/* Gingivitis / Periodontitis */}
          <div className="relative z-0 w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60 sm:p-6">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 text-center mb-4">
              Gingivitis / Periodontitis
            </h3>
            <div className="space-y-3">
              {[
                { key: 'gingivitis_generalizada', label: 'Gingivitis generalizada' },
                { key: 'gingivitis_localizada', label: 'Gingivitis localizada' },
                { key: 'gingivitis_embarazo', label: 'Gingivitis por embarazo' },
                { key: 'periodontitis', label: 'Periodontitis' },
              ].map(item => {
                const entry = gingivitis.find(g => g.tipo === item.key);
                const isChecked = !!entry;
                return (
                  <div key={item.key}>
                    <label className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGingivitis(prev => [...prev, { tipo: item.key }]);
                          } else {
                            setGingivitis(prev => prev.filter(g => g.tipo !== item.key));
                          }
                        }}
                        className="h-4 w-4 rounded border-white/20 bg-slate-950/50 accent-teal-500 text-teal-500 focus:ring-teal-400/40"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200 select-none">
                        {item.label}
                      </span>
                    </label>
                    {item.key === 'gingivitis_localizada' && isChecked && (
                      <input
                        type="text"
                        value={entry?.detalle || ''}
                        onChange={(e) => {
                          setGingivitis(prev => prev.map(g =>
                            g.tipo === 'gingivitis_localizada'
                              ? { ...g, detalle: e.target.value }
                              : g
                          ));
                        }}
                        placeholder="Especifique la ubicación..."
                        className="ml-8 mt-1 w-[calc(100%_-_2rem)] rounded-md border border-slate-200/70 bg-white/70 px-2 py-1 text-sm text-slate-900 backdrop-blur-sm focus:border-teal-400/50 focus:outline-none focus:ring-1 focus:ring-teal-400/20 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* General Notes - Same size and position as teeth layout */}
        <div className="notas-generales-container w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60" style={{ maxWidth: '1600px', margin: '20px auto' }}>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-4">
            Notas Generales
          </h3>
          <textarea
            value={notasGenerales}
            onChange={(e) => setNotasGenerales(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-slate-200/70 bg-white/70 px-4 py-2 text-slate-900 backdrop-blur-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-400/20 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100"
            placeholder="Escriba notas generales sobre el odontograma..."
          />
        </div>

        {/* Popup for notes */}
        {popupState.show && (
          <div className="tooth-popup" onClick={() => setPopupState({ ...popupState, show: false })}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
              <div className="popup-title">
                Nota para diente {popupState.toothNumber}
                <button
                  onClick={() => setPopupState({ ...popupState, show: false })}
                  className="text-slate-400 hover:text-slate-200 dark:text-slate-300 dark:hover:text-white"
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

      <style jsx>{`
        .form-group {
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
            background: rgba(15, 23, 42, 0.85);
            border-color: rgba(255,255,255,0.1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px);
          }
        }

        .dark .popup-content {
          background: rgba(15, 23, 42, 0.85);
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
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
            border-color: rgba(255, 255, 255, 0.1);
            background: rgba(2, 6, 23, 0.5);
            color: #f3f4f6;
          }
          .popup-textarea:focus {
            background: rgba(2, 6, 23, 0.7);
            border-color: rgba(45, 212, 191, 0.5);
          }
        }

        .dark .popup-textarea {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.5);
          color: #f3f4f6;
        }

        .dark .popup-textarea:focus {
          background: rgba(2, 6, 23, 0.7);
          border-color: rgba(45, 212, 191, 0.5);
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
