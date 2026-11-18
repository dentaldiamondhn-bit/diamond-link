'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { Patient } from '@/types/patient';
import { useChartStore } from '@/lib/store/useChartStore';
import {
  analyzeIntervalData,
  calculateIntervalCumulative,
  calculateRecommendedInterval,
  calculateSuggestedInterval,
  findLadderHighlightRow,
  INTERVAL_LADDER_TABLE,
  INTERVAL_MONTH_BOXES,
  type IntervalData,
} from '@/lib/utils/periodontalInterval';
import { detectDiabetes, getSmokingStatus } from '@/lib/utils/periodontalProfile';
import { rasterizeSvg } from './rasterizeSvg';

interface IntervalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

/* Colores del gráfico del sitio de referencia (Chart.js) */
const COLORS = {
  pi: '#7D97E3',
  pd4: '#CCCCCC',
  pd5: '#656565',
  pd6: '#FD0000',
  bop: '#FDA5A5',
  background: '#E7F3FD',
  grid: '#e0e0e0',
  text: '#111827',
  threshold: '#111827',
};

const CHART_W = 680;
const ROW_H = 46;
const ROW_GAP = 26;
const CHART_PAD_T = 14;
const CHART_PAD_B = 34;
const CHART_H = CHART_PAD_T + 3 * ROW_H + 2 * ROW_GAP + CHART_PAD_B;
const PLOT_PAD = 20;

function formatPercent(value: number): string {
  return value.toFixed(1);
}

/* ------------------------------------------------------------------ */
/* Gráfico de barras apiladas horizontales (SVG puro, colores del sitio) */
/* ------------------------------------------------------------------ */

interface BarRowSpec {
  label: string;
  value: number;
  segments: Array<{ value: number; color: string }>;
  threshold?: number;
}

function IntervalChartSvg({
  analysis,
  bopTarget,
  innerRef,
}: {
  analysis: ReturnType<typeof analyzeIntervalData>;
  bopTarget: number;
  innerRef?: React.Ref<SVGSVGElement>;
}) {
  const rows: BarRowSpec[] = [
    {
      label: 'Higiene Bucal (Placa)',
      value: analysis.piPercentage,
      segments: [{ value: analysis.piPercentage, color: COLORS.pi }],
      threshold: 20,
    },
    {
      label: 'Bolsas ≥ 4mm',
      value:
        analysis.pdSum4Percentage + analysis.pdSum5Percentage + analysis.pdSum6PlusPercentage,
      segments: [
        { value: analysis.pdSum4Percentage, color: COLORS.pd4 },
        { value: analysis.pdSum5Percentage, color: COLORS.pd5 },
        { value: analysis.pdSum6PlusPercentage, color: COLORS.pd6 },
      ],
    },
    {
      label: 'Sangrado al Sondaje (BOP)',
      value: analysis.bopPercentage,
      segments: [{ value: analysis.bopPercentage, color: COLORS.bop }],
      threshold: bopTarget,
    },
  ];

  const plotW = CHART_W - 2 * PLOT_PAD;
  const x = (pct: number) => PLOT_PAD + (pct / 100) * plotW;

  return (
    <svg
      ref={innerRef}
      width={CHART_W}
      height={CHART_H}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      role="img"
      aria-label="PI, bolsas y BOP del estudio"
    >
      {rows.map((row, index) => {
        const yTop = CHART_PAD_T + index * (ROW_H + ROW_GAP);
        const barTop = yTop + (ROW_H - 40) / 2;
        let cursor = 0;
        return (
          <g key={row.label}>
            <rect
              x={x(0)}
              y={barTop}
              width={plotW}
              height={40}
              fill={COLORS.background}
            />
            {row.segments.map((segment, segmentIndex) => {
              const segmentX = x(cursor);
              const segmentW = (segment.value / 100) * plotW;
              cursor += segment.value;
              if (segmentW <= 0) return null;
              return (
                <rect
                  key={segmentIndex}
                  x={segmentX}
                  y={barTop}
                  width={segmentW}
                  height={40}
                  fill={segment.color}
                />
              );
            })}
            {row.threshold !== undefined && (
              <line
                x1={x(row.threshold)}
                x2={x(row.threshold)}
                y1={barTop - 3}
                y2={barTop + 43}
                stroke={COLORS.threshold}
                strokeWidth={4}
              />
            )}
            <text
              x={CHART_W - PLOT_PAD - 8}
              y={yTop + ROW_H / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight="bold"
              fontFamily="'Arial Narrow', Arial, sans-serif"
              fill={COLORS.text}
            >
              {row.label}
            </text>
            <text
              x={x(0) + 14}
              y={yTop + ROW_H / 2}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={14}
              fontWeight="bold"
              fontFamily="'Arial Narrow', Arial, sans-serif"
              fill={COLORS.text}
            >
              {Math.round(row.value)}%
            </text>
          </g>
        );
      })}
      {[0, 25, 50, 75, 100].map(tick => (
        <g key={tick}>
          <line
            x1={x(tick)}
            x2={x(tick)}
            y1={CHART_PAD_T}
            y2={CHART_H - CHART_PAD_B + 6}
            stroke={COLORS.grid}
            strokeWidth={1}
          />
          <text
            x={x(tick)}
            y={CHART_H - 10}
            textAnchor="middle"
            fontSize={11}
            fontFamily="'Arial Narrow', Arial, sans-serif"
            fill={COLORS.text}
          >
            {tick}%
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Flecha sugerido → recomendado con etiqueta de factores              */
/* ------------------------------------------------------------------ */

function RiskArrow({
  suggested,
  recommended,
  factors,
}: {
  suggested: number;
  recommended: number;
  factors: string[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [geometry, setGeometry] = useState<{
    width: number;
    fromX: number;
    toX: number;
  } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0) return;
    const fromBox = container.querySelector<HTMLElement>(`[data-month="${suggested}"]`);
    const toBox = container.querySelector<HTMLElement>(`[data-month="${recommended}"]`);
    if (!fromBox || !toBox) return;
    const fromRect = fromBox.getBoundingClientRect();
    const toRect = toBox.getBoundingClientRect();
    setGeometry({
      width: containerRect.width,
      fromX: fromRect.left + fromRect.width / 2 - containerRect.left,
      toX: toRect.left + toRect.width / 2 - containerRect.left,
    });
  }, [suggested, recommended, factors.length]);

  if (factors.length === 0 || suggested === recommended) return null;
  if (!geometry) return null;

  const { width, fromX, toX } = geometry;
  const centerX = (fromX + toX) / 2;
  const arrowLength = Math.abs(fromX - toX) - 30;
  if (arrowLength <= 0) return null;
  const halfLen = arrowLength / 2;
  const headLen = 8;
  const direction = toX < fromX ? -1 : 1;
  const tipX = centerX + direction * halfLen;
  const tailX = centerX - direction * halfLen;
  const baseX = tipX - direction * headLen;

  return (
    <svg
      width={width}
      height={34}
      viewBox={`0 0 ${width} 34`}
      className="pointer-events-none absolute inset-x-0 top-0"
    >
      <line x1={tailX} y1={10} x2={baseX} y2={10} stroke="#f8fafc" strokeWidth={3} />
      <polygon points={`${tipX},10 ${baseX},6 ${baseX},14`} fill="#f8fafc" />
      <text
        x={centerX}
        y={30}
        textAnchor="middle"
        fontSize={12}
        fontWeight={800}
        fontFamily="'Arial Narrow', Arial, sans-serif"
        fill="#f8fafc"
      >
        {factors.join('+')}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Exportación interval.png (SVG compuesto, mismo artefacto que el sitio) */
/* ------------------------------------------------------------------ */

function buildIntervalExportSvg(
  analysis: ReturnType<typeof analyzeIntervalData>,
  cumulative: ReturnType<typeof calculateIntervalCumulative>,
  suggested: number,
  recommended: number,
  factors: string[],
  selected: number | null,
  smoking: boolean,
  dateStamp: string,
  chartMarkup: string,
): SVGSVGElement {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '800');
  svg.setAttribute('height', '880');
  svg.setAttribute('viewBox', '0 0 800 880');

  const addText = (x: number, y: number, text: string, opts: Partial<{ size: number; bold: boolean; fill: string; anchor: 'start' | 'middle' | 'end' }> = {}) => {
    const el = document.createElementNS(SVG_NS, 'text');
    el.setAttribute('x', String(x));
    el.setAttribute('y', String(y));
    el.setAttribute('font-size', String(opts.size ?? 13));
    if (opts.bold) el.setAttribute('font-weight', 'bold');
    el.setAttribute('font-family', 'Arial, sans-serif');
    el.setAttribute('fill', opts.fill ?? '#111827');
    if (opts.anchor) el.setAttribute('text-anchor', opts.anchor);
    el.textContent = text;
    svg.appendChild(el);
    return el;
  };

  addText(40, 40, 'Intervalo de Mantenimiento', { size: 20, bold: true });
  addText(40, 62, dateStamp, { size: 12, fill: '#475569' });

  const chartGroup = document.createElementNS(SVG_NS, 'g');
  chartGroup.setAttribute('transform', 'translate(60, 84)');
  chartGroup.innerHTML = chartMarkup;
  svg.appendChild(chartGroup);

  let y = 84 + CHART_H + 34;

  addText(40, y, 'Evaluación', { size: 15, bold: true });
  y += 24;
  addText(40, y, 'Bolsas    Número    (%)    Acumulativo (%)', { bold: true, fill: '#475569' });
  y += 20;
  const evalRows: Array<[string, number, number, number]> = [
    ['≥4 mm', analysis.pdSum4, analysis.pdSum4Percentage, cumulative.cumulative4],
    ['≥5 mm', analysis.pdSum5, analysis.pdSum5Percentage, cumulative.cumulative5],
    ['≥6 mm', analysis.pdSum6Plus, analysis.pdSum6PlusPercentage, cumulative.cumulative6],
  ];
  evalRows.forEach(([label, count, pct, cum]) => {
    addText(40, y, label);
    addText(150, y, String(count), { anchor: 'end' });
    addText(230, y, formatPercent(pct), { anchor: 'end' });
    addText(330, y, formatPercent(cum), { anchor: 'end' });
    y += 20;
  });

  y += 16;
  addText(40, y, 'Umbrales de mantenimiento (meses)', { size: 15, bold: true });
  y += 12;

  const colX = [40, 150, 270, 390];
  const colW = [110, 120, 120, 120];
  const headerRow = y;
  const rowH = 26;
  y += rowH * (INTERVAL_LADDER_TABLE.length + 1);

  const highlightByColumn = [
    findLadderHighlightRow(cumulative.cumulative4, 't4'),
    findLadderHighlightRow(cumulative.cumulative5, 't5'),
    findLadderHighlightRow(cumulative.cumulative6, 't6'),
  ];

  // Encabezado
  const headerLabels = ['Meses', '≥4mm', '≥5mm', '≥6mm'];
  headerLabels.forEach((label, index) => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(colX[index]));
    rect.setAttribute('y', String(headerRow));
    rect.setAttribute('width', String(colW[index]));
    rect.setAttribute('height', String(rowH));
    rect.setAttribute('fill', '#E2E8F0');
    rect.setAttribute('stroke', '#CBD5E1');
    svg.appendChild(rect);
    addText(colX[index] + colW[index] / 2, headerRow + 17, label, {
      bold: true,
      anchor: 'middle',
      size: 12,
    });
  });

  INTERVAL_LADDER_TABLE.forEach((row, rowIndex) => {
    const rowY = headerRow + (rowIndex + 1) * rowH;
    const cells: Array<[number, string, boolean, string | null]> = [
      [0, `${row.months}`, row.months === suggested, row.months === suggested ? '#FEF3C7' : null],
      [1, `${row.t4}%`, false, null],
      [2, `${row.t5}%`, false, null],
      [3, `${row.t6}%`, false, null],
    ];
    cells.forEach(([colIndex, label, isSuggestedCell, explicitFill]) => {
      let fill = '#FFFFFF';
      let stroke = '#CBD5E1';
      let textFill = '#111827';
      if (explicitFill) fill = explicitFill;
      if (highlightByColumn[colIndex - 1] === null && colIndex > 0) {
        fill = '#FEE2E2';
        stroke = '#FCA5A5';
      } else if (highlightByColumn[colIndex - 1] === row.months && colIndex > 0) {
        fill = '#D1FAE5';
        stroke = '#6EE7B7';
        textFill = '#065F46';
      }
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(colX[colIndex]));
      rect.setAttribute('y', String(rowY));
      rect.setAttribute('width', String(colW[colIndex]));
      rect.setAttribute('height', String(rowH));
      rect.setAttribute('fill', fill);
      rect.setAttribute('stroke', stroke);
      svg.appendChild(rect);
      addText(colX[colIndex] + colW[colIndex] / 2, rowY + 17, label, {
        anchor: 'middle',
        size: 12,
        bold: isSuggestedCell,
        fill: isSuggestedCell ? '#92400E' : textFill,
      });
    });
  });

  y += 34;
  const riskLabels = factors.join('+');
  addText(40, y, `Sugerido: ${suggested} meses`, { size: 15, bold: true });
  if (riskLabels) {
    addText(220, y, `Recomendado: ${recommended} meses (${riskLabels})`, { size: 15, bold: true });
  }
  y += 24;
  addText(40, y, `Seleccionado: ${selected !== null ? `${selected} meses` : '—'}`, { size: 13 });
  y += 22;
  const riskFactors: string[] = [];
  if (smoking) riskFactors.push('Tabaquismo (S)');
  addText(40, y, riskFactors.length ? `Factores de riesgo: ${riskFactors.join(', ')}` : 'Sin factores de riesgo', {
    size: 12,
    fill: '#475569',
  });

  return svg;
}

/* ------------------------------------------------------------------ */
/* Modal principal                                                      */
/* ------------------------------------------------------------------ */

const LADDER_COLUMNS: Array<{
  key: 't4' | 't5' | 't6';
  label: string;
  metric: 'cumulative4' | 'cumulative5' | 'cumulative6';
}> = [
  { key: 't4', label: '≥4mm', metric: 'cumulative4' },
  { key: 't5', label: '≥5mm', metric: 'cumulative5' },
  { key: 't6', label: '≥6mm', metric: 'cumulative6' },
];

export function IntervalModal({ open, onOpenChange, patient = null }: IntervalModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);

  const saved = useMemo(
    () => ((chartData?.interval_data ?? {}) as IntervalData),
    [chartData],
  );

  const analysis = useMemo(() => analyzeIntervalData(chartData ?? {}), [chartData]);
  const cumulative = useMemo(() => calculateIntervalCumulative(analysis), [analysis]);
  const suggested = useMemo(
    () =>
      calculateSuggestedInterval(
        cumulative.cumulative4,
        cumulative.cumulative5,
        cumulative.cumulative6,
      ),
    [cumulative],
  );

  const [smoking, setSmoking] = useState(saved.smoking ?? false);
  const [diabetes, setDiabetes] = useState(saved.diabetes ?? false);
  const [selected, setSelected] = useState<number | null>(saved.recommended ?? null);
  const [downloading, setDownloading] = useState(false);

  const recommended = useMemo(
    () =>
      calculateRecommendedInterval({
        suggested,
        smoking,
        diabetes,
        furcationAdvanced: analysis.furcationAdvanced,
        bopPercentage: analysis.bopPercentage,
      }),
    [suggested, smoking, diabetes, analysis],
  );

  // Estado inicial al abrir: datos guardados del estudio; sin ellos, el
  // expediente del paciente (tabaquismo/diabetes) y el valor recomendado.
  useEffect(() => {
    if (!open) return;
    setSmoking(saved.smoking ?? (patient ? getSmokingStatus(patient) === 'raucher' : false));
    setDiabetes(saved.diabetes ?? (patient ? detectDiabetes(patient) : false));
    setSelected(saved.recommended ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function persist(next: Partial<IntervalData> & { smoking?: boolean; diabetes?: boolean }) {
    const nextData: IntervalData = {
      recommended: next.recommended ?? selected ?? recommended.recommended,
      suggested,
      smoking: next.smoking ?? smoking,
      diabetes: next.diabetes ?? diabetes,
    };
    updateField('interval_data', nextData);
  }

  const chartRef = useRef<SVGSVGElement | null>(null);

  async function handleDownload() {
    if (!chartRef.current || downloading) return;
    setDownloading(true);
    try {
      const dateStamp = `Fecha: ${new Date().toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      const combined = buildIntervalExportSvg(
        analysis,
        cumulative,
        suggested,
        recommended.recommended,
        recommended.factors,
        selected,
        smoking,
        dateStamp,
        chartRef.current.innerHTML,
      );
      await rasterizeSvg(combined, 'interval.png');
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  const bopTarget = smoking ? 16 : 23;
  const highlightRows: Record<string, number | null> = {
    t4: findLadderHighlightRow(cumulative.cumulative4, 't4'),
    t5: findLadderHighlightRow(cumulative.cumulative5, 't5'),
    t6: findLadderHighlightRow(cumulative.cumulative6, 't6'),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Intervalo de mantenimiento"
    >
      <div
        className="flex h-[min(860px,94vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <div>
            <h2 className="text-sm font-semibold text-white">Intervalo de Mantenimiento</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Evaluación y recomendación según el estado periodontal actual
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

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Evaluación + gráfico */}
            <section className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Evaluación
                </h3>
                <table className="mt-2 w-full text-xs text-slate-200">
                  <thead>
                    <tr className="text-[11px] text-slate-400">
                      <th className="py-1 text-left font-medium">Bolsas</th>
                      <th className="py-1 text-right font-medium">Número</th>
                      <th className="py-1 text-right font-medium">(%)</th>
                      <th className="py-1 text-right font-medium">Acumulativo (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['≥4 mm', analysis.pdSum4, analysis.pdSum4Percentage, cumulative.cumulative4],
                      ['≥5 mm', analysis.pdSum5, analysis.pdSum5Percentage, cumulative.cumulative5],
                      [
                        '≥6 mm',
                        analysis.pdSum6Plus,
                        analysis.pdSum6PlusPercentage,
                        cumulative.cumulative6,
                      ],
                    ].map(([label, count, pct, cum]) => (
                      <tr key={label as string} className="border-t border-white/5">
                        <td className="py-1.5">{label}</td>
                        <td className="py-1.5 text-right">{count}</td>
                        <td className="py-1.5 text-right">{formatPercent(pct as number)}</td>
                        <td className="py-1.5 text-right">{formatPercent(cum as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#F8FAFC] p-2">
                <IntervalChartSvg
                  analysis={analysis}
                  bopTarget={bopTarget}
                  innerRef={chartRef}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Línea negra: objetivo de Higiene Bucal 20% y objetivo de BOP {bopTarget}%
                ({smoking ? 'fumador' : 'no fumador'}).
              </p>
            </section>

            {/* Umbrales + personalización */}
            <section className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Umbrales de mantenimiento
                </h3>
                <table className="mt-2 w-full text-xs text-slate-200">
                  <thead>
                    <tr className="text-[11px] text-slate-400">
                      <th className="py-1 text-left font-medium">Meses</th>
                      {LADDER_COLUMNS.map(column => (
                        <th key={column.key} className="py-1 text-center font-medium">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {INTERVAL_LADDER_TABLE.map(row => (
                      <tr key={row.months} className="border-t border-white/5">
                        <td
                          className={`py-1.5 text-left ${
                            row.months === suggested
                              ? 'rounded-md bg-amber-400/20 px-1 font-semibold text-amber-200'
                              : ''
                          }`}
                        >
                          {row.months}
                        </td>
                        {LADDER_COLUMNS.map(column => {
                          const highlight = highlightRows[column.key];
                          const isCritical = highlight === null;
                          const isMatch = highlight === row.months;
                          return (
                            <td
                              key={column.key}
                              className={`py-1.5 text-center ${
                                isCritical
                                  ? 'bg-rose-500/15 text-rose-200'
                                  : isMatch
                                    ? 'rounded-md bg-emerald-500/20 font-semibold text-emerald-200'
                                    : ''
                              }`}
                            >
                              {row[column.key]}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Intervalo de Mantenimiento Personalizado
                </h3>
                <div className="relative mt-8">
                  <RiskArrow
                    suggested={suggested}
                    recommended={recommended.recommended}
                    factors={recommended.factors}
                  />
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {INTERVAL_MONTH_BOXES.map(months => {
                      const isSuggested = months === suggested;
                      const isRecommended = months === recommended.recommended;
                      const isSelected = months === selected;
                      return (
                        <button
                          key={months}
                          type="button"
                          data-month={months}
                          onClick={() => {
                            setSelected(months);
                            persist({ recommended: months });
                          }}
                          className={`w-16 rounded-xl border px-1 py-2 text-center transition-all ${
                            isSelected
                              ? 'border-teal-300 bg-teal-500/25 text-teal-100 shadow-[0_0_10px_rgba(45,212,191,0.25)]'
                              : isRecommended
                                ? 'border-2 border-white bg-white/[0.08] text-white'
                                : isSuggested
                                  ? 'border-white/40 bg-white/15 text-white'
                                  : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]'
                          }`}
                        >
                          <span className="block text-base font-bold leading-tight">{months}</span>
                          <span className="block text-[9px] uppercase tracking-wide opacity-70">
                            meses
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <span>
                    Sugerido:{' '}
                    <strong className="text-white">{suggested} meses</strong>
                  </span>
                  {recommended.factors.length > 0 && (
                    <span>
                      Recomendado:{' '}
                      <strong className="text-white">
                        {recommended.recommended} meses ({recommended.factors.join('+')})
                      </strong>
                    </span>
                  )}
                  <span>
                    Seleccionado:{' '}
                    <strong className="text-teal-300">
                      {selected !== null ? `${selected} meses` : '—'}
                    </strong>
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-200">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={smoking}
                      onChange={event => {
                        const next = event.target.checked;
                        setSmoking(next);
                        persist({ smoking: next });
                      }}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 accent-teal-400"
                    />
                    Tabaquismo (S)
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={diabetes}
                      onChange={event => {
                        const next = event.target.checked;
                        setDiabetes(next);
                        persist({ diabetes: next });
                      }}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 accent-teal-400"
                    />
                    Diabetes (D)
                  </label>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Con factores de riesgo (BOP &gt; {bopTarget}%, S, D o furcaciones ≥ grado 2) el
                  intervalo recomendado se acorta un paso. Los cambios se guardan con el estudio.
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/[0.12] hover:text-white disabled:opacity-50"
          >
            <Download
              className={`h-4 w-4 ${downloading ? 'animate-pulse' : ''}`}
            />
            Descargar (interval.png)
          </button>
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
  );
}
