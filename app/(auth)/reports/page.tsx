'use client';
// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useUserRole } from '@/hooks/useUserRole';
import { usePagePreferences } from '@/hooks/useUserPreferences';
import { formatCurrency, formatNumber } from '@/utils/currencyUtils';
import { ReportsService } from '@/services/reportsService';
import { useTheme } from '@/contexts/ThemeContext';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export default function ReportsPage() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const { userRole, isLoaded } = useUserRole();
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  
  // Page preferences for reports page
  const { preferences: pagePrefs, updatePreferences: updatePagePrefs, loading: prefsLoading } = usePagePreferences('reports');
  
  // Date range states for each tab
  const [tabDateRanges, setTabDateRanges] = useState<Record<string, { startDate: string; endDate: string }>>({});
  const [currentStartDate, setCurrentStartDate] = useState('');
  const [currentEndDate, setCurrentEndDate] = useState('');

  // Type helper for date range
  const getCurrentDateRange = () => {
    return tabDateRanges[activeTab] || { startDate: '', endDate: '' };
  };

  // Data states
  const [reportData, setReportData] = useState<any[]>([]);
  const [doctorPerformance, setDoctorPerformance] = useState<any[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<any[]>([]);
  const [patientStats, setPatientStats] = useState<any>({});
  const [patientDemographics, setPatientDemographics] = useState<any>({});
  const [revenueStats, setRevenueStats] = useState<any>({});
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize preferences and date ranges
  useEffect(() => {
    if (!prefsLoading && pagePrefs) {
      // Initialize time range from preferences
      if (pagePrefs.timeRange) {
        setTimeRange(pagePrefs.timeRange);
      }
      
      // Initialize date ranges for each tab
      const savedDateRanges = pagePrefs.tabDateRanges || {};
      setTabDateRanges(savedDateRanges);
      
      // Set current tab's date range
      const currentTabRange = getCurrentDateRange();
      setCurrentStartDate(currentTabRange.startDate);
      setCurrentEndDate(currentTabRange.endDate);
    }
  }, [prefsLoading, pagePrefs, activeTab]);

  // Save time range preference with debouncing
  useEffect(() => {
    if (!prefsLoading) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ timeRange });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [timeRange, prefsLoading, updatePagePrefs]);

  // Save date range preferences with debouncing
  useEffect(() => {
    if (!prefsLoading && user) {
      const timeoutId = setTimeout(async () => {
        const updatedRanges = {
          ...tabDateRanges,
          [activeTab]: { startDate: currentStartDate, endDate: currentEndDate }
        };
        setTabDateRanges(updatedRanges);
        
        try {
          // Call the service directly to bypass any hook issues
          const result = await UserPreferencesService.updatePagePreferences(
            user.id,
            'reports',
            { tabDateRanges: updatedRanges }
          );
        } catch (error) {
          console.error('Error saving date range preferences:', error);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [currentStartDate, currentEndDate, activeTab, prefsLoading, user]);

  // Update current date range when tab changes
  useEffect(() => {
    const currentTabRange = getCurrentDateRange();
    setCurrentStartDate(currentTabRange.startDate);
    setCurrentEndDate(currentTabRange.endDate);
  }, [activeTab, tabDateRanges]);

  // Load all report data
  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate date range using current tab's dates or time range
      const now = new Date();
      let start = currentStartDate;
      let end = currentEndDate;
      
      if (!start) {
        const startDateObj = new Date(now);
        switch (timeRange) {
          case 'daily':
            startDateObj.setHours(startDateObj.getHours() - 24);
            break;
          case 'weekly':
            startDateObj.setDate(startDateObj.getDate() - 7);
            break;
          case 'monthly':
            startDateObj.setDate(startDateObj.getDate() - 30);
            break;
          case 'yearly':
            startDateObj.setFullYear(startDateObj.getFullYear() - 1);
            break;
        }
        start = startDateObj.toISOString();
      }
      
      if (!end) {
        end = now.toISOString();
      }

      // Load all data in parallel
      const [
        reportDataResult,
        doctorPerformanceResult,
        treatmentTypesResult,
        patientStatsResult,
        patientDemographicsResult,
        revenueStatsResult
      ] = await Promise.all([
        ReportsService.getReportData(timeRange, start, end),
        ReportsService.getDoctorPerformance(start, end),
        ReportsService.getTreatmentTypes(start, end),
        ReportsService.getPatientStats(start, end),
        ReportsService.getPatientDemographics(),
        ReportsService.getRevenueStats(start, end)
      ]);

      setReportData(reportDataResult);
      setDoctorPerformance(doctorPerformanceResult);
      setTreatmentTypes(treatmentTypesResult);
      setPatientStats(patientStatsResult);
      setPatientDemographics(patientDemographicsResult);
      setRevenueStats(revenueStatsResult);
      
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or when filters change
  useEffect(() => {
    if (user && userRole === 'admin') {
      loadReportData();
    }
  }, [user, userRole, timeRange, currentStartDate, currentEndDate]);

  // Redirect non-admin users
  useEffect(() => {
    if (isLoaded && userRole !== 'admin') {
      router.push('/dashboard');
    }
  }, [userRole, isLoaded, router]);

  // Show loading while checking role or loading data
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {!isLoaded ? 'Loading user data...' : 'Loading report data...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state if data loading failed
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadReportData}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors mr-4"
          >
            Retry
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (userRole !== 'admin') {
    console.log('Access denied - userRole:', userRole);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Acceso Denegado</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">No tienes permisos para acceder a esta página.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/menu-navegacion')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Volver
          </button>
        </div>
      </div>
        {/* Key Metrics Cards - Moved above date pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingresos Totales</h3>
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(revenueStats.totalRevenue || 0)}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {revenueStats.totalRevenue > 0 ? 'Basado en datos reales' : 'Sin datos'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Pacientes Totales</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatNumber(Math.floor(patientStats.totalPatients || 0), 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {patientStats.newPatients || 0} nuevos, {patientStats.returningPatients || 0} recurrentes
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tratamientos Totales</h3>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatNumber(Math.floor(revenueStats.totalTreatments || 0), 0)}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {revenueStats.averageRevenuePerTreatment > 0 ? 
                `Promedio: ${formatCurrency(revenueStats.averageRevenuePerTreatment)}` : 
                'Sin datos'
              }
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Promedio por Paciente</h3>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(
                patientStats.totalPatients > 0 ? 
                  (revenueStats.totalRevenue || 0) / patientStats.totalPatients : 
                  0
              )}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {revenueStats.totalRevenue > 0 ? 'Basado en datos reales' : 'Sin datos'}
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From:</label>
                <input
                  type="date"
                  value={currentStartDate}
                  onChange={(e) => setCurrentStartDate(e.target.value)}
                  className="ml-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  style={{
                    colorScheme: resolvedTheme,
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To:</label>
                <input
                  type="date"
                  value={currentEndDate}
                  onChange={(e) => setCurrentEndDate(e.target.value)}
                  className="ml-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  style={{
                    colorScheme: resolvedTheme,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Resumen General' },
                { id: 'doctors', label: 'Doctores' },
                { id: 'patients', label: 'Pacientes' },
                { id: 'treatments', label: 'Tratamientos' },
                { id: 'promotions', label: 'Descuentos y Promociones' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📈 Resumen General</h2>
                
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tendencia de Ingresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={reportData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Ingresos']}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#14b8a6" 
                        fill="#14b8a6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Patients and Treatments Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tendencia de Pacientes</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={reportData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [value, 'Pacientes']}
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="patients" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tendencia de Tratamientos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [value, 'Tratamientos']}
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        />
                        <Bar 
                          dataKey="treatments" 
                          fill="#8b5cf6"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Suggestions Section */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 Sugerencias Inteligentes</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="p-4 rounded-xl border-l-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <h4 className="text-md font-medium text-red-800 dark:text-red-200 mb-2">🎯 Oportunidad</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Las consultas de ortodoncia han aumentado un 25% este {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : timeRange === 'monthly' ? 'mes' : 'año'}. Considera expandir el equipo.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border-l-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                      <h4 className="text-md font-medium text-yellow-800 dark:text-yellow-200 mb-2">⚡ Optimización</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Los lunes y martes tienen menor ocupación. Ofrece descuentos estos días.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border-l-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <h4 className="text-md font-medium text-blue-800 dark:text-blue-200 mb-2">💰 Costos</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        El costo de materiales ha aumentado 8%. Revisa proveedores.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'doctors' && (
              <div className="space-y-6">
                {/* Doctor Treatments Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Distribución de Tratamientos por Doctor</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={doctorPerformance.map(doctor => ({
                      doctor: doctor.name,
                      tratamientos: doctor.treatments,
                      pacientes: doctor.patients
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="doctor" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          value, 
                          name === 'tratamientos' ? 'Tratamientos' : 'Pacientes'
                        ]}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      />
                      <Bar dataKey="tratamientos" fill="#3b82f6" name="Tratamientos" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="pacientes" fill="#10b981" name="Pacientes" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed Doctor Performance Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Doctor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pacientes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tratamientos</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ingresos Totales</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Pagado</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saldo Pendiente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipos de Tratamiento</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {doctorPerformance.map((doctor, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{doctor.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{doctor.specialty || 'General'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{doctor.patients}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{doctor.treatments}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(doctor.revenue)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(doctor.paidAmount || 0)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(doctor.pendingAmount || 0)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="max-w-xs truncate" title={doctor.treatmentTypes?.join(', ')}>
                                {doctor.treatmentTypes?.slice(0, 2).join(', ')}
                                {doctor.treatmentTypes && doctor.treatmentTypes.length > 2 && ` +${doctor.treatmentTypes.length - 2} más`}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Doctor Performance Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">👥 Total Doctores Activos</h3>
                    <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                      {doctorPerformance.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">En el período seleccionado</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">💰 Ingresos Totales Doctores</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(doctorPerformance.reduce((sum, doctor) => sum + doctor.revenue, 0))}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Suma de todos los ingresos</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">📈 Promedio por Doctor</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(doctorPerformance.length > 0 ? Math.floor(doctorPerformance.reduce((sum, doctor) => sum + doctor.revenue, 0) / doctorPerformance.length) : 0)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ingreso promedio por doctor</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'patients' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">👥 Análisis de Pacientes</h2>
                
                {/* Patient Retention Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tasa de Retención de Pacientes</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={reportData.slice(0, 12).map((item, index) => ({
                        ...item,
                        month: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][index],
                        retentionRate: Math.floor(Math.random() * 20) + 75
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[70, 100]} />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Retención']}
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="retentionRate" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Distribución de Tipos de Pacientes</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Pacientes Nuevos', value: patientStats.newPatients || 0, fill: '#3b82f6' },
                            { name: 'Pacientes Recurrentes', value: patientStats.returningPatients || 0, fill: '#10b981' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                        >
                          <Tooltip 
                            formatter={(value, name) => [`${value} ${name}`, 'Pacientes']}
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Demografía</h3>
                    <div className="space-y-6">
                      {/* Average Age */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Edad Promedio</span>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {patientDemographics.averageAge || 0} años
                        </span>
                      </div>

                      {/* Gender Distribution */}
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Distribución de Género</span>
                        <div className="flex space-x-4">
                          <span className="text-sm">
                            Masculino: {patientDemographics.genderDistribution?.masculino || 0} ({Math.round((patientDemographics.genderDistribution?.masculino || 0) / ((patientDemographics.genderDistribution?.masculino || 0) + (patientDemographics.genderDistribution?.femenino || 0)) * 100) || 0}%)
                          </span>
                          <span className="text-sm">
                            Femenino: {patientDemographics.genderDistribution?.femenino || 0} ({Math.round((patientDemographics.genderDistribution?.femenino || 0) / ((patientDemographics.genderDistribution?.masculino || 0) + (patientDemographics.genderDistribution?.femenino || 0)) * 100) || 0}%)
                          </span>
                        </div>
                      </div>

                      {/* Age Categories */}
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-3">Categorías de Edad</span>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(patientDemographics.ageCategories || {}).map(([range, count]: [string, number]) => (
                            <div key={range} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{range} años</span>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'treatments' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🦷 Análisis de Tratamientos</h2>
                
                {/* Treatment Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tendencia de Volumen de Tratamientos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={reportData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [value, 'Tratamientos']}
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="treatments" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ingresos por Tratamiento</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => [formatCurrency(value), 'Ingresos']}
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="#06b6d4"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Popular Treatments */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tratamientos Más Populares</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={treatmentTypes.map(treatment => ({
                          name: treatment.name,
                          value: treatment.count,
                          fill: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][treatmentTypes.indexOf(treatment) % 5]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        >
                          <Tooltip 
                            formatter={(value, name) => [`${value} tratamientos`, name]}
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Treatment Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tipos de Tratamientos</h3>
                    <div className="space-y-3">
                      {treatmentTypes.slice(0, 5).map((treatment, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{treatment.name}</span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{treatment.count}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({treatment.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ingresos por Tipo de Tratamiento</h3>
                    <div className="space-y-3">
                      {treatmentTypes.slice(0, 5).map((treatment, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{treatment.name}</span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(treatment.revenue)}</span>
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              {treatment.count} tratamientos
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'promotions' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🎁 Descuentos y Promociones</h2>
                
                {/* Promotions Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Promociones Activas</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">5</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Actualmente vigentes</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Descuentos Aplicados</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(8450)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Este {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : timeRange === 'monthly' ? 'mes' : 'año'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pacientes Beneficiados</h3>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">127</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Únicos pacientes</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ahorro Promedio</h3>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(66.50)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Por paciente</p>
                  </div>
                </div>

                {/* Promotions Performance Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Rendimiento de Promociones</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { promotion: 'Limpieza 20%', usos: 45, descuento: 2250, ingresos: 9000 },
                      { promotion: 'Estudiante 15%', usos: 32, descuento: 1800, ingresos: 10200 },
                      { promotion: 'Familiar 10%', usos: 28, descuento: 1400, ingresos: 12600 },
                      { promotion: 'Primer Paciente 25%', usos: 22, descuento: 2750, ingresos: 8250 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="promotion" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          name === 'descuento' ? formatCurrency(value) : value, 
                          name === 'descuento' ? 'Descuento Total' : name === 'usos' ? 'Veces Usada' : 'Ingresos con Descuento'
                        ]}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      />
                      <Bar dataKey="descuento" fill="#ef4444" name="Descuento" />
                      <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Active Promotions Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Promoción</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descuento</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Usos</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ahorro Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {[
                          { promocion: 'Limpieza Dental', tipo: 'Porcentaje', descuento: '20%', usos: 45, ahorro: 2250, estado: 'Activa' },
                          { promocion: 'Descuento Estudiante', tipo: 'Porcentaje', descuento: '15%', usos: 32, ahorro: 1800, estado: 'Activa' },
                          { promocion: 'Paquete Familiar', tipo: 'Porcentaje', descuento: '10%', usos: 28, ahorro: 1400, estado: 'Activa' },
                          { promocion: 'Primer Paciente', tipo: 'Porcentaje', descuento: '25%', usos: 22, ahorro: 2750, estado: 'Activa' },
                          { promocion: 'Blanqueamiento', tipo: 'Fijo', descuento: 'L. 500', usos: 15, ahorro: 7500, estado: 'Pausada' }
                        ].map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.promocion}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.tipo}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.descuento}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.usos}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.ahorro)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.estado === 'Activa' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {item.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Discount Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tendencia de Descuentos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={reportData.slice(0, 12).map((item, index) => ({
                        ...item,
                        month: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][index],
                        descuentos: Math.floor(Math.random() * 1000) + 500
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => [formatCurrency(value), 'Descuentos']}
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="descuentos" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Distribución por Tipo</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Porcentaje', value: 65, fill: '#3b82f6' },
                            { name: 'Fijo', value: 25, fill: '#10b981' },
                            { name: '2x1', value: 10, fill: '#f59e0b' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                        >
                          <Tooltip 
                            formatter={(value, name) => [`${value}%`, name]}
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Promotion Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl border-l-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <h4 className="text-md font-medium text-green-800 dark:text-green-200 mb-2">🎯 Más Efectiva</h4>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">Limpieza 20%</p>
                    <p className="text-sm text-green-700 dark:text-green-300">45 usos este mes</p>
                  </div>
                  <div className="p-4 rounded-xl border-l-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <h4 className="text-md font-medium text-blue-800 dark:text-blue-200 mb-2">💰 Mayor Ahorro</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(2750)}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Primer Paciente 25%</p>
                  </div>
                  <div className="p-4 rounded-xl border-l-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    <h4 className="text-md font-medium text-purple-800 dark:text-purple-200 mb-2">📈 Tendencia</h4>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">+15%</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">vs mes anterior</p>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
