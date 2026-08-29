'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { formatPhoneDisplay, createWhatsAppUrl } from '@/utils/phoneUtils';
import { PatientFollowUpStatusService } from '@/services/patientFollowUpStatusService';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { useUser } from '@clerk/nextjs';
import { StickyNote, ChevronDown } from 'lucide-react';
import PatientOverviewModal from '@/components/PatientOverviewModal';
import GlobalWhatsAppEdit from '@/components/GlobalWhatsAppEdit';
import { FormattingToolbar } from '@/components/FormattingToolbar';
import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FollowUpStatus {
  id: string;
  paciente_id: string;
  whatsapp_sent: boolean;
  patient_responded: boolean;
  appointment_scheduled: boolean;
  notes?: string;
  custom_whatsapp_message?: string;
  created_at: string;
  updated_at: string;
}

interface PatientFollowUp {
  paciente_id: string;
  paciente_nombre: string;
  paciente_telefono?: string;
  paciente_codigopais?: string;
  ultimo_tratamiento: string;
  fecha_ultimo_tratamiento: string;
  dias_ultimo_tratamiento: number;
  tipo_seguimiento: 'limpieza' | 'ortodoncia' | 'otro';
  follow_up_status?: FollowUpStatus;
}

type SortKey = 'days' | 'name' | 'date';
type SortDir = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  WhatsApp message templates                                         */
/* ------------------------------------------------------------------ */
const WHATSAPP_TEMPLATES: Record<string, string> = {
  limpieza: `💎 ¡Hola! Somos Clínica Dental Diamond 🦷

¡Esperamos que estés muy bien! 🌞
Solo queríamos recordarte que ya toca tu limpieza dental 😉
Hacerla cada 6 meses ayuda a mantener tu sonrisa sana y brillante 😁✨

💎 También aprovecha tu 14vo con las siguientes promociones 💎😁✨:
*Limpieza mas 3 tapones en molares a 1,599lps*
*Limpieza al 2x1 a 900lps*
*3 tapones en molares a 999lps*

Agenda tu cita con nosotros:
📞 9498-5346 o en nuestra pagina *dentaldiamondhn.com*
📍 Barrio Guamilito 6ta calle entre 9y10 avenida, Plaza Insolh local A3

¡Nos encantará verte pronto y cuidar tu sonrisa! 💙
Clínica Dental Diamond – Tu sonrisa, nuestra prioridad 😍`,

  ortodoncia: `💎 ¡Hola! Somos Clínica Dental Diamond 🦷

¡Esperamos que estés muy bien! 🌞
Es hora de tu revisión de ortodoncia 📋
Mantener tus aparatos o alineadores en óptimas condiciones es clave para una sonrisa perfecta 😁✨

Agenda tu cita de control con nosotros:
📞 9498-5346 o en nuestra pagina *dentaldiamondhn.com*
📍 Barrio Guamilito 6ta calle entre 9y10 avenida, Plaza Insolh local A3

¡Nos encantará verte pronto! 💙
Clínica Dental Diamond – Tu sonrisa, nuestra prioridad 😍`,

  otro: `💎 ¡Hola! Somos Clínica Dental Diamond 🦷

¡Esperamos que estés muy bien! 🌞
Solo queríamos recordarte que es importante mantener tus controles al día 😁✨

Agenda tu cita con nosotros:
📞 9498-5346 o en nuestra pagina *dentaldiamondhn.com*
📍 Barrio Guamilito 6ta calle entre 9y10 avenida, Plaza Insolh local A3

¡Nos encantará verte pronto! 💙
Clínica Dental Diamond – Tu sonrisa, nuestra prioridad 😍`,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const TIPO_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  limpieza: { label: 'Limpieza', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🦷' },
  ortodoncia: { label: 'Ortodoncia', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '😁' },
  otro: { label: 'Otro', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '📋' },
};

function getUrgency(dias: number): { label: string; color: string; bgColor: string; border: string } {
  if (dias >= 180) return { label: 'Muy vencido', color: 'text-red-700', bgColor: 'bg-red-50', border: 'border-red-200' };
  if (dias >= 120) return { label: 'Vencido', color: 'text-red-600', bgColor: 'bg-red-50/50', border: 'border-red-200' };
  if (dias >= 90) return { label: 'Pendiente', color: 'text-amber-600', bgColor: 'bg-amber-50', border: 'border-amber-200' };
  return { label: 'Próximo', color: 'text-green-600', bgColor: 'bg-green-50', border: 'border-green-200' };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

/* ------------------------------------------------------------------ */
const PAGE_KEY = 'patient-follow-up';

const DEFAULT_PREFS = {
  filter: 'all' as 'all' | 'limpieza' | 'ortodoncia',
  sortKey: 'days' as SortKey,
  sortDir: 'desc' as SortDir,
};

export default function PatientFollowUpPage() {
  const { user } = useUser();
  const [patients, setPatients] = useState<PatientFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'limpieza' | 'ortodoncia'>(DEFAULT_PREFS.filter);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_PREFS.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_PREFS.sortDir);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [messageHistory, setMessageHistory] = useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const prefsLoaded = useRef(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [globalTemplates, setGlobalTemplates] = useState<Record<string, string>>({});
  const [showGlobalEditor, setShowGlobalEditor] = useState(false);

  const loadGlobalTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp-templates?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setGlobalTemplates(data);
      }
    } catch (err) {
      console.error('Failed to load global WhatsApp templates', err);
    }
  }, []);

  useEffect(() => {
    loadGlobalTemplates();
  }, [loadGlobalTemplates]);

  const patientRowKey = (p: PatientFollowUp) => `${p.paciente_id}__${p.tipo_seguimiento}`;

  // Patient currently having the WhatsApp editor open (key → paciente_id).
  const editingPacienteId = editingMessage?.split('__')[0] || null;

  /* ---- load saved preferences from Supabase -------------------- */
  useEffect(() => {
    if (!user?.id || prefsLoaded.current) return;
    (async () => {
      const prefs = await UserPreferencesService.getPagePreferences(user.id, PAGE_KEY);
      if (prefs) {
        if (prefs.filter) setFilter(prefs.filter);
        if (prefs.sortKey) setSortKey(prefs.sortKey);
        if (prefs.sortDir) setSortDir(prefs.sortDir);
      }
      prefsLoaded.current = true;
    })();
  }, [user?.id]);

  /* ---- save preferences to Supabase on change ------------------ */
  const savePrefs = useCallback(
    async (patch: Partial<typeof DEFAULT_PREFS>) => {
      if (!user?.id) return;
      try {
        await UserPreferencesService.updatePagePreferences(user.id, PAGE_KEY, patch);
      } catch (err) {
        console.warn('Failed to save preferences:', err);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!prefsLoaded.current) return;
    savePrefs({ filter });
  }, [filter, savePrefs]);

  useEffect(() => {
    if (!prefsLoaded.current) return;
    savePrefs({ sortKey, sortDir });
  }, [sortKey, sortDir, savePrefs]);

  /* ---- data fetch ------------------------------------------------ */
  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/patient-follow-up?type=${filter}`, { cache: 'no-cache' });
      const json = await res.json();
      if (!json.data) return;
      setPatients(json.data);
    } catch (err) {
      console.error('Error loading follow-up patients:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  /* ---- real-time subscription to patient_follow_up_status -------- */
  useEffect(() => {
    const channel = supabase
      .channel('patient_follow_up_status_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patient_follow_up_status' },
        (payload) => {
          const updated = payload.new as FollowUpStatus;
          if (!updated?.paciente_id) return;
          setPatients(prev =>
            prev.map(p => {
              if (p.paciente_id !== updated.paciente_id) return p;
              const existing = p.follow_up_status;
              // Keep the newer record (by updated_at or created_at)
              if (existing?.id && existing.id === updated.id) {
                return { ...p, follow_up_status: updated };
              }
              if (!existing) {
                return { ...p, follow_up_status: updated };
              }
              const existingTime = new Date(existing.updated_at || existing.created_at).getTime();
              const newTime = new Date(updated.updated_at || updated.created_at).getTime();
              return newTime >= existingTime ? { ...p, follow_up_status: updated } : p;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ---- realtime subscription to whatsapp_message_history for the open editor ---- */
  useEffect(() => {
    if (!editingPacienteId) return;
    const channel = supabase
      .channel(`whatsapp_message_history:${editingPacienteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_message_history',
          filter: `paciente_id=eq.${editingPacienteId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as any;
            if (!row?.id) return;
            setMessageHistory(prev => {
              const current = prev[editingPacienteId] || [];
              if (current.some(m => m.id === row.id)) return prev;
              return {
                ...prev,
                [editingPacienteId]: [...current, row].sort(
                  (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
                ),
              };
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (!deletedId) return;
            setMessageHistory(prev => ({
              ...prev,
              [editingPacienteId]: (prev[editingPacienteId] || []).filter(m => m.id !== deletedId),
            }));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [editingPacienteId]);

  /* ---- fallback poll: guarantees notes surface without realtime ---- */
  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event('refresh-follow-up-notes'));
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fire();
    }, 6000);
    window.addEventListener('focus', fire);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', fire);
    };
  }, []);

  /* ---- computed stats & sorted list ------------------------------ */
  const stats = useMemo(() => {
    const total = patients.length;
    const whatsappSent = patients.filter(p => p.follow_up_status?.whatsapp_sent).length;
    const responded = patients.filter(p => p.follow_up_status?.patient_responded).length;
    const scheduled = patients.filter(p => p.follow_up_status?.appointment_scheduled).length;
    const overdue = patients.filter(p => p.dias_ultimo_tratamiento >= 120).length;
    return { total, whatsappSent, responded, scheduled, overdue };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    let list = [...patients];

    // Only include requested treatment types
    list = list.filter(p => p.tipo_seguimiento === 'limpieza' || p.tipo_seguimiento === 'ortodoncia');

    // Only include patients with days >= 150 (5 months)
    list = list.filter(p => p.dias_ultimo_tratamiento >= 150);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.paciente_nombre.toLowerCase().includes(q) ||
          p.ultimo_tratamiento.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'days':
          cmp = a.dias_ultimo_tratamiento - b.dias_ultimo_tratamiento;
          break;
        case 'name':
          cmp = a.paciente_nombre.localeCompare(b.paciente_nombre);
          break;
        case 'date':
          cmp =
            new Date(a.fecha_ultimo_tratamiento).getTime() -
            new Date(b.fecha_ultimo_tratamiento).getTime();
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [patients, search, sortKey, sortDir]);

  /* ---- actions --------------------------------------------------- */
  const handleToggle = async (
    patient: PatientFollowUp,
    field: 'whatsapp_sent' | 'patient_responded' | 'appointment_scheduled'
  ) => {
    // Optimistic update: flip the checkbox instantly
    const key = patientRowKey(patient);
    setPatients(prev =>
      prev.map(p => {
        if (patientRowKey(p) !== key) return p;
        const currentStatus = p.follow_up_status;
        const currentValue = currentStatus?.[field] ?? false;
        return {
          ...p,
          follow_up_status: currentStatus
            ? { ...currentStatus, [field]: !currentValue }
            : {
                id: '',
                paciente_id: p.paciente_id,
                whatsapp_sent: field === 'whatsapp_sent',
                patient_responded: field === 'patient_responded',
                appointment_scheduled: field === 'appointment_scheduled',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
        };
      })
    );

    try {
      if (patient.follow_up_status?.id) {
        await PatientFollowUpStatusService.toggleField(patient.follow_up_status.id, field);
      } else {
        const created = await PatientFollowUpStatusService.createFollowUpStatus({
          paciente_id: patient.paciente_id,
          treatment_date: patient.fecha_ultimo_tratamiento,
          notes: '',
        });
        if (created) {
          await PatientFollowUpStatusService.toggleField(created.id, field);
          // Re-sync with the toggled value, not the raw created record
          setPatients(prev =>
            prev.map(p => {
              if (patientRowKey(p) !== key) return p;
              return { ...p, follow_up_status: { ...created, [field]: true } };
            })
          );
        }
      }
    } catch (err) {
      console.error(`Error toggling ${field}:`, err);
      // Revert optimistic update on error
      loadPatients();
    }
  };

  const handleWhatsApp = async (patient: PatientFollowUp) => {
    // Always use global template first, then fallback to hardcoded defaults
    const globalMessage = globalTemplates[patient.tipo_seguimiento];
    const defaultMessage = globalMessage || WHATSAPP_TEMPLATES[patient.tipo_seguimiento] || WHATSAPP_TEMPLATES.otro;
    setMessageDraft(defaultMessage);
    setEditingMessage(patientRowKey(patient));

    // Load message history for this patient
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/whatsapp-message-history?paciente_id=${patient.paciente_id}&t=${Date.now()}`, { cache: 'no-store' });
      console.log('History fetch response:', res.status, res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded message history:', data);
        setMessageHistory(prev => ({ ...prev, [patient.paciente_id]: data }));
      } else {
        const err = await res.json();
        console.error('Failed to load message history:', err);
      }
    } catch (err) {
      console.error('Error loading message history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (patient: PatientFollowUp) => {
    if (!patient.paciente_telefono) return;
    const url = createWhatsAppUrl(patient.paciente_telefono, messageDraft, patient.paciente_codigopais);
    window.open(url, '_blank');

    // Optimistic update: check the whatsapp_sent checkbox immediately
    const key = patientRowKey(patient);
    setPatients(prev =>
      prev.map(p => {
        if (patientRowKey(p) !== key) return p;
        const currentStatus = p.follow_up_status;
        return {
          ...p,
          follow_up_status: currentStatus
            ? { ...currentStatus, whatsapp_sent: true }
            : {
                id: '',
                paciente_id: p.paciente_id,
                whatsapp_sent: true,
                patient_responded: false,
                appointment_scheduled: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
        };
      })
    );

    try {
      let statusId = patient.follow_up_status?.id;
      if (!statusId) {
        const existing = await PatientFollowUpStatusService.getFollowUpStatus(patient.paciente_id);
        if (existing?.id) {
          statusId = existing.id;
        } else {
          const created = await PatientFollowUpStatusService.createFollowUpStatus({
            paciente_id: patient.paciente_id,
            treatment_date: patient.fecha_ultimo_tratamiento,
            notes: '',
          });
          if (created) {
            statusId = created.id;
            // Re-sync with the created record (whatsapp_sent will be set by markWhatsAppSent)
            setPatients(prev =>
              prev.map(p => {
                if (patientRowKey(p) !== key) return p;
                return { ...p, follow_up_status: { ...created, whatsapp_sent: true } };
              })
            );
          }
        }
      }

      if (statusId) {
        await PatientFollowUpStatusService.markWhatsAppSent(statusId);
        await PatientFollowUpStatusService.updateCustomWhatsAppMessage(statusId, messageDraft);
      }

      // Save to message history
      try {
        const res = await fetch('/api/whatsapp-message-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: patient.paciente_id,
            message_text: messageDraft,
            follow_up_status_id: statusId,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error('Failed to save message history:', err);
        } else {
          const saved = await res.json();
          if (saved?.id) {
            // Show the sent message immediately (realtime will dedupe).
            setMessageHistory(prev => {
              const current = prev[patient.paciente_id] || [];
              if (current.some(m => m.id === saved.id)) return prev;
              return {
                ...prev,
                [patient.paciente_id]: [...current, saved].sort(
                  (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
                ),
              };
            });
          }
        }
      } catch (err) {
        console.error('Error saving message history:', err);
      }

      setEditingMessage(null);
      loadPatients();
    } catch (err) {
      console.error('Error updating follow-up status:', err);
    }
  };

  const loadMessageIntoEditor = (messageText: string) => {
    setMessageDraft(messageText);
  };

  const copyMessageToClipboard = async (messageText: string) => {
    try {
      await navigator.clipboard.writeText(messageText);
      alert('Message copied to clipboard');
    } catch {
      console.error('Failed to copy message');
    }
  };

  const sendHistoryMessage = async (patient: PatientFollowUp, historyItem: any) => {
    const url = createWhatsAppUrl(patient.paciente_telefono, historyItem.message_text, patient.paciente_codigopais);
    window.open(url, '_blank');

    try {
      let statusId = patient.follow_up_status?.id;
      if (!statusId) {
        const existing = await PatientFollowUpStatusService.getFollowUpStatus(patient.paciente_id);
        if (existing?.id) {
          statusId = existing.id;
        } else {
          const created = await PatientFollowUpStatusService.createFollowUpStatus({
            paciente_id: patient.paciente_id,
            treatment_date: patient.fecha_ultimo_tratamiento,
            notes: '',
          });
          if (created) statusId = created.id;
        }
      }

      if (statusId) {
        await PatientFollowUpStatusService.markWhatsAppSent(statusId);
        await PatientFollowUpStatusService.updateCustomWhatsAppMessage(statusId, historyItem.message_text);
      }

      // Save to message history
      try {
        const res = await fetch('/api/whatsapp-message-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: patient.paciente_id,
            message_text: historyItem.message_text,
            follow_up_status_id: statusId,
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          if (saved?.id) {
            // Show the sent message immediately (realtime will dedupe).
            setMessageHistory(prev => {
              const current = prev[patient.paciente_id] || [];
              if (current.some(m => m.id === saved.id)) return prev;
              return {
                ...prev,
                [patient.paciente_id]: [...current, saved].sort(
                  (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
                ),
              };
            });
          }
        }
      } catch {
        // ignore history save errors
      }

      setEditingMessage(null);
      loadPatients();
    } catch (err) {
      console.error('Error sending history message:', err);
    }
  };

  const deleteMessage = async (messageId: string, pacienteId: string) => {
    if (!confirm('¿Eliminar este mensaje del historial?')) return;
    try {
      const res = await fetch(`/api/whatsapp-message-history?id=${messageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      // Remove from local state
      setMessageHistory(prev => ({
        ...prev,
        [pacienteId]: prev[pacienteId]?.filter(m => m.id !== messageId) || [],
      }));
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Error al eliminar el mensaje');
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  /* ---- render ---------------------------------------------------- */
  return (
    <div className="py-8">
      <div data-rr-block className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          <StatCard label="Total" value={stats.total} color="text-gray-900 dark:text-white" bg="bg-white dark:bg-gray-800" />
          <StatCard label="WhatsApp" value={stats.whatsappSent} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" icon="💬" />
          <StatCard label="Respondieron" value={stats.responded} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" icon="✅" />
          <StatCard label="Citas agendadas" value={stats.scheduled} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" icon="📅" />
          <StatCard label="Vencidos" value={stats.overdue} color="text-red-600" bg="bg-red-50 dark:bg-red-900/20" icon="⚠️" />
        </div>

         {/* Controls Bar */}
         <div className="flex flex-col sm:flex-row gap-3 mb-6">
           {/* Filter buttons */}
           <div className="flex gap-2 flex-shrink-0">
             {(['all', 'limpieza', 'ortodoncia'] as const).map(f => (
               <button
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                   filter === f
                     ? f === 'limpieza'
                       ? 'bg-blue-600 text-white shadow-md'
                       : f === 'ortodoncia'
                       ? 'bg-purple-600 text-white shadow-md'
                       : 'bg-teal-600 text-white shadow-md'
                     : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                 }`}
               >
                 {f === 'all' ? 'Todos' : f === 'limpieza' ? '🦷 Limpieza' : '😁 Ortodoncia'}
               </button>
             ))}
           </div>

           {/* Search */}
           <div className="flex-1 relative">
             <input
               type="text"
               placeholder="Buscar por nombre o tratamiento..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
             />
             <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
           </div>

           {/* Sort */}
           <div className="flex gap-2 flex-shrink-0">
             {([
               { key: 'days' as SortKey, label: 'Días' },
               { key: 'name' as SortKey, label: 'Nombre' },
               { key: 'date' as SortKey, label: 'Fecha' },
             ]).map(s => (
               <button
                 key={s.key}
                 onClick={() => toggleSort(s.key)}
                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                   sortKey === s.key
                     ? 'bg-gray-800 dark:bg-gray-700 text-white'
                     : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                 }`}
               >
                 {s.label}
                 {sortKey === s.key && (
                   <span className="text-xs">{sortDir === 'desc' ? '↓' : '↑'}</span>
                 )}
               </button>
             ))}
           </div>

           {/* Global WhatsApp Editor Button */}
           <button
             onClick={() => setShowGlobalEditor(true)}
             className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
           >
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
               <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
             </svg>
             Editar Mensajes Globales
           </button>
         </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg">No hay pacientes que coincidan con la búsqueda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPatients.map(patient => {
              const urg = getUrgency(patient.dias_ultimo_tratamiento);
              const tipo = TIPO_CONFIG[patient.tipo_seguimiento] || TIPO_CONFIG.otro;
              const key = patientRowKey(patient);
              const isEditingMessage = editingMessage === key;

              return (
                <div
                  key={patientRowKey(patient)}
                  className={`rounded-xl border ${urg.border} ${urg.bgColor} dark:bg-gray-800 dark:border-gray-700 p-4 sm:p-5 transition-all hover:shadow-md`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3
                          className="text-lg font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                          onClick={() => setSelectedPatientId(patient.paciente_id)}
                        >
                          {patient.paciente_nombre}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${tipo.color}`}>
                          {tipo.icon} {tipo.label}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${urg.color} bg-white/80 dark:bg-gray-700 border ${urg.border}`}>
                          {urg.label}
                        </span>
                        {patient.follow_up_status?.notes && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700"
                            title="Notas guardadas"
                          >
                            <StickyNote size={12} />
                            Nota
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📞</span>
                          <span>{patient.paciente_telefono ? formatPhoneDisplay(patient.paciente_telefono, patient.paciente_codigopais) : 'Sin teléfono'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🗓️</span>
                          <span>{formatDate(patient.fecha_ultimo_tratamiento)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🦷</span>
                          <span className="truncate">{patient.ultimo_tratamiento}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">⏳</span>
                          <span className={`font-semibold ${urg.color}`}>{patient.dias_ultimo_tratamiento} días</span>
                        </div>
                      </div>

                      {/* Progress bar for days */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-xs">
                          <div
                            className={`h-full rounded-full transition-all ${
                              patient.dias_ultimo_tratamiento >= 180
                                ? 'bg-red-500'
                                : patient.dias_ultimo_tratamiento >= 120
                                ? 'bg-amber-500'
                                : patient.dias_ultimo_tratamiento >= 90
                                ? 'bg-yellow-400'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((patient.dias_ultimo_tratamiento / 180) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {patient.dias_ultimo_tratamiento >= 180
                            ? 'Requiere atención urgente'
                            : patient.dias_ultimo_tratamiento >= 120
                            ? 'Ya debió asistir'
                            : patient.dias_ultimo_tratamiento >= 90
                            ? 'Próximo a vencer'
                            : 'Dentro del plazo'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 lg:min-w-[200px]">
                      {/* Checkboxes */}
                      <div className="space-y-1.5">
                        <Checkbox
                          checked={!!patient.follow_up_status?.whatsapp_sent}
                          label="WhatsApp enviado"
                          onClick={() => handleToggle(patient, 'whatsapp_sent')}
                        />
                        <Checkbox
                          checked={!!patient.follow_up_status?.patient_responded}
                          label="Paciente respondió"
                          onClick={() => handleToggle(patient, 'patient_responded')}
                        />
                        <Checkbox
                          checked={!!patient.follow_up_status?.appointment_scheduled}
                          label="Cita agendada"
                          onClick={() => handleToggle(patient, 'appointment_scheduled')}
                        />
                      </div>

                      {/* WhatsApp button */}
                      {patient.paciente_telefono && (
                        <button
                          onClick={() => handleWhatsApp(patient)}
                          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Enviar WhatsApp
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Follow-up Notes Comment Section */}
                  <FollowUpNotes
                    followUpStatusId={patient.follow_up_status?.id}
                    pacienteId={patient.paciente_id}
                    treatmentDate={patient.fecha_ultimo_tratamiento}
                    onNoteCreated={() => loadPatients()}
                  />

                  {/* Message Editor Panel */}
                  {isEditingMessage && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mensaje de WhatsApp para {patient.paciente_nombre}
                      </label>
                      <FormattingToolbar
                        value={messageDraft}
                        onChange={setMessageDraft}
                        rows={6}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => sendMessage(patient)}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                          Enviar
                        </button>
                        <button
                          onClick={() => setEditingMessage(null)}
                          className="px-4 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>

                      {/* Message History Panel */}
                      {loadingHistory ? (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando historial...</p>
                        </div>
                      ) : messageHistory[patient.paciente_id]?.length > 0 ? (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Historial de mensajes enviados
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {messageHistory[patient.paciente_id].map((item, index) => (
                              <div key={item.id || index} className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {item.sent_by_image ? (
                                      <img
                                        src={item.sent_by_image}
                                        alt={item.sent_by_name || 'Usuario'}
                                        className="w-full h-full rounded-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const fallback = e.currentTarget.parentElement?.querySelector('span');
                                          if (fallback) fallback.style.display = 'block';
                                        }}
                                      />
                                    ) : null}
                                    <span className={item.sent_by_image ? 'hidden' : 'text-[10px] font-bold text-teal-600'}>
                                      {getInitials(item.sent_by_name)}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                        {item.sent_by_name || 'Usuario'}
                                      </span>
                                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {formatDate(item.sent_at)}
                                        {formatTime(item.sent_at) && <span className="ml-1">{formatTime(item.sent_at)}</span>}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-2">
                                  {item.message_text}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => loadMessageIntoEditor(item.message_text)}
                                    className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    onClick={() => copyMessageToClipboard(item.message_text)}
                                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                                  >
                                    📋 Copiar
                                  </button>
                                  <button
                                    onClick={() => sendHistoryMessage(patient, item)}
                                    className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                  >
                                    📤 Enviar
                                  </button>
                                  <button
                                    onClick={() => deleteMessage(item.id, patient.paciente_id)}
                                    className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PatientOverviewModal
        pacienteId={selectedPatientId || ''}
        isOpen={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />

      <GlobalWhatsAppEdit
        isOpen={showGlobalEditor}
        onClose={() => {
          setShowGlobalEditor(false);
          loadGlobalTemplates();
        }}
        onSaved={loadGlobalTemplates}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  color,
  bg,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon?: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Checkbox({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center gap-2 group w-full text-left hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-md px-2 py-1 transition-colors"
    >
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          checked ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400'
        }`}
      >
         {checked && (
           <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
             <path d="M4 11l4 4L16 5" />
           </svg>
         )}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </button>
  );
}

function NoteRow({ note }: { note: any }) {
  return (
    <div className="flex gap-3 py-2 px-2 rounded-lg transition-colors">
      <div className="w-7 h-7 rounded-full bg-teal-500/20 dark:bg-teal-400/20 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
        {note.user_image ? (
          <img src={note.user_image} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
            {(note.user_name || 'U').substring(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {note.user_name || 'Usuario'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(note.created_at).toLocaleDateString('es-HN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
          {note.message}
        </p>
      </div>
    </div>
  );
}

function notesEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map(n => n.id));
  return b.every(n => ids.has(n.id));
}

function CollapsedNoteRow({ note }: { note: any }) {
  return (
    <details
      className="group rounded-lg px-2 hover:bg-white/50 dark:hover:bg-gray-700/40 transition-colors"
    >
      <summary className="flex items-center gap-2 py-1.5 cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 list-none [&::-webkit-details-marker]:hidden">
        <StickyNote size={12} className="flex-shrink-0" />
        <span className="truncate">{note.user_name || 'Usuario'}</span>
        <span className="text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {new Date(note.created_at).toLocaleDateString('es-HN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <ChevronDown size={12} className="ml-auto flex-shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-2">
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
          {note.message}
        </p>
      </div>
    </details>
  );
}

function FollowUpNotes({
  followUpStatusId: initialStatusId,
  pacienteId,
  treatmentDate,
  onNoteCreated,
}: {
  followUpStatusId?: string;
  pacienteId: string;
  treatmentDate: string;
  onNoteCreated?: () => void;
}) {
  const { user } = useUser();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const statusIdRef = useRef<string | undefined>(initialStatusId);

  useEffect(() => {
    statusIdRef.current = initialStatusId;
  }, [initialStatusId]);

  const refetchNotes = useCallback(() => {
    if (!pacienteId) return Promise.resolve();
    return fetch(`/api/patient-follow-up-notes?paciente_id=${pacienteId}`)
      .then(r => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error('Follow-up notes fetch error:', data);
          return;
        }
        setNotes(prev => (notesEqual(prev, data) ? prev : data));
      })
      .catch(err => console.error('Follow-up notes fetch failed:', err));
  }, [pacienteId]);

  useEffect(() => {
    if (!pacienteId) return;
    setLoading(true);
    refetchNotes().finally(() => setLoading(false));
  }, [refetchNotes, pacienteId]);

  // Fallback refresh signal (single page-level interval). Guarantees notes
  // surface within a few seconds even if the realtime websocket is unavailable.
  useEffect(() => {
    const onRefresh = () => refetchNotes();
    window.addEventListener('refresh-follow-up-notes', onRefresh);
    return () => window.removeEventListener('refresh-follow-up-notes', onRefresh);
  }, [refetchNotes]);

  // Realtime for notes scoped EXACTLY to this patient: notes now carry
  // paciente_id directly, so the realtime server filters other patients'
  // events for us (no client-side guard needed).
  useEffect(() => {
    if (!pacienteId) return;
    const channel = supabase
      .channel(`patient_follow_up_notes:${pacienteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_follow_up_notes',
          filter: `paciente_id=eq.${pacienteId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) setNotes(prev => prev.filter(n => n.id !== deletedId));
            return;
          }
          const row = payload.new as any;
          if (!row?.id) return;
          if (payload.eventType === 'INSERT') {
            console.log('[notes-realtime] INSERT', pacienteId, row.id);
            setNotes(prev => {
              if (prev.some(n => n.id === row.id)) return prev;
              return [...prev, row].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            setNotes(prev => prev.map(n => n.id === row.id ? row : n));
          }
        }
      )
      .subscribe((status) => {
        console.log('[notes-realtime]', pacienteId, status);
      });
    return () => { supabase.removeChannel(channel); };
  }, [pacienteId]);

  const ensureStatusId = async (): Promise<string | null> => {
    if (statusIdRef.current) return statusIdRef.current;
    try {
      const existing = await PatientFollowUpStatusService.getFollowUpStatus(pacienteId);
      if (existing?.id) {
        statusIdRef.current = existing.id;
        return existing.id;
      }
      const created = await PatientFollowUpStatusService.createFollowUpStatus({
        paciente_id: pacienteId,
        treatment_date: treatmentDate,
      });
      if (created?.id) {
        statusIdRef.current = created.id;
        return created.id;
      }
    } catch (err) {
      console.error('Error creating follow-up status:', err);
    }
    return null;
  };

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      let sid = statusIdRef.current;
      if (!sid) {
        sid = await ensureStatusId();
        if (!sid) return;
      }
      const res = await fetch('/api/patient-follow-up-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_up_status_id: sid,
          paciente_id: pacienteId,
          message: draft.trim(),
          user_id: user?.id || null,
          user_name: user?.fullName || user?.firstName || 'Usuario',
          user_image: user?.imageUrl || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setNotes(prev => {
          if (prev.some(n => n.id === created.id)) return prev;
          return [...prev, created];
        });
        setDraft('');
        setShowInput(false);
        onNoteCreated?.();
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSaving(false);
    }
  };

  // Newest note on top; older notes are collapsed by default below it.
  const sortedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [notes]
  );
  const newestNote = sortedNotes[0];
  const olderNotes = sortedNotes.slice(1);

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notas</h4>
        <button
          onClick={() => setShowInput(!showInput)}
          className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-medium flex items-center gap-1 transition-colors"
        >
          {showInput ? 'Cancelar' : '+ Agregar'}
        </button>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-1">Cargando notas...</p>
      )}

      {!loading && notes.length === 0 && !showInput && (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-1 italic">Sin notas aún</p>
      )}

      {newestNote && (
        <NoteRow note={newestNote} />
      )}

      {olderNotes.length > 0 && (
        <div className="pt-1 border-t border-gray-100 dark:border-gray-700/60">
          {olderNotes.map(note => (
            <CollapsedNoteRow key={note.id} note={note} />
          ))}
        </div>
      )}

      {showInput && (
        <div className="flex gap-2 mt-1">
          <div className="w-7 h-7 rounded-full bg-teal-500/20 dark:bg-teal-400/20 flex items-center justify-center flex-shrink-0 mt-1">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                {(user?.firstName || 'U').substring(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
              }}
              placeholder="Agregar comentario..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
            <div className="flex gap-2 mt-1.5 justify-end">
              <button
                onClick={() => { setShowInput(false); setDraft(''); }}
                className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.trim()}
                className="px-3 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
