'use client';

import { ReactNode } from 'react';
import { TreatmentModalProvider, useTreatmentModal } from '../contexts/TreatmentModalContext';
import TreatmentModal from './TreatmentModal';

interface TreatmentModalWrapperProps {
  children: ReactNode;
  specialties: string[];
  onSubmit: (e: React.FormEvent, mode: 'treatment' | 'promotion', isEdit: boolean, treatmentData: any, promotionData: any) => Promise<void>;
}

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

  return (
    <>
      {children}
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
    </>
  );
}

export { TreatmentModalWrapper };
