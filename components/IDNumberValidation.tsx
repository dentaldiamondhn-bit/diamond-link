'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface IDValidationResult {
  isUnique: boolean;
  existingPatient?: {
    id: string;
    name: string;
    idNumber: string;
  };
  message: string;
}

interface IDValidationProps {
  idNumber: string;
  patientId?: string; // For edit mode
  onValidationChange?: (result: IDValidationResult) => void;
  disabled?: boolean;
  className?: string;
}

export default function IDNumberValidation({ 
  idNumber, 
  patientId, 
  onValidationChange,
  disabled = false,
  className = ''
}: IDValidationProps) {
  const [validationResult, setValidationResult] = useState<IDValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasBeenValidated, setHasBeenValidated] = useState(false);
  
  // Debounce the ID number to avoid excessive API calls
  const debouncedIdNumber = useDebounce(idNumber, 500);
  
  const validateID = useCallback(async (idToValidate: string) => {
    if (!idToValidate || idToValidate.length < 3) {
      setValidationResult(null);
      setHasBeenValidated(false);
      onValidationChange?.(null);
      return;
    }
    
    setIsValidating(true);
    
    try {
      const params = new URLSearchParams({
        id: idToValidate.trim(),
        ...(patientId && { patientId })
      });
      
      const response = await fetch(`/api/validate-id?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setValidationResult(result);
        setHasBeenValidated(true);
        onValidationChange?.(result);
      } else {
        console.error('❌ ID validation failed:', result);
        setValidationResult({
          isUnique: false,
          message: 'Error validating ID number'
        });
      }
    } catch (error) {
      console.error('❌ Network error validating ID:', error);
      setValidationResult({
        isUnique: false,
        message: 'Network error validating ID'
      });
    } finally {
      setIsValidating(false);
    }
  }, [patientId, onValidationChange]);
  
  // Validate when debounced ID changes
  useEffect(() => {
    if (disabled) return;
    
    if (debouncedIdNumber) {
      validateID(debouncedIdNumber);
    } else {
      setValidationResult(null);
      setHasBeenValidated(false);
      onValidationChange?.(null);
    }
  }, [debouncedIdNumber, validateID, disabled]);
  
  // Don't show anything if no ID number or too short
  if (!idNumber || idNumber.length < 3) {
    return null;
  }
  
  // Show validation state
  const getValidationMessage = () => {
    if (isValidating) {
      return {
        text: 'Verificando...',
        color: 'text-blue-600 dark:text-blue-400',
        icon: 'fas fa-spinner fa-spin'
      };
    }
    
    if (!hasBeenValidated) {
      return null;
    }
    
    if (validationResult?.isUnique) {
      return {
        text: 'Número de Identificación disponible',
        color: 'text-green-600 dark:text-green-400',
        icon: 'fas fa-check-circle'
      };
    }
    
    if (validationResult?.existingPatient) {
      return {
        text: `Ya existe para: ${validationResult.existingPatient.name}`,
        color: 'text-red-600 dark:text-red-400',
        icon: 'fas fa-exclamation-triangle'
      };
    }
    
    return {
      text: validationResult?.message || 'Error verificando',
      color: 'text-red-600 dark:text-red-400',
      icon: 'fas fa-times-circle'
    };
  };
  
  const validationMessage = getValidationMessage();
  
  if (!validationMessage) {
    return null;
  }
  
  return (
    <div className={`mt-1 text-sm flex items-center space-x-2 ${className}`}>
      <i className={`${validationMessage.icon} ${validationMessage.color}`}></i>
      <span className={validationMessage.color}>
        {validationMessage.text}
      </span>
    </div>
  );
}
