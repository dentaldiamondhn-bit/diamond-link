import { useEffect, useRef, useCallback } from 'react';
import { useChartStore } from '@/lib/store/useChartStore';
import { usePatientStore } from '@/lib/store/usePatientStore';

export function useAutoSave(interval = 30000) {
  const { isDirty, collectDataAsJson } = useChartStore();
  const { activePatientId, activeChartId, updateChart, saveToStorage } = usePatientStore();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const flushRef = useRef<() => void>();

  const flush = useCallback(async () => {
    if (!isDirty || !activePatientId || !activeChartId) return;

    const chartData = collectDataAsJson();
    const success = updateChart(activePatientId, {
      id: activeChartId,
      json_data: JSON.stringify(chartData),
      date: chartData.date,
      patient_first_name: chartData.patient_first_name,
      patient_last_name: chartData.patient_last_name,
      patient_dob: chartData.patient_dob,
      clinician: chartData.clinician,
      initial_exam: chartData.initial_exam === 1,
      reevaluation: chartData.reevaluation === 1,
      reevaluation_note: chartData.reevaluation_note,
      created_at: new Date().toISOString(),
    });

    if (success) {
      saveToStorage();
      useChartStore.getState().markDirty(false);
    }
  }, [isDirty, activePatientId, activeChartId, collectDataAsJson, updateChart, saveToStorage]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    if (isDirty) {
      timeoutRef.current = setTimeout(() => {
        flushRef.current?.();
      }, interval);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isDirty, interval]);

  return { flush };
}