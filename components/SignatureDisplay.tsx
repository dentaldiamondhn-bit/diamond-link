'use client';

import React from 'react';

interface SignatureDisplayProps {
  signatureUrl: string | null;
  label?: string;
}

const SignatureDisplay: React.FC<SignatureDisplayProps> = ({ 
  signatureUrl, 
  label = "Firma Digital Existente" 
}) => {
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

  return (
    <div className="signature-section">
      <h4><i className="fas fa-signature"></i> {label}</h4>
      <p className="signature-hint">Esta es la firma digital registrada del paciente. No se puede editar.</p>
      
      <div className="signature-display-container">
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
          <img 
            src={signatureUrl} 
            alt="Firma del paciente" 
            className="max-w-full h-auto"
            style={{ maxHeight: '200px' }}
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
