'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useUserRole } from '../../../hooks/useUserRole';
import { formatCurrency, formatNumber } from '../../../utils/currencyUtils';
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
  const router = useRouter();
  const { user } = useUser();
  const { userRole, isLoaded } = useUserRole();
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debug user state
  console.log('Reports page debug:', {
    user: user ? 'User exists' : 'No user',
    userId: user?.id,
    userRole,
    isLoaded,
    userMetadata: user?.publicMetadata
  });

  // Generate mock data based on time range
  const generateMockData = () => {
    const now = new Date();
    let dataPoints = 30;
    let dateFormat = 'MM/dd';
    
    switch (timeRange) {
      case 'daily':
        dataPoints = 24; // 24 hours
        dateFormat = 'HH:mm';
        break;
      case 'weekly':
        dataPoints = 7; // 7 days
        dateFormat = 'MM/dd';
        break;
      case 'monthly':
        dataPoints = 30; // 30 days
        dateFormat = 'MM/dd';
        break;
      case 'yearly':
        dataPoints = 12; // 12 months
        dateFormat = 'MMM';
        break;
    }

    return Array.from({ length: dataPoints }, (_, i) => {
      const date = new Date(now);
      if (timeRange === 'daily') {
        date.setHours(date.getHours() - (dataPoints - i - 1));
      } else if (timeRange === 'weekly') {
        date.setDate(date.getDate() - (dataPoints - i - 1));
      } else if (timeRange === 'monthly') {
        date.setDate(date.getDate() - (dataPoints - i - 1));
      } else {
        date.setMonth(date.getMonth() - (dataPoints - i - 1));
      }
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        patients: Math.floor(Math.random() * 20) + 5,
        treatments: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 2000) + 500,
        doctors: Math.floor(Math.random() * 5) + 2,
      };
    });
  };

  const [reportData, setReportData] = useState(generateMockData());

  // Update data when time range changes
  useEffect(() => {
    setReportData(generateMockData());
  }, [timeRange]);

  // Redirect non-admin users
  useEffect(() => {
    console.log('Reports page - userRole:', userRole, 'isLoaded:', isLoaded);
    if (isLoaded && userRole !== 'admin') {
      console.log('Redirecting non-admin user to dashboard');
      router.push('/dashboard');
    }
  }, [userRole, isLoaded, router]);

  // Show loading while checking role
  if (!isLoaded) {
    console.log('Still loading - isLoaded:', isLoaded, 'userRole:', userRole);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading user data...</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => router.push('/menu-navegacion')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              📊 Reportes y Análisis
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="ml-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]"
                  style={{
                    colorScheme: 'dark',
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="ml-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]"
                  style={{
                    colorScheme: 'dark',
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

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingresos Totales</h3>
                    <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                      {formatCurrency(reportData.reduce((sum, item) => sum + item.revenue, 0))}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +12.5% vs último {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : timeRange === 'monthly' ? 'mes' : 'año'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Pacientes Totales</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {formatNumber(reportData.reduce((sum, item) => sum + item.patients, 0))}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +8.2% vs último {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : timeRange === 'monthly' ? 'mes' : 'año'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tratamientos Totales</h3>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {formatNumber(reportData.reduce((sum, item) => sum + item.treatments, 0))}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +15.3% vs último {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : timeRange === 'monthly' ? 'mes' : 'año'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Promedio por Paciente</h3>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(reportData.reduce((sum, item) => sum + item.revenue, 0) / reportData.reduce((sum, item) => sum + item.patients, 0))}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +5.7% vs último {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : timeRange === 'monthly' ? 'mes' : 'año'}
                    </p>
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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">👥‍⚕️ Rendimiento y Honorarios de Doctores</h2>
                
                {/* Doctor Royalties Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ingresos Totales de Clínica</h3>
                    <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                      {formatCurrency(reportData.reduce((sum, item) => sum + item.revenue, 0))}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Este {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : timeRange === 'monthly' ? 'mes' : 'año'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Total Honorarios Pagados</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(Math.floor(reportData.reduce((sum, item) => sum + item.revenue, 0) * 0.6))}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">60% de los ingresos</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ganancia de Clínica</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(Math.floor(reportData.reduce((sum, item) => sum + item.revenue, 0) * 0.4))}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">40% de los ingresos</p>
                  </div>
                </div>

                {/* Doctor Royalties Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Distribución de Honorarios por Doctor</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { doctor: 'Dra. Sully Calix', ingresos: 25000, honorarios: 15000, clinica: 10000 },
                      { doctor: 'Dra. Amelia Yanes', ingresos: 22000, honorarios: 13200, clinica: 8800 },
                      { doctor: 'Dr. Gustavo Urtecho', ingresos: 18000, honorarios: 10800, clinica: 7200 },
                      { doctor: 'Dra. Jimena Molina', ingresos: 20000, honorarios: 12000, clinica: 8000 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="doctor" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          formatCurrency(value), 
                          name === 'honorarios' ? 'Honorarios (60%)' : name === 'clinica' ? 'Clínica (40%)' : name
                        ]}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      />
                      <Bar dataKey="honorarios" fill="#3b82f6" name="Honorarios" stackId="stack" />
                      <Bar dataKey="clinica" fill="#10b981" name="Clínica" stackId="stack" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed Doctor Royalties Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Doctor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tratamientos</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ingresos Totales</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Porcentaje Honorarios</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Honorarios</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ganancia Clínica</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado de Pago</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {[
                          { doctor: 'Dra. Sully Calix', treatments: 45, ingresos: 25000, porcentaje: 60, honorarios: 15000, clinica: 10000, estado: 'Pagado' },
                          { doctor: 'Dra. Amelia Yanes', treatments: 38, ingresos: 22000, porcentaje: 60, honorarios: 13200, clinica: 8800, estado: 'Pendiente' },
                          { doctor: 'Dr. Gustavo Urtecho', treatments: 32, ingresos: 18000, porcentaje: 60, honorarios: 10800, clinica: 7200, estado: 'Pagado' },
                          { doctor: 'Dra. Jimena Molina', treatments: 40, ingresos: 20000, porcentaje: 60, honorarios: 12000, clinica: 8000, estado: 'Pendiente' }
                        ].map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.doctor}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.treatments}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.ingresos)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.porcentaje}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.honorarios)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.clinica)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.estado === 'Pagado' 
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

                {/* Royalty Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl border-l-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <h4 className="text-md font-medium text-green-800 dark:text-green-200 mb-2">✅ Pagados este Mes</h4>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(25800)}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">2 doctores pagados</p>
                  </div>
                  <div className="p-4 rounded-xl border-l-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-md font-medium text-yellow-800 dark:text-yellow-200 mb-2">⏳ Pendientes de Pago</h4>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(25200)}</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">2 doctores pendientes</p>
                  </div>
                  <div className="p-4 rounded-xl border-l-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <h4 className="text-md font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Próximo Pago</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">15 días</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Fecha límite: 15 del mes</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'patients' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">👥‍⚕️ Análisis de Pacientes</h2>
                
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
                            { name: 'Pacientes Nuevos', value: Math.floor(Math.random() * 100) + 50, fill: '#3b82f6' },
                            { name: 'Pacientes Recurrentes', value: Math.floor(Math.random() * 200) + 100, fill: '#10b981' }
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
                </div>

                {/* Patient Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Estadísticas de Pacientes</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pacientes Nuevos</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber(Math.floor(Math.random() * 100) + 50)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pacientes Recurrentes</span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatNumber(Math.floor(Math.random() * 200) + 100)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total de Pacientes</span>
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatNumber((Math.floor(Math.random() * 100) + 50) + (Math.floor(Math.random() * 200) + 100))}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Demografía</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Edad Promedio</span>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {Math.floor(Math.random() * 20) + 25} años
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Distribución de Género</span>
                        <div className="flex space-x-4">
                          <span className="text-sm">Masculino: {Math.floor(Math.random() * 30) + 35}%</span>
                          <span className="text-sm">Femenino: {Math.floor(Math.random() * 30) + 45}%</span>
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
                        data={[
                          { name: 'Limpieza', value: Math.floor(Math.random() * 100) + 150, fill: '#3b82f6' },
                          { name: 'Ortodoncia', value: Math.floor(Math.random() * 80) + 100, fill: '#8b5cf6' },
                          { name: 'Empastes', value: Math.floor(Math.random() * 60) + 80, fill: '#06b6d4' },
                          { name: 'Extracciones', value: Math.floor(Math.random() * 40) + 60, fill: '#10b981' },
                          { name: 'Blanqueamiento', value: Math.floor(Math.random() * 30) + 40, fill: '#f59e0b' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        >
                          <Tooltip 
                            formatter={(value, name) => [`${value} ${name}`, 'Tratamientos']}
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Treatment Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Categorías de Tratamientos</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Preventivos', count: Math.floor(Math.random() * 100) + 200, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
                        { name: 'Restaurativos', count: Math.floor(Math.random() * 80) + 150, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
                        { name: 'Cosméticos', count: Math.floor(Math.random() * 50) + 100, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
                        { name: 'Quirúrgicos', count: Math.floor(Math.random() * 30) + 50, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
                      ].map((category, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category.name}</span>
                          <span className={`text-lg font-bold ${category.color}`}>{category.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ingresos por Tipo de Tratamiento</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Limpieza', revenue: Math.floor(Math.random() * 5000) + 10000, trend: '+12%' },
                        { name: 'Ortodoncia', revenue: Math.floor(Math.random() * 8000) + 20000, trend: '+25%' },
                        { name: 'Empastes', revenue: Math.floor(Math.random() * 3000) + 8000, trend: '+8%' },
                        { name: 'Extracciones', revenue: Math.floor(Math.random() * 2000) + 5000, trend: '-5%' },
                        { name: 'Blanqueamiento', revenue: Math.floor(Math.random() * 1500) + 3000, trend: '+18%' }
                      ].map((treatment, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{treatment.name}</span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(treatment.revenue)}</span>
                            <span className={`ml-2 text-sm ${treatment.trend.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {treatment.trend} vs último {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : timeRange === 'monthly' ? 'mes' : 'año'}
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
    </div>
  );
}
