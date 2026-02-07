'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface HistoricalModeContextType {
  // Current state
  isHistoricalMode: boolean;
  bypassHistoricalMode: boolean;
  currentPatient: string | null;
  loading: boolean;
  
  // Actions
  toggleHistoricalMode: () => void;
  setBypassHistoricalMode: (value: boolean) => void;
  setCurrentPatient: (patientId: string) => void;
  
  // Enhanced methods
  loadPatientSettings: (patientId: string) => Promise<void>;
  savePatientSettings: (patientId: string, bypass: boolean) => Promise<void>;
  getEffectiveMode: () => 'historical' | 'active' | 'bypassed';
}

const HistoricalModeContext = createContext<HistoricalModeContextType | undefined>(undefined);

export function HistoricalModeProvider({ children }: { children: ReactNode }) {
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);
  const [bypassHistoricalMode, setBypassHistoricalMode] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleHistoricalMode = () => {
    setIsHistoricalMode(prev => !prev);
  };

  // Load patient-specific settings
  const loadPatientSettings = async (patientId: string) => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      
      const { data, error } = await supabase
        .from('historical_mode_settings')
        .select('bypass_historical_mode')
        .eq('patient_id', patientId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error loading patient settings:', error);
      }
      
      const bypassValue = data?.bypass_historical_mode ?? false;
      // Only update if value actually changed to prevent infinite loops
      setBypassHistoricalMode(prev => {
        if (prev !== bypassValue) {
          setCurrentPatient(patientId);
          return bypassValue;
        }
        return prev;
      });
    } catch (error) {
      console.error('Unexpected error loading patient settings:', error);
      setBypassHistoricalMode(false);
    } finally {
      setLoading(false);
    }
  };

  // Save patient-specific settings (global across all users)
  const savePatientSettings = async (patientId: string, bypass: boolean) => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      
      // First try to update existing record
      const { data: existingData, error: fetchError } = await supabase
        .from('historical_mode_settings')
        .select('id')
        .eq('patient_id', patientId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing setting:', fetchError);
        throw fetchError;
      }
      
      let error;
      
      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('historical_mode_settings')
          .update({
            bypass_historical_mode: bypass,
            updated_at: new Date().toISOString()
          })
          .eq('patient_id', patientId);
        
        error = updateError;
      } else {
        // Insert new record (provide placeholder for clerk_user_id since it's still required)
        const { error: insertError } = await supabase
          .from('historical_mode_settings')
          .insert({
            patient_id: patientId,
            clerk_user_id: 'system-migration-placeholder', // Clear placeholder value
            bypass_historical_mode: bypass,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        error = insertError;
      }
      
      if (error) {
        console.error('Error saving patient setting:', error);
        throw error;
      }
      
      // Only update if value actually changed to prevent infinite loops
      setBypassHistoricalMode(prev => {
        if (prev !== bypass) {
          return bypass;
        }
        return prev;
      });
    } catch (error) {
      console.error('Unexpected error saving patient settings:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get effective mode for current patient
  const getEffectiveMode = (): 'historical' | 'active' | 'bypassed' => {
    if (!currentPatient) return 'active';
    if (!isHistoricalMode) return 'active';
    return bypassHistoricalMode ? 'bypassed' : 'historical';
  };

  return (
    <HistoricalModeContext.Provider value={{ 
      isHistoricalMode, 
      toggleHistoricalMode, 
      bypassHistoricalMode, 
      setBypassHistoricalMode, 
      setCurrentPatient, 
      currentPatient,
      loading,
      loadPatientSettings,
      savePatientSettings,
      getEffectiveMode
    }}>
      {children}
    </HistoricalModeContext.Provider>
  );
}

export function useHistoricalMode() {
  const context = useContext(HistoricalModeContext);
  if (context === undefined) {
    throw new Error('useHistoricalMode must be used within a HistoricalModeProvider');
  }
  return context;
}
