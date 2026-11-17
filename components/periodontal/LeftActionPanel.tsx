'use client';

import React from 'react';
import {
  Activity,
  Box,
  CalendarClock,
  ClipboardList,
  Copy,
  Download,
  Droplet,
  QrCode,
  Ruler,
  Save,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
} from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';

export type ClinicalModalKey =
  | 'classification'
  | 'summary'
  | 'analysis'
  | 'interval'
  | 'three-d'
  | 'qr'
  | 'calibration'
  | 'profile'
  | 'aiprompt'
  | 'general-health'
  | 'general-health-editor'
  | 'microbiology';

interface LeftActionPanelProps {
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenModal: (key: ClinicalModalKey) => void;
  onNewVersion: () => void;
  isEditingVersion: boolean;
  disabled?: boolean;
}

interface ModeButton {
  id: string;
  label: string;
  color: string;
  ring: string;
}

const MODE_BUTTONS: ModeButton[] = [
  {
    id: 'plaque',
    label: 'Placa',
    color: 'bg-blue-500 text-white',
    ring: 'ring-blue-500',
  },
  {
    id: 'bop',
    label: 'BOP',
    color: 'bg-red-500 text-white',
    ring: 'ring-red-500',
  },
  {
    id: '5mm',
    label: '5mm',
    color: 'bg-amber-400 text-gray-900',
    ring: 'ring-amber-400',
  },
  {
    id: '6mmplus',
    label: '≥6mm',
    color: 'bg-red-600 text-white',
    ring: 'ring-red-600',
  },
  {
    id: 'pra',
    label: 'PRA',
    color: 'bg-purple-600 text-white',
    ring: 'ring-purple-600',
  },
];

const MODAL_BUTTONS: { key: ClinicalModalKey; label: string; icon: React.ElementType }[] = [
  { key: 'classification', label: 'Clasificación', icon: Stethoscope },
  { key: 'summary', label: 'Resumen', icon: ClipboardList },
  { key: 'analysis', label: 'Análisis', icon: ScanLine },
  { key: 'interval', label: 'Intervalo', icon: CalendarClock },
  { key: 'three-d', label: '3D', icon: Box },
  { key: 'qr', label: 'Código QR', icon: QrCode },
  { key: 'calibration', label: 'Calibración', icon: Ruler },
  { key: 'profile', label: 'Perfil', icon: Activity },
  { key: 'aiprompt', label: 'Prompt IA', icon: Sparkles },
  { key: 'general-health', label: 'Salud General', icon: Stethoscope },
  { key: 'general-health-editor', label: 'Editor Salud', icon: ClipboardList },
  { key: 'microbiology', label: 'Microbiología', icon: Box },
];

export function LeftActionPanel({
  onSave,
  onExport,
  onImport,
  onOpenModal,
  onNewVersion,
  isEditingVersion,
  disabled = false,
}: LeftActionPanelProps) {
  const activeRemoteControl = useChartStore(state => state.activeRemoteControl);
  const setActiveRemoteControl = useChartStore(state => state.setActiveRemoteControl);

  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {isEditingVersion ? 'Actualizar Versión' : 'Guardar'}
      </button>

      <button
        type="button"
        onClick={onNewVersion}
        disabled={disabled || !isEditingVersion}
        title={isEditingVersion ? 'Crear una nueva versión a partir del estudio cargado' : 'Cargue un estudio guardado (Editar) para poder crear una nueva versión'}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Copy className="h-4 w-4" />
        Nueva Versión
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={disabled}
          className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-2 text-[10px] font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={disabled}
          className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-2 text-[10px] font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          Importar
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-1.5 border-t border-gray-200 dark:border-gray-700 pt-3">
        {MODE_BUTTONS.map(button => {
          const active = activeRemoteControl === button.id;
          return (
            <button
              key={button.id}
              type="button"
              onClick={() => setActiveRemoteControl(active ? 'pockets' : button.id)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
                active
                  ? `${button.color} ring-2 ring-offset-1 ${button.ring} dark:ring-offset-gray-900`
                  : 'border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {button.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-col gap-1.5 border-t border-gray-200 dark:border-gray-700 pt-3">
        {MODAL_BUTTONS.map(action => (
          <button
            key={action.key}
            type="button"
            onClick={() => onOpenModal(action.key)}
            className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-2 text-[10px] font-medium text-gray-700 dark:text-gray-200 transition-colors hover:border-teal-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <action.icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            {action.label}
          </button>
        ))}
      </div>

      <div className="mt-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-center">
        <Droplet className="mx-auto h-4 w-4 text-teal-500" />
        <p className="mt-1 text-[10px] leading-tight text-gray-500 dark:text-gray-400">
          Modo activo: {activeRemoteControl === 'pockets' ? 'ninguno' : activeRemoteControl}
        </p>
      </div>

      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
        <ShieldCheck className="h-3 w-3" />
        PRA
      </div>
    </aside>
  );
}
