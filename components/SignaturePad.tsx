'use client';

import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';
import { useTheme } from '@/contexts/ThemeContext';

interface SignaturePadComponentProps {
  onChange: (signatureData: string | null) => void;
  value?: string | null;
  disabled?: boolean;
}

export default function SignaturePadComponent({ onChange, value, disabled = false }: SignaturePadComponentProps) {
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      
      // Use theme-appropriate colors
      const isDark = resolvedTheme === 'dark';
      const backgroundColor = isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)';
      const penColor = isDark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
      
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
  }, [onChange, value, resolvedTheme]);

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
          className={`border-2 rounded-lg w-full ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'} ${
            resolvedTheme === 'dark' 
              ? 'border-gray-600' 
              : 'border-gray-300'
          }`}
          style={{ 
            touchAction: 'none', 
            height: '225px', // 150px * 1.50 = 225px
            backgroundColor: resolvedTheme === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)'
          }}
        />
        {isEmpty && (
          <div className="signature-placeholder absolute inset-0 flex flex-col items-center justify-center pointer-events-none ${
            resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'
          }">
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
