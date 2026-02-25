'use client';

import React from 'react';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  explanation?: string;
  contactInfo?: string;
  onGoBack?: () => void;
}

export default function AccessDenied({ 
  title = "Acceso Denegado",
  message = "No tienes permiso para acceder a esta página.",
  explanation = "Esta área es exclusiva para el personal autorizado.",
  contactInfo = "Si necesitas acceso, contacta a un administrador del sistema.",
  onGoBack,
  ...props 
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-gray-900 dark:bg-black flex items-center justify-center">
      <div className="bg-gray-800 dark:bg-gray-900 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
          <p className="text-gray-300 dark:text-gray-400 text-lg mb-8">{message}</p>
          
          {explanation && (
            <div className="space-y-4 mb-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                <i className="fas fa-info-circle mr-2"></i>
                {explanation}
              </p>
              {contactInfo && (
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  <i className="fas fa-shield-alt mr-2"></i>
                  {contactInfo}
                </p>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            {onGoBack && (
              <button
                onClick={onGoBack}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Volver
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
