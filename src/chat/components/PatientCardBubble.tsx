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
import { CARD_KIND_TITLE_KEYS, getPatientAge } from '@/chat/patientCardData';
import OdontogramMini from '@/chat/components/OdontogramMini';
import type { Patient } from '@/types/patient';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';
import { OdontogramPilotService } from '@/services/odontogramPilotService';
import { ExportService } from '@/services/exportService';
import { formatPhoneDisplay, createWhatsAppUrl } from '@/utils/phoneUtils';

interface PatientCardBubbleProps {
  patient: Patient;
  linkType: PatientCaseLinkType;
  metadata?: Record<string, any> | null;
  description?: string | null;
}

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  iconOverride?: React.ReactNode | null;
  href?: string;
  whatsapp?: boolean;
}

const WHATSAPP_GREEN = '#25D366';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function dateOnly(value: string | undefined): string {
  if (!value) return '-';
  const clean = value.slice(0, 10);
  return clean || '-';
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
  const countryCode = patient.codigopais || snapshot.codigopais || '504';
  const displayPhoneWithCode = formatPhoneDisplay(displayPhone, countryCode);
  const whatsappUrl = displayPhone ? createWhatsAppUrl(displayPhone, null, countryCode) : '';
  const displayEmail = patient.email || snapshot.email || '';
  const displayDoctor = patient.doctor && patient.doctor !== 'otro' ? patient.doctor : snapshot.doctor;
  const displayIdNumber = patient.numero_identidad || snapshot.numero_identidad || '';
  const displayAge = getPatientAge(
    patient.fecha_nacimiento || snapshot.fecha_nacimiento,
    typeof patient.edad === 'number' ? patient.edad : (snapshot.edad as number | undefined)
  );
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

  const actionButtons: ActionButton[] =
    linkType === PatientCaseLinkType.ODONTOGRAM
      ? [
          {
            label: t('expandFullChart'),
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            onClick: openOdontogram,
            disabled: false,
          },
          {
            label: t('compareWithCurrent'),
            icon: <ChevronRight className="h-3.5 w-3.5" />,
            onClick: openOdontogram,
            disabled: false,
          },
        ]
      : linkType === PatientCaseLinkType.TREATMENT
      ? [
          {
            label: t('openClinicalNotes'),
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            onClick: openProfile,
            disabled: false,
          },
          {
            label: t('downloadPdfReport'),
            icon: downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />,
            onClick: handleDownloadPdf,
            disabled: downloadingPdf,
          },
        ]
      : [
          {
            label: t('viewFullProfile'),
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            onClick: openProfile,
            disabled: false,
          },
          {
            label: t('whatsapp'),
            icon: <WhatsAppIcon className="h-3.5 w-3.5" />,
            onClick: () => undefined,
            disabled: false,
            href: whatsappUrl || undefined,
            whatsapp: true,
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
              <a
                href={`tel:${countryCode}${displayPhone.replace(/[\s\-()]/g, '')}`}
                className="flex items-center gap-2 hover:opacity-70"
              >
                <Phone className="h-4 w-4 text-gray-400" />
                {displayPhoneWithCode}
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
            {displayAge != null && (
              <p className="flex items-center gap-2">
                <span className="text-gray-400">{t('age')}:</span>
                <span>{displayAge} años</span>
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
                        <th className="pb-1 pr-2 font-medium text-gray-500 dark:text-gray-400">{t('qty')}</th>
                        <th className="pb-1 font-medium text-gray-500 dark:text-gray-400">{t('payment')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metadata.treatments.map((tr: any) => (
                        <tr key={tr.id || tr._key} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <td className="py-1 pr-2 whitespace-nowrap">{dateOnly(tr.date)}</td>
                          <td className="py-1 pr-2">{tr.procedure || '-'}</td>
                          <td className="py-1 pr-2">{tr.qty || 0}</td>
                          <td className="py-1 whitespace-nowrap">
                            {typeof tr.payment === 'number' ? tr.payment.toLocaleString() : '-'}
                          </td>
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
                <OdontogramMini
                  teethStatus={metadata.teethStatus}
                  child={metadata.odontogramType === 'nino'}
                />
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
                    {(metadata.odontogramDate || '').slice(0, 10)}
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
              target={btn.href.startsWith('http') ? '_blank' : undefined}
              rel={btn.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ${
                btn.whatsapp
                  ? 'text-white hover:opacity-80'
                  : 'fd-accent-soft-bg fd-accent-soft-border border fd-accent-text'
              }`}
              style={btn.whatsapp ? { backgroundColor: WHATSAPP_GREEN } : undefined}
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