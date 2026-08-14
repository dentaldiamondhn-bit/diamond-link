'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OdontogramPilotService } from '@/services/odontogramPilotService';
import { Odontogram } from '@/types/odontogram';

const CUADRANTES = ['mesial', 'distal', 'buccal', 'lingual'] as const;
type Cuadrante = typeof CUADRANTES[number];

const ESTADOS = [
  { key: "abfraccion", label: "Abfracción", color: "#BA68C8" },
  { key: "abrasion", label: "Abrasión", color: "#4FC3F7" },
  { key: "amalgama", label: "Restauración Amalgama", color: "#607D8B" },
  { key: "apilado", label: "Apiñamiento", color: "#455A64" },
  { key: "atricion", label: "Atrición", color: "#FFD54F" },
  { key: "ausente", label: "Ausente", color: "#9E9E9E" },
  { key: "carilla", label: "Carilla", color: "#00BCD4" },
  { key: "cariado", label: "Cariado", color: "#FF5722" },
  { key: "caries-restauracion", label: "Restauración con Caries", color: "#FFC107" },
  { key: "corona", label: "Corona", color: "#795548" },
  { key: "endodoncia", label: "Endodoncia", color: "#5D4037" },
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

const ESTADOS_OLEARY = [
  { key: "sano", label: "Sano", color: "#FFFFFF" },
  { key: "placa", label: "Placa", color: "#FFEB3B" },
  { key: "ausente", label: "Ausente", color: "#000000" }
];

const ADULT_TEETH_QUADRANTS = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41]
};

const CHILD_TEETH_QUADRANTS = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft: [61, 62, 63, 64, 65],
  lowerLeft: [71, 72, 73, 74, 75],
  lowerRight: [85, 84, 83, 82, 81]
};

const MORDIDAS_LABELS: Record<string, string> = {
  mordida_abierta_anterior: 'Mordida abierta anterior',
  mordida_abierta_posterior: 'Mordida abierta posterior',
  mordida_cruzada_anterior: 'Mordida cruzada anterior',
  mordida_cruzada_posterior: 'Mordida cruzada posterior',
  mordida_bis_a_bis: 'Mordida bis a bis'
};

const GINGIVITIS_LABELS: Record<string, string> = {
  gingivitis_generalizada: 'Gingivitis generalizada',
  gingivitis_localizada: 'Gingivitis localizada',
  gingivitis_embarazo: 'Gingivitis por embarazo',
  periodontitis: 'Periodontitis'
};

interface ToothData {
  cuadrantes: Record<Cuadrante, string>;
  central?: string;
  nota?: string;
}

interface OdontogramPreviewProps {
  pacienteId: string;
}

function ToothSvg({ numero, cuadrantes, central, nota, isOleary }: {
  numero: number;
  cuadrantes: Record<Cuadrante, string>;
  central?: string;
  nota?: string;
  isOleary: boolean;
}) {
  const radius = 18;

  const pieSlicePath = (startAngle: number, endAngle: number, r: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = r * Math.cos(startRad);
    const y1 = r * Math.sin(startRad);
    const x2 = r * Math.cos(endRad);
    const y2 = r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const quadrantAngles: Record<Cuadrante, [number, number]> = {
    mesial: [45, 135],
    buccal: [135, 225],
    lingual: [225, 315],
    distal: [315, 405]
  };

  const estados = isOleary ? ESTADOS_OLEARY : ESTADOS;

  return (
    <g>
      <title>{`Diente ${numero}${nota ? ' - ' + nota : ''}`}</title>
      {(Object.entries(quadrantAngles) as [Cuadrante, [number, number]][]).map(([cuadrante, [start, end]]) => {
        const estado = cuadrantes[cuadrante];
        const fillColor = estados.find(e => e.key === estado)?.color || '#FFFFFF';
        return (
          <path
            key={cuadrante}
            d={pieSlicePath(start, end, radius)}
            fill={fillColor}
            stroke="black"
            strokeWidth="0.8"
            opacity="0.9"
          />
        );
      })}

      {!isOleary && (
        <>
          <circle
            cx="0"
            cy="0"
            r="7.2"
            fill={central ? (estados.find(e => e.key === central)?.color || '#FFFFFF') : '#FFFFFF'}
            stroke="black"
            strokeWidth="1.5"
          />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            fontWeight="bold"
            fill={central && central !== 'sano' ? '#FFFFFF' : '#1F2937'}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {numero}
          </text>
        </>
      )}

      {isOleary && (
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fontWeight="bold"
          fill="#1F2937"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {numero}
        </text>
      )}

      {nota && (
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

export default function OdontogramPreview({ pacienteId }: OdontogramPreviewProps) {
  const router = useRouter();
  const [odontogram, setOdontogram] = useState<Odontogram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pacienteId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await OdontogramPilotService.getActiveOdontogram(pacienteId);
        if (!cancelled) setOdontogram(data);
      } catch (err) {
        console.error('Error loading odontogram preview:', err);
        if (!cancelled) setOdontogram(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pacienteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!odontogram || !odontogram.datos_odontograma) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <i className="fas fa-tooth text-gray-300 text-4xl mb-3"></i>
        <p className="text-gray-600 dark:text-gray-400">
          No hay odontograma registrado para este paciente
        </p>
        <button
          onClick={() => router.push(`/odontogram-pilot?id=${pacienteId}`)}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <i className="fas fa-plus mr-2"></i>
          Crear Odontograma
        </button>
      </div>
    );
  }

  const datos = odontogram.datos_odontograma;
  const tipo = (datos.tipo as 'adulto' | 'nino' | 'oleary_adulto') || 'adulto';
  const isOleary = tipo === 'oleary_adulto';
  const isAdulto = tipo === 'adulto' || tipo === 'oleary_adulto';

  const teethQuadrants = isAdulto ? ADULT_TEETH_QUADRANTS : CHILD_TEETH_QUADRANTS;
  const upperTeeth = [...teethQuadrants.upperRight, ...teethQuadrants.upperLeft];
  const lowerTeeth = [...teethQuadrants.lowerRight, ...teethQuadrants.lowerLeft];

  const getTooth = (num: number): ToothData => {
    const diente = datos.dientes?.[num.toString()];
    if (!diente) return { cuadrantes: { mesial: 'sano', distal: 'sano', buccal: 'sano', lingual: 'sano' } };

    if ((diente as any).cuadrantes) {
      const defaultCuadrantes = { mesial: 'sano', distal: 'sano', buccal: 'sano', lingual: 'sano' };
      const rawCuadrantes = (diente as any).cuadrantes;
      const sanitizedCuadrantes = Object.fromEntries(
        Object.entries(rawCuadrantes).filter(([, v]) => typeof v === 'string')
      );
      return {
        cuadrantes: { ...defaultCuadrantes, ...sanitizedCuadrantes },
        central: typeof (diente as any).central === 'string' ? ((diente as any).central || 'sano') : 'sano',
        nota: (diente as any).nota
      };
    }
    if ((diente as any).estado !== undefined) {
      const estadoLegado = (diente as any).estado || 'sano';
      return {
        cuadrantes: { mesial: estadoLegado, distal: estadoLegado, buccal: estadoLegado, lingual: estadoLegado },
        central: 'sano',
        nota: (diente as any).nota
      };
    }
    return { cuadrantes: { mesial: 'sano', distal: 'sano', buccal: 'sano', lingual: 'sano' } };
  };

  const contadorEstados = () => {
    const contador: Record<string, number> = {};
    const estados = isOleary ? ESTADOS_OLEARY : ESTADOS;
    estados.forEach(e => { contador[e.key] = 0; });

    [...upperTeeth, ...lowerTeeth].forEach(num => {
      const tooth = getTooth(num);
      // Collect all non-sano statuses across quadrants and center
      const allStatuses: string[] = [];
      if (!isOleary) {
        if (tooth.central && typeof tooth.central === 'string') {
          allStatuses.push(tooth.central);
        }
      }
      const quadrantValues = Object.values(tooth.cuadrantes || {}).filter((q) => typeof q === 'string');
      allStatuses.push(...quadrantValues);

      const uniqueNonSano = new Set(allStatuses.filter(s => s !== 'sano'));
      if (uniqueNonSano.size === 0) {
        contador['sano']++;
      } else {
        uniqueNonSano.forEach(status => {
          contador[status] = (contador[status] || 0) + 1;
        });
      }
    });

    return contador;
  };

  const contador = contadorEstados();
  const mordidas = datos.mordidas || [];
  const gingivitis = datos.gingivitis || [];
  const notaToothCount = [...upperTeeth, ...lowerTeeth].filter(num => getTooth(num).nota).length;

  const formatFecha = (dateString: string) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div data-rr-block>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
          Versión {odontogram.version}
        </span>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {tipo === 'adulto' ? 'Adulto' : tipo === 'nino' ? 'Niño' : "O'Leary Adulto"}
        </span>
        {odontogram.activo && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Actual
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Fecha: {formatFecha((datos as any).fecha || odontogram.fecha_creacion)}
      </p>

      {/* Tooth chart */}
      <div className="bg-white dark:bg-gray-800" style={{ borderRadius: '12px', padding: '16px', width: '100%' }}>
        <div className="teeth-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'nowrap' }}>
          {upperTeeth.map(num => {
            const tooth = getTooth(num);
            return (
              <div key={num} style={{ flexShrink: 0 }}>
                <svg width="52" height="52" viewBox="0 0 40 40" style={{ display: 'block' }}>
                  <g transform="translate(20,20)">
                    <ToothSvg
                      numero={num}
                      cuadrantes={tooth.cuadrantes}
                      central={tooth.central}
                      nota={tooth.nota}
                      isOleary={isOleary}
                    />
                  </g>
                </svg>
              </div>
            );
          })}
        </div>

        <div className="teeth-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'nowrap', marginTop: '8px' }}>
          {lowerTeeth.map(num => {
            const tooth = getTooth(num);
            return (
              <div key={num} style={{ flexShrink: 0 }}>
                <svg width="52" height="52" viewBox="0 0 40 40" style={{ display: 'block' }}>
                  <g transform="translate(20,20)">
                    <ToothSvg
                      numero={num}
                      cuadrantes={tooth.cuadrantes}
                      central={tooth.central}
                      nota={tooth.nota}
                      isOleary={isOleary}
                    />
                  </g>
                </svg>
              </div>
            );
          })}
        </div>

        {/* Legend / counters */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(isOleary ? ESTADOS_OLEARY : ESTADOS)
            .filter(estado => contador[estado.key] > 0)
            .map(estado => (
              <div key={estado.key} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-100 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: estado.color, border: estado.color === '#FFFFFF' ? '1px solid #ccc' : 'none' }} />
                <span className="text-xs font-semibold">{estado.label}</span>
                <span className="text-xs font-semibold">{contador[estado.key]}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Mordidas */}
      {mordidas.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mordida</h4>
          <div className="flex flex-wrap gap-2">
            {mordidas.map(m => (
              <span key={m} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
                <i className="fas fa-check-circle text-teal-600 dark:text-teal-400"></i>
                {MORDIDAS_LABELS[m] || m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gingivitis */}
      {gingivitis.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Gingivitis / Periodontitis</h4>
          <div className="flex flex-wrap gap-2">
            {gingivitis.map((g, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
                <i className="fas fa-exclamation-triangle text-amber-500"></i>
                {GINGIVITIS_LABELS[g.tipo] || g.tipo}
                {g.detalle ? ` - ${g.detalle}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {odontogram.notas && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notas generales</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{odontogram.notas}</p>
        </div>
      )}

      {notaToothCount > 0 && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {notaToothCount} diente(s) con nota
        </p>
      )}
    </div>
  );
}
