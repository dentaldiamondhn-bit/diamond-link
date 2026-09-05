'use client';

import { Phone, Mail, UserPlus, FileText, ExternalLink, ChevronRight } from 'lucide-react';
import { PatientCaseLinkType } from '@/types/chat';
import type { Patient } from '@/types/patient';

interface PatientCardBubbleProps {
  patient: Patient;
  linkType: PatientCaseLinkType;
  metadata?: Record<string, any> | null;
  description?: string | null;
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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PatientCardBubble({ patient, linkType, metadata, description }: PatientCardBubbleProps) {
  const title = CARD_KIND_LABEL[linkType] || 'Patient Card';

  const actionButtons = linkType === 'odontogram'
    ? [
        { label: 'Expand Full Chart', icon: <ExternalLink className="h-3.5 w-3.5" /> },
        { label: 'Compare with Current', icon: <ChevronRight className="h-3.5 w-3.5" /> },
      ]
    : linkType === 'treatment'
    ? [
        { label: 'Open Clinical Notes', icon: <ExternalLink className="h-3.5 w-3.5" /> },
        { label: 'Download PDF', icon: <FileText className="h-3.5 w-3.5" /> },
      ]
    : [
        { label: 'View Full Profile', icon: <ExternalLink className="h-3.5 w-3.5" /> },
        { label: 'Import to My Patients', icon: <UserPlus className="h-3.5 w-3.5" /> },
      ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
          {getInitials(patient.nombre_completo || '?')}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{patient.nombre_completo}</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {title} {patient.numero_identidad ? `• ${patient.numero_identidad}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        {linkType === 'consent' && (
          <>
            {patient.telefono && (
              <a href={`tel:${patient.telefono}`} className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400">
                <Phone className="h-4 w-4 text-gray-400" />
                {patient.telefono}
              </a>
            )}
            {patient.email && (
              <a href={`mailto:${patient.email}`} className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400">
                <Mail className="h-4 w-4 text-gray-400" />
                {patient.email}
              </a>
            )}
            {patient.doctor && (
              <p className="flex items-center gap-2">
                <span className="text-gray-400">Doctor:</span>
                <span>{patient.doctor}</span>
              </p>
            )}
            {patient.alergias && (
              <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="font-medium">Allergies:</span>
                <span>{patient.alergias}</span>
              </p>
            )}
          </>
        )}

        {linkType === 'treatment' && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Completed Procedures
            </p>
            {metadata?.treatments && metadata.treatments.length > 0 ? (
              <div className="mt-2 max-h-40 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-1 font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="pb-1 font-medium text-gray-500 dark:text-gray-400">Tooth</th>
                      <th className="pb-1 font-medium text-gray-500 dark:text-gray-400">Procedure</th>
                      <th className="pb-1 font-medium text-gray-500 dark:text-gray-400">CDT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metadata.treatments.map((tr: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <td className="py-1">{tr.date || '-'}</td>
                        <td className="py-1">{tr.tooth || '-'}</td>
                        <td className="py-1">{tr.procedure || '-'}</td>
                        <td className="py-1">{tr.cdt || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Treatment summary included.</p>
            )}
          </div>
        )}

        {linkType === 'odontogram' && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Odontogram State
            </p>
            {metadata?.teethStatus && metadata.teethStatus.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {metadata.teethStatus.slice(0, 12).map((tooth: any) => (
                  <span
                    key={tooth.toothNumber}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-medium text-white"
                    style={{ backgroundColor: tooth.color || '#6b7280' }}
                    title={`#${tooth.toothNumber}: ${tooth.status}`}
                  >
                    {tooth.toothNumber}
                  </span>
                ))}
                {metadata.teethStatus.length > 12 && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 text-[10px] font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                    +{metadata.teethStatus.length - 12}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Odontogram snapshot included.</p>
            )}
          </div>
        )}

        {description && (
          <p className="pt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 px-4 py-2">
        {actionButtons.map((btn, idx) => (
          <button
            key={idx}
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            {btn.icon}
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
