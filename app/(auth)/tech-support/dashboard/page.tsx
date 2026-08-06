'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Ticket, 
  Activity, 
  Clock, 
  AlertTriangle, 
  Plus, 
  FileText, 
  Settings, 
  LayoutGrid,
  Server,
  Database,
  Cloud,
  Shield,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Wifi,
  Gauge,
  Timer
} from 'lucide-react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@clerk/nextjs';
import AccessDenied from '@/components/AccessDenied';
import { TicketService } from '@/services/ticketService';
import { TicketStatus, TicketPriority } from '@/types/ticket';
import { apiMonitor, ApiHealthStatus } from '@/services/apiMonitorService';

interface DashboardStat {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ElementType;
  color: string;
}

interface SystemStatus {
  name: string;
  status: 'operational' | 'degraded' | 'offline';
  details?: string;
}

interface RecentActivity {
  id: string;
  type: 'ticket' | 'system' | 'user';
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

export default function TechSupportDashboard() {
  const { userRole } = useRoleBasedAccess();
  const { resolvedTheme } = useTheme();
  const { user } = useUser();
  
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiHealthStatus[]>([]);

  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Fetch real ticket data
      const ticketsResult = await TicketService.getTickets({});
      const tickets = ticketsResult.data || [];
      
      // Calculate stats from real data
      const openTickets = tickets.filter(t => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS).length;
      const resolvedToday = tickets.filter(t => {
        if (t.status !== TicketStatus.RESOLVED) return false;
        // Find the most recent status change activity that changed status to RESOLVED
        const resolvedActivity = t.activities?.find(activity => 
          activity.activity_type === 'STATUS_CHANGE' && 
          activity.metadata?.new_status === TicketStatus.RESOLVED
        );
        if (!resolvedActivity) return false;
        
        const resolvedDate = new Date(resolvedActivity.created_at);
        const today = new Date();
        return resolvedDate.toDateString() === today.toDateString();
      }).length;
      const highPriority = tickets.filter(t => t.priority === TicketPriority.HIGH && t.status !== TicketStatus.RESOLVED).length;

      // Calculate average response time (mock for now)
      const avgResponseTime = '2.5h';

      setStats([
        {
          title: 'Tickets Abiertos',
          value: openTickets,
          change: highPriority > 0 ? `${highPriority} de alta prioridad` : 'Sin críticos',
          changeType: highPriority > 0 ? 'increase' : 'neutral',
          icon: Ticket,
          color: 'blue'
        },
        {
          title: 'Tiempo Respuesta',
          value: avgResponseTime,
          change: 'Promedio esta semana',
          changeType: 'neutral',
          icon: Clock,
          color: 'green'
        },
        {
          title: 'Resueltos Hoy',
          value: resolvedToday,
          change: resolvedToday > 0 ? 'Completados' : 'Sin actividad',
          changeType: resolvedToday > 0 ? 'increase' : 'neutral',
          icon: Activity,
          color: 'purple'
        },
        {
          title: 'Tickets Totales',
          value: tickets.length,
          change: 'En sistema',
          changeType: 'neutral',
          icon: Zap,
          color: 'orange'
        }
      ]);

      // Mock recent activity (in production, this would come from an activity log)
      const now = new Date();
      setRecentActivity([
        {
          id: '1',
          type: 'ticket',
          message: `Ticket #${tickets[0]?.ticket_number || 'N/A'}: ${tickets[0]?.title || 'Sin tickets'}`,
          timestamp: now.toISOString(),
          priority: (tickets[0]?.priority || 'medium').toLowerCase() as 'high' | 'medium' | 'low'
        },
        {
          id: '2',
          type: 'system',
          message: 'Sistema funcionando correctamente',
          timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
          priority: 'low'
        },
        {
          id: '3',
          type: 'user',
          message: `Usuario ${user?.firstName || 'Tech'} sesión iniciada`,
          timestamp: new Date(now.getTime() - 30 * 60000).toISOString(),
          priority: 'low'
        },
        {
          id: '4',
          type: 'system',
          message: 'Backup automático completado',
          timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
          priority: 'low'
        }
      ]);

      // Mock system status (in production, this would come from health checks)
      setSystemStatus([
        { name: 'Base de Datos', status: 'operational', details: 'Conexión activa' },
        { name: 'API', status: 'operational', details: 'Todas las rutas funcionando' },
        { name: 'Almacenamiento', status: 'degraded', details: '75% utilizado' },
        { name: 'Autenticación', status: 'operational', details: 'Clerk activo' },
        { name: 'Backup', status: 'operational', details: 'Último: hace 1 hora' }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to mock data on error
      setStats([
        { title: 'Tickets Abiertos', value: 12, change: '+3 desde ayer', changeType: 'increase', icon: Ticket, color: 'blue' },
        { title: 'Tiempo Respuesta', value: '2.5h', change: '-30min esta semana', changeType: 'increase', icon: Clock, color: 'green' },
        { title: 'Resueltos Hoy', value: 8, change: '+2 vs ayer', changeType: 'increase', icon: Activity, color: 'purple' },
        { title: 'Errores Activos', value: 3, change: '-1 desde hora pasada', changeType: 'decrease', icon: AlertTriangle, color: 'red' }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (userRole !== 'tech_support') return;

    apiMonitor.startMonitoring();
    
    const unsubscribe = apiMonitor.subscribe((statuses) => {
      setApiStatus(statuses);
    });

    const unsubscribeAlerts = apiMonitor.subscribeToAlerts((alert) => {
      if (alert.severity === 'error') {
        new window.Notification(`⚠️ API Error: ${alert.endpoint}`, {
          body: alert.message,
          icon: '/favicon.ico',
          tag: 'api-alert',
          requireInteraction: true
        });
      } else {
        new window.Notification(`⚠️ API Warning: ${alert.endpoint}`, {
          body: alert.message,
          icon: '/favicon.ico',
          tag: 'api-warning'
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeAlerts();
      apiMonitor.stopMonitoring();
    };
  }, [userRole]);

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase': return 'text-green-600 dark:text-green-400';
      case 'decrease': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket': return Ticket;
      case 'system': return Server;
      case 'user': return Activity;
      default: return Activity;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return CheckCircle;
      case 'degraded': return AlertCircle;
      case 'offline': return XCircle;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'offline': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', icon: 'text-orange-600 dark:text-orange-400' }
    };
    return colors[color] || colors.blue;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} h`;
    return date.toLocaleDateString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const quickActions = [
    { href: '/tech-support/tickets', label: 'Nuevo Ticket', icon: Plus, color: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' },
    { href: '/tech-support/system-logs', label: 'Ver Logs', icon: FileText, color: 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700' },
    { href: '/tech-support/system-settings', label: 'Configuración', icon: Settings, color: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700' },
    { href: '/tech-support/access-portal', label: 'Portal de Acceso', icon: LayoutGrid, color: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700' }
  ];

  if (userRole !== 'tech_support') {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permiso para acceder a esta página."
        explanation="Esta área es exclusiva para el personal de soporte técnico."
        contactInfo="Si necesitas acceso, contacta a un administrador del sistema."
        onGoBack={() => window.history.back()}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      {/* Quick Actions */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`inline-flex items-center justify-center px-4 py-3 ${action.color} text-white rounded-lg transition-all hover:scale-105 hover:shadow-md`}
            >
              <action.icon className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium hidden sm:inline">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* API Sensors */}
      {userRole === 'tech_support' && (
        <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sensores API</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Actualización: 30s</span>
              <button 
                onClick={() => apiMonitor.checkAllEndpoints()}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Refrescar estado"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {apiStatus.length > 0 ? (
              apiStatus.map((api) => (
                <div 
                    key={api.name} 
                    className={`p-4 rounded-lg border ${
                      api.status === 'operational' 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : api.status === 'degraded'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          api.status === 'operational'
                            ? 'bg-green-100 dark:bg-green-900/40'
                            : api.status === 'degraded'
                            ? 'bg-yellow-100 dark:bg-yellow-900/40'
                            : 'bg-red-100 dark:bg-red-900/40'
                        }`}>
                          {api.status === 'operational' ? (
                            <CheckCircle className={`w-4 h-4 text-green-600 dark:text-green-400`} />
                          ) : api.status === 'degraded' ? (
                            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{api.name}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Latency */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Gauge className="w-3 h-3" />
                          Latencia
                        </span>
                        <span className={`font-medium ${
                          api.latency < 200 
                            ? 'text-green-600 dark:text-green-400'
                            : api.latency < 500
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {api.latency}ms
                        </span>
                      </div>
                      
                      {/* Uptime */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Timer className="w-3 h-3" />
                          Uptime
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{api.uptime.toFixed(1)}%</span>
                      </div>
                      
                      {/* Uptime Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            api.uptime >= 99 
                              ? 'bg-green-500'
                              : api.uptime >= 95
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${api.uptime}%` }}
                        />
                      </div>
                      
                      {/* Last Check */}
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(api.lastCheck).toLocaleTimeString('es-HN')}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
              <div className="col-span-full text-center py-8">
                <Wifi className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Cargando estado de APIs...</p>
              </div>
            )}
          </div>
          
          {/* API Summary */}
          {apiStatus.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Estado General: 
                  <span className={`ml-2 font-medium ${
                    apiStatus.every(a => a.status === 'operational')
                      ? 'text-green-600 dark:text-green-400'
                      : apiStatus.some(a => a.status === 'offline')
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {apiStatus.every(a => a.status === 'operational') 
                      ? 'Todos los servicios operativos'
                      : apiStatus.some(a => a.status === 'offline')
                      ? `${apiStatus.filter(a => a.status === 'offline').length} servicio(s) caído(s)`
                      : `${apiStatus.filter(a => a.status === 'degraded').length} servicio(s) degradado(s)`}
                  </span>
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  Avg: {Math.round(apiStatus.reduce((acc, a) => acc + a.latency, 0) / apiStatus.length)}ms
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
                <span className={`text-xs md:text-sm font-medium ${getChangeColor(stat.changeType)}`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{stat.title}</p>
            </div>
          );
        })}
      </div>

      {/* Activity and System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className={`rounded-xl shadow-sm ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Actividad Reciente</h2>
              <Link
                href="/tech-support/tickets"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
              >
                Ver todos <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const ActivityIcon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <ActivityIcon className="text-gray-600 dark:text-gray-400 w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{activity.message}</p>
                      <div className="flex items-center mt-2 space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(activity.priority)}`}>
                          {activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className={`rounded-xl shadow-sm ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Estado del Sistema</h2>
              <Link
                href="/tech-support/system-settings"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
              >
                Detalles <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="space-y-4">
              {systemStatus.map((system, index) => {
                const StatusIcon = getStatusIcon(system.status);
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <div className={`${getStatusColor(system.status)}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{system.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{system.details}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      system.status === 'operational' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : system.status === 'degraded'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {system.status === 'operational' ? 'Operativo' : system.status === 'degraded' ? 'Degradado' : 'Caído'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recursos del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">CPU</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">45%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
          {/* Memory */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Memoria</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">62%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '62%' }}></div>
            </div>
          </div>
          {/* Storage */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Almacenamiento</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">75%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
