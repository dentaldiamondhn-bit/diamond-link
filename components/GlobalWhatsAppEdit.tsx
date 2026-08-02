'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Clock, Trash2 } from 'lucide-react';
import { FormattingToolbar } from '@/components/FormattingToolbar';
import { supabase } from '@/lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type TemplateKey = 'limpieza' | 'ortodoncia' | 'otro';

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  limpieza: 'Limpieza',
  ortodoncia: 'Ortodoncia',
  otro: 'Otro',
};

interface HistoryItem {
  id: string;
  tipo: string;
  message_text: string;
  changed_at: string;
  changed_by: string;
  changed_by_name: string | null;
  changed_by_image: string | null;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

export default function GlobalWhatsAppEdit({ isOpen, onClose, onSaved }: Props) {
  const [templates, setTemplates] = useState<Record<TemplateKey, string>>({
    limpieza: '',
    ortodoncia: '',
    otro: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TemplateKey>('limpieza');
  const [history, setHistory] = useState<Record<TemplateKey, HistoryItem[]>>({
    limpieza: [],
    ortodoncia: [],
    otro: [],
  });
  const [loadingHistory, setLoadingHistory] = useState<Record<TemplateKey, boolean>>({
    limpieza: false,
    ortodoncia: false,
    otro: false,
  });
  const [dirtyTabs, setDirtyTabs] = useState<Set<TemplateKey>>(new Set());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dirtyTabsRef = useRef<Set<TemplateKey>>(new Set());

  useEffect(() => {
    dirtyTabsRef.current = dirtyTabs;
  }, [dirtyTabs]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp-templates?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTemplates({
          limpieza: data.limpieza || '',
          ortodoncia: data.ortodoncia || '',
          otro: data.otro || '',
        });
        setDirtyTabs(new Set());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (tipo: TemplateKey) => {
    setLoadingHistory(prev => ({ ...prev, [tipo]: true }));
    try {
      const res = await fetch(`/api/whatsapp-templates?tipo=${tipo}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data)) return;
        
        // CRITICAL: Only keep items with EXACTLY matching tipo
        const filtered = data.filter((item: any) => item.tipo === tipo);
        
        // Update ONLY the specific tipo, clearing potential cross-contamination
        setHistory(prev => {
          const newHist = {};
          // Copy other tabs' history unchanged
          Object.keys(prev).forEach(key => {
            if (key !== tipo) {
              newHist[key] = prev[key as TemplateKey];
            }
          });
          // Set ONLY this tab's history
          newHist[tipo] = filtered as HistoryItem[];
          return newHist as Record<TemplateKey, HistoryItem[]>;
        });
      }
    } catch (e) {
      console.error('loadHistory error:', e);
    } finally {
      setLoadingHistory(prev => ({ ...prev, [tipo]: false }));
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
    // Clear all history when modal opens to ensure clean state
    setHistory({ limpieza: [], ortodoncia: [], otro: [] });
    setDirtyTabs(new Set());
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadHistory(activeTab);
    }
  }, [activeTab, isOpen]);

  /* ---- Realtime subscriptions -------------------------------------- */
  /* Keep history and saved templates in sync across sessions.          */
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel('whatsapp-global-templates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_templates_history' },
        (payload: any) => {
          const tipo = payload.new?.tipo || payload.old?.tipo;
          if (tipo && TEMPLATE_LABELS[tipo as TemplateKey]) {
            loadHistory(tipo as TemplateKey);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_templates' },
        (payload: any) => {
          const tipo = payload.new?.tipo || payload.old?.tipo;
          if (!tipo || !TEMPLATE_LABELS[tipo as TemplateKey]) return;
          const tk = tipo as TemplateKey;
          // Do not clobber a tab the user is currently editing
          if (!dirtyTabsRef.current.has(tk)) {
            setTemplates(prev => ({
              ...prev,
              [tk]: payload.new?.message_text ?? prev[tk],
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  /* ---- Real-time subscriptions disabled (client-side env issue) ---- */
  /* History refreshes on tab switch or after save */

  const handleSave = async () => {
    // Only persist tabs that were actually modified so each tab stays isolated
    if (dirtyTabs.size === 0) {
      setSaveSuccess(false);
      return;
    }

    const toSave: Record<string, string> = {};
    dirtyTabs.forEach((tab) => {
      toSave[tab] = templates[tab];
    });

    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/whatsapp-templates?t=' + Date.now(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to save templates');

      const savedTabs = Array.from(dirtyTabs);

      // Clear history for saved tabs and let them reload with the new entries
      setHistory(prev => {
        const next = { ...prev };
        savedTabs.forEach((tab) => {
          next[tab] = [];
        });
        return next;
      });
      setDirtyTabs(new Set());
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);

      savedTabs.forEach((tab) => loadHistory(tab));

      onSaved?.();
    } catch {
      alert('Failed to save global WhatsApp templates');
    } finally {
      setSaving(false);
    }
  };

  const loadHistoryMessage = (messageText: string) => {
    setTemplates(prev => ({ ...prev, [activeTab]: messageText }));
    setDirtyTabs(prev => new Set(prev).add(activeTab));
  };

  const deleteHistoryItem = async (id: string, tipo: TemplateKey) => {
    if (!confirm('¿Eliminar esta entrada del historial?')) return;
    try {
      const res = await fetch(`/api/whatsapp-templates?id=${id}&t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      setHistory(prev => ({
        ...prev,
        [tipo]: prev[tipo].filter(item => item.id !== id && item.tipo === tipo),
      }));
    } catch (err) {
      console.error('Error deleting history item:', err);
      alert('Error al eliminar la entrada del historial');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="bg-white dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                Editar Mensajes Globales de WhatsApp
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-teal-500 mr-2" size={24} />
                <span className="text-gray-600 dark:text-gray-400">Cargando plantillas...</span>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                  {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === key
                          ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {TEMPLATE_LABELS[key]}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mensaje global para {TEMPLATE_LABELS[activeTab]}
                  </label>
                  <FormattingToolbar
                    value={templates[activeTab]}
                    onChange={(text) => {
                      setTemplates(prev => ({ ...prev, [activeTab]: text }));
                      setDirtyTabs(prev => new Set(prev).add(activeTab));
                    }}
                    onEmojiSelect={(emoji) => {
                      setTemplates(prev => ({ ...prev, [activeTab]: (prev[activeTab] || '') + emoji }));
                      setDirtyTabs(prev => new Set(prev).add(activeTab));
                    }}
                    rows={10}
                  />
                </div>

                <div className="flex justify-end gap-2 items-center">
                  {saveSuccess && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium mr-2">
                      ✓ Cambios guardados
                    </span>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="animate-spin" size={16} />}
                    Guardar Cambios Globales
                  </button>
                </div>

                {/* History Section - Comment-like style */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Historial de cambios - {TEMPLATE_LABELS[activeTab]}
                  </h3>
                  {loadingHistory[activeTab] ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="animate-spin text-teal-500 mr-2" size={20} />
                      <span className="text-gray-600 dark:text-gray-400">Cargando historial...</span>
                    </div>
                  ) : history[activeTab].length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      No hay historial de cambios
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {history[activeTab].map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {item.changed_by_image ? (
                              <img
                                src={item.changed_by_image}
                                alt={item.changed_by_name || 'Usuario'}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('span');
                                  if (fallback) fallback.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <span className={item.changed_by_image ? 'hidden' : 'text-sm font-bold text-teal-600'}>
                              {getInitials(item.changed_by_name)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                {item.changed_by_name || 'Usuario'}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={12} />
                                {formatDate(item.changed_at)}
                                {formatTime(item.changed_at) && <span className="ml-1">{formatTime(item.changed_at)}</span>}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mt-1 cursor-pointer"
                               onClick={() => loadHistoryMessage(item.message_text)}>
                              {item.message_text}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryItem(item.id, activeTab);
                            }}
                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}