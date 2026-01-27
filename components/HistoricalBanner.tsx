import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import HistoricalBadge from './HistoricalBadge';

interface HistoricalBannerProps {
  isHistorical: boolean;
  isBypassed: boolean;
  patientId?: string;
  onBypassChange?: (bypassed: boolean) => void;
  loading?: boolean;
  showBypassToggle?: boolean;
  compact?: boolean;
}

export function HistoricalBanner({
  isHistorical,
  isBypassed,
  patientId,
  onBypassChange,
  loading = false,
  showBypassToggle = true,
  compact = false
}: HistoricalBannerProps) {
  const { user } = useUser();
  const [localBypass, setLocalBypass] = useState(isBypassed);

  // Always show banner if patient is historical (regardless of bypass state)
  if (!isHistorical) return null;

  const handleBypassToggle = async (newBypassValue: boolean) => {
    setLocalBypass(newBypassValue);
    
    if (onBypassChange) {
      try {
        await onBypassChange(newBypassValue);
      } catch (error) {
        // Revert on error
        setLocalBypass(isBypassed);
        console.error('Failed to update bypass setting:', error);
      }
    }
  };

  // Dynamic color classes based on bypass state
  const bannerColors = localBypass 
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
  
  const textColors = localBypass
    ? 'text-green-900 dark:text-green-100'
    : 'text-amber-900 dark:text-amber-100';
  
  const subTextColors = localBypass
    ? 'text-green-700 dark:text-green-300'
    : 'text-amber-700 dark:text-amber-300';
  
  const toggleColors = localBypass
    ? 'peer-checked:bg-green-600 peer-focus:ring-green-300 dark:peer-focus:ring-green-800'
    : 'peer-checked:bg-amber-600 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800';

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg ${bannerColors}`}>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${subTextColors}`}>
            {localBypass ? 'Modo normal activado' : 'Modo histórico activo'}
          </span>
        </div>
        
        {showBypassToggle && (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localBypass}
              onChange={(e) => handleBypassToggle(e.target.checked)}
              disabled={loading}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${toggleColors}`}></div>
            <span className={`ml-3 text-sm font-medium ${textColors}`}>
              {loading ? "Cargando..." : `${localBypass ? "Desactivar" : "Activar"} Firmas`}
            </span>
          </label>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${bannerColors}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className={`text-sm ${subTextColors}`}>
            {localBypass ? 'Modo normal activado' : 'Modo histórico activo'}
          </span>
        </div>
        
        {showBypassToggle && (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localBypass}
              onChange={(e) => handleBypassToggle(e.target.checked)}
              disabled={loading}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${toggleColors}`}></div>
            <span className={`ml-3 text-sm font-medium ${textColors}`}>
              {loading ? "Cargando..." : `${localBypass ? "Desactivar" : "Activar"} Firmas`}
            </span>
          </label>
        )}
      </div>
      
      <div className={`mt-3 p-3 rounded-lg ${localBypass ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
        <p className={`text-sm ${localBypass ? 'text-green-800 dark:text-green-200' : 'text-blue-800 dark:text-blue-200'}`}>
          {localBypass ? (
            <>
              <i className="fas fa-check-circle mr-2"></i>
              <strong>Modo Normal Activado:</strong> Este paciente se tratará como un registro activo. 
              Se requerirán firmas digitales y se aplicarán los precios estándar de los tratamientos.
            </>
          ) : (
            <>
              <i className="fas fa-history mr-2"></i>
              <strong>Modo Histórico:</strong> Este es un registro transcribo de documentos físicos. 
              Los tratamientos no tienen costo y no requieren firma digital (ya firmada físicamente).
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default HistoricalBanner;
