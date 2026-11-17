'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Download, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import { useOverlayStore } from '@/lib/store/useOverlayStore';
import {
  calculateChartStatistics,
  calculateRiskAssessment,
  calculateDetailedChartStatistics,
  calculateBaderstenAnalysis,
  calculateRamseierAnalysis,
  RiskLevel,
  DetailedChartStatistics,
  BaderstenCategoryData,
  RamseierAnalysisResult,
} from '@/lib/utils/periodontalAnalysis';
import { rasterizeSvg } from './rasterizeSvg';
import { formatToDdMmYyyy } from '@/lib/utils/periodontalAnalysis';

const LEVEL_STYLES: Record<RiskLevel, string> = {
  bajo: 'bg-green-500/20 text-green-300 border-green-400/30',
  moderado: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  alto: 'bg-red-500/20 text-red-300 border-red-400/30',
};

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-green-500',
  moderate: 'bg-amber-500',
  high: 'bg-red-500',
  info: 'bg-slate-500',
};

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors';
const PILL_IDLE = 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white';
const PILL_ACTIVE = 'border-teal-400/40 bg-teal-500/15 text-teal-300';

interface AnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const METRIC_COLORS = {
  pi: '#7D97E3',
  pd4: '#CCCCCC',
  pd5: '#656565',
  pd6: '#FD0000',
  bop: '#FDA5A5',
} as const;

function MetricBar({ label, value, unit, color, maxPercent = 100 }: { 
  label: string; 
  value: number | string; 
  unit: string; 
  color: string; 
  maxPercent?: number;
}) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const width = Math.min((numValue / maxPercent) * 100, 100);
  
  return (
    <div className="analysis-metric-row flex items-center gap-2 py-1">
      <div className="w-[180px] text-xs text-slate-300 whitespace-nowrap">
        {label}
      </div>
      <div className="w-[60px] text-sm font-bold text-white text-right">
        {value}{unit && <span className="font-normal text-xs text-slate-400">{unit}</span>}
      </div>
      <div className="flex-1 h-5 bg-slate-800/50 rounded overflow-hidden">
        <div 
          className="h-full rounded transition-all duration-500"
          style={{ 
            width: `${width}%`, 
            backgroundColor: color,
          }} 
        />
      </div>
    </div>
  );
}

function BaderstenChart({ data }: { data: BaderstenCategoryData[] }) {
  const maxHeight = 200;
  const zeroY = 100;
  const barWidth = 28;
  const gap = 12;
  
  return (
    <div className="badersten-chart-container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'flex-end', 
      height: `${maxHeight + 40}px`,
      borderLeft: '1.5px solid var(--badersten-axis, #000)',
      padding: '20px 10px 10px 20px',
      position: 'relative'
    }}>
      <svg viewBox={`0 0 ${data.length * (barWidth + gap) + 40} ${maxHeight + 40}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="baderstenPositive" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FD0000" />
            <stop offset="100%" stopColor="#CC0000" />
          </linearGradient>
          <linearGradient id="baderstenNegative" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0069CD" />
            <stop offset="100%" stopColor="#004A99" />
          </linearGradient>
          <linearGradient id="baderstenNeutral" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E7F3FD" />
            <stop offset="100%" stopColor="#D0E8FC" />
          </linearGradient>
        </defs>
        
        <rect x="0" y="0" width={data.length * (barWidth + gap) + 40} height={maxHeight + 40} fill="var(--badersten-bg, #FAFAFA)" />
        
        <line x1="20" y1={zeroY} x2={data.length * (barWidth + gap) + 20} y2={zeroY} stroke="var(--badersten-axis, #999)" strokeWidth="1" />
        
        {data.map((row, i) => {
          const x = 20 + i * (barWidth + gap);
          
          if (row.count === 0) {
            return (
              <g key={i} transform={`translate(${x}, ${zeroY - 15})`}>
                <rect width={barWidth} height={30} fill="url(#baderstenNeutral)" />
              </g>
            );
          }
          
          const meanChange = row.meanChange || 0;
          
          if (meanChange > 0) {
            const height = Math.min((meanChange / 10) * maxHeight, maxHeight);
            return (
              <g key={i} transform={`translate(${x}, ${zeroY - height})`}>
                <rect width={barWidth} height={height} fill="url(#baderstenPositive)" className="d_kat" />
              </g>
            );
          } else if (meanChange < 0) {
            const height = Math.min((Math.abs(meanChange) / 10) * maxHeight, maxHeight);
            return (
              <g key={i} transform={`translate(${x}, ${zeroY})`}>
                <rect width={barWidth} height={height} fill="url(#baderstenNegative)" className="m_kat" />
              </g>
            );
          } else {
            return (
              <g key={i} transform={`translate(${x}, ${zeroY - 15})`}>
                <rect width={barWidth} height={30} fill="url(#baderstenNeutral)" />
              </g>
            );
          }
        })}
        
        {data.map((_, i) => (
          <text
            key={`label-${i}`}
            x={20 + i * (barWidth + gap) + barWidth / 2}
            y={maxHeight + 35}
            fontSize={10}
            fill="var(--badersten-label, #666)"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
          >
            {data[i].category}
          </text>
        ))}
      </svg>
    </div>
  );
}

function RamseierChart({ data }: { data: RamseierAnalysisResult }) {
  const maxHeight = 200;
  const categories = ['pdReduced', 'pdSame', 'pdIncreased'];
  const labels = ['PD reduc.', 'PD igual', 'PD aum.'];
  const barWidth = 28;
  const gap = 20;
  
  return (
    <div className="ramseier-chart-container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'flex-end', 
      height: `${maxHeight + 40}px`,
      borderLeft: '1.5px solid var(--ramseier-axis, #000)',
      padding: '20px 10px 10px 20px',
      position: 'relative'
    }}>
      <svg viewBox={`0 0 ${categories.length * (barWidth + gap) + 40} ${maxHeight + 40}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width={categories.length * (barWidth + gap) + 40} height={maxHeight + 40} fill="var(--ramseier-bg, #FAFAFA)" />
        
        {categories.map((cat, i) => {
          const x = 20 + i * (barWidth + gap);
          const cell = data.table[cat as keyof typeof data.table];
          const total = cell.bopReduced + cell.bopSame + cell.bopIncreased;
          
          if (total === 0) return null;
          
          const afterHeight = (cell.bopReduced / total) * maxHeight;
          const diffHeight = (cell.bopSame / total) * maxHeight;
          const remainingHeight = (cell.bopIncreased / total) * maxHeight;
          
          let currentY = maxHeight;
          
          return (
            <g key={i} transform={`translate(${x}, 0)`}>
              <rect 
                x={0} 
                y={maxHeight - afterHeight} 
                width={barWidth} 
                height={afterHeight} 
                fill="var(--ramseier-after, #FDA5A5)" 
                className="ramseier-segment after" 
              />
              <rect 
                x={0} 
                y={maxHeight - afterHeight - diffHeight} 
                width={barWidth} 
                height={diffHeight} 
                fill="var(--ramseier-diff, #FFDDDD)" 
                className="ramseier-segment diff" 
              />
              <rect 
                x={0} 
                y={maxHeight - afterHeight - diffHeight - remainingHeight} 
                width={barWidth} 
                height={remainingHeight} 
                fill="var(--ramseier-remaining, #E7F3FD)" 
                className="ramseier-segment remaining" 
              />
              <text 
                x={barWidth / 2} 
                y={maxHeight + 25} 
                fontSize={10} 
                fill="var(--ramseier-label, #666)" 
                textAnchor="middle" 
                fontFamily="Arial, sans-serif"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


export function AnalysisModal({ open, onOpenChange }: AnalysisModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const overlayData = useOverlayStore(state => state.overlayData);
  const isOverlayMode = useChartStore(state => state.isOverlayMode);
  const [downloading, setDownloading] = useState(false);
  const [baderstenExpanded, setBaderstenExpanded] = useState(true);
  const [ramseierExpanded, setRamseierExpanded] = useState(true);

  const stats = useMemo(() => calculateChartStatistics(chartData), [chartData]);
  const detailedStats = useMemo(() => calculateDetailedChartStatistics(chartData), [chartData]);
  const risk = useMemo(() => calculateRiskAssessment(chartData), [chartData]);

  const baderstenData = useMemo(() => 
    isOverlayMode && overlayData ? calculateBaderstenAnalysis(chartData, overlayData) : null,
    [chartData, overlayData, isOverlayMode]
  );

  const ramseierData = useMemo(() => 
    isOverlayMode && overlayData ? calculateRamseierAnalysis(chartData, overlayData) : null,
    [chartData, overlayData, isOverlayMode]
  );

  const dateText = formatToDdMmYyyy(chartData.date);

  const analysisSvgRef = useRef<HTMLDivElement | null>(null);

  async function handleDownload() {
    const svgs = analysisSvgRef.current?.querySelectorAll<SVGSVGElement>('svg');
    if (!svgs || svgs.length === 0 || downloading) return;

    setDownloading(true);
    try {
      for (const svg of Array.from(svgs)) {
        await rasterizeSvg(svg, 'analysis.png');
      }
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  const patientInfo = [
    chartData.patient_first_name,
    chartData.patient_last_name,
  ].filter(Boolean).join(' ');

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Análisis periodontal"
        >
          <div
            className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-2.5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Análisis de los Datos del Estado Periodontal</h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  {isOverlayMode && overlayData ? 'Comparativa: Examen Inicial vs. Reevaluación' : 'Análisis de un único examen'}
                </p>
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

            <div className="mt-4" ref={analysisSvgRef}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">Resumen del Análisis</h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {[patientInfo, formatToDdMmYyyy(chartData.date)].filter(Boolean).join(' · ') || 'Análisis periodontal'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-400/35 hover:border-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.12)] px-4 py-2 text-sm font-medium transition-all"
                >
                  {downloading ? <Download className="h-4 w-4 animate-pulse" /> : <Download className="h-4 w-4" />}
                  Descargar
                </button>
              </div>

              <div style={{ 
                display: 'flex', 
                width: '900px', 
                maxWidth: '100%',
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px'
              }}>
                <div style={{ width: '300px', borderLeft: '1.5px solid #000', paddingLeft: '8px' }}>
                  <div style={{ 
                    display: 'flex', 
                    width: '310px', 
                    borderTop: '1.5px solid #000',
                    paddingTop: '5px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    color: '#374151'
                  }}>
                    <div style={{ flex: 15, textAlign: 'left' }}> </div>
                    <div style={{ flex: 30, textAlign: 'left' }}>Examen</div>
                    <div style={{ flex: 50, textAlign: 'right' }}>Valor</div>
                  </div>
                  
                  <MetricBar 
                    label="Número de dientes" 
                    value={stats.teethPresent} 
                    unit="" 
                    color={METRIC_COLORS.pi}
                    maxPercent={32}
                  />
                  <MetricBar 
                    label="Índice de Placa (%)" 
                    value={detailedStats.plaquePercent.toFixed(1)} 
                    unit="%" 
                    color={METRIC_COLORS.pi}
                  />
                  <MetricBar 
                    label="Profundidades 4mm (%)" 
                    value={detailedStats.pd4Percent.toFixed(1)} 
                    unit="%" 
                    color={METRIC_COLORS.pd4}
                  />
                  <MetricBar 
                    label="Profundidades 5mm (%)" 
                    value={detailedStats.pd5Percent.toFixed(1)} 
                    unit="%" 
                    color={METRIC_COLORS.pd5}
                  />
                  <MetricBar 
                    label="Profundidades ≥6mm (%)" 
                    value={detailedStats.pdGreater5Percent.toFixed(1)} 
                    unit="%" 
                    color={METRIC_COLORS.pd6}
                  />
                  <MetricBar 
                    label="Prof. Sondaje (media)" 
                    value={detailedStats.meanPd.toFixed(1)} 
                    unit="mm" 
                    color={METRIC_COLORS.pi}
                    maxPercent={10}
                  />
                  <MetricBar 
                    label="Margen Gingival (media)" 
                    value={detailedStats.meanGm.toFixed(1)} 
                    unit="mm" 
                    color={METRIC_COLORS.pd4}
                    maxPercent={10}
                  />
                  <MetricBar 
                    label="Nivel Inserción (media)" 
                    value={detailedStats.meanAl.toFixed(1)} 
                    unit="mm" 
                    color={METRIC_COLORS.pd5}
                    maxPercent={15}
                  />
                  <MetricBar 
                    label="Sangrado al Sondaje (%)" 
                    value={detailedStats.bopPercent.toFixed(1)} 
                    unit="%" 
                    color={METRIC_COLORS.bop}
                  />
                </div>

                <div style={{ width: '150px', textAlign: 'center', paddingTop: '40px', fontSize: '11px', color: '#6B7280' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Examen Inicial</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>
                    {formatToDdMmYyyy(chartData.date)}
                  </div>
                </div>

                <div style={{ width: '150px', textAlign: 'center', paddingTop: '40px', fontSize: '11px', color: '#6B7280' }}>
                  {isOverlayMode && overlayData ? (
                    <>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Reevaluación</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>
                        {formatToDdMmYyyy(overlayData.date)}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#9CA3AF' }}>—</div>
                  )}
                </div>

                <div style={{ width: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10px' }}>
                  <div style={{ 
                    display: 'flex', 
                    height: '30px', 
                    background: '#E7F3FD',
                    borderRadius: '4px',
                    width: '100%',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(detailedStats.plaquePercent * 3, 100)}%`,
                      backgroundColor: METRIC_COLORS.pi,
                      borderRadius: '4px 0 0 4px'
                    }}></div>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(detailedStats.pd4Percent * 3, 100)}%`,
                      backgroundColor: METRIC_COLORS.pd4
                    }}></div>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(detailedStats.pd5Percent * 3, 100)}%`,
                      backgroundColor: METRIC_COLORS.pd5
                    }}></div>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(detailedStats.pdGreater5Percent * 3, 100)}%`,
                      backgroundColor: METRIC_COLORS.pd6
                    }}></div>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(detailedStats.bopPercent * 3, 100)}%`,
                      backgroundColor: METRIC_COLORS.bop,
                      borderRadius: '0 4px 4px 0'
                    }}></div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%', 
                    marginTop: '4px',
                    fontSize: '10px',
                    color: '#6B7280'
                  }}>
                    <span>PI</span>
                    <span>4mm</span>
                    <span>5mm</span>
                    <span>≥6mm</span>
                    <span>BOP</span>
                  </div>
                </div>
              </div>

              {isOverlayMode && overlayData && (
                <>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setBaderstenExpanded(!baderstenExpanded)}
                      className="flex items-center gap-2 text-sm font-semibold text-white hover:text-teal-300"
                    >
                      {baderstenExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      Análisis de Badersten (Cambios en Profundidades de Sondaje)
                    </button>
                    {baderstenExpanded && baderstenData && (
                      <div className="mt-4 space-y-4">
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                          <div className="rounded-md border border-white/10 bg-white/[0.02] overflow-x-auto" style={{ minWidth: '520px' }}>
                            <table className="w-full border-collapse text-xs" id="BaderstenAnalysisTable">
                              <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                  <th className="border border-white/10 bg-white/[0.02] px-3 py-2 text-left font-semibold text-slate-300" style={{ width: '120px' }}>
                                    Examen Inicial (mm)
                                  </th>
                                  <th className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center font-semibold text-slate-300" style={{ width: '100px' }}>
                                    Reevaluación (mm)
                                  </th>
                                  <th className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center font-semibold text-slate-300" style={{ width: '100px' }}>
                                    Cambio (mm)
                                  </th>
                                  <th className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center font-semibold text-slate-300" style={{ width: '100px' }}>
                                    Bolsas (número)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {baderstenData.map((row, i) => (
                                  <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)' }}>
                                    <td className="border border-white/10 bg-white/[0.02] px-3 py-2 font-medium text-white">
                                      {row.category}
                                    </td>
                                    <td className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-slate-300">
                                      {row.meanBefore !== null ? row.meanBefore.toFixed(2) : '—'}
                                    </td>
                                    <td className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-slate-300">
                                      {row.meanChange !== null ? 
                                        (row.meanChange > 0 ? '+' : '') + row.meanChange.toFixed(2) : '—'}
                                    </td>
                                    <td className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-slate-300">
                                      {row.count}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <BaderstenChart data={baderstenData} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setRamseierExpanded(!ramseierExpanded)}
                      className="flex items-center gap-2 text-sm font-semibold text-white hover:text-teal-300"
                    >
                      {ramseierExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      Análisis de Ramseier (Cambios PD / BOP)
                    </button>
                    {ramseierExpanded && ramseierData && (
                      <div className="mt-4 space-y-4">
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4" style={{ minWidth: '400px' }}>
                            <table className="w-full border-collapse text-xs" id="RamseierAnalysisTable">
                              <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                  <th className="border border-white/10 bg-white/[0.02] px-3 py-2 text-left font-semibold text-slate-300">
                                    PD / BOP
                                  </th>
                                  <th className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center font-semibold text-slate-300">
                                    BOP reduc.
                                  </th>
                                  <th className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center font-semibold text-slate-300">
                                    BOP igual
                                  </th>
                                  <th className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center font-semibold text-slate-300">
                                    BOP aum.
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { key: 'pdReduced', label: 'PD reduc.' },
                                  { key: 'pdSame', label: 'PD igual' },
                                  { key: 'pdIncreased', label: 'PD aum.' },
                                ].map(row => (
                                  <tr key={row.key}>
                                    <td className="border border-white/10 bg-white/[0.02] px-3 py-2 font-medium text-white">
                                      {row.label}
                                    </td>
                                    <td className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-slate-300">
                                      {ramseierData.table[row.key as keyof typeof ramseierData.table].bopReduced}
                                    </td>
                                    <td className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-slate-300">
                                      {ramseierData.table[row.key as keyof typeof ramseierData.table].bopSame}
                                    </td>
                                    <td className="border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-slate-300">
                                      {ramseierData.table[row.key as keyof typeof ramseierData.table].bopIncreased}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <RamseierChart data={ramseierData} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ramseierData.chiSquare !== null && (
                            <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
                              <h4 className="font-semibold text-white mb-2">Prueba Chi-Cuadrado (χ²)</h4>
                              <p className="text-sm text-slate-300 font-mono">
                                χ² = {ramseierData.chiSquare.toFixed(4)}, df = {ramseierData.degreesOfFreedom}, 
                                <i>p = {ramseierData.pValue !== null ? ramseierData.pValue.toFixed(4) : 'NaN'}</i>
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {ramseierData.pValue !== null && ramseierData.pValue < 0.05 
                                  ? 'Diferencia estadísticamente significativa (p < 0.05)'
                                  : 'Sin diferencia estadísticamente significativa (p ≥ 0.05)'
                                }
                              </p>
                            </div>
                          )}
                          
                          {ramseierData.pearsonR !== null && (
                            <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
                              <h4 className="font-semibold text-white mb-2">Correlación de Pearson</h4>
                              <p className="text-sm text-slate-300 font-mono">
                                r = {ramseierData.pearsonR.toFixed(2)}, df = {ramseierData.pearsonDf}, 
                                <i>p = {ramseierData.pearsonPValue !== null ? ramseierData.pearsonPValue.toFixed(4) : 'NaN'}</i>
                              </p>
                              <p className="text-sm text-slate-300 font-mono">
                                IC 95%: [{ramseierData.pearsonCiLower?.toFixed(4) ?? 'NaN'}, {ramseierData.pearsonCiUpper?.toFixed(4) ?? 'NaN'}]
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Correlación entre PD y BOP en la reevaluación
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!isOverlayMode && (
                <div className="mt-6 rounded-md border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-sm text-slate-300">
                    Para ver el análisis comparativo (Badersten y Ramseier), active el modo de comparación
                    cargando un segundo examen en la vista principal.
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <section className="rounded-md border border-teal-400/30 bg-teal-500/10 p-4">
                  <h4 className="font-semibold text-teal-300 mb-2">Evaluación de Riesgo Periodontal</h4>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${LEVEL_STYLES[risk.level]}`}>
                      Riesgo {risk.level}
                    </span>
                    <span className="text-xs text-slate-400">Puntaje: {risk.score}</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {risk.factors.map(factor => (
                      <li key={factor.label} className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.02] p-3">
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_STYLES[factor.severity]}`} />
                        <div>
                          <div className="text-sm font-medium text-white">{factor.label}</div>
                          <div className="text-xs text-slate-400">{factor.detail}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-md border border-white/10 bg-white/[0.02] p-4">
                  <h4 className="font-semibold text-white mb-3">Detalles Adicionales</h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                      { label: 'Dientes presentes', value: stats.teethPresent },
                      { label: 'Dientes ausentes', value: stats.teethMissing },
                      { label: 'Implantes', value: stats.teethImplanted },
                      { label: 'Bolsas ≥ 5mm', value: stats.sites5mm },
                      { label: 'Bolsas ≥ 6mm', value: stats.sites6mm },
                      { label: 'Furcación II-III', value: stats.furcationAdvanced },
                    ].map(item => (
                      <div key={item.label} className="rounded border border-white/10 bg-white/[0.02] px-2 py-1.5 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {item.label}
                        </div>
                        <div className="text-sm font-bold text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <p className="text-[11px] text-slate-500">
                {isOverlayMode && overlayData 
                  ? 'Análisis comparativo: Examen Inicial vs. Reevaluación' 
                  : 'Análisis de un único examen periodontal'}
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-400/35 hover:border-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.12)] px-4 py-2 text-sm font-medium transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}