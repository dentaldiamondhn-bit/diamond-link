'use client';

import React from 'react';
import { useChartStore } from '@/lib/store/useChartStore';
import { RemoteControlMode } from '@/lib/types';
import { Switch } from '@/components/ui/switch';

const REMOTE_CONTROLS = [
  { mode: 'bop' as RemoteControlMode, label: 'BOP', icon: '🩸', active: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { mode: 'plaque' as RemoteControlMode, label: 'PI', icon: '🦠', active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { mode: '5mm' as RemoteControlMode, label: '≥5mm', icon: '⚠️', active: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { mode: '6mmplus' as RemoteControlMode, label: '≥6mm', icon: '🔴', active: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
] as const;

const LAYER_CONTROLS = [
  { key: 'pockets', label: 'Bolsas', dot: '#3b82f6', active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { key: 'bone', label: 'Hueso', dot: '#a855f7', active: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  { key: 'furcation', label: 'Furcación', dot: '#f97316', active: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  { key: 'plaque', label: 'Placa', dot: '#06b6d4', active: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  { key: 'bop', label: 'BOP', dot: '#ef4444', active: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { key: 'mobility', label: 'Movilidad', dot: '#22c55e', active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
] as const;

export function RemoteControlPanel({ className = '' }: { className?: string }) {
  const {
    activeRemoteControl,
    setActiveRemoteControl,
    viewStatus,
    setViewStatus,
    isGmInverted,
    toggleGmInverted,
    isMirrored,
    toggleMirrored,
    activeIndices,
    setActiveIndices,
    isOverlayMode,
    setOverlayMode,
    calculateAllAL,
    calculateIndices,
  } = useChartStore();

  const handleModeChange = (mode: RemoteControlMode) => {
    setActiveRemoteControl(mode);
    if (mode === 'bop') {
      setActiveIndices({ bop: true, plaque: false });
    } else if (mode === 'plaque') {
      setActiveIndices({ plaque: true, bop: false });
    } else if (mode === '5mm' || mode === '6mmplus') {
      setActiveIndices({ pockets: true });
    }
  };

  const handleViewStatusChange = (status: 0 | 1 | 2) => {
    setViewStatus(status);
    if (status === 2) calculateAllAL();
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Modo Pintura</span>
        <div className="flex items-center gap-1">
          {REMOTE_CONTROLS.map(ctrl => (
            <button
              key={ctrl.mode}
              onClick={() => handleModeChange(ctrl.mode)}
              className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1 ${activeRemoteControl === ctrl.mode
                ? `${ctrl.active} shadow-sm`
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={ctrl.label}
            >
              <span className="text-lg">{ctrl.icon}</span>
              <span className="hidden sm:inline text-xs font-medium">{ctrl.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vista</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewStatusChange(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewStatus === 0
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Profundidad de Sondaje (PS)"
          >
            PS
          </button>
          <button
            onClick={() => handleViewStatusChange(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewStatus === 1
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Margen Gingival (MG)"
          >
            MG
          </button>
          <button
            onClick={() => handleViewStatusChange(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewStatus === 2
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Nivel de Inserción Clínica (NIC)"
          >
            NIC
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capas</span>
        <div className="flex items-center gap-1">
          {LAYER_CONTROLS.map(layer => (
            <button
              key={layer.key}
              onClick={() => setActiveIndices({ [layer.key]: !activeIndices[layer.key as keyof typeof activeIndices] })}
              className={`p-2 rounded-lg transition-all flex items-center gap-1 ${activeIndices[layer.key as keyof typeof activeIndices]
                ? `${layer.active} shadow-sm`
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={layer.label}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: layer.dot }} />
              <span className="hidden sm:inline text-xs">{layer.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opciones</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={isGmInverted}
              onCheckedChange={toggleGmInverted}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline">MG Invertida</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 sm:hidden" title="MG Invertida">MG↑</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={isMirrored}
              onCheckedChange={toggleMirrored}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline">Espejo</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 sm:hidden" title="Espejo">↔</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setOverlayMode(!isOverlayMode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
            isOverlayMode
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Comparar con el estudio periodontal anterior"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m12 2 9 5-9 5-9-5 9-5Z" />
            <path d="m3 12 9 5 9-5" />
            <path d="m3 17 9 5 9-5" />
          </svg>
          <span className="hidden sm:inline">Comparativa</span>
        </button>
        <button
          onClick={() => { calculateAllAL(); calculateIndices(); }}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
          title="Recalcular NIC e Índices"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span className="hidden sm:inline">Recalcular</span>
        </button>
      </div>
    </div>
  );
}