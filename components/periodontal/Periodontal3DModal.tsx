'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Droplet, Droplets, Pause, Play, RotateCcw, Sparkles, Waves, X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import { calculateAL } from '@/lib/types/clinical';
import {
  createPeriodontal3dViewer,
  type CameraPresetKey,
  type HoverInfo,
  type Periodontal3dViewerInstance,
  type ViewerToggles,
} from '@/lib/periodontal/3d/periodontal3dEngine';

interface Periodontal3DModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CAMERA_PRESETS: { key: CameraPresetKey; label: string }[] = [
  { key: 'frontal', label: 'Vista Frontal' },
  { key: 'superior', label: 'Maxilar Superior' },
  { key: 'inferior', label: 'Mandibular Inferior' },
  { key: 'oclusal', label: 'Oclusal' },
  { key: 'reset', label: 'Reiniciar Cámara' },
];

function readNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isToothPresent(value: unknown): boolean {
  if (value === '0' || value === 0 || value === false) return false;
  return true;
}

function getSiteLabel(tooth: number, site: string): string {
  const jaw = tooth >= 11 && tooth <= 28 ? 'upper' : 'lower';
  const labels: Record<string, string> =
    jaw === 'upper'
      ? { db: 'VD', b: 'V', mb: 'VM', dp: 'PD', p: 'P', mp: 'PM' }
      : { db: 'VD', b: 'V', mb: 'VM', dl: 'LD', l: 'L', ml: 'LM' };
  return labels[site] ?? site;
}

function getAnatomicalSites(tooth: number): string[] {
  const upper = tooth >= 11 && tooth <= 28;
  const inner = upper ? ['dp', 'p', 'mp'] : ['dl', 'l', 'ml'];
  return ['db', 'b', 'mb', ...inner];
}

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors';
const PILL_IDLE = 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white';
const PILL_ACTIVE = 'border-teal-400/40 bg-teal-500/15 text-teal-300';

export function Periodontal3DModal({ open, onOpenChange }: Periodontal3DModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const [toggles, setToggles] = useState<ViewerToggles>({
    translucentGums: false,
    pockets: true,
    bop: true,
    plaque: false,
  });
  const [autoRotate, setAutoRotate] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [assetsState, setAssetsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Periodontal3dViewerInstance | null>(null);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const viewer = createPeriodontal3dViewer(container, info => setHover(info));
    viewerRef.current = viewer;
    let cancelled = false;
    viewer
      .loadAssets()
      .then(() => {
        if (cancelled) return;
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Periodontal3D] assets ready', viewerRef.current?.getRuntimeStats());
        }
        setAssetsState('ready');
      })
      .catch((err) => {
        console.error('[Periodontal3D] asset load failed:', err);
        if (cancelled) return;
        setAssetsState('error');
      });
    return () => {
      cancelled = true;
      viewer.dispose();
      viewerRef.current = null;
      setHover(null);
    };
  }, [open]);

  useEffect(() => {
    viewerRef.current?.updateData(chartData);
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Periodontal3D] updateData', viewerRef.current?.getRuntimeStats());
    }
  }, [chartData]);

  useEffect(() => {
    viewerRef.current?.applyToggles(toggles);
  }, [toggles]);

  useEffect(() => {
    viewerRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const togglePill = (key: keyof ViewerToggles, label: string, Icon: typeof Droplet) => {
    const active = toggles[key];
    return (
      <button
        type="button"
        onClick={() => setToggles(prev => ({ ...prev, [key]: !prev[key] }))}
        className={`${PILL_BASE} ${active ? PILL_ACTIVE : PILL_IDLE}`}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </button>
    );
  };

  const hoverTooth = hover?.tooth ?? null;
  const hoverSites = hoverTooth != null ? getAnatomicalSites(hoverTooth) : [];
  const hoverPresent = hoverTooth != null && isToothPresent(chartData[`tooth_${hoverTooth}`]);
  const hoverImplant = hoverTooth != null && readNumber(chartData[`implant_${hoverTooth}`]) > 0;
  const hoverMobility = hoverTooth != null ? readNumber(chartData[`mobility_${hoverTooth}`]) : 0;
  const inverted = Boolean(chartData.isGmInverted);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Visor 3D periodontal"
        >
          <div
            className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div>
                <h2 className="text-sm font-semibold text-white">Visor 3D Periodontal</h2>
                <p className="text-[11px] text-slate-400">Modelo interactivo sincronizado con el odontograma</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoRotate(prev => !prev)}
                  className={`${PILL_BASE} ${autoRotate ? PILL_ACTIVE : PILL_IDLE}`}
                >
                  {autoRotate ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
                  Auto-rotar
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  aria-label="Cerrar visor 3D"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
              {CAMERA_PRESETS.map(preset => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => viewerRef.current?.setCameraPreset(preset.key)}
                  className={`${PILL_BASE} ${PILL_IDLE} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400`}
                >
                  {preset.key === 'reset' && <RotateCcw className="h-3 w-3" aria-hidden="true" />}
                  {preset.label}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-white/10" aria-hidden="true" />
              {togglePill('translucentGums', 'Encía Translúcida', Droplet)}
              {togglePill('pockets', 'Bolsas Periodontales', Waves)}
              {togglePill('bop', 'BOP', Droplets)}
              {togglePill('plaque', 'Placa', Sparkles)}
            </div>

            <div className="relative flex-1 overflow-hidden">
              <div ref={containerRef} className="h-full w-full" />
              {assetsState !== 'ready' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                  {assetsState === 'loading' ? (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-teal-400/70 border-t-transparent" aria-hidden="true" />
                      <p className="text-xs">Cargando anatomía 3D…</p>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      No se pudo cargar el modelo anatómico. Reintenta abriendo el visor.
                    </p>
                  )}
                </div>
              )}
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-[10px] text-slate-400 backdrop-blur-md">
                <span className="mr-2 inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#ff3b47]" aria-hidden="true" /> BOP
                </span>
                <span className="mr-2 inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#3b82f6]" aria-hidden="true" /> Sano
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#9aa4b2]" aria-hidden="true" /> Implante
                </span>
              </div>
              {hover && hoverTooth != null && (
                <div
                  className="pointer-events-none fixed z-10 w-52 rounded-xl border border-white/10 bg-slate-950/90 p-2.5 text-[11px] text-slate-200 shadow-xl backdrop-blur-xl"
                  style={{ left: hover.x + 14, top: hover.y + 14 }}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-teal-300">Pieza {hoverTooth}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        !hoverPresent
                          ? 'bg-slate-700/60 text-slate-300'
                          : hoverImplant
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {!hoverPresent ? 'Ausente' : hoverImplant ? 'Implante' : 'Presente'}
                    </span>
                  </div>
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="py-0.5 text-left font-normal">Sitio</th>
                        <th className="py-0.5 text-right font-normal">GM</th>
                        <th className="py-0.5 text-right font-normal">PD</th>
                        <th className="py-0.5 text-right font-normal">NIC</th>
                        <th className="py-0.5 text-right font-normal">BOP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hoverSites.map(site => {
                        const gm = readNumber(chartData[`gm_${hoverTooth}_${site}`]);
                        const pd = readNumber(chartData[`pd_${hoverTooth}_${site}`]);
                        const bopOn = readNumber(chartData[`bop_${hoverTooth}_${site}`]) === 1;
                        return (
                          <tr key={site} className="border-t border-white/5">
                            <td className="py-0.5 text-slate-300">{getSiteLabel(hoverTooth, site)}</td>
                            <td className="py-0.5 text-right">{gm}</td>
                            <td className="py-0.5 text-right">{pd}</td>
                            <td className="py-0.5 text-right">{calculateAL(pd, gm, inverted)}</td>
                            <td className="py-0.5 text-right">
                              <span
                                className={`ml-auto inline-block h-2 w-2 rounded-full ${
                                  bopOn ? 'bg-[#ff2440]' : 'bg-slate-600'
                                }`}
                                aria-label={bopOn ? 'Sangrado positivo' : 'Sin sangrado'}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {hoverMobility > 0 && (
                    <p className="mt-1 text-[10px] text-amber-300">Movilidad grado {hoverMobility}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
