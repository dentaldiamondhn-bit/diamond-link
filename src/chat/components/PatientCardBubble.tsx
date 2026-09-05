'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Mail,
  FileText,
  ExternalLink,
  ChevronRight,
  Loader2,
  Activity as ActivityIcon,
} from 'lucide-react';
import { PatientCaseLinkType } from '@/types/chat';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { CARD_KIND_TITLE_KEYS } from '@/chat/patientCardData';
import type { Patient } from '@/types/patient';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';
import { OdontogramPilotService } from '@/services/odontogramPilotService';
import { ExportService } from '@/services/exportService';

interface PatientCardBubbleProps {
  patient: Patient;
  linkType: PatientCaseLinkType;
  metadata?: Record<string, any> | null;
  description?: string | null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PatientCardBubble({ patient, linkType, metadata, description }: PatientCardBubbleProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const title = t(CARD_KIND_TITLE_KEYS[linkType] || 'patientCase');
  const snapshot = (metadata?.patient as Record<string, any>) || {};
  const displayName = patient.nombre_completo || snapshot.nombre_completo || t('patientCase');
  const displayPhone = patient.telefono || snapshot.telefono || '';
  const displayEmail = patient.email || snapshot.email || '';
  const displayDoctor = patient.doctor && patient.doctor !== 'otro' ? patient.doctor : snapshot.doctor;
  const displayAllergies = patient.alergias || snapshot.alergias || '';
  const displayIdNumber = patient.numero_identidad || snapshot.numero_identidad || '';
  const patientId = patient.paciente_id || snapshot.paciente_id || '';

  const handleDownloadPdf = async () => {
    if (!patientId || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const [treatments, odontogram] = await Promise.all([
        CompletedTreatmentService.getCompletedTreatmentsByPatientId(patientId),
        OdontogramPilotService.getActiveOdontogram(patientId),
      ]);
      const pdfPatient = { ...patient, ...snapshot } as Patient;
      await ExportService.exportToPDF(pdfPatient, [], odontogram, treatments, []);
    } catch (error) {
      console.error('Failed to generate patient PDF:', error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const openProfile = () => {
    if (patientId) router.push(`/patient-preview/${patientId}`);
  };

  const openOdontogram = () => {
    if (patientId) router.push(`/odontogram-pilot?id=${patientId}`);
  };

  const actionButtons =
    linkType === PatientCaseLinkType.ODONTOGRAM
      ? [
          {
            label: t('expandFullChart'),
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            onClick: openOdontogram,
            disabled: false,
            iconOverride: null,
            href: undefined,
          },
          {
            label: t('compareWithCurrent'),
            icon: <ChevronRight className="h-3.5 w-3.5" />,
            onClick: openOdontogram,
            disabled: false,
            iconOverride: null,
            href: undefined,
          },
        ]
      : linkType === PatientCaseLinkType.TREATMENT
      ? [
          {
            label: t('openClinicalNotes'),
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            onClick: openProfile,
            disabled: false,
            iconOverride: null,
            href: undefined,
          },
          {
            label: t('downloadPdfReport'),
            icon: downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />,
            onClick: handleDownloadPdf,
            disabled: downloadingPdf,
            iconOverride: null,
            href: undefined,
          },
        ]
      : [
          {
            label: t('viewFullProfile'),
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            onClick: openProfile,
            disabled: false,
            iconOverride: null,
            href: undefined,
          },
          {
            label: t('callPatient'),
            icon: <Phone className="h-3.5 w-3.5" />,
            onClick: () => undefined,
            disabled: false,
            iconOverride: null,
            href: displayPhone ? `tel:${displayPhone}` : undefined,
          },
        ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
        <div className="fd-accent-bg flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
          {getInitials(displayName || '?')}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {title} {displayIdNumber ? `• ${displayIdNumber}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        {linkType === PatientCaseLinkType.CONSENT && (
          <>
            {displayPhone && (
              <a href={`tel:${displayPhone}`} className="flex items-center gap-2 hover:opacity-70">
                <Phone className="h-4 w-4 text-gray-400" />
                {displayPhone}
              </a>
            )}
            {displayEmail && (
              <a href={`mailto:${displayEmail}`} className="flex items-center gap-2 hover:opacity-70">
                <Mail className="h-4 w-4 text-gray-400" />
                {displayEmail}
              </a>
            )}
            {displayDoctor && (
              <p className="flex items-center gap-2">
                <span className="text-gray-400">{t('doctor')}:</span>
                <span>{displayDoctor}</span>
              </p>
            )}
            {displayAllergies && (
              <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="font-medium">{t('allergies')}:</span>
                <span>{displayAllergies}</span>
              </p>
            )}
            {displayIdNumber && (
              <p className="flex items-center gap-2">
                <span className="text-gray-400">{t('identityId')}:</span>
                <span>{displayIdNumber}</span>
              </p>
            )}
          </>
        )}

        {linkType === PatientCaseLinkType.TREATMENT && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('completedProcedures')}
              {typeof metadata?.treatmentsCount === 'number' ? ` (${metadata.treatmentsCount})` : ''}
            </p>
            {metadata?.treatments && metadata.treatments.length > 0 ? (
              <>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-1 pr-2 font-medium text-gray-500 dark:text-gray-400">{t('date')}</th>
                        <th className="pb-1 pr-2 font-medium text-gray-500 dark:text-gray-400">
                          {t('procedure')}
                        </th>
                        <th className="pb-1 pr-2 font-medium text-gray-500 dark:text-gray-400">{t('cdt')}</th>
                        <th className="pb-1 font-medium text-gray-500 dark:text-gray-400">{t('qty')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metadata.treatments.map((tr: any) => (
                        <tr key={tr.id || tr._key} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <td className="py-1 pr-2 whitespace-nowrap">{tr.date || '-'}</td>
                          <td className="py-1 pr-2">{tr.procedure || '-'}</td>
                          <td className="py-1 pr-2">{tr.cdt || '-'}</td>
                          <td className="py-1">{tr.qty || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(metadata.treatmentsTotals || []).map((total: any) => (
                  <p
                    key={total.moneda}
                    className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-200"
                  >
                    {t('treatmentTotal')}: {Number(total.total).toLocaleString()} {total.moneda}
                  </p>
                ))}
              </>
            ) : (
              <p className="mt-1 text-xs text-gray-500">{t('noTreatments')}</p>
            )}
          </div>
        )}

        {linkType === PatientCaseLinkType.ODONTOGRAM && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('odontogramState')}
            </p>
            {metadata?.teethStatus && metadata.teethStatus.length > 0 ? (
              <>
                <div className="mt-2 flex flex-wrap gap-1">
                  {metadata.teethStatus.slice(0, 20).map((tooth: any) => (
                    <span
                      key={tooth.toothNumber}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-medium text-white"
                      style={{
                        backgroundColor: tooth.color || '#6b7280',
                        boxShadow: tooth.status === 'sano' ? 'inset 0 0 0 1px #d1d5db' : undefined,
                      }}
                      title={`#${tooth.toothNumber}: ${tooth.status}`}
                    >
                      {tooth.toothNumber}
                    </span>
                  ))}
                  {metadata.teethStatus.length > 20 && (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 text-[10px] font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                      +{metadata.teethStatus.length - 20}
                    </span>
                  )}
                </div>
                {(metadata.odontogramPlanned > 0 ||
                  metadata.odontogramDiagnostics > 0 ||
                  metadata.odontogramGingivitis > 0) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {metadata.odontogramPlanned > 0 && (
                      <span className="flex items-center gap-1">
                        <ActivityIcon className="h-3 w-3" />
                        {t('plannedTreatments', { n: metadata.odontogramPlanned })}
                      </span>
                    )}
                    {metadata.odontogramDiagnostics > 0 && (
                      <span>{t('diagnostics', { n: metadata.odontogramDiagnostics })}</span>
                    )}
                    {metadata.odontogramGingivitis > 0 && (
                      <span>{t('gingivitis', { n: metadata.odontogramGingivitis })}</span>
                    )}
                  </div>
                )}
                {(metadata.odontogramVersion != null || metadata.odontogramDate) && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {metadata.odontogramVersion != null && (
                      <>
                        {t('odontogramVersion')}: {metadata.odontogramVersion}
                      </>
                    )}
                    {metadata.odontogramVersion != null && metadata.odontogramDate ? ' • ' : ''}
                    {metadata.odontogramDate || ''}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-xs text-gray-500">{t('noOdontogramData')}</p>
            )}
          </div>
        )}

        {description && (
          <p className="pt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 px-4 py-2">
        {actionButtons.map((btn, idx) =>
          btn.href ? (
            <a
              key={idx}
              href={btn.href}
              className="fd-accent-soft-bg fd-accent-soft-border flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium fd-accent-text shadow-sm"
            >
              {btn.icon}
              {btn.label}
            </a>
          ) : (
            <button
              key={idx}
              type="button"
              onClick={btn.onClick}
              disabled={btn.disabled}
              className="fd-accent-soft-bg fd-accent-soft-border flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium fd-accent-text shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {btn.icon}
              {btn.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}