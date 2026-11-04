'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import GlassModal from './GlassModal';
import { BTN_DANGER, BTN_SECONDARY_DARK, GLASS_INSET_DARK } from './glassTheme';
import { cn } from '@/lib/utils';

export interface PendingTreatmentDeletion {
  id: string;
  patientName: string;
  treatmentCount: number;
}

export default function DeleteTreatmentModal({
  open,
  onClose,
  treatment,
  deleting,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  treatment: PendingTreatmentDeletion | null;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  if (!treatment) return null;

  const title = deleting ? 'Eliminando Tratamiento...' : 'Eliminar Tratamiento Completado';

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
      maxWidth="max-w-lg"
      footer={
        !deleting ? (
          <>
            <button type="button" onClick={onClose} className={BTN_SECONDARY_DARK}>
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} className={BTN_DANGER} disabled={deleting}>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Eliminar Tratamiento
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-rose-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-400/40 border-t-rose-300" />
            Eliminando tratamiento...
          </span>
        )
      }
    >
      <p className="text-sm text-slate-300">
        {deleting
          ? 'Por favor espere mientras se elimina el tratamiento y todos sus datos relacionados...'
          : `¿Está seguro de que desea eliminar el tratamiento completado de ${treatment.patientName}?`}
      </p>

      {!deleting ? (
        <div className={cn(GLASS_INSET_DARK, 'mt-4 border-amber-500/30 bg-amber-500/5 p-3')}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Esta acción eliminará permanentemente:
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-0.5 text-xs text-amber-200/80">
            <li>El tratamiento completado ({treatment.treatmentCount} items)</li>
            <li>Todos los items de tratamiento asociados</li>
            <li>Los pagos relacionados (si existen)</li>
            <li>La firma digital del paciente (si existe)</li>
            <li>Se ajustará el contador de veces_realizado en los tratamientos originales</li>
          </ul>
          <p className="mt-2 text-xs font-semibold text-amber-300">
            Esta acción no se puede deshacer.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className={cn(GLASS_INSET_DARK, 'mt-4 border-rose-500/30 bg-rose-500/5 p-3')}>
          <p className="text-sm text-rose-300">Error: {error}</p>
        </div>
      ) : null}
    </GlassModal>
  );
}
