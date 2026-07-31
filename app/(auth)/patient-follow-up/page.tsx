'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { formatPhoneDisplay, createWhatsAppUrl } from '@/utils/phoneUtils';
import { PatientFollowUpStatusService } from '@/services/patientFollowUpStatusService';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { useUser } from '@clerk/nextjs';
import PatientOverviewModal from '@/components/PatientOverviewModal';
import GlobalWhatsAppEdit from '@/components/GlobalWhatsAppEdit';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FollowUpStatus {
  id: string;
  whatsapp_sent: boolean;
  patient_responded: boolean;
  appointment_scheduled: boolean;
  notes?: string;
  custom_whatsapp_message?: string;
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

function cleanPhone(phone: string): string {
  let clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+')) clean = clean.substring(1);
  if (!clean.startsWith('504')) clean = '504' + clean;
  return clean;
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
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [messageHistory, setMessageHistory] = useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
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
        }
      }
      loadPatients();
    } catch (err) {
      console.error(`Error toggling ${field}:`, err);
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
      const res = await fetch(`/api/whatsapp-message-history?paciente_id=${patient.paciente_id}`);
      if (res.ok) {
        const data = await res.json();
        setMessageHistory(prev => ({ ...prev, [patient.paciente_id]: data }));
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (patient: PatientFollowUp) => {
    if (!patient.paciente_telefono) return;
    const url = createWhatsAppUrl(patient.paciente_telefono, messageDraft, patient.paciente_codigopais);
    window.open(url, '_blank');

    try {
      let statusId = patient.follow_up_status?.id;
      if (!statusId) {
        const created = await PatientFollowUpStatusService.createFollowUpStatus({
          paciente_id: patient.paciente_id,
          treatment_date: patient.fecha_ultimo_tratamiento,
          notes: '',
        });
        if (created) statusId = created.id;
      }

      if (statusId) {
        await PatientFollowUpStatusService.markWhatsAppSent(statusId);
        await PatientFollowUpStatusService.updateCustomWhatsAppMessage(statusId, messageDraft);
      }

      // Save to message history
      try {
        await fetch('/api/whatsapp-message-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: patient.paciente_id,
            message_text: messageDraft,
            follow_up_status_id: statusId,
          }),
        });
      } catch {
        // ignore history save errors
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
        const created = await PatientFollowUpStatusService.createFollowUpStatus({
          paciente_id: patient.paciente_id,
          treatment_date: patient.fecha_ultimo_tratamiento,
          notes: '',
        });
        if (created) statusId = created.id;
      }

      if (statusId) {
        await PatientFollowUpStatusService.markWhatsAppSent(statusId);
        await PatientFollowUpStatusService.updateCustomWhatsAppMessage(statusId, historyItem.message_text);
      }

      // Save to message history
      try {
        await fetch('/api/whatsapp-message-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: patient.paciente_id,
            message_text: historyItem.message_text,
            follow_up_status_id: statusId,
          }),
        });
      } catch {
        // ignore history save errors
      }

      setEditingMessage(null);
      loadPatients();
    } catch (err) {
      console.error('Error sending history message:', err);
    }
  };

  const startEditNotes = (patient: PatientFollowUp) => {
    setEditingNotes(patientRowKey(patient));
    setNotesDraft(patient.follow_up_status?.notes || '');
  };

  const saveNotes = async (patient: PatientFollowUp) => {
    setSavingNotes(true);
    try {
      if (patient.follow_up_status?.id) {
        await PatientFollowUpStatusService.updateNotes(patient.follow_up_status.id, notesDraft);
      } else {
        const created = await PatientFollowUpStatusService.createFollowUpStatus({
          paciente_id: patient.paciente_id,
          treatment_date: patient.fecha_ultimo_tratamiento,
          notes: notesDraft,
        });
        if (created) {
          await PatientFollowUpStatusService.updateNotes(created.id, notesDraft);
        }
      }
      setEditingNotes(null);
      loadPatients();
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
              const isEditingNotes = editingNotes === key;

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

                      {/* Notes toggle */}
                      <button
                        onClick={() => (isEditingNotes ? setEditingNotes(null) : startEditNotes(patient))}
                        className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-1"
                      >
                        📝 {patient.follow_up_status?.notes ? 'Ver notas' : 'Agregar notas'}
                      </button>
                    </div>
                  </div>

                  {/* Notes Panel */}
                  {isEditingNotes && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <textarea
                        value={notesDraft}
                        onChange={e => setNotesDraft(e.target.value)}
                        placeholder="Escribe notas sobre este seguimiento..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveNotes(patient)}
                          disabled={savingNotes}
                          className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {savingNotes ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="px-4 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message Editor Panel */}
                  {isEditingMessage && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mensaje de WhatsApp para {patient.paciente_nombre}
                      </label>
                      <textarea
                        value={messageDraft}
                        onChange={e => setMessageDraft(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
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
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(item.sent_at).toLocaleString('es-HN')}
                                </p>
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
      onClick={onClick}
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
