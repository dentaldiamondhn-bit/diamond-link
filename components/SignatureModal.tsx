'use client';

import React from 'react';
import SignaturePadComponent from './SignaturePad';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  title: string;
  subtitle?: string;
  value?: string | null;
  isHistorical?: boolean; // Add historical record prop
}

const SignatureModal: React.FC<SignatureModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  title, 
  subtitle,
  value,
  isHistorical = false
}) => {
  const [signatureData, setSignatureData] = React.useState<string | null>(value || null);

  const handleSave = () => {
    if (signatureData) {
      onSave(signatureData);
      onClose();
    }
  };

  const handleClear = () => {
    setSignatureData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4 text-white flex-shrink-0">
          <div className="text-center">
            <h3 className="text-lg font-bold flex items-center justify-center">
              <i className="fas fa-signature mr-3"></i>
              {title}
            </h3>
            {subtitle && (
              <p className="text-teal-100 text-sm mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Signature Pad */}
        <div className="p-4 flex-1 overflow-auto">
          <div className="bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600">
            {isHistorical ? (
              // Historical record - no signature required
              <div className="text-center p-8">
                <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-4xl mb-2"></i>
                <p className="text-green-800 dark:text-green-200 font-medium">Firma No Requerida</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Registro histórico transcribido de documento físico
                </p>
              </div>
            ) : (
              // Active record - show signature pad
              <SignaturePadComponent
                onChange={setSignatureData}
                value={signatureData}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 flex justify-end space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            <i className="fas fa-times mr-2"></i>
            Cancelar
          </button>
          {!signatureData && !isHistorical && (
            <button
              className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 font-medium transition-all duration-200 shadow-lg flex items-center space-x-2 opacity-50 cursor-not-allowed"
              disabled
            >
              <i className="fas fa-pen"></i>
              Añadir Firma
            </button>
          )}
          {signatureData && !isHistorical && (
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 font-medium transition-all duration-200 shadow-lg flex items-center space-x-2"
            >
              <i className="fas fa-eraser"></i>
              Limpiar Firma
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!signatureData}
            className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-lg flex items-center space-x-2"
          >
            <i className="fas fa-save"></i>
            {isHistorical ? 'Entendido' : 'Guardar Firma'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
