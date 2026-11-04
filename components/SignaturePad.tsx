'use client';

import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';
import { Eraser, Signature as SignatureIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedBorderContainer from './AnimatedBorderContainer';
import { cn } from '@/lib/utils';

interface SignaturePadComponentProps {
  onChange: (signatureData: string | null) => void;
  value?: string | null;
  disabled?: boolean;
  variant?: 'default' | 'modal';
}

export default function SignaturePadComponent({
  onChange,
  value,
  disabled = false,
  variant = 'default',
}: SignaturePadComponentProps) {
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const isModal = variant === 'modal';

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;

      const isDark = resolvedTheme === 'dark';
      const backgroundColor = isModal
        ? 'rgb(15, 23, 42)'
        : isDark
          ? 'rgb(31, 41, 55)'
          : 'rgb(255, 255, 255)';
      const penColor = isModal || isDark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';

      const signaturePad = new SignaturePad(canvas, {
        backgroundColor,
        penColor,
        // Disable all smoothing that causes stroke issues
        minWidth: 1,
        maxWidth: 2,
        velocityFilterWeight: 0.1,
        dotSize: 2,
        throttle: 0,
      });

      signaturePadRef.current = signaturePad;

      // Simple resize - only on window resize, not during drawing
      const handleResize = () => {
        if (!canvasRef.current || !signaturePadRef.current) return;

        const canvas = canvasRef.current;
        const signaturePad = signaturePadRef.current;

        // Store current signature
        const data = signaturePad.isEmpty() ? null : signaturePad.toData();

        // Set canvas size
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;

        // Scale context
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(ratio, ratio);
          // Fix stroke overlap issues
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'source-over';
        }

        // Clear and restore signature
        signaturePad.clear();
        if (data) {
          signaturePad.fromData(data);
        }
      };

      // Initial resize
      handleResize();

      // Only listen to window resize events
      window.addEventListener('resize', handleResize);

      // Handle signature events
      signaturePad.addEventListener('beginStroke', () => {
        setIsEmpty(false);
      });

      signaturePad.addEventListener('endStroke', () => {
        const dataURL = signaturePad.toDataURL('image/png');
        onChange(dataURL);
      });

      // Load existing signature if provided
      if (value) {
        if (typeof value === 'string' && value.startsWith('data:image/')) {
          signaturePad.fromDataURL(value);
          setIsEmpty(false);
        }
      }

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isModal, onChange, value, resolvedTheme]);

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onChange(null);
      setIsEmpty(true);
    }
  };

  if (isModal) {
    return (
      <div className={cn('w-full', disabled && 'pointer-events-none opacity-50')}>
        <div className="rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-pink-400 p-[1.5px] shadow-lg shadow-cyan-950/30">
          <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-950 shadow-inner">
            <div className="relative w-full" style={{ height: '225px' }}>
              <canvas
                ref={canvasRef}
                className="h-full w-full cursor-crosshair"
                style={{
                  touchAction: 'none',
                  backgroundColor: 'rgb(15, 23, 42)',
                }}
              />
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-300',
                  isEmpty ? 'opacity-100' : 'opacity-0',
                )}
              >
                <SignatureIcon className="h-8 w-8 text-slate-600" aria-hidden="true" />
                <span className="text-sm text-slate-500">
                  Firme aquí con el cursor o pantalla táctil
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-800/80 px-2 py-1.5">
              <button
                type="button"
                onClick={clearSignature}
                disabled={disabled || isEmpty}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                Limpiar Firma
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <AnimatedBorderContainer>
        <div className="relative p-0 w-full" style={{ height: '225px' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair rounded-[14px]"
            style={{
              touchAction: 'none',
              backgroundColor: resolvedTheme === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)'
            }}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-fade-in-up">
              <i className="fas fa-signature text-[2.7rem] mb-2 text-gray-400 animate-pulse-icon"></i>
              <span className="text-[1.2rem] text-gray-400 animate-pulse-text">Por favor, firme aquí</span>
            </div>
          )}
        </div>
      </AnimatedBorderContainer>
      <div className="flex justify-between items-center mt-3">
        <button
          type="button"
          onClick={clearSignature}
          disabled={disabled || isEmpty}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <i className="fas fa-eraser mr-2"></i>
          Limpiar Firma
        </button>
        <span className="text-sm text-gray-600">
          Firme en el área de arriba
        </span>
      </div>
    </div>
  );
}
