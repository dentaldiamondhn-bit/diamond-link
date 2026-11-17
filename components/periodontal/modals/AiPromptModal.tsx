'use client';

import React, { useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import type { Patient } from '@/types/patient';
import {
  AI_PROMPT_LANGUAGES,
  analyzeForProfile,
  buildAIPrompt,
  detectDiabetes,
  getSmokingStatus,
} from '@/lib/utils/periodontalProfile';
import { rasterizeSvg, wrapText } from './rasterizeSvg';

interface AiPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

const EXPORT_W = 800;
const LINE_HEIGHT = 22;

function buildTextSvg(promptText: string): SVGSVGElement {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const lines: string[] = [];
  for (const rawLine of promptText.split('\n')) {
    if (rawLine === '') {
      lines.push('');
      continue;
    }
    lines.push(...wrapText(rawLine, 90));
  }
  const height = Math.max(200, lines.length * LINE_HEIGHT + 80);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(EXPORT_W));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${EXPORT_W} ${height}`);

  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('width', String(EXPORT_W));
  background.setAttribute('height', String(height));
  background.setAttribute('fill', '#0c1220');
  svg.appendChild(background);

  let y = 50;
  for (const line of lines) {
    if (line !== '') {
      const textEl = document.createElementNS(SVG_NS, 'text');
      textEl.setAttribute('x', '40');
      textEl.setAttribute('y', String(y));
      textEl.setAttribute('font-size', '15');
      textEl.setAttribute('font-family', "'Courier New', monospace");
      textEl.setAttribute('fill', '#E5E7EB');
      textEl.textContent = line;
      svg.appendChild(textEl);
    }
    y += LINE_HEIGHT;
  }

  return svg;
}

interface AiPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

export function AiPromptModal({ open, onOpenChange, patient = null }: AiPromptModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const [languageCode, setLanguageCode] = useState('es');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const prompt = useMemo(() => {
    const metrics = analyzeForProfile(chartData);
    const values = {
      pi: metrics.pi,
      bop: metrics.bop,
      pd6: metrics.pd6,
      furcation2: metrics.furcation2,
      smokingStatus: getSmokingStatus(patient),
      diabetes: detectDiabetes(patient),
    };
    return buildAIPrompt(values, languageCode);
  }, [chartData, patient, languageCode]);

  async function copyPrompt(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      return true;
    } catch {
      return false;
    }
  }

  async function handleCopyAndOpenGemini() {
    const ok = await copyPrompt();
    if (ok) window.open('https://gemini.google.com/', '_blank', 'noopener');
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await rasterizeSvg(buildTextSvg(prompt), 'aiprompt.png');
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Prompt para IA"
        >
          <div
            className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-2.5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Prompt para Gemini (Google), ChatGPT (OpenAI), etc.:</h2>
                <p className="mt-1 text-[11px] text-slate-400">Generado a partir del estudio periodontal actual</p>
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
              <div className="flex items-center gap-3 mb-4">
                <label htmlFor="ai-prompt-language" className="text-sm text-slate-300">Idioma:</label>
                <select
                  id="ai-prompt-language"
                  value={languageCode}
                  onChange={event => setLanguageCode(event.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  {AI_PROMPT_LANGUAGES.map(language => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </div>

              <pre className="mt-3 max-h-[45vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-white/10 bg-white/[0.02] p-4 font-mono text-xs leading-relaxed text-slate-200">
                {prompt}
              </pre>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-400/35 hover:border-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.12)] px-4 py-2 text-sm font-medium transition-all"
                >
                  <Copy className="h-4 w-4" />
                  Copiar Prompt
                </button>
                <button
                  type="button"
                  onClick={handleCopyAndOpenGemini}
                  className="inline-flex items-center gap-2 rounded-lg border border-teal-400/35 bg-teal-500/15 text-teal-200 hover:bg-teal-500/25 px-4 py-2 text-sm font-medium transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  Copiar Prompt y Abrir Gemini
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </button>
                <span className={`text-xs transition-opacity ${copied ? 'text-teal-300 opacity-100' : 'opacity-0'}`}>✔ Copiado al portapapeles</span>
              </div>

              <p className="mt-4 text-[11px] leading-snug text-red-400">Haga clic en el botón solo una vez. La imagen se descarga como "aiprompt.png" y puede usarse en presentaciones.</p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <p className="text-[11px] text-slate-500">El prompt no incluye datos personales del paciente.</p>
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
