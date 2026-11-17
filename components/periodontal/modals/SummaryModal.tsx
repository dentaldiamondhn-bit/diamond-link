'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import { calculateChartStatistics } from '@/lib/utils/periodontalAnalysis';
import { getApplicableSurfaces } from '@/lib/utils/chartGeometry';
import { ALL_TEETH } from '@/lib/constants/teeth';
import { readNumber, isToothPresent, getToothAl } from '@/lib/utils/periodontalAnalysis';
import {
  computeOverviewStats,
  formatOverviewDate,
  getOverviewFurcationMarkers,
  getOverviewImplantMarkers,
  getOverviewSiteFills,
  buildOverviewPdTexts,
} from '@/lib/utils/periodontalOverview';
import { OverviewMap } from '@/components/periodontal/modals/OverviewMap';
import { OVERVIEW_SITE_PATHS } from '@/lib/constants/overviewSites';
import {
  FURCATION_OVERVIEW_COORDINATES,
  IMPLANT_OVERVIEW_COORDINATES,
  OVERVIEW_PD_TEXT_SLOTS,
} from '@/lib/constants/overviewCoordinates';

interface SummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors';
const PILL_IDLE = 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white';
const PILL_ACTIVE = 'border-teal-400/40 bg-teal-500/15 text-teal-300';

export function SummaryModal({ open, onOpenChange }: SummaryModalProps) {
  const chartData = useChartStore(state => state.chartData);

  const stats = useMemo(() => computeOverviewStats(chartData), [chartData]);
  const perSiteStats = useMemo(() => calculateChartStatistics(chartData), [chartData]);
  const fills = useMemo(() => getOverviewSiteFills(chartData, OVERVIEW_SITE_PATHS), [chartData]);
  const pdTexts = useMemo(
    () => buildOverviewPdTexts(chartData, OVERVIEW_PD_TEXT_SLOTS),
    [chartData],
  );
  const furcations = useMemo(
    () => getOverviewFurcationMarkers(chartData, FURCATION_OVERVIEW_COORDINATES),
    [chartData],
  );
  const implants = useMemo(
    () => getOverviewImplantMarkers(chartData, IMPLANT_OVERVIEW_COORDINATES),
    [chartData],
  );
  const dateText = formatOverviewDate(chartData.date);

  const piSvgRef = useRef<SVGSVGElement | null>(null);
  const bopSvgRef = useRef<SVGSVGElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    const piSvg = piSvgRef.current;
    const bopSvg = bopSvgRef.current;
    if (!piSvg || !bopSvg || downloading) return;

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

      const svgString = new XMLSerializer().serializeToString(combined);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('No se pudo rasterizar el mapa.'));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible.');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'pd_bop.png';
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  const patientInfo = [
    chartData.patient_first_name,
    chartData.patient_last_name,
  ]
    .filter(Boolean)
    .join(' ');

  const rows = ALL_TEETH.filter(tooth => {
    if (!isToothPresent(chartData, tooth)) return false;
    return getApplicableSurfaces(tooth).some(
      surface => readNumber(chartData[`pd_${tooth}_${surface}`]) > 0,
    );
  });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Resumen periodontal"
        >
          <div
            className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-2.5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Resumen</h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  {[patientInfo, formatOverviewDate(chartData.date)].filter(Boolean).join(' · ') ||
                    'Mapa del periodicio completo'}
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

            <div className="overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                <section className="rounded-md border border-white/10 p-3 bg-white/[0.02]">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
                    <h3 className="text-sm font-semibold text-white">
                      Índice de placa (PI)
                    </h3>
                    <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                      {stats.piPercent}%
                    </span>
                  </div>
                  <OverviewMap
                    kind="pi"
                    fills={fills}
                    pdTexts={pdTexts}
                    furcations={furcations}
                    implants={implants}
                    dateText={formatOverviewDate(chartData.date)}
                    percent={stats.piPercent}
                    svgRef={piSvgRef}
                  />
                </section>

                <section className="rounded-md border border-white/10 p-3 bg-white/[0.02]">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
                    <h3 className="text-sm font-semibold text-white">
                      Sangrado al sondaje (BOP)
                    </h3>
                    <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">
                      {stats.bopPercent}%
                    </span>
                  </div>
                  <OverviewMap
                    kind="bop"
                    fills={fills}
                    pdTexts={pdTexts}
                    furcations={furcations}
                    implants={implants}
                    dateText={formatOverviewDate(chartData.date)}
                    percent={stats.bopPercent}
                    svgRef={bopSvgRef}
                  />
                </section>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] leading-snug text-red-400">
                    Haga clic en el botón solo una vez. La imagen se descarga como
                    "pd_bop.png" y puede usarse en presentaciones.
                  </p>
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
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Prof. media', value: `${perSiteStats.meanPd.toFixed(1)} mm` },
                  { label: 'NIC media', value: `${perSiteStats.meanAl.toFixed(1)} mm` },
                  { label: 'BOP', value: `${perSiteStats.bopPercent.toFixed(0)}%` },
                  { label: 'PI', value: `${perSiteStats.plaquePercent.toFixed(0)}%` },
                ].map(item => (
                  <div
                    key={item.label}
                    className="rounded-md border border-white/10 bg-white/[0.02] p-3 text-center"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">
                      {item.label}
                    </div>
                    <div className="mt-1 text-lg font-bold text-teal-300">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-md border border-white/10 bg-white/[0.02]">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {['Diente', 'Vest. mesial', 'Vest. medio', 'Vest. distal', 'Oral mesial', 'Oral medio', 'Oral distal'].map(
                        header => (
                          <th
                            key={header}
                            className="border border-white/10 bg-white/[0.02] px-2 py-1 text-center font-semibold text-slate-300"
                          >
                            {header}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(tooth => {
                      const surfaces = getApplicableSurfaces(tooth);
                      return (
                        <tr key={tooth}>
                          <td className="border border-white/10 px-2 py-1 text-center font-bold text-white">
                            {tooth}
                          </td>
                          {surfaces.map(surface => {
                            const pd = readNumber(chartData[`pd_${tooth}_${surface}`]);
                            const al = getToothAl(chartData, tooth, surface);
                            return (
                              <td
                                key={surface}
                                className="border border-white/10 px-2 py-1 text-center text-slate-300"
                              >
                                {pd ? `${pd} / ${al.toFixed(1)}` : '&mdash;'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="border border-white/10 px-2 py-6 text-center text-slate-500"
                        >
                          Todavía no hay profundidades de sondaje registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

<p className="mt-3 text-[11px] text-slate-500">
                Números rojos sobre el mapa: PD &gt; 3 mm. Círculo amarillo: PD &ge; 6 mm. Sitios
                grises: dientes ausentes.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <p className="text-[11px] text-slate-500">
                Vista general del estudio periodontal actual.
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