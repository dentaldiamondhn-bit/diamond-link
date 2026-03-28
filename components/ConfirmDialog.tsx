'use client';

import React from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  type = 'warning',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'bg-red-100 dark:bg-red-900/50 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative w-full max-w-md ${styles.bg} ${styles.border} border-2 rounded-2xl shadow-2xl overflow-hidden`}>
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${styles.icon}`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-5 py-3 ${styles.button} rounded-xl transition-colors font-medium`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
