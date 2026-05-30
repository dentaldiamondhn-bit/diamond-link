'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';

type FilterType = 'all' | 'appointment' | 'treatment' | 'odontogram' | 'consentimiento' | 'presupuesto' | 'payment' | 'milestone' | 'note';

interface TimelineEvent {
  id: string;
  type: FilterType;
  date: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  color: string;
  details?: Record<string, any>;
}

interface NoteBlock {
  type: 'text' | 'heading' | 'checklist';
  text: string;
  level?: number;
  formats?: Record<string, boolean>;
  items?: ChecklistItem[];
  checked?: boolean;
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface NoteContent {
  blocks: NoteBlock[];
}

interface NoteComment {
  id: string;
  note_id: string;
  user_id: string | null;
  user_name: string | null;
  user_image: string | null;
  user_role: string | null;
  message: NoteContent;
  created_at: string;
  updated_at: string;
}

interface TimelineNote {
  id: string;
  paciente_id: string;
  user_id: string | null;
  title: string;
  content: NoteContent | string | null;
  note_date: string;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  created_by_image: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
}

interface TimelineData {
  patient: {
    paciente_id: string;
    nombre_completo: string;
    fecha_inicio: string | null;
    edad: number | null;
    sexo: string | null;
  };
  appointments: any[];
  treatments: any[];
  odontograms: any[];
  consentimientos: any[];
  presupuestos: any[];
  summary: {
    total_appointments: number;
    total_treatments: number;
    total_odontograms: number;
    total_consentimientos: number;
    total_presupuestos: number;
    total_paid: number;
    total_billed: number;
    fecha_inicio: string | null;
  };
}

const EVENT_TYPE_CONFIG: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  milestone: { icon: 'fas fa-flag', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', label: 'Hito' },
  appointment: { icon: 'fas fa-calendar-check', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'Cita' },
  treatment: { icon: 'fas fa-tooth', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30', label: 'Tratamiento' },
  odontogram: { icon: 'fas fa-teeth', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', label: 'Odontograma' },
  consentimiento: { icon: 'fas fa-file-signature', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Consentimiento' },
  presupuesto: { icon: 'fas fa-file-invoice-dollar', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', label: 'Presupuesto' },
  payment: { icon: 'fas fa-money-bill-wave', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Pago' },
  note: { icon: 'fas fa-sticky-note', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', label: 'Nota' },
};

const FILTER_OPTIONS: { value: FilterType; label: string; icon: string }[] = [
  { value: 'all', label: 'Todos', icon: 'fas fa-layer-group' },
  { value: 'milestone', label: 'Hitos', icon: 'fas fa-flag' },
  { value: 'appointment', label: 'Citas', icon: 'fas fa-calendar-check' },
  { value: 'treatment', label: 'Tratamientos', icon: 'fas fa-tooth' },
  { value: 'odontogram', label: 'Odontogramas', icon: 'fas fa-teeth' },
  { value: 'consentimiento', label: 'Consentimientos', icon: 'fas fa-file-signature' },
  { value: 'presupuesto', label: 'Presupuestos', icon: 'fas fa-file-invoice-dollar' },
  { value: 'note', label: 'Notas', icon: 'fas fa-sticky-notes' },
  { value: 'payment', label: 'Pagos', icon: 'fas fa-money-bill-wave' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(amount);
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    confirmed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    pagado: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    firmado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    pendiente_firma: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    activo: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    parcialmente_pagado: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  };
  return styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    completed: 'Completada',
    scheduled: 'Programada',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    pagado: 'Pagado',
    firmado: 'Firmado',
    pendiente_firma: 'Pendiente firma',
    pending: 'Pendiente',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
    expired: 'Expirado',
    activo: 'Activo',
    cancelado: 'Cancelado',
    parcialmente_pagado: 'Parcialmente pagado',
  };
  return labels[status] || status;
}

function getEventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    appointment: 'Cita',
    consultation: 'Consulta',
    surgery: 'Cirugía',
    follow_up: 'Seguimiento',
    reminder: 'Recordatorio',
    other: 'Otro',
  };
  return labels[type] || type;
}

function renderNoteBlock(block: NoteBlock, idx: number) {
  if (block.type === 'heading') {
    const Tag = `h${Math.min(block.level || 2, 4)}` as keyof JSX.IntrinsicElements;
    return (
      <Tag key={idx} className="font-bold text-gray-900 dark:text-white mt-2 mb-1" style={{ fontSize: `${1.15 - (block.level || 2) * 0.1}rem` }}>
        {block.text}
      </Tag>
    );
  }
  if (block.type === 'checklist') {
    return (
      <ul key={idx} className="space-y-1 my-1">
        {(block.items || []).map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <i className={`fas ${item.checked ? 'fa-check-square text-cyan-600' : 'fa-square text-gray-400'} flex-shrink-0`}></i>
            <span className={item.checked ? 'line-through opacity-60' : ''}>{item.text}</span>
          </li>
        ))}
      </ul>
    );
  }
  const fmt = block.formats || {};
  const className = [
    fmt.bold ? 'font-bold' : '',
    fmt.italic ? 'italic' : '',
    fmt.underline ? 'underline' : '',
    fmt.strikethrough ? 'line-through' : '',
    'text-gray-600 dark:text-gray-300',
  ].filter(Boolean).join(' ');
  return <p key={idx} className={`${className} whitespace-pre-wrap text-sm`}>{block.text}</p>;
}

function renderNoteContent(content: NoteContent | string | null) {
  if (!content) return null;
  if (typeof content === 'string') {
    return <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm">{content}</p>;
  }
  const blocks = content.blocks || [];
  if (blocks.length === 0) return null;
  return <div className="space-y-1">{blocks.map((block, i) => renderNoteBlock(block, i))}</div>;
}

function parseContent(content: NoteContent | string | null): NoteContent {
  if (!content || typeof content === 'string') {
    const text = typeof content === 'string' ? content : '';
    return text ? { blocks: [{ type: 'text', text, formats: {} }] } : { blocks: [] };
  }
  return content;
}

function NoteComments({ noteId }: { noteId: string }) {
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      const res = await fetch(`/api/timeline-notes/${noteId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
      setLoading(false);
    };
    fetchComments();
  }, [noteId]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/timeline-notes/${noteId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: newComment })
    });
    if (res.ok) {
      const data = await res.json();
      setComments(prev => [...prev, data.comment]);
      setNewComment('');
    }
  };

  if (loading) return <p className="text-xs text-gray-400">Cargando comentarios...</p>;

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-2">
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                {c.user_image ? (
                  <img 
                    src={c.user_image} 
                    alt={c.user_name || 'Usuario'} 
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('span');
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                ) : null}
                <span className={c.user_image ? 'hidden' : 'text-[10px] font-bold text-cyan-600'}>
                  {(c.user_name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.user_name || 'Usuario'}</span>
                  <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString('es-HN')}</span>
                </div>
                {renderNoteContent(c.message)}
              </div>
            </div>
          ))}
        </div>
      )}
      {showInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') addComment(); if (e.key === 'Escape') setShowInput(false); }}
            placeholder="Escribe un comentario..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            autoFocus
          />
          <button onClick={(e) => { e.stopPropagation(); addComment(); }} className="px-2 py-1 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-700">
            <i className="fas fa-paper-plane"></i>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowInput(false); }} className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
            <i className="fas fa-times"></i>
          </button>
        </div>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); setShowInput(true); }} className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
          <i className="fas fa-comment-dots"></i> Agregar comentario
        </button>
      )}
    </div>
  );
}

export default function NotasLineaDeTiempoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    }>
      <NotasLineaDeTiempoContent />
    </Suspense>
  );
}

function NotasLineaDeTiempoContent() {
  const searchParams = useSearchParams();
  const pacienteId = searchParams.get('id');

  const [data, setData] = useState<TimelineData | null>(null);
  const [odontogramPilots, setOdontogramPilots] = useState<any[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [notes, setNotes] = useState<TimelineNote[]>([]);
   const [notesModalOpen, setNotesModalOpen] = useState(false);
   const [editingNote, setEditingNote] = useState<TimelineNote | null>(null);
   const [noteTitle, setNoteTitle] = useState('');
   const [noteBlocks, setNoteBlocks] = useState<NoteBlock[]>([{ type: 'text', text: '', formats: {} }]);
   const [activeBlockIdx, setActiveBlockIdx] = useState(0);
   const [noteDate, setNoteDate] = useState('');
   const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    if (!pacienteId) {
      setError('ID de paciente no proporcionado');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [timelineResponse, odontogramResponse, notesResponse] = await Promise.all([
          fetch(`/api/timeline?paciente_id=${pacienteId}`),
          fetch(`/api/odontogram-pilot/history?patient_id=${pacienteId}`),
          fetch(`/api/timeline-notes?paciente_id=${pacienteId}&_t=${Date.now()}`)
        ]);

        if (!timelineResponse.ok) throw new Error('Error al cargar datos');
        const result: TimelineData = await timelineResponse.json();

        // Parse odontogram-pilot history
        let pilots: any[] = [];
        if (odontogramResponse.ok) {
          const odData = await odontogramResponse.json();
          pilots = odData.history || [];
        }

        let fetchedNotes: TimelineNote[] = [];
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          fetchedNotes = notesData.notes || [];
        }

        setOdontogramPilots(pilots);
        setData(result);
        setNotes(fetchedNotes);
        buildEvents(result, pilots, fetchedNotes);
      } catch (err) {
        setError('Error al cargar la línea de tiempo');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pacienteId]);

   function buildEvents(timelineData: TimelineData, pilots: any[], timelineNotes: TimelineNote[]) {
      const allEvents: TimelineEvent[] = [];
      const { patient, appointments, treatments, consentimientos, presupuestos } = timelineData;

      // Add note events
      timelineNotes.forEach((n) => {
        allEvents.push({
          id: `note-${n.id}`,
          type: 'note',
          date: n.note_date,
          title: n.title,
          subtitle: undefined,
          description: undefined,
          icon: 'fas fa-sticky-note',
          color: 'text-cyan-600',
          details: { note_id: n.id }
        });
      });

     // Milestone: Patient start date (will be added at the end)
     let milestoneEvent: TimelineEvent | null = null;
     if (patient.fecha_inicio) {
       milestoneEvent = {
         id: 'milestone-inicio',
         type: 'milestone',
         date: patient.fecha_inicio,
         title: 'Inicio del Paciente',
         subtitle: patient.nombre_completo,
         description: 'Fecha en que el paciente inició su historial en la clínica',
         icon: 'fas fa-flag',
         color: 'text-amber-600',
         details: { edad: patient.edad, sexo: patient.sexo }
       };
     }

     // Appointments
     appointments.forEach((apt) => {
       allEvents.push({
         id: `apt-${apt.id}`,
         type: 'appointment',
         date: apt.start_date,
         title: apt.title || 'Cita',
         subtitle: getEventTypeLabel(apt.event_type),
         description: apt.notes || apt.description || undefined,
         icon: 'fas fa-calendar-check',
         color: 'text-blue-600',
         details: {
           status: apt.status,
           location: apt.location,
           end_date: apt.end_date
         }
       });
     });

     // Treatments
     treatments.forEach((t) => {
       const itemNames = (t.items || []).slice(0, 3).map((i: any) => i.nombre_tratamiento).join(', ');
       const moreCount = (t.items || []).length > 3 ? ` +${(t.items || []).length - 3} más` : '';
       allEvents.push({
         id: `treatment-${t.id}`,
         type: 'treatment',
         date: t.fecha_cita,
         title: itemNames ? `${itemNames}${moreCount}` : 'Tratamiento',
         subtitle: t.especialidad || undefined,
         description: t.notas_doctor || undefined,
         icon: 'fas fa-tooth',
         color: 'text-teal-600',
         details: {
           status: t.estado,
           total: t.total_final,
           paid: t.monto_pagado,
           remaining: (t.total_final || 0) - (t.monto_pagado || 0),
           item_count: (t.items || []).length
         }
       });

       // Payment events for this treatment
       (t.payments || []).forEach((p: any) => {
         allEvents.push({
           id: `payment-${p.id}`,
           type: 'payment',
           date: p.fecha_pago,
           title: `Pago: ${formatCurrency(p.monto_pago)}`,
           subtitle: p.metodo_pago || undefined,
           description: p.notas_pago || undefined,
           icon: 'fas fa-money-bill-wave',
           color: 'text-emerald-600',
           details: { moneda: p.moneda }
         });
       });
     });

      // Odontograms from odontogram-pilot history API
      pilots.forEach((o) => {
        const datosOdontograma = o.datos_odontograma || {};
        const dientes = datosOdontograma.dientes || {};
        const odontogramType = datosOdontograma.tipo;
        const adultToothNumbers = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
        const childToothNumbers = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
        const toothKeys = odontogramType === 'nino' ? childToothNumbers : adultToothNumbers;
  
        const getToothState = (diente: any) => {
          if (!diente || typeof diente !== 'object') return 'sano';
          if (diente.estado !== undefined) return diente.estado || 'sano';
          if (diente.cuadrantes && typeof diente.cuadrantes === 'object') {
            const vals = Object.values(diente.cuadrantes).filter((v) => typeof v === 'string') as string[];
            const first = vals.find((v) => v !== 'sano');
            if (odontogramType === 'oleary_adulto') return first || 'sano';
            if (diente.central && typeof diente.central === 'string' && diente.central !== 'sano') return diente.central;
            return first || 'sano';
          }
          if (diente.central && typeof diente.central === 'string') return diente.central || 'sano';
          return 'sano';
        };

        const counts: Record<string, number> = {};
        toothKeys.forEach((n) => {
          const state = getToothState(dientes[n.toString()]);
          counts[state] = (counts[state] || 0) + 1;
        });

        const significant = Object.entries(counts)
          .filter(([k]) => k !== 'sano')
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`);

        allEvents.push({
          id: `odontogram-${o.id}`,
          type: 'odontogram',
          date: datosOdontograma.fecha || o.fecha_creacion,
          title: `Odontograma v${o.version}`,
          subtitle: significant.length > 0 ? significant.join(' • ') : `${toothKeys.length} dientes registrados`,
          description: o.notas || undefined,
          icon: 'fas fa-teeth',
          color: 'text-purple-600',
          details: {
            version: o.version,
            total_teeth: toothKeys.length,
            findings: counts
          }
        });
      });

     // Consentimientos
     consentimientos.forEach((c) => {
       allEvents.push({
         id: `consent-${c.id}`,
         type: 'consentimiento',
         date: c.fecha_consentimiento,
         title: c.nombre_consentimiento || 'Consentimiento',
         subtitle: c.tipo_consentimiento || undefined,
         description: undefined,
         icon: 'fas fa-file-signature',
         color: 'text-green-600',
         details: { status: c.estado }
       });
     });

     // Presupuestos
     presupuestos.forEach((p) => {
       allEvents.push({
         id: `presupuesto-${p.id}`,
         type: 'presupuesto',
         date: p.quote_date,
         title: p.treatment_description || 'Presupuesto',
         subtitle: formatCurrency(p.total_amount),
         description: p.doctor_name ? `Doctor: ${p.doctor_name}` : undefined,
         icon: 'fas fa-file-invoice-dollar',
         color: 'text-orange-600',
         details: { status: p.status, amount: p.total_amount }
       });
     });

      // Sort by date descending (newest first)
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Add milestone event at the end (bottom) regardless of date
      if (milestoneEvent) {
        allEvents.push(milestoneEvent);
      }

       setEvents(allEvents);
    }

   async function openNotesModal(note?: TimelineNote) {
    if (note) {
       setEditingNote(note);
       setNoteTitle(note.title);
       setNoteBlocks(parseContent(note.content).blocks);
       setNoteDate(note.note_date);
     } else {
       setEditingNote(null);
       setNoteTitle('Nota');
       setNoteBlocks([{ type: 'text', text: '', formats: {} }]);
       setNoteDate(new Date().toISOString().split('T')[0]);
     }
     setNotesModalOpen(true);
   }

   async function saveNote() {
     if (!pacienteId || !noteTitle.trim()) return;
     setNoteSaving(true);
     try {
      const contentPayload: NoteContent = { blocks: noteBlocks.filter(b => b.text.trim() !== '' || (b.type === 'checklist' && (b.items || []).length > 0)) };
      const body: Record<string, any> = {
        title: noteTitle,
        content: contentPayload.blocks.length > 0 ? contentPayload : null,
        note_date: noteDate
      };
       if (editingNote) {
         const res = await fetch('/api/timeline-notes', {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ ...body, id: editingNote.id })
         });
         if (!res.ok) throw new Error('Error al actualizar nota');
       } else {
         const res = await fetch('/api/timeline-notes', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ ...body, paciente_id: pacienteId })
         });
         if (!res.ok) throw new Error('Error al guardar nota');
       }
       setNotesModalOpen(false);
       const notesRes = await fetch(`/api/timeline-notes?paciente_id=${pacienteId}`);
       if (notesRes.ok) {
         const notesData = await notesRes.json();
         const fetchedNotes = notesData.notes || [];
         setNotes(fetchedNotes);
         if (data) buildEvents(data, odontogramPilots, fetchedNotes);
       }
     } catch (err) {
       console.error(err);
     } finally {
       setNoteSaving(false);
     }
   }
  async function deleteNote(noteId: string) {
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      const res = await fetch(`/api/timeline-notes?id=${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar nota');
      const updatedNotes = notes.filter(n => n.id !== noteId);
      setNotes(updatedNotes);
      if (data) buildEvents(data, odontogramPilots, updatedNotes);
    } catch (err) {
      console.error(err);
    }
  }

  const filteredEvents = activeFilter === 'all'
    ? events
    : events.filter(e => e.type === activeFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Cargando línea de tiempo...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-red-500">
          <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
          <p>{error || 'Error desconocido'}</p>
        </div>
      </div>
    );
  }

  const { patient, summary } = data;
  const odontogramCount = odontogramPilots.length;

   return (
     <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
       <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400">
              {patient.nombre_completo}
            </p>
            <button
              onClick={() => openNotesModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-all shadow-md"
            >
              <i className="fas fa-sticky-note"></i>
              Nueva Nota
            </button>
          </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <i className="fas fa-calendar-check text-blue-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_appointments}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Citas</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <i className="fas fa-tooth text-teal-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_treatments}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tratamientos</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <i className="fas fa-money-bill-wave text-emerald-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.total_paid)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Pagado</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <i className="fas fa-teeth text-purple-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{odontogramCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Odontogramas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFilter === opt.value
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm'
              }`}
            >
              <i className={opt.icon}></i>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

          <div className="space-y-6">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16 pl-16">
                <i className="fas fa-inbox text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">No hay eventos para mostrar</p>
              </div>
            ) : (
              filteredEvents.map((event, index) => {
                const config = EVENT_TYPE_CONFIG[event.type];
                const isExpanded = expandedEvent === event.id;

                return (
                  <div key={event.id} className="relative pl-16">
                    {/* Timeline dot */}
                    <div className={`absolute left-4 w-5 h-5 rounded-full ${config.bgColor} border-2 border-white dark:border-gray-900 flex items-center justify-center z-10`}>
                      <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`}></div>
                    </div>

                    {/* Date label */}
                    <div className="mb-1">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        {SimpleTimezoneFix.formatDisplayDate(event.date)}
                      </span>
                    </div>

                    {/* Card */}
                    <div
                      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                        isExpanded ? 'ring-2 ring-teal-500/20' : ''
                      }`}
                      onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <i className={`${config.icon} ${config.color}`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                                {event.title}
                              </h3>
                              {event.details?.status && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(event.details.status)}`}>
                                  {getStatusLabel(event.details.status)}
                                </span>
                              )}
                            </div>
                            {event.subtitle && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {event.subtitle}
                              </p>
                            )}
                          </div>
                          <i className={`fas fa-chevron-down text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            {event.description && typeof event.description === 'string' && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{event.description}</p>
                            )}

                            {/* Treatment details */}
                            {event.type === 'treatment' && event.details && (
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(event.details.total || 0)}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">Pagado</p>
                                  <p className="font-semibold text-emerald-600">{formatCurrency(event.details.paid || 0)}</p>
                                </div>
                                {event.details.remaining > 0 && (
                                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 col-span-2">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Saldo pendiente</p>
                                    <p className="font-semibold text-orange-600">{formatCurrency(event.details.remaining)}</p>
                                  </div>
                                )}
                                {event.details.item_count > 0 && (
                                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 col-span-2">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Tratamientos realizados</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{event.details.item_count} ítems</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Odontogram details */}
                            {event.type === 'odontogram' && event.details?.findings && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Estado dental</p>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(event.details.findings).map(([key, val]) => (
                                    <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                      <span className="text-gray-600 dark:text-gray-300 capitalize">{key}:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">{val as number}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Appointment details */}
                            {event.type === 'appointment' && event.details && (
                              <div className="space-y-2 text-sm">
                                {event.details.location && (
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                    <i className="fas fa-map-marker-alt text-gray-400 w-4"></i>
                                    {event.details.location}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Presupuesto details */}
                            {event.type === 'presupuesto' && event.details && (
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">Monto</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(event.details.amount || 0)}</p>
                                </div>
                              </div>
                            )}

                            {/* Payment details */}
                            {event.type === 'payment' && event.details && (
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                <p>Moneda: {event.details.moneda || 'HNL'}</p>
                              </div>
                            )}

                            {/* Date/time for all timeline items */}
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                <i className="fas fa-clock mr-1"></i>
                                {SimpleTimezoneFix.formatDisplayDate(event.date)}
                              </p>
                            </div>

                             {/* Note details */}
                             {event.type === 'note' && event.details?.note_id && (() => {
                               const note = notes.find(n => n.id === event.details.note_id);
                               if (!note) return null;
                               return (
                                 <div className="space-y-3">
                                   <div className="flex items-start justify-between gap-3">
                                     <div className="flex-1 min-w-0">
                                       {renderNoteContent(note.content)}
                                     </div>
                                     <div className="flex items-center gap-1 flex-shrink-0">
                                       <button
                                         onClick={(e) => { e.stopPropagation(); openNotesModal(note); }}
                                         className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-cyan-600 transition-colors"
                                       >
                                         <i className="fas fa-pen text-xs"></i>
                                       </button>
                                       <button
                                         onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                         className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 transition-colors"
                                       >
                                         <i className="fas fa-trash text-xs"></i>
                                       </button>
</div>
                                    </div>
{note.created_by_name && (
                                       <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                         <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center overflow-hidden">
                                           {note.created_by_image ? (
                                             <img 
                                               src={note.created_by_image} 
                                               alt={note.created_by_name}
                                               className="w-full h-full rounded-full object-cover"
                                               onError={(e) => {
                                                 e.currentTarget.style.display = 'none';
                                               }}
                                             />
                                           ) : null}
                                           <span className={note.created_by_image ? 'hidden' : 'text-[10px] font-bold text-cyan-600'}>
                                             {(note.created_by_name || '?').charAt(0).toUpperCase()}
                                           </span>
                                         </div>
                                         <span><i className="fas fa-user mr-1"></i> {note.created_by_name}</span>
                                       </div>
                                     )}
                                    <NoteComments noteId={note.id} />
                                 </div>
                               );
                             })()}

                            {/* Milestone details */}
                            {event.type === 'milestone' && event.details && (
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {event.details.edad && (
                                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Edad</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{event.details.edad} años</p>
                                  </div>
                                )}
                                {event.details.sexo && (
                                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Sexo</p>
                                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{event.details.sexo}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      {notesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNotesModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingNote ? 'Editar Nota' : 'Nueva Nota'}
              </h3>
              <button onClick={() => setNotesModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  placeholder="Título de la nota"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido</label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  {/* Formatting toolbar */}
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-300 dark:border-gray-600 flex-wrap">
                    <button type="button" onClick={() => setNoteBlocks(prev => prev.map((b, i) => i === activeBlockIdx && b.type === 'text' ? { ...b, formats: { ...b.formats, bold: !b.formats?.bold } } : b))} className={`p-1.5 rounded text-xs ${noteBlocks[activeBlockIdx]?.formats?.bold ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Bold">
                      <i className="fas fa-bold"></i>
                    </button>
                    <button type="button" onClick={() => setNoteBlocks(prev => prev.map((b, i) => i === activeBlockIdx && b.type === 'text' ? { ...b, formats: { ...b.formats, italic: !b.formats?.italic } } : b))} className={`p-1.5 rounded text-xs ${noteBlocks[activeBlockIdx]?.formats?.italic ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Italic">
                      <i className="fas fa-italic"></i>
                    </button>
                    <button type="button" onClick={() => setNoteBlocks(prev => prev.map((b, i) => i === activeBlockIdx && b.type === 'text' ? { ...b, formats: { ...b.formats, underline: !b.formats?.underline } } : b))} className={`p-1.5 rounded text-xs ${noteBlocks[activeBlockIdx]?.formats?.underline ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Underline">
                      <i className="fas fa-underline"></i>
                    </button>
                    <button type="button" onClick={() => setNoteBlocks(prev => prev.map((b, i) => i === activeBlockIdx && b.type === 'text' ? { ...b, formats: { ...b.formats, strikethrough: !b.formats?.strikethrough } } : b))} className={`p-1.5 rounded text-xs ${noteBlocks[activeBlockIdx]?.formats?.strikethrough ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Strikethrough">
                      <i className="fas fa-strikethrough"></i>
                    </button>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button type="button" onClick={() => setNoteBlocks(prev => { const nb = [...prev]; if (nb[activeBlockIdx]?.type === 'text') nb[activeBlockIdx] = { ...nb[activeBlockIdx], type: 'heading', level: 2 }; return nb; })} className={`p-1.5 rounded text-xs ${noteBlocks[activeBlockIdx]?.type === 'heading' ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Heading">
                      <i className="fas fa-heading"></i>
                    </button>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button type="button" onClick={() => setNoteBlocks(prev => { const nb = [...prev]; const items: ChecklistItem[] = noteBlocks[activeBlockIdx]?.type === 'checklist' ? (noteBlocks[activeBlockIdx].items || []) : [{ id: crypto.randomUUID(), text: '', checked: false }]; nb[activeBlockIdx] = { type: 'checklist', text: '', items }; return nb; })} className={`p-1.5 rounded text-xs ${noteBlocks[activeBlockIdx]?.type === 'checklist' ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Checklist">
                      <i className="fas fa-tasks"></i>
                    </button>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button type="button" onClick={() => { if (noteBlocks.length <= 1) return; const nb = noteBlocks.filter((_, i) => i !== activeBlockIdx); setNoteBlocks(nb.length > 0 ? nb : [{ type: 'text', text: '', formats: {} }]); setActiveBlockIdx(Math.max(0, activeBlockIdx - 1)); }} className="p-1.5 rounded text-xs text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500" title="Delete block">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                  {/* Block editor */}
                  <div className="p-3 space-y-2 min-h-[180px] bg-white dark:bg-gray-900">
                    {noteBlocks.map((block, idx) => (
                      <div key={idx} onClick={() => setActiveBlockIdx(idx)} className={`rounded-lg p-2 cursor-text ${idx === activeBlockIdx ? 'ring-1 ring-cyan-500/30 bg-cyan-50/30 dark:bg-cyan-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                        {block.type === 'checklist' ? (
                          <div className="space-y-1">
                            {(block.items || []).map((item, itemIdx) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <button type="button" onClick={() => { setNoteBlocks(prev => { const nb = [...prev]; if (nb[idx].type !== 'checklist') return nb; const items = [...(nb[idx].items || [])]; items[itemIdx] = { ...items[itemIdx], checked: !items[itemIdx].checked }; nb[idx] = { ...nb[idx], items }; return nb; }); }} className="flex-shrink-0">
                                  <i className={`fas ${item.checked ? 'fa-check-square text-cyan-600' : 'fa-square text-gray-400'}`}></i>
                                </button>
                                <input
                                  type="text"
                                  value={item.text}
                                  onChange={(e) => { setNoteBlocks(prev => { const nb = [...prev]; if (nb[idx].type !== 'checklist') return nb; const items = [...(nb[idx].items || [])]; items[itemIdx] = { ...items[itemIdx], text: e.target.value }; nb[idx] = { ...nb[idx], items }; return nb; }); }}
                                  onFocus={() => setActiveBlockIdx(idx)}
                                  placeholder="Item..."
                                  className={`flex-1 bg-transparent text-sm outline-none ${item.checked ? 'line-through opacity-60 text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                                />
                                <button type="button" onClick={() => { setNoteBlocks(prev => { const nb = [...prev]; if (nb[idx].type !== 'checklist') return nb; const items = (nb[idx].items || []).filter((_, i) => i !== itemIdx); nb[idx] = { ...nb[idx], items }; return nb; }); }} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                                  <i className="fas fa-times text-xs"></i>
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => { setNoteBlocks(prev => { const nb = [...prev]; if (nb[idx].type !== 'checklist') return nb; const items = [...(nb[idx].items || []), { id: crypto.randomUUID(), text: '', checked: false }]; nb[idx] = { ...nb[idx], items }; return nb; }); }} className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1 mt-1">
                              <i className="fas fa-plus"></i> Agregar item
                            </button>
                          </div>
                        ) : (
                          <textarea
                            value={block.text}
                            onChange={(e) => { setNoteBlocks(prev => prev.map((b, i) => i === idx ? { ...b, text: e.target.value } : b)); }}
                            onFocus={() => setActiveBlockIdx(idx)}
                            rows={block.type === 'heading' ? 1 : 2}
                            placeholder={block.type === 'heading' ? 'Encabezado...' : 'Escribe aquí...'}
                            className={`w-full bg-transparent outline-none resize-none text-sm ${block.type === 'heading' ? 'font-bold text-gray-900 dark:text-white' : ''} ${(block.formats?.bold && block.type === 'text') ? 'font-bold' : ''} ${(block.formats?.italic && block.type === 'text') ? 'italic' : ''} ${(block.formats?.underline && block.type === 'text') ? 'underline' : ''} ${(block.formats?.strikethrough && block.type === 'text') ? 'line-through' : ''} ${block.type === 'text' ? 'text-gray-700 dark:text-gray-300' : ''}`}
                          />
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => { setNoteBlocks(prev => [...prev, { type: 'text', text: '', formats: {} }]); setActiveBlockIdx(noteBlocks.length); }} className="text-xs text-gray-400 hover:text-cyan-600 flex items-center gap-1 mt-2">
                      <i className="fas fa-plus-circle"></i> Agregar bloque
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setNotesModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveNote}
                  disabled={noteSaving || !noteTitle.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {noteSaving ? 'Guardando...' : (editingNote ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
