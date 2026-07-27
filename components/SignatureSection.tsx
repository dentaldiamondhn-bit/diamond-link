'use client';

import React from 'react';
import SignaturePadComponent from './SignaturePad';
import AnimatedBorderContainer from './AnimatedBorderContainer';

interface SignatureSectionProps {
  value?: string | null;
  onChange: (signatureData: string | null) => void;
  disabled?: boolean;
}

export default function SignatureSection({ value, onChange, disabled = false }: SignatureSectionProps) {
  return (
    <div className="w-full">
      <AnimatedBorderContainer>
        <div className="p-4 flex items-center justify-between">
          <span className="font-medium text-lg text-slate-200">hello</span>
          <button
            type="button"
            className="px-4 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Continue
          </button>
        </div>
      </AnimatedBorderContainer>

      <p className="text-lg text-slate-300 font-medium px-1 mt-6 mb-4">Que tal</p>

      <AnimatedBorderContainer className="h-56">
        <div className="relative w-full h-full p-4">
          <SignaturePadComponent onChange={onChange} value={value} disabled={disabled} />
        </div>
      </AnimatedBorderContainer>
    </div>
  );
}