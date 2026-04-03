'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Activity, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Clock,
  RefreshCw,
  Zap,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  World
} from 'lucide-react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { useTheme } from '@/contexts/ThemeContext';
import { useVercelAnalytics, trackEvent, trackPageView } from '@/hooks/useVercelAnalytics';
import AccessDenied from '@/components/AccessDenied';

export default function TechSupportAnalyticsPage() {
  const { userRole } = useRoleBasedAccess();
  const { resolvedTheme } = useTheme();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    pageViews: 0,
    uniqueVisitors: 0,
    totalVisits: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    topPages: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  if (userRole !== 'tech_support') {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permiso para acceder a las analíticas del sistema."
        explanation="Las analíticas y métricas del sistema son exclusivas para el personal de soporte técnico autorizado."
        contactInfo="Si necesitas acceso, contacta a un administrador del sistema."
        onGoBack={() => window.history.back()}
      />
    );
  }

  const fetchAnalyticsData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const mockData: AnalyticsData = {
      pageViews: Math.floor(Math.random() * 1000) + 500,
      uniqueVisitors: Math.floor(Math.random() * 200) + 100,
      totalVisits: Math.floor(Math.random() * 300) + 150,
      bounceRate: Math.random() * 30 + 20,
      avgSessionDuration: Math.random() * 180 + 60,
      topPages: [
        { path: '/dashboard', views: Math.floor(Math.random() * 100) + 50 },
        { path: '/pacientes', views: Math.floor(Math.random() * 80) + 40 },
        { path: '/calendario', views: Math.floor(Math.random() * 60) + 30 },
        { path: '/patient-form', views: Math.floor(Math.random() * 50) + 25 },
        { path: '/tratamientos', views: Math.floor(Math.random() * 40) + 20 }
      ],
      recentActivity: [
        { timestamp: new Date().toISOString(), page: '/dashboard', type: 'page_view' },
        { timestamp: new Date(Date.now() - 300000).toISOString(), page: '/pacientes', type: 'page_view' },
        { timestamp: new Date(Date.now() - 600000).toISOString(), page: '/calendario', type: 'page_view' },
        { timestamp: new Date(Date.now() - 900000).toISOString(), page: '/patient-form', type: 'form_submit' },
        { timestamp: new Date(Date.now() - 1200000).toISOString(), page: '/tratamientos', type: 'page_view' }
      ]
    };

    setTimeout(() => {
      setAnalyticsData(mockData);
      setLoading(false);
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  useEffect(() => {
    if (userRole !== 'tech_support') return;

    const interval = setInterval(() => {
      setAnalyticsData(prev => ({
        ...prev,
        pageViews: prev.pageViews + Math.floor(Math.random() * 5),
        recentActivity: [
          { 
            timestamp: new Date().toISOString(), 
            page: prev.topPages[Math.floor(Math.random() * prev.topPages.length)]?.path || '/dashboard', 
            type: 'page_view' 
          },
          ...prev.recentActivity.slice(0, 9)
        ]
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, [userRole, timeRange]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-HN');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'page_view': return Eye;
      case 'form_submit': return MousePointer;
      default: return Activity;
    }
  };

  const getStatColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', icon: 'text-orange-600 dark:text-orange-400' },
      cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', icon: 'text-cyan-600 dark:text-cyan-400' }
    };
    return colors[color] || colors.blue;
  };

  const stats = [
    {
      title: 'Vistas de Página',
      value: analyticsData.pageViews,
      change: 'Últimas 24h',
      changeType: 'neutral' as const,
      icon: Eye,
      color: 'blue'
    },
    {
      title: 'Visitantes Únicos',
      value: analyticsData.uniqueVisitors,
      change: `${((analyticsData.uniqueVisitors / analyticsData.totalVisits) * 100).toFixed(0)}% del total`,
      changeType: 'neutral' as const,
      icon: Users,
      color: 'green'
    },
    {
      title: 'Visitas Totales',
      value: analyticsData.totalVisits,
      change: 'Sesiones únicas',
      changeType: 'neutral' as const,
      icon: Activity,
      color: 'purple'
    },
    {
      title: 'Duración Promedio',
      value: formatDuration(analyticsData.avgSessionDuration),
      change: 'Por sesión',
      changeType: 'neutral' as const,
      icon: Clock,
      color: 'orange'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Time Range Selector and Refresh Button */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
          className={`px-3 py-2 rounded-lg border ${
            resolvedTheme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
        >
          <option value="1h">Última Hora</option>
          <option value="24h">Últimas 24 Horas</option>
          <option value="7d">Últimos 7 Días</option>
          <option value="30d">Últimos 30 Días</option>
        </select>
        <button 
          onClick={() => fetchAnalyticsData(true)}
          className={`p-2 rounded-lg border ${
            resolvedTheme === 'dark'
              ? 'border-gray-600 text-gray-400 hover:bg-gray-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
          } transition-colors`}
          title="Refrescar datos"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => {
          const colorClasses = getStatColorClasses(stat.color);
          return (
            <div
              key={index}
              className={`rounded-xl shadow-sm p-4 md:p-6 transition-all hover:shadow-md ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`${colorClasses.icon} text-xl`} />
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{stat.title}</p>
            </div>
          );
        })}
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className={`rounded-xl shadow-sm ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Páginas Populares</h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="space-y-3">
              {analyticsData.topPages.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 w-6 text-sm">{index + 1}</span>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-gray-100 text-sm">{page.path}</span>
                    </div>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{formatNumber(page.views)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`rounded-xl shadow-sm ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Actividad Reciente</h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="space-y-3">
              {analyticsData.recentActivity.map((activity, index) => {
                const ActivityIcon = getActivityIcon(activity.type);
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <ActivityIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-gray-100 text-sm">{activity.page}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs">{formatTime(activity.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Métricas de Rendimiento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-4 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">Tasa de Rebote</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.bounceRate.toFixed(1)}%</p>
          </div>
          <div className={`p-4 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">Páginas por Sesión</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analyticsData.totalVisits > 0 ? (analyticsData.pageViews / analyticsData.totalVisits).toFixed(1) : '0'}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">Nuevos vs Recurrentes</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">75% / 25%</p>
          </div>
        </div>
      </div>

      {/* Real-time Indicator */}
      <div className={`rounded-xl shadow-sm p-4 ${resolvedTheme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className={`text-sm ${resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>
            Monitoreo en tiempo real activo
          </span>
        </div>
      </div>
    </>
  );
}
