// app/dashboard/page.tsx
'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PatientService } from '../../../services/patientService';
import { CompletedTreatmentService } from '../../../services/completedTreatmentService';
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
  const [loading, setLoading] = useState<boolean>(true);


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const doctorName = user?.fullName || '';
        
        // Fetch role-specific data
        console.log('Dashboard userRole:', userRole);
        console.log('Dashboard userName:', user?.fullName);
        
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
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.fullName, userRole]);

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
        </div>
      </div>
    </>
  );
}