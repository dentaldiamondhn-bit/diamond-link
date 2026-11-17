'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { QrCode, X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import {
  buildPerioChartUrl,
  encodeChartDataForQr,
  hasRecordedFindings,
} from '@/lib/utils/periodontalQr';

interface QrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrModal({ open, onOpenChange }: QrModalProps) {
  const chartData = useChartStore(state => state.chartData);

  const encoded = useMemo(() => encodeChartDataForQr(chartData ?? {}), [chartData]);
  const url = useMemo(() => buildPerioChartUrl(encoded), [encoded]);
  const unregistered = useMemo(() => !hasRecordedFindings(chartData ?? {}), [chartData]);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQrDataUrl(null);
    setQrError(false);
    void (async () => {
      try {
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'L',
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Código QR del periodontograma"
    >
      <div
        className="flex max-h-[92vh] w-[min(460px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-white">Periodontograma</h2>
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
          <p className="text-xs text-slate-300">
            El periodontograma se puede abrir en dispositivos móviles con el siguiente código QR:
          </p>

          <div className="mt-4 flex items-center justify-center">
            <div className="rounded-xl border border-white/10 bg-white p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Código QR del periodontograma" className="block h-64 w-64" />
              ) : qrError ? (
                <div className="flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-lg bg-slate-100">
                  <QrCode className="h-10 w-10 text-slate-400" />
                  <p className="px-4 text-center text-xs text-slate-500">
                    No se pudo generar el código QR.
                  </p>
                </div>
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-slate-100">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-teal-500" />
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-300">
            El periodontograma se puede abrir en una nueva ventana de este navegador:
          </p>
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="w-full max-w-[240px] rounded-lg border border-teal-400/35 bg-teal-500/15 px-4 py-2 text-sm font-medium text-teal-200 shadow-[0_0_12px_rgba(45,212,191,0.12)] transition-all hover:border-teal-400/60 hover:bg-teal-500/25"
            >
              Abrir Periodontograma
            </button>
          </div>

          {unregistered && (
            <p className="mt-3 text-center text-[11px] text-amber-300/80">
              Este periodontograma no está registrado con nosotros.
            </p>
          )}

          <p className="mt-4 text-[11px] text-slate-500">
            Este código QR no contiene datos personales como nombre, apellidos o fecha de
            nacimiento.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2.5">
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
