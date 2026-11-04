'use client';

import { ReactNode, useRef } from 'react';
import { Stethoscope, Tag } from 'lucide-react';
import { TreatmentModalProvider, useTreatmentModal } from '../contexts/TreatmentModalContext';
import TreatmentModal from './TreatmentModal';
import GlassModal from './tratamientos-completados/GlassModal';
import { BTN_PRIMARY, BTN_SECONDARY_DARK } from './tratamientos-completados/glassTheme';

interface TreatmentModalWrapperProps {
  children: ReactNode;
  specialties: string[];
  onSubmit: (e: React.FormEvent, mode: 'treatment' | 'promotion', isEdit: boolean, treatmentData: any, promotionData: any) => Promise<void>;
}

const LEGACY_FORM_RESET = [
  '[&>div]:!static',
  '[&>div]:!z-auto',
  '[&>div]:!overflow-visible',
  '[&>div>div]:!block',
  '[&>div>div]:!min-h-0',
  '[&>div>div]:!p-0',
  '[&>div>div]:!text-left',
  '[&_[aria-hidden="true"]]:!hidden',
  '[&>div>div>div:not([aria-hidden="true"])]:!block',
  '[&>div>div>div:not([aria-hidden="true"])]:!w-full',
  '[&>div>div>div:not([aria-hidden="true"])]:!max-w-none',
  '[&>div>div>div:not([aria-hidden="true"])]:!my-0',
  '[&>div>div>div:not([aria-hidden="true"])]:!rounded-none',
  '[&>div>div>div:not([aria-hidden="true"])]:!bg-transparent',
  '[&>div>div>div:not([aria-hidden="true"])]:!shadow-none',
  '[&>div>div>div:not([aria-hidden="true"])]:!overflow-visible',
  '[&>div>div>div:not([aria-hidden="true"])]:!transform-none',
  '[&_form>div:first-child]:!bg-transparent',
  '[&_form>div:first-child]:!p-0',
  '[&_form>div:first-child>div:first-child]:!hidden',
  '[&_form>div:last-child]:!hidden',
  '[&_form_label]:!text-slate-300',
  '[&_form_input]:!rounded-lg',
  '[&_form_input]:!border-slate-800',
  '[&_form_input]:!bg-slate-950/60',
  '[&_form_input]:!text-slate-100',
  '[&_form_input]:!shadow-none',
  '[&_form_input:focus]:!border-emerald-500',
  '[&_form_input:focus]:!ring-1',
  '[&_form_input:focus]:!ring-emerald-500/50',
  '[&_form_input[type="checkbox"]]:!border-slate-700',
  '[&_form_input[type="checkbox"]]:!bg-slate-900',
  '[&_form_input[type="checkbox"]]:!text-emerald-600',
  '[&_form_select]:!rounded-lg',
  '[&_form_select]:!border-slate-800',
  '[&_form_select]:!bg-slate-950/60',
  '[&_form_select]:!text-slate-100',
  '[&_form_select]:!shadow-none',
  '[&_form_select:focus]:!border-emerald-500',
  '[&_form_select:focus]:!ring-1',
  '[&_form_select:focus]:!ring-emerald-500/50',
  '[&_form_textarea]:!rounded-lg',
  '[&_form_textarea]:!border-slate-800',
  '[&_form_textarea]:!bg-slate-950/60',
  '[&_form_textarea]:!text-slate-100',
  '[&_form_textarea]:!shadow-none',
  '[&_form_textarea:focus]:!border-emerald-500',
  '[&_form_textarea:focus]:!ring-1',
  '[&_form_textarea:focus]:!ring-emerald-500/50',
  '[&_form_p]:!text-slate-400',
  '[&_form_span]:!text-slate-400',
].join(' ');

function TreatmentModalWrapper({ children, specialties, onSubmit }: TreatmentModalWrapperProps) {
  return (
    <TreatmentModalProvider specialties={specialties} onSubmit={onSubmit}>
      <TreatmentModalContent>
        {children}
      </TreatmentModalContent>
    </TreatmentModalProvider>
  );
}

function TreatmentModalContent({ children }: { children: ReactNode }) {
  const {
    isOpen,
    mode,
    isEdit,
    treatmentFormData,
    promotionFormData,
    closeTreatmentModal,
    setTreatmentFormData,
    setPromotionFormData,
    isSubmitting,
    onSubmit,
    specialties,
    handleSpecialtyChange
  } = useTreatmentModal();

  const formHostRef = useRef<HTMLDivElement>(null);

  const submitForm = () => {
    const form = formHostRef.current?.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  const modalTitle =
    mode === 'treatment'
      ? (isEdit ? 'Editar Tratamiento' : 'Nuevo Tratamiento')
      : (isEdit ? 'Editar Promoción' : 'Nueva Promoción');

  return (
    <>
      {children}
      <GlassModal
        open={isOpen}
        onClose={closeTreatmentModal}
        title={modalTitle}
        icon={
          mode === 'treatment' ? (
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Tag className="h-5 w-5" aria-hidden="true" />
          )
        }
        maxWidth="max-w-2xl"
        footer={
          <>
            <button type="button" onClick={closeTreatmentModal} className={BTN_SECONDARY_DARK}>
              Cancelar
            </button>
            <button type="button" onClick={submitForm} disabled={isSubmitting} className={BTN_PRIMARY}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className={`dark max-h-[70vh] overflow-y-auto pr-1 ${LEGACY_FORM_RESET}`}>
          <TreatmentModal
            isOpen={isOpen}
            onClose={closeTreatmentModal}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            mode={mode}
            isEdit={isEdit}
            treatmentFormData={treatmentFormData}
            setTreatmentFormData={setTreatmentFormData}
            promotionFormData={promotionFormData}
            setPromotionFormData={setPromotionFormData}
            specialties={specialties}
            handleSpecialtyChange={handleSpecialtyChange}
          />
        </div>
      </GlassModal>
    </>
  );
}

export { TreatmentModalWrapper };
