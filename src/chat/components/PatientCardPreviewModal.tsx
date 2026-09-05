'use client';

import { X, Send, Loader2 } from 'lucide-react';
import { PatientCaseLinkType } from '@/types/chat';
import type { Patient } from '@/types/patient';

interface PatientCardPreviewModalProps {
  open: boolean;
  patient: Patient;
  linkType: PatientCaseLinkType;
  scope: Record<string, any>;
  caption: string;
  onCaptionChange: (caption: string) => void;
  onSend: () => void;
  onCancel: () => void;
  sending: boolean;
}

const CARD_KIND_LABEL: Record<PatientCaseLinkType, string> = {
  consent: 'Patient Contact',
  odontogram: 'Odontogram Snapshot',
  treatment: 'Treatment Summary',
  event: 'Event',
  presupuesto: 'Presupuesto',
  payment: 'Payment',
  general: 'General',
};

export default function PatientCardPreviewModal({
  open,
  patient,
  linkType,
  scope,
  caption,
  onCaptionChange,
  onSend,
  onCancel,
  sending,
}: PatientCardPreviewModalProps) {
  if (!open) return null;

  const title = CARD_KIND_LABEL[linkType] || 'Patient Card';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-lg font-medium text-white">
                {(patient.nombre_completo || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-gray-900 dark:text-white">
                  {patient.nombre_completo}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {patient.numero_identidad} {patient.doctor ? `• ${patient.doctor}` : ''}
                </p>
              </div>
            </div>

            {scope.includeContact && (
              <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                {patient.telefono && (
                  <p className="flex items-center gap-2">
                    <span className="text-gray-500">Phone:</span>
                    <span>{patient.telefono}</span>
                  </p>
                )}
                {patient.email && (
                  <p className="flex items-center gap-2">
                    <span className="text-gray-500">Email:</span>
                    <span>{patient.email}</span>
                  </p>
                )}
                {patient.doctor && (
                  <p className="flex items-center gap-2">
                    <span className="text-gray-500">Doctor:</span>
                    <span>{patient.doctor}</span>
                  </p>
                )}
                {patient.alergias && (
                  <p className="flex items-center gap-2">
                    <span className="text-gray-500">Allergies:</span>
                    <span className="text-red-600 dark:text-red-400">{patient.alergias}</span>
                  </p>
                )}
              </div>
            )}

            {scope.includeTreatments && (
              <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Completed treatments
                </p>
                <p className="mt-1 text-xs text-gray-500">Treatment summary will be included.</p>
              </div>
            )}

            {scope.includeOdontogram && (
              <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Odontogram Snapshot
                </p>
                <p className="mt-1 text-xs text-gray-500">Current odontogram state will be included.</p>
              </div>
            )}
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              rows={2}
              placeholder="Add a note..."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
