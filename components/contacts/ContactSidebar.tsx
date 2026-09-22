'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Star,
  Archive,
  Trash2,
  Download,
  Settings,
  Wifi,
  WifiOff,
  RotateCw,
  Check,
  X,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContactFilter, LocalLabel } from '@/lib/contacts/db';

interface ContactSidebarProps {
  labels: LocalLabel[];
  activeFilter: ContactFilter;
  counts: { all: number; favorites: number; archived: number; recentHistory: number; trash: number };
  pendingCount: number;
  isOnline: boolean;
  onCreate: () => void;
  onSelect: (filter: ContactFilter) => void;
  onAddLabel: (name: string) => void;
  onImportExport: () => void;
  onResync: () => void;
}

function navCls(active: boolean): string {
  return cn(
    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    active
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60',
  );
}

export function ContactSidebar({
  labels,
  activeFilter,
  counts,
  pendingCount,
  isOnline,
  onCreate,
  onSelect,
  onAddLabel,
  onImportExport,
  onResync,
}: ContactSidebarProps) {
  const [addingLabel, setAddingLabel] = useState(false);
  const [labelName, setLabelName] = useState('');

  const isActive = (f: ContactFilter) =>
    f === activeFilter || (typeof f === 'object' && typeof activeFilter === 'object' && f.labelId === activeFilter.labelId);

  const submitLabel = () => {
    const name = labelName.trim();
    if (name) {
      onAddLabel(name);
      setLabelName('');
      setAddingLabel(false);
    }
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="p-4 pb-3">
        <button
          onClick={onCreate}
          className="flex items-center justify-center gap-2 w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 shadow-sm transition-colors"
        >
          <Plus size={18} /> Crear contacto
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        <button className={navCls(isActive('all'))} onClick={() => onSelect('all')}>
          <span className="flex items-center gap-2">Contactos</span>
          <span className="text-xs text-zinc-400">{counts.all}</span>
        </button>
        <button className={navCls(isActive('favorites'))} onClick={() => onSelect('favorites')}>
          <span className="flex items-center gap-2">
            <Star size={14} className="text-amber-500" /> Favoritos
          </span>
          <span className="text-xs text-zinc-400">{counts.favorites}</span>
        </button>
        <button className={navCls(isActive('archived'))} onClick={() => onSelect('archived')}>
          <span className="flex items-center gap-2">
            <Archive size={14} /> Archivados
          </span>
          <span className="text-xs text-zinc-400">{counts.archived}</span>
        </button>
        <button className={navCls(isActive('trash'))} onClick={() => onSelect('trash')}>
          <span className="flex items-center gap-2">
            <Trash2 size={14} /> Papelera
          </span>
          <span className="text-xs text-zinc-400">{counts.trash}</span>
        </button>
        <button className={navCls(isActive('recentHistory'))} onClick={() => onSelect('recentHistory')}>
          <span className="flex items-center gap-2">
            <Activity size={14} className="text-emerald-500" /> Historiales Recientes
          </span>
          <span className="text-xs text-zinc-400">{counts.recentHistory}</span>
        </button>

        <div className="pt-5 pb-1.5">
          <div className="flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Etiquetas
            </span>
            <button
              onClick={() => setAddingLabel((v) => !v)}
              className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
              title="Crear etiqueta"
            >
              <Plus size={14} />
            </button>
          </div>
          {addingLabel && (
            <div className="mt-1.5 px-1 flex items-center gap-1.5">
              <input
                autoFocus
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitLabel();
                  if (e.key === 'Escape') {
                    setAddingLabel(false);
                    setLabelName('');
                  }
                }}
                placeholder="Nueva etiqueta..."
                className="flex h-8 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={submitLabel} className="text-emerald-500">
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setAddingLabel(false);
                  setLabelName('');
                }}
                className="text-zinc-400"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          {labels.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-zinc-400 dark:text-zinc-500">Sin etiquetas aún</p>
          )}
          {labels.map((label) => (
            <button
              key={label.id}
              className={navCls(isActive({ labelId: label.id }))}
              onClick={() => onSelect({ labelId: label.id })}
            >
              <span className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                <span className="truncate">{label.name}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="pt-4">
          <button className={navCls(false)} onClick={onImportExport}>
            <span className="flex items-center gap-2">
              <Download size={14} /> Importar / Exportar
            </span>
          </button>
        </div>
      </nav>

      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs">
            {isOnline ? (
              <>
                <Wifi size={13} className="text-emerald-500" />
                <span className={pendingCount > 0 ? 'text-zinc-500 dark:text-zinc-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {pendingCount > 0 ? `Sincronizando… ${pendingCount}` : 'Sincronizado'}
                </span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-rose-500" />
                <span className="text-zinc-500 dark:text-zinc-400">Sin conexión</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">v0.1.0</span>
            <Link
              href="/account"
              title="Configuración"
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <Settings size={14} />
            </Link>
          </div>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={onResync}
            className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <RotateCw size={12} /> Reintentar ahora
          </button>
        )}
      </div>
    </aside>
  );
}