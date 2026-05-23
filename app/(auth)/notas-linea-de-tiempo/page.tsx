'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';

type FilterType = 'all' | 'appointment' | 'treatment' | 'odontogram' | 'consentimiento' | 'presupuesto' | 'payment' | 'milestone';

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
};

const FILTER_OPTIONS: { value: FilterType; label: string; icon: string }[] = [
  { value: 'all', label: 'Todos', icon: 'fas fa-layer-group' },
  { value: 'milestone', label: 'Hitos', icon: 'fas fa-flag' },
  { value: 'appointment', label: 'Citas', icon: 'fas fa-calendar-check' },
  { value: 'treatment', label: 'Tratamientos', icon: 'fas fa-tooth' },
  { value: 'odontogram', label: 'Odontogramas', icon: 'fas fa-teeth' },
  { value: 'consentimiento', label: 'Consentimientos', icon: 'fas fa-file-signature' },
  { value: 'presupuesto', label: 'Presupuestos', icon: 'fas fa-file-invoice-dollar' },
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
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!pacienteId) {
      setError('ID de paciente no proporcionado');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/timeline?paciente_id=${pacienteId}`);
        if (!response.ok) throw new Error('Error al cargar datos');
        const result: TimelineData = await response.json();
        setData(result);
        buildEvents(result);
      } catch (err) {
        setError('Error al cargar la línea de tiempo');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pacienteId]);

  function buildEvents(timelineData: TimelineData) {
    const allEvents: TimelineEvent[] = [];
    const { patient, appointments, treatments, odontograms, consentimientos, presupuestos } = timelineData;

    // Milestone: Patient start date
    if (patient.fecha_inicio) {
      allEvents.push({
        id: 'milestone-inicio',
        type: 'milestone',
        date: patient.fecha_inicio,
        title: 'Inicio del Paciente',
        subtitle: patient.nombre_completo,
        description: 'Fecha en que el paciente inició su historial en la clínica',
        icon: 'fas fa-flag',
        color: 'text-amber-600',
        details: { edad: patient.edad, sexo: patient.sexo }
      });
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

    // Odontograms
    odontograms.forEach((o) => {
      allEvents.push({
        id: `odontogram-${o.id}`,
        type: 'odontogram',
        date: o.fecha_creacion,
        title: `Odontograma v${o.version}`,
        subtitle: o.significant_findings?.length > 0 ? o.significant_findings.join(' • ') : `${o.total_teeth} dientes registrados`,
        description: o.notas || undefined,
        icon: 'fas fa-teeth',
        color: 'text-purple-600',
        details: {
          version: o.version,
          total_teeth: o.total_teeth,
          findings: o.tooth_counts
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

    // Sort by date descending
    allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEvents(allEvents);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            <i className="fas fa-stream mr-3 text-teal-600"></i>
            Notas - Línea de Tiempo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {patient.nombre_completo}
          </p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_odontograms}</p>
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
                const isLeft = index % 2 === 0;

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
                            {event.description && (
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
    </div>
  );
}
