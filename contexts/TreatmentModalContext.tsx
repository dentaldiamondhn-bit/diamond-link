'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { TreatmentFormData, PromotionFormData } from '../components/TreatmentModal';
import { TreatmentService } from '../services/treatmentService';
import { Currency } from '../utils/currencyUtils';

interface TreatmentModalContextType {
  isOpen: boolean;
  mode: 'treatment' | 'promotion';
  isEdit: boolean;
  treatmentFormData: TreatmentFormData;
  promotionFormData: PromotionFormData;
  openTreatmentModal: (mode?: 'treatment' | 'promotion', editData?: TreatmentFormData | PromotionFormData) => void;
  closeTreatmentModal: () => void;
  setTreatmentFormData: (data: TreatmentFormData) => void;
  setPromotionFormData: (data: PromotionFormData) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  specialties: string[];
  handleSpecialtyChange: (newSpecialty: string) => Promise<void>;
}

const TreatmentModalContext = createContext<TreatmentModalContextType | undefined>(undefined);

interface TreatmentModalProviderProps {
  children: ReactNode;
  specialties: string[];
  onSubmit: (e: React.FormEvent, mode: 'treatment' | 'promotion', isEdit: boolean, treatmentData: TreatmentFormData, promotionData: PromotionFormData) => Promise<void>;
}

export function TreatmentModalProvider({ children, specialties, onSubmit }: TreatmentModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'treatment' | 'promotion'>('treatment');
  const [isEdit, setIsEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [treatmentFormData, setTreatmentFormData] = useState<TreatmentFormData>({
    id: undefined,
    codigo: '',
    nombre: '',
    especialidad: '',
    precio: 0,
    moneda: 'HNL', // Default currency
    veces_realizado: 0,
    activo: true
  });

  const [promotionFormData, setPromotionFormData] = useState<PromotionFormData>({
    id: undefined,
    codigo: '',
    nombre: '',
    descuento: 0,
    precio_original: 0,
    precio_promocional: 0,
    moneda: 'HNL', // Default currency
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
    veces_realizado: 0
  });

  const openTreatmentModal = (newMode: 'treatment' | 'promotion' = 'treatment', editData?: TreatmentFormData | PromotionFormData) => {
    setMode(newMode);
    setIsEdit(!!editData);
    
    if (editData) {
      if (newMode === 'treatment') {
        setTreatmentFormData(editData as TreatmentFormData);
      } else {
        setPromotionFormData(editData as PromotionFormData);
      }
    } else {
      // Reset form data for new item
      if (newMode === 'treatment') {
        setTreatmentFormData({
          id: undefined,
          codigo: '',
          nombre: '',
          especialidad: '',
          precio: 0,
          moneda: 'HNL', // Default currency
          veces_realizado: 0,
          activo: true
        });
      } else {
        setPromotionFormData({
          id: undefined,
          codigo: '',
          nombre: '',
          descuento: 0,
          precio_original: 0,
          precio_promocional: 0,
          moneda: 'HNL', // Default currency
          fecha_inicio: '',
          fecha_fin: '',
          activo: true,
          veces_realizado: 0
        });
      }
    }
    
    setIsOpen(true);
  };

  const closeTreatmentModal = () => {
    setIsOpen(false);
    setIsEdit(false);
  };

  // Auto-generate code when specialty changes (only for new treatments)
  const handleSpecialtyChange = async (newSpecialty: string) => {
    if (!isEdit && newSpecialty) {
      try {
        const nextCode = await TreatmentService.generateNextCode(newSpecialty);
        setTreatmentFormData(prev => ({
          ...prev,
          especialidad: newSpecialty,
          codigo: nextCode
        }));
      } catch (error) {
        console.error('Error generating code:', error);
        // Fallback: just update specialty without code
        setTreatmentFormData(prev => ({
          ...prev,
          especialidad: newSpecialty
        }));
      }
    } else {
      // For edits, just update specialty
      setTreatmentFormData(prev => ({
        ...prev,
        especialidad: newSpecialty
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      await onSubmit(e, mode, isEdit, treatmentFormData, promotionFormData);
      
      // Close modal and reset form - just like the working tratamientos page
      closeTreatmentModal();
      
      // Reset form data
      if (mode === 'treatment') {
        setTreatmentFormData({
          id: undefined,
          codigo: '',
          nombre: '',
          especialidad: '',
          precio: 0,
          moneda: 'HNL', // Default currency
          veces_realizado: 0,
          activo: true
        });
      } else {
        setPromotionFormData({
          id: undefined,
          codigo: '',
          nombre: '',
          descuento: 0,
          precio_original: 0,
          precio_promocional: 0,
          moneda: 'HNL', // Default currency
          fecha_inicio: '',
          fecha_fin: '',
          activo: true,
          veces_realizado: 0
        });
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      // Error handling is done in the parent component
    }
  };

  const value: TreatmentModalContextType = {
    isOpen,
    mode,
    isEdit,
    treatmentFormData,
    promotionFormData,
    openTreatmentModal,
    closeTreatmentModal,
    setTreatmentFormData,
    setPromotionFormData,
    isSubmitting,
    setIsSubmitting,
    onSubmit: handleSubmit,
    specialties,
    handleSpecialtyChange
  };

  return (
    <TreatmentModalContext.Provider value={value}>
      {children}
    </TreatmentModalContext.Provider>
  );
}

export function useTreatmentModal() {
  const context = useContext(TreatmentModalContext);
  if (context === undefined) {
    throw new Error('useTreatmentModal must be used within a TreatmentModalProvider');
  }
  return context;
}
