'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Download, Printer, Save, Stethoscope, X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui';
import { Chart as ChartJS, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import type { Patient } from '@/types/patient';

ChartJS.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface MicrobiologyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

interface Bacterium {
  id: string;
  name: string;
  fullName: string;
  category: 'pathogenic' | 'potentially-pathogenic';
}

interface BacteriumInputProps {
  bacterium: Bacterium;
  value: number;
  onChange: (id: string, value: number) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string) => void;
  onFocus: (e: React.FocusEvent) => void;
}

const PATHOGENIC_BACTERIA: Bacterium[] = [
  { id: 'aa', name: 'A.a.', fullName: 'Aggregatibacter actinomycetemcomitans', category: 'pathogenic' },
  { id: 'pg', name: 'P.g.', fullName: 'Porphyromonas gingivalis', category: 'pathogenic' },
  { id: 'tf', name: 'T.f.', fullName: 'Tannerella forsythia', category: 'pathogenic' },
  { id: 'td', name: 'T.d.', fullName: 'Treponema denticola', category: 'pathogenic' },
  { id: 'pi', name: 'P.i.', fullName: 'Prevotella intermedia', category: 'pathogenic' },
  { id: 'fa', name: 'F.a.', fullName: 'Filifactor alocis', category: 'pathogenic' },
];

const POTENTIALLY_PATHOGENIC_BACTERIA: Bacterium[] = [
  { id: 'pm', name: 'P.m.', fullName: 'Parvimonas micra', category: 'potentially-pathogenic' },
  { id: 'fn', name: 'F.n.', fullName: 'Fusobacterium nucleatum', category: 'potentially-pathogenic' },
  { id: 'cr', name: 'C.r.', fullName: 'Campylobacter rectus', category: 'potentially-pathogenic' },
  { id: 'en', name: 'E.n.', fullName: 'Eubacterium nodatum', category: 'potentially-pathogenic' },
  { id: 'ec', name: 'E.c.', fullName: 'Eikenella corrodens', category: 'potentially-pathogenic' },
  { id: 'csp', name: 'C.sp.', fullName: 'Capnocytophaga species', category: 'potentially-pathogenic' },
];

const ALL_BACTERIA = [...PATHOGENIC_BACTERIA, ...POTENTIALLY_PATHOGENIC_BACTERIA];
const VALID_VALUES = [0, 4, 5, 6];

const EXPONENT_COLORS = {
  0: { bg: 'bg-white/[0.04]', text: 'text-slate-400', label: '0' },
  4: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: '4' },
  5: { bg: 'bg-orange-500/20', text: 'text-orange-300', label: '5' },
  6: { bg: 'bg-red-500/20', text: 'text-red-300', label: '6' },
};

function getConcentrationLabel(value: number): string {
  if (value === 0) return 'No detectable';
  if (value === 4) return '10⁴';
  if (value === 5) return '10⁵';
  if (value === 6) return '10⁶';
  return '—';
}

function getConcentrationColor(value: number): string {
  if (value === 0) return '#374151';
  if (value === 4) return '#fbbf24';
  if (value === 5) return '#fb923c';
  if (value === 6) return '#ef4444';
  return '#374151';
}

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors';
const PILL_IDLE = 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white';
const PILL_ACTIVE = 'border-teal-400/40 bg-teal-500/15 text-teal-300';

const BacteriumInput = ({ bacterium, value, onChange, onKeyDown, onFocus }: BacteriumInputProps) => {
  const colorConfig = EXPONENT_COLORS[value as keyof typeof EXPONENT_COLORS] || EXPONENT_COLORS[0];

  return (
    <div className={`microbiology-bacterium-input rounded-lg border p-3 transition-colors ${colorConfig.bg}`}>
      <div className="mb-2">
        <div className="font-medium text-white">{bacterium.name}</div>
        <div className="text-xs text-slate-400">{bacterium.fullName}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-mono text-slate-400">10</span>
        <input
          type="text"
          id={`input-${bacterium.id}`}
          value={value}
          onChange={e => {
            const cleanValue = e.target.value.replace(/[^0456]/g, '').substring(0, 1);
            if (cleanValue && VALID_VALUES.includes(parseInt(cleanValue))) {
              onChange(bacterium.id, parseInt(cleanValue));
            } else if (!cleanValue) {
              onChange(bacterium.id, 0);
            }
          }}
          onKeyDown={e => onKeyDown(e, bacterium.id)}
          onFocus={onFocus}
          className="microbiology-exponent-input w-12 h-8 text-center text-lg font-mono rounded-lg border border-white/10 bg-white/[0.04] text-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          inputMode="numeric"
          maxLength={1}
        />
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Concentración: {getConcentrationLabel(value)}
      </div>
    </div>
  );
};

function MicrobiologyModal({ open, onOpenChange, patient = null }: MicrobiologyModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);
  const [values, setValues] = useState<Record<string, number>>({});
  const [overlayMode, setOverlayMode] = useState(false);
  const [overlayData, setOverlayData] = useState<Record<string, number> | null>(null);
  const [expandedCategories, setExpandedCategories] = useState({ pathogenic: true, potentially: true });
  const [downloading, setDownloading] = useState(false);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    const savedData = chartData.microbiology_data;
    if (savedData) {
      try {
        const parsed = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
        const initialValues: Record<string, number> = {};
        ALL_BACTERIA.forEach(b => {
          initialValues[b.id] = parsed[b.id] !== undefined ? parsed[b.id] : 0;
        });
        setValues(initialValues);
      } catch {
        const initialValues: Record<string, number> = {};
        ALL_BACTERIA.forEach(b => { initialValues[b.id] = 0; });
        setValues(initialValues);
      }
    } else {
      const initialValues: Record<string, number> = {};
      ALL_BACTERIA.forEach(b => { initialValues[b.id] = 0; });
      setValues(initialValues);
    }
  }, [chartData.microbiology_data]);

  const updateValue = (bacteriumId: string, value: number) => {
    const safeValue = VALID_VALUES.includes(value) ? value : 0;
    setValues(prev => ({ ...prev, [bacteriumId]: safeValue }));
    updateField('microbiology_data', { ...values, [bacteriumId]: safeValue });
  };

  const handleKeyDown = (e: React.KeyboardEvent, bacteriumId: string) => {
    const currentValue = values[bacteriumId] || 0;
    const currentIndex = VALID_VALUES.indexOf(currentValue);

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        e.preventDefault();
        if (currentIndex < VALID_VALUES.length - 1) {
          updateValue(bacteriumId, VALID_VALUES[currentIndex + 1]);
        }
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        e.preventDefault();
        if (currentIndex > 0) {
          updateValue(bacteriumId, VALID_VALUES[currentIndex - 1]);
        }
        break;
      case '0':
      case '4':
      case '5':
      case '6':
        e.preventDefault();
        updateValue(bacteriumId, parseInt(e.key));
        break;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        updateValue(bacteriumId, 0);
        break;
      case 'Tab':
      case 'Enter':
        break;
      default:
        e.preventDefault();
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  const createChart = useCallback(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const currentValues = overlayMode && overlayData
      ? ALL_BACTERIA.map(b => overlayData[b.id] !== undefined ? overlayData[b.id] : 0)
      : ALL_BACTERIA.map(b => values[b.id] || 0);

    const overlayDataset = overlayMode && overlayData ? {
      label: 'Befund 1 (Anterior)',
      data: ALL_BACTERIA.map(b => values[b.id] || 0),
      backgroundColor: 'rgba(3, 187, 0, 0.2)',
      borderColor: 'rgba(3, 187, 0, 1)',
      borderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: (context) => getConcentrationColor(context.dataset.data[context.dataIndex] as number),
      pointBorderColor: '#333',
      pointBorderWidth: 2,
      fill: true,
    } : null;

    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'radar',
      data: {
        labels: ALL_BACTERIA.map(b => b.name),
        datasets: [
          {
            label: overlayMode ? 'Befund 2 (Actual)' : 'Examen Actual',
            data: currentValues,
            backgroundColor: overlayMode ? 'rgba(44, 82, 130, 0.2)' : 'rgba(44, 82, 130, 0.2)',
            borderColor: overlayMode ? 'rgba(44, 82, 130, 1)' : 'rgba(44, 82, 130, 1)',
            borderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: (context) => getConcentrationColor(context.parsed.r),
            pointBorderColor: '#333',
            pointBorderWidth: 2,
            fill: true,
          },
          ...(overlayDataset ? [overlayDataset] : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { font: { size: 14, family: 'Arial, sans-serif' }, color: '#E5E7EB' },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.r;
                const bacterium = ALL_BACTERIA[context.dataIndex];
                return `${bacterium.fullName}: ${getConcentrationLabel(value)}`;
              },
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 6,
            ticks: {
              stepSize: 1,
              callback: (value) => String(value),
              color: '#6B7280',
              font: { size: 12 },
            },
            grid: { color: '#374151' },
            angleLines: { color: '#374151' },
            pointLabels: {
              callback: (label) => label,
              color: (context) => context.index < 6 ? '#ef4444' : '#fb923c',
              font: { weight: 'bold', size: 14 },
            },
          },
        },
      },
    });
  }, [overlayMode, overlayData, values]);

  useEffect(() => {
    createChart();
    return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
  }, [values, overlayMode, overlayData, createChart]);

  const handleSave = () => {
    updateField('microbiology_data', values);
    alert('Datos de microbiología guardados correctamente');
  };

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!chartRef.current || downloading) return;
    setDownloading(true);
    try {
      const svg = chartInstanceRef.current?.toBase64Image();
      if (svg) {
        const link = document.createElement('a');
        link.href = svg;
        link.download = 'microbiology_radar.png';
        link.click();
      }
    } finally {
      setDownloading(false);
    }
  }

  const toggleCategory = (cat: 'pathogenic' | 'potentially') => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const loadOverlayData = () => {
    const testOverlay: Record<string, number> = {};
    ALL_BACTERIA.forEach(b => {
      testOverlay[b.id] = Math.min(6, (values[b.id] || 0) + 1);
    });
    setOverlayData(testOverlay);
    setOverlayMode(true);
  };

  const clearOverlay = () => {
    setOverlayData(null);
    setOverlayMode(false);
  };

  if (!open) return null;

  const patientInfo = patient
    ? `${patient.nombre_completo} · ${chartData.date || ''}`
    : 'Sin paciente';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Microbiología Periodontal"
        >
          <div
            className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-teal-400" />
                  Microbiología Periodontal
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-6">
              <div className="rounded-md border border-white/10 p-4 bg-white/[0.02]">
                <h3 className="mb-3 text-sm font-semibold text-white">Gráfico de Radar</h3>
                <div className="relative h-[350px]">
                  <canvas ref={chartRef} id="radarChart" />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Rojo: Bacterias periodontopatógenas · Naranja: Bacterias potencialmente patógenas
                  {overlayMode && ' · Vista comparativa activada'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-3 bg-white/[0.02]">
                <Button variant="outline" onClick={loadOverlayData} disabled={overlayMode} className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  Cargar Comparativa
                </Button>
                {overlayMode && (
                  <Button variant="outline" onClick={clearOverlay} className="flex items-center gap-1.5 text-red-400 border-red-400/35 hover:bg-red-500/10">
                    <X className="h-3.5 w-3.5" />
                    Limpiar Comparativa
                  </Button>
                )}
                <Button variant="outline" onClick={handlePrint} className="flex items-center gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={handleDownload} disabled={downloading} className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  {downloading ? 'Descargando...' : 'Descargar'}
                </Button>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => toggleCategory('pathogenic')}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedCategories.pathogenic ? 'rotate-180' : ''}`} />
                    <span className="text-sm font-semibold text-red-400">Bacterias periodontopatógenas</span>
                    <span className="text-xs font-medium text-red-400 bg-red-500/20 px-2 py-0.5 rounded">Patogénicas</span>
                  </div>
                </button>

                {expandedCategories.pathogenic && (
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {PATHOGENIC_BACTERIA.map(b => (
                      <BacteriumInput
                        key={b.id}
                        bacterium={b}
                        value={values[b.id] || 0}
                        onChange={updateValue}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleCategory('potentially')}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedCategories.potentially ? 'rotate-180' : ''}`} />
                    <span className="text-sm font-semibold text-orange-400">Bacterias potencialmente periodontopatógenas</span>
                    <span className="text-xs font-medium text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded">Potencialmente patógenas</span>
                  </div>
                </button>

                {expandedCategories.potentially && (
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {POTENTIALLY_PATHOGENIC_BACTERIA.map(b => (
                      <BacteriumInput
                        key={b.id}
                        bacterium={b}
                        value={values[b.id] || 0}
                        onChange={updateValue}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 p-3 bg-white/[0.02]">
                <p className="text-[11px] text-slate-500">
                  <strong>Controles:</strong> Flechas ↑/→ (mayor), ↓/← (menor) | Entrada directa: 0, 4, 5, 6
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08] transition-all"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-400/35 hover:border-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.12)] px-4 py-2 text-sm font-medium transition-all"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { MicrobiologyModal };