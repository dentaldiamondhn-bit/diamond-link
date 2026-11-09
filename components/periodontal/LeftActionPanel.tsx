'use client';

import React from 'react';
import { Download, Droplet, Save, ShieldCheck, Upload } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';

interface LeftActionPanelProps {
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
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

export function LeftActionPanel({ onSave, onExport, onImport, disabled = false }: LeftActionPanelProps) {
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
        Guardar
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
