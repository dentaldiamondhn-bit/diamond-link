// app/dashboard/page.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Activity,
  Sparkles,
  CalendarClock,
  DollarSign,
  TrendingUp,
  ListChecks,
  MessageSquare,
  FileText,
  CalendarDays,
  Clock,
  MapPin,
  ArrowUpRight,
  User,
} from 'lucide-react';
import { PatientService } from '../../../services/patientService';
import { CompletedTreatmentService } from '../../../services/completedTreatmentService';
import { SimpleTimezoneFix } from '../../../services/simpleTimezoneFix';
import { UserAvatar } from '../../../components/calendar/UserComponents';
import { useRoleBasedAccess } from '../../../hooks/useRoleBasedAccess';
import PatientsTableModal from '../../../components/PatientsTableModal';

// Currency formatting utility for HNL
const formatHNL = (amount: number) => {
  return `L ${amount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Doctor',
  staff: 'Personal',
  'tech-support': 'Soporte Técnico',
  tech_support: 'Soporte Técnico',
};

type AccentKey = 'blue' | 'purple' | 'teal' | 'green' | 'red' | 'orange' | 'indigo' | 'yellow' | 'cyan' | 'gray';

const ACCENTS: Record<AccentKey, { icon: string; wash: string }> = {
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', wash: 'bg-blue-500' },
  purple: { icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400', wash: 'bg-purple-500' },
  teal: { icon: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400', wash: 'bg-teal-500' },
  green: { icon: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400', wash: 'bg-green-500' },
  red: { icon: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', wash: 'bg-red-500' },
  orange: { icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400', wash: 'bg-orange-500' },
  indigo: { icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400', wash: 'bg-indigo-500' },
  yellow: { icon: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400', wash: 'bg-yellow-500' },
  cyan: { icon: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400', wash: 'bg-cyan-500' },
  gray: { icon: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', wash: 'bg-gray-500' },
};

interface StatTileProps {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  accent: AccentKey;
  loading?: boolean;
  onClick?: () => void;
}

function StatTile({ icon, title, value, subtitle, accent, loading, onClick }: StatTileProps) {
  const a = ACCENTS[accent];
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm transition-all duration-200 ${
        onClick
          ? 'cursor-pointer text-left hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg dark:hover:border-teal-600'
          : 'hover:shadow-md'
      }`}
    >
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl ${a.wash}`} />
      <div className="relative flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {loading ? <span className="text-gray-300 dark:text-gray-600">...</span> : value}
          </div>
          <div className="truncate text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</div>
          {subtitle && <div className="truncate text-xs text-gray-400 dark:text-gray-500">{subtitle}</div>}
        </div>
        {onClick && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:bg-gray-700 dark:text-gray-500">
            <ArrowUpRight size={14} />
          </span>
        )}
      </div>
    </Wrapper>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { userRole, permissions, hasPermission } = useRoleBasedAccess();
  const router = useRouter();
  const [patientCount, setPatientCount] = useState<number>(0);
  const [treatmentCount, setTreatmentCount] = useState<number>(0);
  const [individualTreatmentCount, setIndividualTreatmentCount] = useState<number>(0);
  const [doctorRevenue, setDoctorRevenue] = useState<number>(0);
  const [averageRevenue, setAverageRevenue] = useState<number>(0);
  const [patientStats, setPatientStats] = useState<any>({ newPatients: 0, returningPatients: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [followUpCount, setFollowUpCount] = useState<number>(0);
  const [prospectOrtoCount, setProspectOrtoCount] = useState<number>(0);
  const [eventParticipants, setEventParticipants] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  
  // Patients modal state
  const [showPatientsModal, setShowPatientsModal] = useState<boolean>(false);
  const [doctorPatients, setDoctorPatients] = useState<any[]>([]);
  const [patientsModalLoading, setPatientsModalLoading] = useState<boolean>(false);

  // Prospecto para Orto modal state
  const [showProspectModal, setShowProspectModal] = useState<boolean>(false);
  const [prospectPatients, setProspectPatients] = useState<any[]>([]);
  const [prospectModalLoading, setProspectModalLoading] = useState<boolean>(false);

  // Patients modal functions
  const openPatientsModal = async () => {
    try {
      const doctorName = user?.fullName || '';
      if (userRole !== 'doctor') {
        console.warn('❌ Patients modal only available for doctors');
        return;
      }

      // Fetch doctor's patients first
      const patients = await PatientService.getPatientsByDoctor(doctorName);
      
      if (!patients || patients.length === 0) {
        console.warn('❌ No patients found for doctor');
        return;
      }

      setShowPatientsModal(true);
      setPatientsModalLoading(true);
      
      // Batch-fetch treatment data for ALL patients in one query
      const { supabase } = await import('@/lib/supabase');
      const patientIds = patients.map((p: any) => p.paciente_id || p.id).filter(Boolean);

      const { data: allTreatments } = await supabase
        .from('tratamientos_completados')
        .select('paciente_id, monto_pagado')
        .in('paciente_id', patientIds);

      const perPatient: Record<string, { count: number; total: number }> = {};
      if (allTreatments) {
        for (const t of allTreatments) {
          if (!perPatient[t.paciente_id]) perPatient[t.paciente_id] = { count: 0, total: 0 };
          perPatient[t.paciente_id].count++;
          perPatient[t.paciente_id].total += t.monto_pagado || 0;
        }
      }

      const patientsWithDetails = patients.map((patient: any) => {
        const pid = patient.paciente_id || patient.id;
        const agg = perPatient[pid] || { count: 0, total: 0 };
        return { ...patient, completedTreatmentsCount: agg.count, totalPaid: agg.total };
      });

      setDoctorPatients(patientsWithDetails);
    } catch (error) {
      console.error('❌ Error opening patients modal:', error);
    } finally {
      setPatientsModalLoading(false);
    }
  };

  const closePatientsModal = () => {
    setShowPatientsModal(false);
    setDoctorPatients([]);
  };

  const openProspectOrtoModal = async () => {
    try {
      setShowProspectModal(true);
      setProspectModalLoading(true);

      const { OdontogramPilotService } = await import('../../../services/odontogramPilotService');
      const patients = await OdontogramPilotService.getProspectOrtoPatients();
      setProspectPatients(patients || []);
    } catch (error) {
      console.error('❌ Error opening prospect orto modal:', error);
      setProspectPatients([]);
    } finally {
      setProspectModalLoading(false);
    }
  };

  const closeProspectOrtoModal = () => {
    setShowProspectModal(false);
    setProspectPatients([]);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const doctorName = user?.fullName || '';
        
        // Fetch role-specific data
        
        // Fetch upcoming events for logged-in user
        if (user?.id) {
          const evRes = await fetch('/api/events/upcoming', {
            headers: { 'x-user-id': user.id },
          });
          const userUpcomingEvents = evRes.ok ? await evRes.json() : [];
          setUpcomingEvents(userUpcomingEvents);
          
          // Fetch participants for each event using new participants API
          const participantsData: Record<string, any[]> = {};
          for (const event of userUpcomingEvents) {
            if (event.id) {
              const res = await fetch(`/api/events/${event.id}/participants`, {
                headers: { 'x-user-id': event.user_id },
              });
              if (res.ok) {
                participantsData[event.id] = await res.json();
              } else {
                participantsData[event.id] = [];
              }
            }
          }
          setEventParticipants(participantsData);
        }
        
        if (userRole === 'doctor') {
          // Fetch doctor's patients and stats
          const doctorPatients = await PatientService.getPatientsByDoctor(doctorName);
          const doctorPatientStats = await PatientService.getDoctorPatientStats(doctorName);
          setPatientCount(doctorPatients.length);
          setPatientStats(doctorPatientStats);

          // Fetch prospect orto count (active odontograms marked as ortho prospects)
          const { OdontogramPilotService } = await import('../../../services/odontogramPilotService');
          const prospectCount = await OdontogramPilotService.getProspectOrtoCount();
          setProspectOrtoCount(prospectCount);

          // Fetch doctor's treatments (completed treatment records) for current month
          const doctorTreatments = await CompletedTreatmentService.getCompletedTreatmentsByDoctor(doctorName);
          const completedCount = await CompletedTreatmentService.getCompletedTreatmentsCountByDoctor(doctorName);
          setTreatmentCount(completedCount);

          // Fetch individual treatments count for current month
          const individualCount = await CompletedTreatmentService.getIndividualTreatmentsCountByDoctor(doctorName);
          setIndividualTreatmentCount(individualCount);

          // Fetch doctor's revenue and average
          const revenue = await CompletedTreatmentService.getDoctorRevenue(doctorName);
          const avgRevenue = await CompletedTreatmentService.getDoctorAverageRevenue(doctorName);
          setDoctorRevenue(revenue);
          setAverageRevenue(avgRevenue);

          // Fetch follow-up count
          const followUpRes = await fetch('/api/patient-follow-up?type=all');
          const followUpJson = await followUpRes.json();
          setFollowUpCount(followUpJson.data?.length || 0);

        } else if (userRole === 'admin') {
          // Fetch all patients for admin
          const allPatients = await PatientService.getPatients();
          setPatientCount(allPatients.length);

          // Fetch prospect orto count (active odontograms marked as ortho prospects)
          const { OdontogramPilotService } = await import('../../../services/odontogramPilotService');
          const prospectCount = await OdontogramPilotService.getProspectOrtoCount();
          setProspectOrtoCount(prospectCount);

          // Fetch treatments count for current month
          const now = new Date();
          const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const { supabase } = await import('../../../lib/supabase');
          
          const { data: monthlyCompleted } = await supabase
            .from('tratamientos_completados')
            .select(`
              id,
              fecha_cita,
              vista_tratamientos_realizados_detalles!inner (
                doctor_name
              )
            `)
            .gte('fecha_cita', firstOfMonth.toISOString().split('T')[0])
            .lt('fecha_cita', firstOfNextMonth.toISOString().split('T')[0]);
          setTreatmentCount(monthlyCompleted?.length || 0);
          
          // Fetch individual treatments count for current month
          const { data: monthlyItems } = await supabase
            .from('vista_tratamientos_realizados_detalles')
            .select('id')
            .gte('creado_en', firstOfMonth.toISOString())
            .lt('creado_en', firstOfNextMonth.toISOString());
          setIndividualTreatmentCount(monthlyItems?.length || 0);

          // Fetch follow-up count
          const followUpRes = await fetch('/api/patient-follow-up?type=all');
          const followUpJson = await followUpRes.json();
          setFollowUpCount(followUpJson.data?.length || 0);

        } else {
          // For staff and others, fetch all patients
          const patients = await PatientService.getPatients();
          setPatientCount(patients.length);

          // Fetch prospect orto count (active odontograms marked as ortho prospects)
          const { OdontogramPilotService } = await import('../../../services/odontogramPilotService');
          const prospectCount = await OdontogramPilotService.getProspectOrtoCount();
          setProspectOrtoCount(prospectCount);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setPatientCount(0);
        setTreatmentCount(0);
        setDoctorRevenue(0);
        setAverageRevenue(0);
        setPatientStats({ newPatients: 0, returningPatients: 0 });
        setUpcomingEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.fullName, userRole, user?.id]);

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'Usuario';
  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const todayLabel = new Date().toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      {/* Contenido Principal */}
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Sección de Bienvenida */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 dark:from-teal-800 dark:via-teal-700 dark:to-cyan-700 p-6 sm:p-8 shadow-lg mb-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-teal-100 capitalize">{todayLabel}</p>
                <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  ¡Bienvenido de nuevo, {firstName}!
                </h2>
                <p className="mt-2 text-teal-50">
                  Esto es lo que está pasando con tu cuenta hoy.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm sm:self-auto">
                <UserAvatar
                  user={{
                    first_name: user?.firstName,
                    last_name: user?.lastName,
                    profileImageUrl: user?.imageUrl,
                  }}
                  size="lg"
                />
                <div>
                  <div className="text-sm font-semibold text-white">{user?.fullName || 'Usuario'}</div>
                  <div className="text-xs text-teal-100 capitalize">{roleLabel}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas - Role Specific */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5 mb-6">
            {userRole === 'doctor' ? (
              <>
                {/* Doctor-specific stats */}
                <StatTile
                  icon={<Users size={20} />}
                  title="Mis Pacientes"
                  value={patientCount}
                  subtitle={`${patientStats.newPatients} nuevos · ${patientStats.returningPatients} recurrentes`}
                  accent="blue"
                  loading={loading}
                  onClick={openPatientsModal}
                />
                <StatTile
                  icon={<Activity size={20} />}
                  title="Tratamientos Completados"
                  value={treatmentCount}
                  subtitle={averageRevenue > 0 ? `Promedio: ${formatHNL(averageRevenue)}` : 'Sin datos'}
                  accent="purple"
                  loading={loading}
                />
                <StatTile
                  icon={<Sparkles size={20} />}
                  title="Tratamientos Individuales"
                  value={individualTreatmentCount}
                  subtitle="Este mes"
                  accent="teal"
                  loading={loading}
                />
                <StatTile
                  icon={<CalendarClock size={20} />}
                  title="Seguimiento Pacientes"
                  value={followUpCount}
                  subtitle="Pacientes con más de 5 meses sin tratamiento"
                  accent="green"
                  loading={loading}
                  onClick={() => router.push('/patient-follow-up')}
                />
                <StatTile
                  icon={<Sparkles size={20} />}
                  title="Prospecto para Orto"
                  value={prospectOrtoCount}
                  subtitle="Pacientes marcados en odontograma"
                  accent="indigo"
                  loading={loading}
                  onClick={openProspectOrtoModal}
                />
              </>
            ) : userRole === 'admin' ? (
              <>
                {/* Admin-specific stats */}
                <StatTile
                  icon={<Users size={20} />}
                  title="Total de Pacientes"
                  value={patientCount}
                  subtitle="Todos los roles"
                  accent="red"
                  loading={loading}
                />
                <StatTile
                  icon={<Activity size={20} />}
                  title="Tratamientos Totales"
                  value={treatmentCount}
                  subtitle="Todos los tratamientos"
                  accent="orange"
                  loading={loading}
                />
                <StatTile
                  icon={<DollarSign size={20} />}
                  title="Ingresos Hoy"
                  value="12"
                  subtitle="Nuevos ingresos"
                  accent="teal"
                  loading={loading}
                />
                <StatTile
                  icon={<TrendingUp size={20} />}
                  title="Tasa de Actividad"
                  value="87%"
                  subtitle="Usuarios activos"
                  accent="indigo"
                  loading={loading}
                />
                <StatTile
                  icon={<Sparkles size={20} />}
                  title="Tratamientos Individuales"
                  value={individualTreatmentCount}
                  subtitle="Este mes"
                  accent="cyan"
                  loading={loading}
                />
                <StatTile
                  icon={<CalendarClock size={20} />}
                  title="Seguimiento Pacientes"
                  value={followUpCount}
                  subtitle="Pacientes con más de 5 meses sin tratamiento"
                  accent="green"
                  loading={loading}
                  onClick={() => router.push('/patient-follow-up')}
                />
                <StatTile
                  icon={<Sparkles size={20} />}
                  title="Prospecto para Orto"
                  value={prospectOrtoCount}
                  subtitle="Pacientes marcados en odontograma"
                  accent="indigo"
                  loading={loading}
                  onClick={openProspectOrtoModal}
                />
              </>
            ) : userRole === 'staff' ? (
              <>
                {/* Staff-specific stats */}
                <StatTile
                  icon={<ListChecks size={20} />}
                  title="Tareas Pendientes"
                  value="5"
                  subtitle="Por completar"
                  accent="gray"
                  loading={loading}
                />
                <StatTile
                  icon={<MessageSquare size={20} />}
                  title="Mensajes Hoy"
                  value="3"
                  subtitle="Sin responder"
                  accent="yellow"
                  loading={loading}
                />
                <StatTile
                  icon={<FileText size={20} />}
                  title="Documentos"
                  value="8"
                  subtitle="Por procesar"
                  accent="cyan"
                  loading={loading}
                />
                <StatTile
                  icon={<Sparkles size={20} />}
                  title="Prospecto para Orto"
                  value={prospectOrtoCount}
                  subtitle="Pacientes marcados en odontograma"
                  accent="indigo"
                  loading={loading}
                  onClick={openProspectOrtoModal}
                />
              </>
            ) : (
              <>
                {/* Default/Fallback stats */}
                <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                  <StatTile
                    icon={<Users size={20} />}
                    title="Total de Pacientes"
                    value={patientCount}
                    subtitle="En el sistema"
                    accent="blue"
                    loading={loading}
                  />
                </div>
                <StatTile
                  icon={<Sparkles size={20} />}
                  title="Prospecto para Orto"
                  value={prospectOrtoCount}
                  subtitle="Pacientes marcados en odontograma"
                  accent="indigo"
                  loading={loading}
                  onClick={openProspectOrtoModal}
                />
              </>
            )}
          </div>

          {/* Próximos Eventos Section */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
                  <CalendarDays size={18} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Próximos Eventos
                </h3>
              </div>
              <Link
                href="/calendario"
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
              >
                Ver Calendario
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="p-5 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando eventos...</span>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                    <CalendarDays size={24} />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No hay eventos próximos
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No tienes eventos programados para hoy o mañana.
                  </p>
                  <Link
                    href="/calendario"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors duration-200"
                  >
                    <CalendarDays size={16} />
                  Crear Evento
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40 p-4 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-600/60"
                  >
                    {/* Status Badge and Participants Row */}
                    <div className="flex items-center justify-between mb-2">
                      {/* Status Badge */}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {event.status === 'confirmed' ? 'Confirmado' :
                         event.status === 'pending' ? 'Pendiente' :
                         event.status}
                      </span>
                      
                      {/* Event Participants Avatars */}
                      {eventParticipants[event.id] && eventParticipants[event.id].length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Participantes:</span>
                          <div className="flex -space-x-2">
                            {eventParticipants[event.id].slice(0, 4).map((participant, index) => (
                              <div key={participant.id} className="relative" title={`${participant.first_name} ${participant.last_name} (${participant.role === 'owner' ? 'Organizador' : participant.role === 'invitee_accepted' ? 'Invitado' : 'Pendiente'})`}>
                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-white bg-gray-200 dark:bg-gray-600">
                                  {participant.profile_image_url ? (
                                    <img 
                                      src={participant.profile_image_url} 
                                      alt={`${participant.first_name} ${participant.last_name}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Fallback to UI Avatars if image fails
                                        const names = `${participant.first_name} ${participant.last_name}`.replace(/\s+/g, '+');
                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${names}&background=random&size=32`;
                                      }}
                                    />
                                  ) : (
                                    <img 
                                      src={`https://ui-avatars.com/api/?name=${participant.first_name}+${participant.last_name}&background=random&size=32`}
                                      alt={`${participant.first_name} ${participant.last_name}`}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                                {participant.role === 'owner' && (
                                  <div className="absolute -left-1 -top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-white flex items-center justify-center">
                                    <i className="fas fa-crown text-white text-xs"></i>
                                  </div>
                                )}
                              </div>
                            ))}
                            {eventParticipants[event.id].length > 4 && (
                              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 border-2 border-white dark:border-white">
                                +{eventParticipants[event.id].length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Event Title */}
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {event.title}
                    </div>
                    
                    {/* Date Row */}
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <CalendarDays size={14} className="mr-2 text-gray-400 dark:text-gray-500" />
                      {event.date ? new Date(event.date).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' }) : SimpleTimezoneFix.formatDisplayDate(event.start_date)}
                      {event.start_time && ` - ${event.start_time}`}
                      {event.end_time && ` - ${event.end_time}`}
                    </div>
                    
                    {/* Patient Row */}
                    {(event.patient_name || event.patient?.nombre_completo) && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <User size={14} className="mr-2 text-gray-400 dark:text-gray-500" />
                        {event.patient_name || event.patient?.nombre_completo}
                      </div>
                    )}
                    
                    {/* Location */}
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <MapPin size={14} className="mr-2 text-gray-400 dark:text-gray-500" />
                        {event.location}
                      </div>
                    )}
                    
                    {/* Description */}
                    {event.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {event.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Patients Modal */}
      {showPatientsModal && (
        <PatientsTableModal
          title="Mis Pacientes - Detalles Completos"
          loading={patientsModalLoading}
          patients={doctorPatients}
          onClose={closePatientsModal}
          emptyTitle="No tienes pacientes asignados"
          emptyDescription="No se encontraron pacientes para tu cuenta."
        />
      )}

      {/* Prospecto para Orto Modal */}
      {showProspectModal && (
        <PatientsTableModal
          title="Prospecto para Orto - Pacientes"
          loading={prospectModalLoading}
          patients={prospectPatients}
          onClose={closeProspectOrtoModal}
          emptyTitle="No hay pacientes marcados"
          emptyDescription="No hay pacientes marcados como Prospecto para Orto en el odontograma."
        />
      )}
    </>
  );
}