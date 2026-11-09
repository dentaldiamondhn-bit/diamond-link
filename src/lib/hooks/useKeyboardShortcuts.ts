import { useEffect, useCallback } from 'react';
import { useChartStore } from '@/lib/store/useChartStore';
import { useChartData } from './useChartData';

export function useKeyboardShortcuts() {
  const { setViewStatus, toggleGmInverted, toggleMirrored } = useChartStore();
  const { calculateAL } = useChartData();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
      return;
    }

    switch (event.key) {
      case '1':
        event.preventDefault();
        setViewStatus(0);
        break;
      case '2':
        event.preventDefault();
        setViewStatus(1);
        break;
      case '3':
        event.preventDefault();
        setViewStatus(2);
        break;
      case 'i':
        event.preventDefault();
        toggleGmInverted();
        break;
      case 'm':
        event.preventDefault();
        toggleMirrored();
        break;
      case 'r':
        event.preventDefault();
        calculateAL();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        break;
    }
  }, [setViewStatus, toggleGmInverted, toggleMirrored, calculateAL]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}