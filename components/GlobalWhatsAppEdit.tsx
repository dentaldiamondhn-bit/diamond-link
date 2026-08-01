'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Clock, User } from 'lucide-react';

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
  const [showHistory, setShowHistory] = useState<Record<TemplateKey, boolean>>({
    limpieza: false,
    ortodoncia: false,
    otro: false,
  });

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates({
          limpieza: data.limpieza || '',
          ortodoncia: data.ortodoncia || '',
          otro: data.otro || '',
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (tipo: TemplateKey) => {
    if (history[tipo].length > 0) {
      setShowHistory(prev => ({ ...prev, [tipo]: !prev[tipo] }));
      return;
    }
    setLoadingHistory(prev => ({ ...prev, [tipo]: true }));
    try {
      const res = await fetch(`/api/whatsapp-templates?tipo=${tipo}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(prev => ({ ...prev, [tipo]: data }));
        setShowHistory(prev => ({ ...prev, [tipo]: true }));
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(prev => ({ ...prev, [tipo]: false }));
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templates),
      });
      if (!res.ok) throw new Error('Failed to save templates');
      onSaved?.();
      onClose();
    } catch {
      alert('Failed to save global WhatsApp templates');
    } finally {
      setSaving(false);
    }
  };

  const loadHistoryMessage = (messageText: string) => {
    setTemplates(prev => ({ ...prev, [activeTab]: messageText }));
    setShowHistory(prev => ({ ...prev, [activeTab]: false }));
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
                    <div key={key} className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab(key)}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex-1 ${
                          activeTab === key
                            ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {TEMPLATE_LABELS[key]}
                      </button>
                      <button
                        onClick={() => loadHistory(key)}
                        disabled={loadingHistory[key]}
                        className={`px-2 py-2 text-sm transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          showHistory[key] ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Ver historial"
                      >
                        <Clock size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mensaje global para {TEMPLATE_LABELS[activeTab]}
                  </label>
                  <textarea
                    value={templates[activeTab]}
                    onChange={(e) => setTemplates({ ...templates, [activeTab]: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="Escribe el mensaje global de WhatsApp..."
                  />
                </div>

                {showHistory[activeTab] && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Historial de cambios - {TEMPLATE_LABELS[activeTab]}
                      </h3>
                      <button
                        onClick={() => setShowHistory(prev => ({ ...prev, [activeTab]: false }))}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Cerrar historial
                      </button>
                    </div>
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
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {history[activeTab].map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            onClick={() => loadHistoryMessage(item.message_text)}
                          >
                            <div className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                                <span className={item.changed_by_image ? 'hidden' : 'text-xs font-bold text-teal-600'}>
                                  {getInitials(item.changed_by_name)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {item.changed_by_name || 'Usuario'}
                                  </span>
                                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Clock size={10} />
                                    {formatDate(item.changed_at)}
                                    {formatTime(item.changed_at) && <span className="ml-1">{formatTime(item.changed_at)}</span>}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap mt-1 line-clamp-3 cursor-pointer">
                                  {item.message_text}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
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
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}