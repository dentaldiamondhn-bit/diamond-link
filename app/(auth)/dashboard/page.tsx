// app/dashboard/page.tsx
'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PatientService } from '../../../services/patientService';
import { CompletedTreatmentService } from '../../../services/completedTreatmentService';
import { CalendarService } from '../../../services/calendarService';
import { SimpleTimezoneFix } from '../../../services/simpleTimezoneFix';
import { UserAvatar } from '../../../components/calendar/UserComponents';
import { useRoleBasedAccess } from '../../../hooks/useRoleBasedAccess';

// Currency formatting utility for HNL
const formatHNL = (amount: number) => {
  return `L ${amount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
};

export default function DashboardPage() {
  const { user } = useUser();
  const { userRole, permissions, hasPermission } = useRoleBasedAccess();
  const [patientCount, setPatientCount] = useState<number>(0);
  const [treatmentCount, setTreatmentCount] = useState<number>(0);
  const [doctorRevenue, setDoctorRevenue] = useState<number>(0);
  const [averageRevenue, setAverageRevenue] = useState<number>(0);
  const [patientStats, setPatientStats] = useState<any>({ newPatients: 0, returningPatients: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [eventParticipants, setEventParticipants] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<boolean>(true);


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const doctorName = user?.fullName || '';
        
        // Fetch role-specific data
        
        // Fetch upcoming events for logged-in user
        const userUpcomingEvents = await CalendarService.getUpcomingEvents(user?.id);
        setUpcomingEvents(userUpcomingEvents);
        
        // Fetch participants for each event
        const participantsData: Record<string, any[]> = {};
        for (const event of userUpcomingEvents) {
          if (event.id) {
            const participants = await CalendarService.getEventParticipants(event.id);
            participantsData[event.id] = participants;
          }
        }
        setEventParticipants(participantsData);
        
        if (userRole === 'doctor') {
          // Fetch doctor's patients and stats
          const doctorPatients = await PatientService.getPatientsByDoctor(doctorName);
          const doctorPatientStats = await PatientService.getDoctorPatientStats(doctorName);
          setPatientCount(doctorPatients.length);
          setPatientStats(doctorPatientStats);

          // Fetch doctor's treatments
          const doctorTreatments = await CompletedTreatmentService.getCompletedTreatmentsByDoctor(doctorName);
          setTreatmentCount(doctorTreatments.length);

          // Fetch doctor's revenue and average
          const revenue = await CompletedTreatmentService.getDoctorRevenue(doctorName);
          const avgRevenue = await CompletedTreatmentService.getDoctorAverageRevenue(doctorName);
          setDoctorRevenue(revenue);
          setAverageRevenue(avgRevenue);

        } else if (userRole === 'admin') {
          // Fetch all patients for admin
          const allPatients = await PatientService.getPatients();
          setPatientCount(allPatients.length);

          // Fetch all treatments for admin
          const allTreatments = await CompletedTreatmentService.getAllCompletedTreatments();
          setTreatmentCount(allTreatments.length);

        } else {
          // For staff and others, fetch all patients
          const patients = await PatientService.getPatients();
          setPatientCount(patients.length);
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

  return (
    <>
      {/* Contenido Principal */}
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Sección de Bienvenida */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                ¡Bienvenido de nuevo, {user?.fullName || 'Usuario'}!
              </h2>
              <p className="mt-2 text-gray-600">
                Esto es lo que está pasando con tu cuenta hoy.
              </p>
            </div>
          </div>

          {/* Estadísticas - Role Specific */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {userRole === 'doctor' ? (
              <>
                {/* Doctor-specific stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Mis Pacientes</h3>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {loading ? '...' : patientCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {patientStats.newPatients} nuevos, {patientStats.returningPatients} recurrentes
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tratamientos Completados</h3>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {loading ? '...' : treatmentCount}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {averageRevenue > 0 ? 
                      `Promedio: ${formatHNL(averageRevenue)}` : 
                      'Sin datos'
                    }
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingresos Generados</h3>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {loading ? '...' : formatHNL(doctorRevenue)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tratamientos pagados
                  </p>
                </div>
              </>
            ) : userRole === 'admin' ? (
              <>
                {/* Admin-specific stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Total de Usuarios</h3>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {loading ? '...' : patientCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Todos los roles
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tratamientos Totales</h3>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {loading ? '...' : treatmentCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Todos los tratamientos
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingresos Hoy</h3>
                  <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                    {loading ? '...' : '12'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nuevos ingresos
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tasa de Actividad</h3>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {loading ? '...' : '87%'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Usuarios activos
                  </p>
                </div>
              </>
            ) : userRole === 'staff' ? (
              <>
                {/* Staff-specific stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tareas Pendientes</h3>
                  <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                    {loading ? '...' : '5'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Por completar
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Mensajes Hoy</h3>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {loading ? '...' : '3'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sin responder
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Documentos</h3>
                  <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                    {loading ? '...' : '8'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Por procesar
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Default/Fallback stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Total de Pacientes</h3>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {loading ? '...' : patientCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    En el sistema
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Próximos Eventos Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Próximos Eventos
              </h3>
              <Link
                href="/calendario"
                className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal300 text-sm font-medium"
              >
                Ver Calendario →
              </Link>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando eventos...</span>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <i className="fas fa-calendar-alt text-4xl"></i>
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay eventos próximos
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No tienes eventos programados para hoy o mañana.
                </p>
                <Link
                  href="/calendar"
                  className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors duration-200"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Crear Evento
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
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
                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600">
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
                                  <div className="absolute -left-1 -top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                    <i className="fas fa-crown text-white text-xs"></i>
                                  </div>
                                )}
                              </div>
                            ))}
                            {eventParticipants[event.id].length > 4 && (
                              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 border-2 border-white dark:border-gray-800">
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
                      <i className="fas fa-calendar-alt mr-2"></i>
                      {SimpleTimezoneFix.formatDisplayDate(event.start_date)} - {SimpleTimezoneFix.formatTime(event.start_date)}
                      {event.end_date && ` - ${SimpleTimezoneFix.formatTime(event.end_date)}`}
                    </div>
                    
                    {/* Patient Row */}
                    {event.patient && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <i className="fas fa-user mr-2"></i>
                        {event.patient.nombre_completo}
                      </div>
                    )}
                    
                    {/* Location */}
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <i className="fas fa-map-marker-alt mr-2"></i>
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
    </>
  );
}