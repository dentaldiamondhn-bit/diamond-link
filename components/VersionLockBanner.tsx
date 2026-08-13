'use client';

import React from 'react';
import { OrthodonticVersion } from '@/utils/versionUtils';

interface VersionLockBannerProps {
  isLocked: boolean;
  version: OrthodonticVersion | null;
  onUnlock: () => void;
  onCreateNewVersion: () => void;
}

/**
 * Header controls shown while a historical (read-only) version is loaded:
 *   - "🔒 Historical Version (Read-Only)" status badge
 *   - primary "Create New Version" (forks data into an editable draft)
 *   - secondary "Admin / Support Unlock" (Clerk reverification + admin role)
 */
const VersionLockBanner: React.FC<VersionLockBannerProps> = ({
  isLocked,
  version,
  onUnlock,
  onCreateNewVersion,
}) => {
  if (!version) return null;

  if (!isLocked) {
    return (
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-600/10 dark:bg-emerald-500/20 border border-emerald-600/30 dark:border-emerald-500/30 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          <i className="fas fa-unlock-alt text-emerald-600 dark:text-emerald-400"></i>
          Versión actual (editable)
        </span>
      </div>
    );
  }

  return (
    <div className="mb-6 relative overflow-hidden rounded-xl border border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 p-5 shadow-md">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <span className="text-xl">🔒</span>
            Versión Histórica (Solo Lectura)
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            La versión <strong>v{version.versionNumber}</strong> es de solo lectura para evitar
            modificaciones accidentales. Crea una nueva versión para continuar editando,
            o desbloquéala con verificación de administrador / soporte.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onCreateNewVersion}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200 flex items-center space-x-2 shadow-md"
          >
            <i className="fas fa-plus"></i>
            <span>Crear Nueva Versión</span>
          </button>

          <button
            onClick={onUnlock}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 flex items-center space-x-2 shadow-md"
          >
            <i className="fas fa-user-shield"></i>
            <span>Admin / Support Unlock</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionLockBanner;