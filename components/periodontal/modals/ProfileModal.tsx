'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import type { Patient } from '@/types/patient';
import {
  analyzeForProfile,
  buildProfileAssessment,
  detectDiabetes,
  getSmokingStatus,
  profileBopText,
  profileFurcationText,
  profilePiText,
  profilePdText,
  type ProfileAssessment,
  type ProfileAssessmentInput,
  type ProfileMetrics,
} from '@/lib/utils/periodontalProfile';
import { rasterizeSvg, wrapText } from './rasterizeSvg';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

const CHART_W = 800;
const CHART_H = 330;
const PLOT_LEFT = 190;
const PLOT_RIGHT = 770;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const BAR_HEIGHT = 44;
const ROW_YS = [50, 140, 230];

const COLORS = {
  pi: '#7D97E3',
  pd4: '#D3D3D3',
  pd5: '#808080',
  pd6: '#FF0000',
  bop: '#FDA5A5',
};

const ROW_LABELS = {
  pi: 'Higiene Bucal (%)',
  pd: 'Profundidades de Sondaje (%)',
  bop: 'Inflamación (%)',
};

const LEGEND = [
  { label: '4mm (%)', color: COLORS.pd4 },
  { label: '5mm (%)', color: COLORS.pd5 },
  { label: '≥6mm (%)', color: COLORS.pd6 },
];

function barX(value: number): number {
  return PLOT_LEFT + (Math.min(Math.max(value, 0), 100) / 100) * PLOT_WIDTH;
}

function ChartSvg({
  metrics,
  innerRef,
}: {
  metrics: ProfileMetrics;
  innerRef?: React.RefObject<SVGSVGElement | null>;
}) {
  const segments = [
    { color: COLORS.pd4, value: metrics.pd4 },
    { color: COLORS.pd5, value: metrics.pd5 },
    { color: COLORS.pd6, value: metrics.pd6 },
  ];

  return (
    <svg
      ref={innerRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      width={CHART_W}
      height={CHART_H}
      className="w-full max-w-3xl"
      role="img"
      aria-label="Perfil periodontal"
    >
      <rect width={CHART_W} height={CHART_H} fill="#FFFFFF" />

      {[0, 20, 40, 60, 80, 100].map(tick => {
        const x = barX(tick);
        return (
          <g key={`tick-${tick}`}>
            <line x1={x} y1={ROW_YS[0] - 14} x2={x} y2={ROW_YS[2] + BAR_HEIGHT + 8} stroke="#E5E7EB" strokeWidth={1} />
            <text x={x} y={ROW_YS[2] + BAR_HEIGHT + 28} fontSize={12} fill="#6B7280" textAnchor="middle" fontFamily="Arial, sans-serif">
              {tick}
            </text>
          </g>
        );
      })}

      {(['pi', 'pd', 'bop'] as const).map((row, index) => (
        <text
          key={`label-${row}`}
          x={PLOT_LEFT - 12}
          y={ROW_YS[index] + BAR_HEIGHT / 2 + 5}
          fontSize={13}
          fill="#374151"
          textAnchor="end"
          fontFamily="Arial, sans-serif"
        >
          {ROW_LABELS[row]}
        </text>
      ))}

      <rect x={PLOT_LEFT} y={ROW_YS[0]} width={barX(metrics.pi) - PLOT_LEFT || 0} height={BAR_HEIGHT} fill={COLORS.pi} />
      <text x={barX(metrics.pi) + 6} y={ROW_YS[0] + BAR_HEIGHT / 2 + 5} fontSize={12} fill="#374151" fontFamily="Arial, sans-serif">
        {metrics.pi > 0 ? `${metrics.pi.toFixed(1)}%` : ''}
      </text>

      {segments.map((segment, index) => {
        const startsBefore = segments.slice(0, index).reduce((sum, item) => sum + item.value, 0);
        const x = barX(startsBefore);
        const width = barX(startsBefore + segment.value) - x;
        if (width <= 0) return null;
        return (
          <g key={`segment-${index}`}>
            <rect x={x} y={ROW_YS[1]} width={width} height={BAR_HEIGHT} fill={segment.color} />
            <text
              x={x + width / 2}
              y={ROW_YS[1] + BAR_HEIGHT / 2 + 5}
              fontSize={11}
              fill={segment.color === COLORS.pd4 ? '#6B7280' : '#FFFFFF'}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
            >
              {segment.value > 0 ? `${segment.value.toFixed(1)}%` : ''}
            </text>
          </g>
        );
      })}

      <rect x={PLOT_LEFT} y={ROW_YS[2]} width={barX(metrics.bop) - PLOT_LEFT || 0} height={BAR_HEIGHT} fill={COLORS.bop} />
      <text x={barX(metrics.bop) + 6} y={ROW_YS[2] + BAR_HEIGHT / 2 + 5} fontSize={12} fill="#374151" fontFamily="Arial, sans-serif">
        {metrics.bop > 0 ? `${metrics.bop.toFixed(1)}%` : ''}
      </text>

      <line x1={PLOT_LEFT} y1={ROW_YS[2] + BAR_HEIGHT} x2={PLOT_RIGHT} y2={ROW_YS[2] + BAR_HEIGHT} stroke="#9CA3AF" strokeWidth={1} />
    </svg>
  );
}

function EmphasisText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : <React.Fragment key={index}>{part}</React.Fragment>,
      )}
    </>
  );
}

function buildExportSvg(
  metrics: ProfileMetrics,
  assessment: ProfileAssessment,
  values: ProfileAssessmentInput,
  dateStamp: string,
  chartMarkup: string,
): SVGSVGElement {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '800');
  svg.setAttribute('height', '1100');
  svg.setAttribute('viewBox', '0 0 800 1100');

  const title = document.createElementNS(SVG_NS, 'text');
  title.setAttribute('x', '40');
  title.setAttribute('y', '40');
  title.setAttribute('font-size', '20');
  title.setAttribute('font-weight', 'bold');
  title.setAttribute('font-family', 'Arial, sans-serif');
  title.textContent = '¿Qué tan estables son sus encías?';
  svg.appendChild(title);

  const chartGroup = document.createElementNS(SVG_NS, 'g');
  chartGroup.setAttribute('transform', 'translate(20, 60) scale(0.95)');
  chartGroup.innerHTML = chartMarkup;
  svg.appendChild(chartGroup);

  let y = CHART_H + 80;
  const lines: string[] = [];

  lines.push(assessment.stable
    ? 'Las condiciones periodontales se consideran estables, ya que se cumplen los criterios principales (Higiene bucal ≤20%, sin bolsas residuales ≥ 6mm, sin afectación de furcación ≥ Grado 2, Inflamación ≤20%).'
    : 'La estabilidad periodontal podría no estar completamente alcanzada. Los siguientes puntos se desvían del objetivo de estabilidad:');
  for (const deviation of assessment.deviations) lines.push(`• ${deviation}`);
  lines.push('');
  lines.push(`Higiene Bucal (%): ${profilePiText(metrics.pi)}`);
  lines.push(`Profundidades de Sondaje (%): ${profilePdText(metrics.pd6)}`);
  lines.push(`Furcaciones (número): ${profileFurcationText(metrics.furcation2)}`);
  lines.push(`Inflamación (%): ${profileBopText(values, assessment.bopTarget)}`);
  lines.push('');
  lines.push(assessment.summaryGood
    ? 'Todas las condiciones relevantes para una situación periodontalmente estable se cumplen actualmente.'
    : 'Los siguientes pasos podrían ser necesarios para la estabilización periodontal:');
  for (const goal of assessment.goals) lines.push(`• ${goal}`);
  if (assessment.summaryRisks) lines.push(assessment.summaryRisks);
  lines.push('');
  lines.push(dateStamp);

  for (const line of lines) {
    if (line === '') {
      y += 12;
      continue;
    }
    for (const wrapped of wrapText(line, 95)) {
      const textEl = document.createElementNS(SVG_NS, 'text');
      textEl.setAttribute('x', '40');
      textEl.setAttribute('y', String(y));
      textEl.setAttribute('font-size', '14');
      textEl.setAttribute('font-family', 'Arial, sans-serif');
      textEl.textContent = wrapped;
      svg.appendChild(textEl);
      y += 20;
    }
  }

  return svg;
}

export function ProfileModal({ open, onOpenChange, patient = null }: ProfileModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const [downloading, setDownloading] = useState(false);

  const metrics = useMemo(() => analyzeForProfile(chartData), [chartData]);

  const values = useMemo<ProfileAssessmentInput>(
    () => ({
      pi: metrics.pi,
      bop: metrics.bop,
      pd6: metrics.pd6,
      furcation2: metrics.furcation2,
      smokingStatus: getSmokingStatus(patient),
      diabetes: detectDiabetes(patient),
    }),
    [metrics, patient],
  );

  const assessment = useMemo(() => buildProfileAssessment(values), [values]);

  const dateStamp = useMemo(
    () => `Estado: ${new Date().toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
    [],
  );

  const chartRef = useRef<SVGSVGElement | null>(null);

  async function handleDownload() {
    if (!chartRef.current || downloading) return;
    setDownloading(true);
    try {
      const combined = buildExportSvg(metrics, assessment, values, dateStamp, chartRef.current.innerHTML);
      await rasterizeSvg(combined, 'profile.png');
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div className="relative z-50 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              ¿Qué tan estables son sus encías?
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Perfil periodontal del estudio actual
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <section className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <ChartSvg metrics={metrics} innerRef={chartRef} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-gray-600 dark:text-gray-300">
              <span className="font-semibold">
                Leyenda:
              </span>
              {LEGEND.map(item => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-5 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Evaluación de su Estabilidad Periodontal
            </h3>
            {assessment.stable ? (
              <p>
                <EmphasisText text="Las condiciones periodontales se consideran **estables**, ya que se cumplen los criterios principales (Higiene bucal ≤20%, sin bolsas residuales ≥ 6mm, sin afectación de furcación ≥ Grado 2, Inflamación ≤20%)." />
              </p>
            ) : (
              <div>
                <p>
                  <EmphasisText text="La estabilidad periodontal podría **no estar completamente alcanzada**. Los siguientes puntos se desvían del objetivo de estabilidad:" />
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {assessment.deviations.map((deviation, index) => (
                    <li key={index}>{deviation}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <p>
                <strong>Higiene Bucal (%)</strong>
                <br />
                {profilePiText(metrics.pi)}
              </p>
              <p>
                <strong>Profundidades de Sondaje (%)</strong>
                <br />
                {profilePdText(metrics.pd6)}
              </p>
              <p>
                <strong>Furcaciones (número)</strong>
                <br />
                {profileFurcationText(metrics.furcation2)}
              </p>
              <p>
                <strong>Inflamación (%)</strong>
                <br />
                {profileBopText(values, assessment.bopTarget)}
              </p>
            </div>

            <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-800 dark:bg-teal-900/20">
              <h3 className="text-base font-semibold text-teal-800 dark:text-teal-200">
                Notas de Resumen
              </h3>
              {assessment.summaryGood ? (
                <p className="mt-1">
                  Todas las condiciones relevantes para una situación periodontalmente estable se cumplen actualmente.
                </p>
              ) : (
                <div className="mt-1">
                  {assessment.goals.length > 0 && (
                    <>
                      <p>Los siguientes pasos podrían ser necesarios para la estabilización periodontal:</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {assessment.goals.map((goal, index) => (
                          <li key={index}>{goal}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {assessment.summaryRisks && <p className="mt-2">{assessment.summaryRisks}</p>}
                </div>
              )}
            </div>

            <p className="text-right text-xs text-gray-500 dark:text-gray-400">{dateStamp}</p>
          </section>

          <p className="mt-4 text-[11px] leading-snug text-red-600 dark:text-red-300">
            Haga clic en el botón solo una vez. La imagen se descarga como
            &quot;profile.png&quot; y puede usarse en presentaciones.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Higiene bucal ≤ 20% · BOP ≤ {assessment.bopTarget}% · sin bolsas ≥ 6 mm · sin furcaciones ≥ Grado 2
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Descargar
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
