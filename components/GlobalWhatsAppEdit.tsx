'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

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

export default function GlobalWhatsAppEdit({ isOpen, onClose, onSaved }: Props) {
  const [templates, setTemplates] = useState<Record<TemplateKey, string>>({
    limpieza: '',
    ortodoncia: '',
    otro: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TemplateKey>('limpieza');

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
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
    load();
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
                  <textarea
                    value={templates[activeTab]}
                    onChange={(e) => setTemplates({ ...templates, [activeTab]: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="Escribe el mensaje global de WhatsApp..."
                  />
                </div>

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
