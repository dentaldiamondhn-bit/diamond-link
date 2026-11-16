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
  background.setAttribute('fill', '#FFFFFF');
  svg.appendChild(background);

  let y = 50;
  for (const line of lines) {
    if (line !== '') {
      const textEl = document.createElementNS(SVG_NS, 'text');
      textEl.setAttribute('x', '40');
      textEl.setAttribute('y', String(y));
      textEl.setAttribute('font-size', '15');
      textEl.setAttribute('font-family', "'Courier New', monospace");
      textEl.textContent = line;
      svg.appendChild(textEl);
    }
    y += LINE_HEIGHT;
  }

  return svg;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div className="relative z-50 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Prompt para Gemini (Google), ChatGPT (OpenAI), etc.:
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Generado a partir del estudio periodontal actual
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
          <div className="flex items-center gap-3">
            <label htmlFor="ai-prompt-language" className="text-sm text-gray-700 dark:text-gray-200">
              Idioma:
            </label>
            <select
              id="ai-prompt-language"
              value={languageCode}
              onChange={event => setLanguageCode(event.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100"
            >
              {AI_PROMPT_LANGUAGES.map(language => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>

          <pre className="mt-3 max-h-[45vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            {prompt}
          </pre>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              <Copy className="h-4 w-4" />
              Copiar Prompt
            </button>
            <button
              type="button"
              onClick={handleCopyAndOpenGemini}
              className="inline-flex items-center gap-2 rounded-md border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-900/30"
            >
              <ExternalLink className="h-4 w-4" />
              Copiar Prompt y Abrir Gemini
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Descargar
            </button>
            <span
              className={`text-xs transition-opacity ${copied ? 'text-teal-600 opacity-100 dark:text-teal-300' : 'opacity-0'}`}
            >
              ✔ Copiado al portapapeles
            </span>
          </div>

          <p className="mt-4 text-[11px] leading-snug text-red-600 dark:text-red-300">
            Haga clic en el botón solo una vez. La imagen se descarga como
            &quot;aiprompt.png&quot; y puede usarse en presentaciones.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            El prompt no incluye datos personales del paciente.
          </p>
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
  );
}
