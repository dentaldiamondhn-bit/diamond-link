'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface SignatureDisplayProps {
  signatureUrl: string | null;
  label?: string;
  variant?: 'default' | 'preview';
}

const SignatureDisplay: React.FC<SignatureDisplayProps> = ({
  signatureUrl,
  label = "Firma Digital Existente",
  variant = 'default'
}) => {
  const isPreview = variant === 'preview';
  const { resolvedTheme } = useTheme();
  const [needsInversion, setNeedsInversion] = useState(false);
  
  // Analyze signature to determine if color inversion is needed
  useEffect(() => {
    if (!signatureUrl) return;
    
    const analyzeSignature = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        ctx.drawImage(img, 0, 0);
        
        // Sample pixels to determine dominant signature color
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let lightPixels = 0;
        let darkPixels = 0;
        let totalPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 0) { // Only count non-transparent pixels
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            
            if (brightness > 128) {
              lightPixels++;
            } else {
              darkPixels++;
            }
            totalPixels++;
          }
        }
        
        // Determine if signature is primarily light or dark
        const lightRatio = lightPixels / totalPixels;
        const isLightSignature = lightRatio > 0.5;
        
        if (totalPixels === 0) {
          setNeedsInversion(false);
          return;
        }

        // Dark theme: invert light/cream captures so the stroke renders white on dark.
        // Light theme: invert dark captures so the stroke renders black on light.
        const shouldInvert =
          (resolvedTheme === 'dark' && isLightSignature) ||
          (resolvedTheme === 'light' && !isLightSignature);

        setNeedsInversion(shouldInvert);
      };
      
      img.onerror = () => {
        console.error('Failed to analyze signature image');
        setNeedsInversion(false);
      };
      
      img.src = signatureUrl;
    };
    
    analyzeSignature();
  }, [signatureUrl, resolvedTheme]);
  
  if (!signatureUrl || signatureUrl === '') {
    return (
      <div className="signature-section">
        <h4><i className="fas fa-signature"></i> {label}</h4>
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <i className="fas fa-signature text-gray-300 text-4xl mb-3"></i>
          <p className="text-gray-600 dark:text-gray-400">
            No hay firma digital registrada
          </p>
        </div>
      </div>
    );
  }

  if (isPreview) {
    return (
      <div className="flex w-full flex-col items-center">
        <img
          src={signatureUrl}
          alt={label}
          className="max-h-[200px] w-auto max-w-full object-contain"
          style={{
            filter: needsInversion
              ? 'invert(1) hue-rotate(180deg) brightness(1.25) contrast(1.25)'
              : 'none'
          }}
        />
        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Firma digital registrada • Solo visualización
        </p>
      </div>
    );
  }

  return (
    <div className="signature-section">
      <h4><i className="fas fa-signature"></i> {label}</h4>
      <p className="signature-hint">Esta es la firma digital registrada del paciente. No se puede editar.</p>
      
      <div className="signature-display-container">
        <div className={`border-2 rounded-lg p-4 ${
          resolvedTheme === 'dark' 
            ? 'border-gray-600 bg-gray-800' 
            : 'border-gray-300 bg-white'
        }`}>
          <img 
            src={signatureUrl} 
            alt="Firma del paciente" 
            className="max-w-full h-auto"
            style={{ 
              maxHeight: '200px',
              filter: needsInversion ? 'invert(1)' : 'none'
            }}
          />
        </div>
      </div>
      
      <div className="signature-actions">
        <span className="signature-hint">Firma existente - Solo visualización</span>
      </div>
    </div>
  );
};

export default SignatureDisplay;
