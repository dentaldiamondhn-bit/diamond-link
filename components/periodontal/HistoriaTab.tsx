'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Camera, CheckCircle2, Smile } from 'lucide-react';
import { Patient } from '@/types/patient';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { buildChartDataFromStudy } from '@/lib/utils/studyToChart';
import { isToothPresent } from '@/lib/utils/periodontalAnalysis';
import {
  analyzeHistoryJsonData,
  analyzeHistorySvgData,
  extractHistoryInstanceData,
  calculatePdDifferences,
  aggregatePdDifferences,
  calculateChangePercentages,
  summarizeTopWorseningSites,
  suggestMaintenanceInterval,
  computeIntervalStatus,
  formatHistoryDate,
  formatHistoryMonthYear,
  formatIntervalDuration,
  formatSignedChange,
  parseHistoryDate,
  getHeatmapColor,
  HEATMAP_LEGEND_COLORS,
  type AggregatedPdDifferences,
  type HistoryChangePercentages,
  type HistoryInstanceData,
  type IntervalStatus,
  type RankedSiteChange,
  type ToothPdDifferences,
} from '@/lib/utils/periodontalHistory';
import {
  getOverviewSiteFills,
  buildOverviewPdTexts,
  getOverviewFurcationMarkers,
  getOverviewImplantMarkers,
} from '@/lib/utils/periodontalOverview';
import { OVERVIEW_SITE_PATHS } from '@/lib/constants/overviewSites';
import {
  OVERVIEW_PD_TEXT_SLOTS,
  FURCATION_OVERVIEW_COORDINATES,
  IMPLANT_OVERVIEW_COORDINATES,
} from '@/lib/constants/overviewCoordinates';
import { OverviewMap, type OverviewLayerVisibility } from '@/components/periodontal/modals/OverviewMap';
import { rasterizeSvg } from '@/components/periodontal/modals/rasterizeSvg';

interface HistoriaTabProps {
  patient: Patient | null;
  studies: any[];
  loading?: boolean;
}

interface StudyEntry {
  id: string;
  date: string;
  version: number | null;
  clinician: string;
  chart: ChartData;
  svgStats: { bopPercent: number; piPercent: number; pd4Percent: number };
}

interface PairAnalysis {
  key: string;
  before: StudyEntry;
  after: StudyEntry;
  differences: Record<string, ToothPdDifferences>;
  aggregated: Record<string, AggregatedPdDifferences>;
  percentages: HistoryChangePercentages;
  ranked: RankedSiteChange[];
  beforeData: HistoryInstanceData;
  afterData: HistoryInstanceData;
  suggestedMonths: number;
  status: IntervalStatus;
  actualDays: number;
  durationText: string;
}

interface HistoryToggles {
  pdBop: boolean;
  circles: boolean;
  furcations: boolean;
  implants: boolean;
  pi: boolean;
}

const toggleBase =
  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40';
const toggleActive =
  'border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300';
const toggleInactive =
  'border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700';

// ---------------------------------------------------------------------------
// Trend charts (updateResults / createChart / createStackedChart port)
// ---------------------------------------------------------------------------

interface TrendChartProps {
  title: string;
  labels: string[];
  datasets: Array<{ values: number[]; color: string; label?: string }>;
  stacked?: boolean;
}

function TrendChart({ title, labels, datasets, stacked = false }: TrendChartProps) {
  const count = Math.max(1, labels.length);
  const band = Math.max(24, Math.min(56, 640 / count));
  const width = 46 + count * band;
  const height = 200;
  const plotLeft = 34;
  const plotTop = 14;
  const plotBottom = 28;
  const plotHeight = height - plotTop - plotBottom;
  const rotateLabels = labels.length > 6;
  const y = (value: number) => plotTop + (1 - Math.min(100, Math.max(0, value)) / 100) * plotHeight;

  return (
    <div className="min-w-[280px] flex-1">
      <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">{title}</h4>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={title}>
        {[0, 25, 50, 75, 100].map(tick => (
          <g key={tick}>
            <line
              x1={plotLeft}
              x2={width - 8}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text x={plotLeft - 6} y={y(tick) + 3} fontSize={8} fill="#6b7280" textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        {labels.map((label, index) => {
          const x = plotLeft + index * band + band * 0.2;
          const barWidth = band * 0.6;
          let cumulative = 0;

          return (
            <g key={`${label}-${index}`}>
              {datasets.map(dataset => {
                const value = dataset.values[index] ?? 0;
                const bottom = cumulative;
                cumulative += value;
                const top = y(stacked ? cumulative : value);
                const bottomY = y(stacked ? bottom : 0);
                return (
                  <rect
                    key={dataset.label ?? dataset.color}
                    x={x}
                    y={top}
                    width={barWidth}
                    height={Math.max(0, bottomY - top)}
                    fill={dataset.color}
                  >
                    <title>{`${label}: ${value}%`}</title>
                  </rect>
                );
              })}
              <text
                x={plotLeft + index * band + band / 2}
                y={height - plotBottom + 10}
                fontSize={8.5}
                fill="#374151"
                textAnchor={rotateLabels ? 'end' : 'middle'}
                transform={rotateLabels ? `rotate(-35 ${plotLeft + index * band + band / 2} ${height - plotBottom + 10})` : undefined}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {stacked && (
        <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
          {datasets.map(dataset => (
            <span key={dataset.label} className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: dataset.color }} />
              {dataset.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-study map pair (loadAndRenderSvg port)
// ---------------------------------------------------------------------------

interface StudyBlockProps {
  entry: StudyEntry;
  layersBop: OverviewLayerVisibility;
  layersPi: OverviewLayerVisibility;
}

function StudyBlock({ entry, layersBop, layersPi }: StudyBlockProps) {
  const chart = entry.chart;
  const bopRef = useRef<SVGSVGElement | null>(null);
  const piRef = useRef<SVGSVGElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fills = useMemo(() => getOverviewSiteFills(chart, OVERVIEW_SITE_PATHS), [chart]);
  const pdTexts = useMemo(() => buildOverviewPdTexts(chart, OVERVIEW_PD_TEXT_SLOTS), [chart]);
  const furcations = useMemo(
    () => getOverviewFurcationMarkers(chart, FURCATION_OVERVIEW_COORDINATES),
    [chart],
  );
  const implants = useMemo(
    () => getOverviewImplantMarkers(chart, IMPLANT_OVERVIEW_COORDINATES),
    [chart],
  );
  const dateText = formatHistoryDate(entry.date);

  async function handleDownload() {
    const bopSvg = bopRef.current;
    const piSvg = piRef.current;
    if (!bopSvg || !piSvg || downloading) return;

    setDownloading(true);
    try {
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const combined = document.createElementNS(SVG_NS, 'svg');
      combined.setAttribute('xmlns', SVG_NS);
      combined.setAttribute('width', '1000');
      combined.setAttribute('height', '640');
      combined.setAttribute('viewBox', '0 0 1000 640');

      const background = document.createElementNS(SVG_NS, 'rect');
      background.setAttribute('width', '1000');
      background.setAttribute('height', '640');
      background.setAttribute('fill', '#FFFFFF');
      combined.appendChild(background);

      const piGroup = document.createElementNS(SVG_NS, 'g');
      piGroup.innerHTML = piSvg.innerHTML;
      combined.appendChild(piGroup);

      const bopGroup = document.createElementNS(SVG_NS, 'g');
      bopGroup.setAttribute('transform', 'translate(0, 330)');
      bopGroup.innerHTML = bopSvg.innerHTML;
      combined.appendChild(bopGroup);

      await rasterizeSvg(combined, `historial_bop_pi_${entry.date || entry.id}.png`, 2);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {dateText || 'Sin fecha'}
          {entry.version !== null && (
            <span className="ml-2 rounded border border-white/10 bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
              v{entry.version}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          title="Guardar Figura como PNG"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Camera className={`h-3.5 w-3.5 ${downloading ? 'animate-pulse' : ''}`} />
          {downloading ? 'Guardando…' : 'PNG'}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-medium text-red-600 dark:text-red-400">
            Sangrado al sondaje (BOP) — {entry.svgStats.bopPercent}%
          </p>
          <OverviewMap
            kind="bop"
            fills={fills}
            pdTexts={pdTexts}
            furcations={furcations}
            implants={implants}
            dateText={dateText}
            percent={entry.svgStats.bopPercent}
            svgRef={bopRef}
            layerVisibility={layersBop}
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            Índice de placa (PI) — {entry.svgStats.piPercent}%
          </p>
          <OverviewMap
            kind="pi"
            fills={fills}
            pdTexts={pdTexts}
            furcations={furcations}
            implants={implants}
            dateText={dateText}
            percent={entry.svgStats.piPercent}
            svgRef={piRef}
            layerVisibility={layersPi}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interval strip + superimpose panel
// ---------------------------------------------------------------------------

function IntervalStrip({
  pair,
  open,
  onToggle,
}: {
  pair: PairAnalysis;
  open: boolean;
  onToggle: () => void;
}) {
  const statusIcon =
    pair.status.status === 'late' ? (
      <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
    ) : pair.status.status === 'early' ? (
      <Smile className="h-4 w-4 text-emerald-600" aria-hidden="true" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
    );
  const labelClass = pair.status.color === 'red' ? 'text-red-600' : 'text-emerald-600';

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/50">
      <div className="flex items-center gap-3">
        <svg width="26" height="44" viewBox="0 0 26 44" aria-hidden="true">
          <g
            stroke={pair.status.color === 'red' ? '#dc2626' : '#059669'}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1={13} y1={4} x2={13} y2={40} />
            <polyline points="8,9 13,4 18,9" />
            <polyline points="8,35 13,40 18,35" />
          </g>
        </svg>
        {statusIcon}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${labelClass}`}>{pair.status.label}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            (esperado aprox. {pair.status.expectedDays} días, actual {pair.status.actualDays} días)
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 rotate-90" />
          {open ? 'Ocultar cambios' : 'Mostrar cambios'}
        </button>
      </div>
    </div>
  );
}

function SuperimposeMap({
  after,
  aggregated,
}: {
  after: ChartData;
  aggregated: Record<string, AggregatedPdDifferences>;
}) {
  const fills = useMemo(() => {
    const out: Array<{ id: string; fill: string; opacity: number }> = [];
    for (const path of OVERVIEW_SITE_PATHS) {
      const match = path.id.match(/^site_(\d{2})([mdbpl])$/);
      if (!match) continue;
      const tooth = parseInt(match[1], 10);
      const letter = match[2];
      if (!isToothPresent(after, tooth as FDIToothNumber)) {
        out.push({ id: path.id, fill: '#808080', opacity: 0.4 });
        continue;
      }
      const value = aggregated[`tooth_${tooth}`]?.[letter];
      const color = getHeatmapColor(value);
      if (color) out.push({ id: path.id, fill: color, opacity: 1 });
    }
    return out;
  }, [after, aggregated]);

  const fillById = useMemo(() => new Map(fills.map(fill => [fill.id, fill])), [fills]);

  return (
    <div>
      <svg viewBox="0 0 1000 300" className="w-full" role="img" aria-label="Mapa de cambios de PD">
        {OVERVIEW_SITE_PATHS.map(path => {
          const overlay = fillById.get(path.id);
          return (
            <path
              key={path.id}
              d={path.d}
              fill={overlay?.fill ?? '#FFFFFF'}
              fillOpacity={overlay?.opacity ?? 1}
              stroke="#000000"
              strokeWidth={1}
              strokeMiterlimit={10}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
        <span>-10 mm</span>
        <span
          className="inline-block h-2.5 flex-1 rounded-sm"
          style={{ backgroundImage: `linear-gradient(90deg, ${HEATMAP_LEGEND_COLORS.join(', ')})` }}
        />
        <span>5 mm</span>
      </div>
    </div>
  );
}

function ChangeHistogram({ differences }: { differences: Record<string, ToothPdDifferences> }) {
  const { values, counts } = useMemo(() => {
    const list: number[] = [];
    for (const key of Object.keys(differences)) {
      const entry = differences[key];
      if (entry.after !== 1) continue;
      for (const value of Object.values(entry.pdDifferences)) {
        if (value !== undefined) list.push(value);
      }
    }
    const unique = [...new Set(list)].sort((a, b) => a - b);
    const counts = new Map<number, number>();
    unique.forEach(value => counts.set(value, list.filter(item => item === value).length));
    return { values: unique, counts };
  }, [differences]);

  if (values.length === 0) {
    return (
      <p className="py-6 text-center text-[11px] text-gray-400">
        No hay cambios de PD entre ambos estudios
      </p>
    );
  }

  const maxCount = Math.max(...values.map(value => counts.get(value) ?? 0));
  const band = 26;
  const width = 30 + values.length * band;
  const height = 150;
  const plotTop = 10;
  const plotBottom = 22;
  const plotHeight = height - plotTop - plotBottom;

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-gray-600 dark:text-gray-300">
        Frecuencia de cambios
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Histograma de cambios">
        {values.map((value, index) => {
          const count = counts.get(value) ?? 0;
          const barHeight = maxCount === 0 ? 0 : (count / maxCount) * plotHeight;
          return (
            <g key={value}>
              <rect
                x={14 + index * band + band * 0.15}
                y={plotTop + plotHeight - barHeight}
                width={band * 0.7}
                height={barHeight}
                fill={getHeatmapColor(value) ?? '#FFFFFF'}
                stroke="#d1d5db"
              >
                <title>{`${value} mm: ${count}`}</title>
              </rect>
              <text
                x={14 + index * band + band / 2}
                y={height - plotBottom + 12}
                fontSize={8}
                fill="#374151"
                textAnchor="middle"
              >
                {value}
              </text>
            </g>
          );
        })}
        <text x={4} y={plotTop + 4} fontSize={8} fill="#6b7280">
          {maxCount}
        </text>
        <text x={width / 2} y={height - 2} fontSize={8} fill="#6b7280" textAnchor="middle">
          Cambio (mm)
        </text>
      </svg>
    </div>
  );
}

function ChangeStackedBar({ percentages }: { percentages: HistoryChangePercentages }) {
  const total =
    percentages.improvementPercentage +
    percentages.nochangePercentage +
    percentages.worseningPercentage;

  if (total === 0) {
    return (
      <p className="py-2 text-center text-[11px] text-gray-400">
        Sin sitios comparables entre ambos estudios
      </p>
    );
  }

  const segments = [
    { label: 'Mejora', value: percentages.improvementPercentage, color: '#00FF00' },
    { label: 'sin cambio', value: percentages.nochangePercentage, color: '#F7F700' },
    { label: 'Empeoramiento', value: percentages.worseningPercentage, color: '#DF48A1' },
  ];

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-3 text-[10px] text-gray-600 dark:text-gray-300">
        {segments.map(segment => (
          <span key={segment.label} className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: segment.color }} />
            {segment.label}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 320 64" className="w-full" role="img" aria-label="Distribución de cambios">
        {(() => {
          let cursor = 0;
          return segments.map(segment => {
            const width = (segment.value / 100) * 320;
            const rect = (
              <rect key={segment.label} x={cursor} y={4} width={width} height={16} fill={segment.color} />
            );
            cursor += width;
            return rect;
          });
        })()}
        {(() => {
          let cursor = 0;
          return segments.map(segment => {
            const width = (segment.value / 100) * 320;
            const center = cursor + width / 2;
            cursor += width;
            if (width < 22) return null;
            return (
              <text
                key={`label-${segment.label}`}
                x={center}
                y={16}
                fontSize={9}
                fill="#111111"
                textAnchor="middle"
              >
                {segment.value}%
              </text>
            );
          });
        })()}
        {[0, 50, 100].map(tick => (
          <text key={tick} x={(tick / 100) * 320} y={40} fontSize={8} fill="#6b7280" textAnchor="middle">
            {tick}%
          </text>
        ))}
        <text x={160} y={56} fontSize={8} fill="#6b7280" textAnchor="middle">
          Porcentaje
        </text>
      </svg>
    </div>
  );
}

function ComparisonTable({
  pair,
  view,
  onToggleView,
}: {
  pair: PairAnalysis;
  view: 'summary' | 'top';
  onToggleView: () => void;
}) {
  const { before, after, beforeData, afterData } = pair;
  const dateBefore = formatHistoryDate(before.date) || 'NA';
  const dateAfter = formatHistoryDate(after.date) || 'NA';

  const cellClass = 'border-b border-gray-200 px-2 py-1 text-center text-xs dark:border-gray-600';
  const headClass = 'border-b border-gray-200 bg-[#DEEAF6] px-2 py-1 text-center text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-gray-100';

  if (view === 'top') {
    return (
      <div>
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[20%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[21%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="border-b border-gray-200 bg-white px-2 py-1 text-left dark:bg-gray-800">
                <button
                  type="button"
                  onClick={onToggleView}
                  className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Tabla 1/2
                </button>
              </th>
              <th className={headClass}>Sitio</th>
              <th className={headClass}>{dateBefore}</th>
              <th className={headClass}>{dateAfter}</th>
              <th className={headClass}>Cambio</th>
            </tr>
          </thead>
          <tbody>
            {pair.ranked.map(row => {
              const highlight = row.change > 1 ? ' bg-[#FFDDDD]' : '';
              return (
                <tr key={`${row.rank}-${row.site}`}>
                  <td className={`${cellClass} bg-[#F6F6F6] text-center dark:bg-slate-800`}>{row.rank}</td>
                  <td className={`${cellClass}${highlight} text-center font-medium`}>{row.site}</td>
                  <td className={`${cellClass}${highlight}`}>{row.before}</td>
                  <td className={`${cellClass}${highlight}`}>{row.after}</td>
                  <td className={`${cellClass}${highlight} font-semibold`}>+{row.change} mm</td>
                </tr>
              );
            })}
            {pair.ranked.length === 0 && (
              <tr>
                <td colSpan={5} className={`${cellClass} py-4 text-center text-gray-400`}>
                  Ningún sitio empeoró entre ambos estudios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const rows: Array<[string, string | number, string | number, string]> = [
    ['Fecha', dateBefore, dateAfter, pair.durationText],
    ['Dientes', beforeData.teeth, afterData.teeth, formatSignedChange(beforeData.teeth, afterData.teeth)],
    ['4 mm', beforeData.pockets4mm, afterData.pockets4mm, formatSignedChange(beforeData.pockets4mm, afterData.pockets4mm)],
    ['cerrado', beforeData.closedPockets, afterData.closedPockets, formatSignedChange(beforeData.closedPockets, afterData.closedPockets)],
    ['5 mm', beforeData.pockets5mm, afterData.pockets5mm, formatSignedChange(beforeData.pockets5mm, afterData.pockets5mm)],
    ['desde 6 mm', beforeData.pockets6mm, afterData.pockets6mm, formatSignedChange(beforeData.pockets6mm, afterData.pockets6mm)],
    ['Furcación Grado 1', beforeData.furcation1, afterData.furcation1, formatSignedChange(beforeData.furcation1, afterData.furcation1)],
    ['Furcación Grado 2', beforeData.furcation2, afterData.furcation2, formatSignedChange(beforeData.furcation2, afterData.furcation2)],
    ['Furcación Grado 3', beforeData.furcation3, afterData.furcation3, formatSignedChange(beforeData.furcation3, afterData.furcation3)],
    ['Implantes', beforeData.implants, afterData.implants, formatSignedChange(beforeData.implants, afterData.implants)],
  ];

  return (
    <div className="space-y-3">
      <table className="w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col className="w-[25%]" />
          <col className="w-[25%]" />
          <col className="w-[25%]" />
          <col className="w-[25%]" />
        </colgroup>
        <thead>
          <tr>
            <th className="border-b border-gray-200 bg-white px-2 py-1 text-left dark:bg-gray-800">
              <button
                type="button"
                onClick={onToggleView}
                className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Tabla 2/2
              </button>
            </th>
            <th className={headClass}>Antes</th>
            <th className={headClass}>Después</th>
            <th className={headClass}>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, beforeValue, afterValue, diff]) => (
            <tr key={label}>
              <td className={`${cellClass} bg-[#F6F6F6] font-medium text-gray-700 dark:bg-slate-800 dark:text-gray-200`}>
                {label}
              </td>
              <td className={cellClass}>{beforeValue}</td>
              <td className={cellClass}>{afterValue}</td>
              <td className={cellClass}>{diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ChangeStackedBar percentages={pair.percentages} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

export function HistoriaTab({ patient, studies, loading = false }: HistoriaTabProps) {
  const [detailsById, setDetailsById] = useState<Record<string, any>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [toggles, setToggles] = useState<HistoryToggles>({
    pdBop: true,
    circles: false,
    furcations: true,
    implants: true,
    pi: false,
  });
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [tableViews, setTableViews] = useState<Record<string, 'summary' | 'top'>>({});

  const studyIdsKey = useMemo(
    () =>
      studies
        .filter(study => !patient?.paciente_id || study.paciente_id === patient.paciente_id)
        .map(study => study.id)
        .filter(Boolean)
        .join(','),
    [studies, patient],
  );

  useEffect(() => {
    const ids = studyIdsKey ? studyIdsKey.split(',') : [];
    if (ids.length === 0) return;

    let cancelled = false;
    const load = async () => {
      setDetailsLoading(true);
      const results = await Promise.allSettled(
        ids.map(id =>
          fetch(`/api/estudios-periodontales/${id}`).then(response => {
            if (!response.ok) throw new Error('Failed to fetch study detail');
            return response.json();
          }),
        ),
      );
      if (cancelled) return;
      const map: Record<string, any> = {};
      results.forEach(result => {
        if (result.status !== 'fulfilled') return;
        const detail = result.value?.data ?? result.value;
        if (detail?.id) map[detail.id] = detail;
      });
      setDetailsById(map);
      setDetailsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [studyIdsKey]);

  const entries = useMemo<StudyEntry[]>(() => {
    return studies
      .filter(study => !patient?.paciente_id || study.paciente_id === patient.paciente_id)
      .map(study => detailsById[study.id])
      .filter(Boolean)
      .map(detail => {
        const chart = buildChartDataFromStudy(detail);
        return {
          id: detail.id,
          date: detail.fecha_estudio || '',
          version: detail.version ?? null,
          clinician: detail.atendido_por || '',
          chart,
          svgStats: analyzeHistorySvgData(chart),
        };
      })
      .sort((a, b) => (parseHistoryDate(a.date)?.getTime() ?? 0) - (parseHistoryDate(b.date)?.getTime() ?? 0));
  }, [studies, detailsById, patient]);

  const analyses = useMemo(() => entries.map(entry => analyzeHistoryJsonData(entry.chart)), [entries]);

  const labels = useMemo(
    () => entries.map((entry, index) => formatHistoryMonthYear(entry.date) || `#${index + 1}`),
    [entries],
  );

  const pairs = useMemo<PairAnalysis[]>(() => {
    const out: PairAnalysis[] = [];
    for (let i = 0; i < entries.length - 1; i++) {
      const before = entries[i];
      const after = entries[i + 1];

      const differences = calculatePdDifferences(before.chart, after.chart);
      const aggregated = aggregatePdDifferences(differences);
      const percentages = calculateChangePercentages(differences);
      const ranked = summarizeTopWorseningSites(before.chart, after.chart);
      const beforeData = extractHistoryInstanceData(before.chart);
      const afterData = extractHistoryInstanceData(after.chart);

      const beforeAnalysis = analyzeHistoryJsonData(before.chart);
      const suggestedMonths = suggestMaintenanceInterval({
        pd4: beforeAnalysis.pd4Percent,
        pd5: beforeAnalysis.pd5Percent,
        pd6: beforeAnalysis.pd6PlusPercent,
      });

      const older = parseHistoryDate(before.date);
      const newer = parseHistoryDate(after.date);
      const durationDays =
        older && newer ? Math.ceil(Math.abs(newer.getTime() - older.getTime()) / 86400000) : 0;
      // Without usable dates the strip stays neutral instead of flagging a
      // false "early" recall.
      const actualDays =
        older && newer ? Math.round((newer.getTime() - older.getTime()) / 86400000) : suggestedMonths * 30;
      const status = computeIntervalStatus(suggestedMonths, actualDays);

      out.push({
        key: `${before.id}_${after.id}`,
        before,
        after,
        differences,
        aggregated,
        percentages,
        ranked,
        beforeData,
        afterData,
        suggestedMonths,
        status,
        actualDays,
        durationText: formatIntervalDuration(durationDays),
      });
    }
    return out;
  }, [entries]);

  const latest = entries[entries.length - 1];
  const latestAnalysis = latest ? analyzeHistoryJsonData(latest.chart) : null;
  const suggestedMonths = latestAnalysis
    ? suggestMaintenanceInterval({
        pd4: latestAnalysis.pd4Percent,
        pd5: latestAnalysis.pd5Percent,
        pd6: latestAnalysis.pd6PlusPercent,
      })
    : null;

  const nameParts = (patient?.nombre_completo || '').trim().split(/\s+/);
  const nombre = nameParts.slice(0, 1).join(' ') || latest?.chart.patient_first_name || '';
  const apellidos = nameParts.slice(1).join(' ') || latest?.chart.patient_last_name || '';

  if (!patient) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-xl">
        <p className="text-sm font-medium text-slate-200">Seleccione un paciente</p>
        <p className="mt-1 text-xs text-slate-500">
          El historial compara los estudios periodontales guardados del paciente seleccionado.
        </p>
      </div>
    );
  }

  if (loading || detailsLoading) {
    return (
      <div className="space-y-2.5" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`historia-skeleton-${index}`}
            className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04] motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-xl">
        <p className="text-sm font-medium text-slate-200">No hay estudios guardados para este paciente</p>
        <p className="mt-1 text-xs text-slate-500">
          Guarde estudios periodontales desde la pestaña «Nuevo Estudio» para ver la evolución aquí.
        </p>
      </div>
    );
  }

  const blocks = [...entries].reverse();
  const layersBop: OverviewLayerVisibility = {
    pdText: toggles.pdBop,
    circles: toggles.pdBop && toggles.circles,
    furcations: toggles.furcations,
    implants: toggles.implants,
  };
  const layersPi: OverviewLayerVisibility = {
    pdText: toggles.pi,
    circles: toggles.pi && toggles.circles,
    furcations: toggles.pi,
    implants: toggles.pi,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">HISTORIAL</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Evolución longitudinal de los estudios periodontales
            </p>
          </div>
          {suggestedMonths !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 dark:border-gray-600">
              <span className="text-2xl font-bold text-teal-600 dark:text-teal-300">
                {suggestedMonths}
              </span>
              <span className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                meses
                <br />
                sugeridos
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'ID del paciente', value: patient.paciente_id || latest?.chart.patient_number || '–' },
            { label: 'Fecha', value: formatHistoryDate(latest.date) || '–' },
            { label: 'Apellidos del paciente', value: apellidos || '–' },
            { label: 'Nombre', value: nombre || '–' },
            { label: 'Fecha de nacimiento', value: formatHistoryDate(patient.fecha_nacimiento) || '–' },
            { label: 'Clínico', value: latest.clinician || '–' },
          ].map(field => (
            <div key={field.label}>
              <label className="mb-1 block text-[11px] font-medium text-gray-400">
                {field.label}
              </label>
              <div className="flex h-8 items-center overflow-hidden rounded border border-gray-300 bg-gray-50 px-2.5 dark:border-gray-600 dark:bg-gray-700">
                <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                  {field.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'pdBop', label: 'PD/BOP' },
            { key: 'circles', label: 'PD ≥ 6mm' },
            { key: 'furcations', label: 'Furcaciones' },
            { key: 'implants', label: 'Implantes' },
            { key: 'pi', label: 'PI +' },
          ] as const
        ).map(toggle => (
          <button
            key={toggle.key}
            type="button"
            onClick={() => setToggles(prev => ({ ...prev, [toggle.key]: !prev[toggle.key] }))}
            aria-pressed={toggles[toggle.key]}
            className={`${toggleBase} ${toggles[toggle.key] ? toggleActive : toggleInactive}`}
          >
            {toggle.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Desarrollo de los índices por estudio
        </h3>
        <div className="flex gap-5 overflow-x-auto pb-2">
          <TrendChart
            title="Inflamación (%)"
            labels={labels}
            datasets={[{ values: analyses.map(a => a.bopPercent), color: '#FF0000' }]}
          />
          <TrendChart
            title="Profundidades de Sondaje (%)"
            labels={labels}
            stacked
            datasets={[
              { values: analyses.map(a => a.pd4Percent), color: '#D3D3D3', label: '% 4mm' },
              { values: analyses.map(a => a.pd5Percent), color: '#A9A9A9', label: '% 5mm' },
              { values: analyses.map(a => a.pd6PlusPercent), color: '#FF0000', label: '% ≥ 6mm' },
            ]}
          />
          <TrendChart
            title="Higiene Bucal (%)"
            labels={labels}
            datasets={[{ values: analyses.map(a => a.piPercent), color: '#0000FF' }]}
          />
        </div>
      </div>

      <div className="space-y-4">
        {blocks.map((entry, blockIndex) => {
          const pair = blockIndex < blocks.length - 1 ? pairs[blocks.length - 2 - blockIndex] : null;
          const panelOpen = pair ? Boolean(openPanels[pair.key]) : false;
          const view = pair ? (tableViews[pair.key] ?? 'summary') : 'summary';

          return (
            <div key={entry.id} className="space-y-3">
              <StudyBlock entry={entry} layersBop={layersBop} layersPi={layersPi} />
              {pair && (
                <>
                  <IntervalStrip
                    pair={pair}
                    open={panelOpen}
                    onToggle={() =>
                      setOpenPanels(prev => ({ ...prev, [pair.key]: !prev[pair.key] }))
                    }
                  />
                  {panelOpen && (
                    <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-2">
                      <div className="space-y-4">
                        <SuperimposeMap after={pair.after.chart} aggregated={pair.aggregated} />
                        <ChangeHistogram differences={pair.differences} />
                      </div>
                      <ComparisonTable
                        pair={pair}
                        view={view}
                        onToggleView={() =>
                          setTableViews(prev => ({
                            ...prev,
                            [pair.key]: prev[pair.key] === 'top' ? 'summary' : 'top',
                          }))
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
        Los mapas muestran PD &gt; 3 mm en rojo sobre los dientes presentes; el círculo amarillo
        marca PD ≥ 6 mm; los sitios grises son dientes ausentes. El mapa de superposición colorea
        el cambio de profundidad entre ambos estudios (verde = mejora, amarillo = sin cambio,
        rosa/magenta = empeoramiento). El intervalo sugerido se calcula a partir de los
        porcentajes de bolsas del estudio más reciente.
      </p>
    </div>
  );
}
