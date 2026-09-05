'use client';

import { X, Send, Loader2 } from 'lucide-react';
import { PatientCaseLinkType } from '@/types/chat';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { CARD_KIND_TITLE_KEYS } from '@/chat/patientCardData';
import type { Patient } from '@/types/patient';

interface PatientCardPreviewModalProps {
  open: boolean;
  patient: Patient;
  linkType: PatientCaseLinkType;
  scope: Record<string, any>;
  metadata: Record<string, any> | null;
  caption: string;
  onCaptionChange: (caption: string) => void;
  onSend: () => void;
  onCancel: () => void;
  sending: boolean;
}

export default function PatientCardPreviewModal({
  open,
  patient,
  linkType,
  metadata,
  caption,
  onCaptionChange,
  onSend,
  onCancel,
  sending,
}: PatientCardPreviewModalProps) {
  const { t } = useTranslations();

  if (!open) return null;

  const title = t(CARD_KIND_TITLE_KEYS[linkType] || 'patientCase');
  const loading = metadata === null;
  const teethStatus = (metadata?.teethStatus as any[]) || null;
  const treatments = (metadata?.treatments as any[]) || null;

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

            {linkType === 'treatment' &&
              (loading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('loadingTreatments')}
                </div>
              ) : treatments && treatments.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('completedProcedures')}
                  </p>
                  <div className="mt-1 space-y-0.5 text-xs text-gray-700 dark:text-gray-200">
                    {treatments.slice(0, 4).map((tr: any) => (
                      <p key={tr.id} className="flex items-center gap-2 truncate">
                        <span className="w-16 flex-shrink-0 text-gray-400">{tr.date}</span>
                        <span className="truncate">{tr.procedure}</span>
                        {tr.cdt && <span className="flex-shrink-0 text-gray-400">{tr.cdt}</span>}
                      </p>
                    ))}
                    {(metadata?.treatmentsCount ?? treatments.length) > 4 && (
                      <p className="text-gray-500">
                        {t('andMoreTreatments', { n: (metadata?.treatmentsCount ?? treatments.length) - 4 })}
                      </p>
                    )}
                  </div>
                  {(metadata?.treatmentsTotals || []).map((total: any) => (
                    <p key={total.moneda} className="mt-1 text-xs font-medium text-gray-700 dark:text-gray-200">
                      {t('treatmentTotal')}: {Number(total.total).toLocaleString()} {total.moneda}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-500">{t('noTreatments')}</p>
              ))}

            {linkType === 'odontogram' &&
              (loading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('loadingOdontogram')}
                </div>
              ) : teethStatus && teethStatus.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('odontogramState')}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {teethStatus.slice(0, 16).map((tooth: any) => (
                      <span
                        key={tooth.toothNumber}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-medium"
                        style={{
                          backgroundColor: tooth.color || '#6b7280',
                          color: '#ffffff',
                          boxShadow: tooth.status === 'sano' ? 'inset 0 0 0 1px #d1d5db' : undefined,
                        }}
                        title={`#${tooth.toothNumber}: ${tooth.status}`}
                      >
                        {tooth.toothNumber}
                      </span>
                    ))}
                    {teethStatus.length > 16 && (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 text-[10px] font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                        +{teethStatus.length - 16}
                      </span>
                    )}
                  </div>
                  {(metadata?.odontogramVersion != null || metadata?.odontogramDate) && (
                    <p className="mt-1 text-xs text-gray-500">
                      {metadata?.odontogramVersion != null && (
                        <>
                          {t('odontogramVersion')}: {metadata.odontogramVersion}
                        </>
                      )}
                      {metadata?.odontogramVersion != null && metadata?.odontogramDate ? ' • ' : ''}
                      {metadata?.odontogramDate ? metadata.odontogramDate : ''}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-500">{t('noOdontogramData')}</p>
              ))}
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('captionOptional')}
            </label>
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              rows={2}
              placeholder={t('addNote')}
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
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            {t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}