'use client';

import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

interface SignaturePadComponentProps {
  onChange: (signatureData: string | null) => void;
  value?: string | null;
  disabled?: boolean;
}

export default function SignaturePadComponent({ onChange, value, disabled = false }: SignaturePadComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });

      signaturePadRef.current = signaturePad;

      // Handle resize
      const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(ratio, ratio);
        }
        
        // Redraw signature if it exists
        if (!signaturePad.isEmpty()) {
          const data = signaturePad.toData();
          signaturePad.clear();
          signaturePad.fromData(data);
        }
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

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
        signaturePad.fromDataURL(value);
        setIsEmpty(false);
      }

      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [onChange, value]);

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onChange(null);
      setIsEmpty(true);
    }
  };

  return (
    <div className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`border-2 border-gray-300 rounded-lg w-full ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
          style={{ touchAction: 'none', height: '150px' }}
        />
        {isEmpty && (
          <div className="signature-placeholder absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400">
            <i className="fas fa-signature text-4xl mb-2 opacity-50"></i>
            <span>Por favor, firme aquí</span>
          </div>
        )}
      </div>
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
