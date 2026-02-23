'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

interface DashboardStat {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'ticket' | 'system' | 'user';
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

export default function TechSupportDashboard() {
  const { userRole, hasPermission } = useRoleBasedAccess();
  
  // Debug logging
  console.log('Tech Dashboard - User Role:', userRole);
  console.log('Tech Dashboard - Has Permission:', hasPermission('canViewDashboard'));
  
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is tech support
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

  useEffect(() => {
    // Mock data for demonstration
    setTimeout(() => {
      setStats([
        {
          title: 'Tickets Abiertos',
          value: 12,
          change: '+3 desde ayer',
          changeType: 'increase',
          icon: 'fas fa-ticket-alt',
          color: 'blue'
        },
        {
          title: 'Tiempo Respuesta Promedio',
          value: '2.5h',
          change: '-30min desde semana pasada',
          changeType: 'increase',
          icon: 'fas fa-clock',
          color: 'green'
        },
        {
          title: 'Tickets Resueltos Hoy',
          value: 8,
          change: '+2 vs ayer',
          changeType: 'increase',
          icon: 'fas fa-check-circle',
          color: 'purple'
        },
        {
          title: 'Errores del Sistema',
          value: 3,
          change: '-1 desde hora pasada',
          changeType: 'decrease',
          icon: 'fas fa-exclamation-triangle',
          color: 'red'
        }
      ]);

      setRecentActivity([
        {
          id: '1',
          type: 'ticket',
          message: 'Nuevo ticket #123: Error en calendario',
          timestamp: '2024-01-15T10:30:00Z',
          priority: 'high'
        },
        {
          id: '2',
          type: 'system',
          message: 'Backup automático completado exitosamente',
          timestamp: '2024-01-15T10:15:00Z',
          priority: 'low'
        },
        {
          id: '3',
          type: 'user',
          message: 'Usuario Dr. Pérez restableció contraseña',
          timestamp: '2024-01-15T10:00:00Z',
          priority: 'medium'
        },
        {
          id: '4',
          type: 'ticket',
          message: 'Ticket #122 resuelto: Problema firma digital',
          timestamp: '2024-01-15T09:45:00Z',
          priority: 'medium'
        }
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket': return 'fas fa-ticket-alt';
      case 'system': return 'fas fa-server';
      case 'user': return 'fas fa-user';
      default: return 'fas fa-circle';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/tech-support/tickets" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <i className="fas fa-plus mr-2"></i>
            Nuevo Ticket
          </Link>
          <Link href="/tech-support/system-logs" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <i className="fas fa-file-alt mr-2"></i>
            Ver Logs
          </Link>
          <Link href="/tech-support/system-settings" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <i className="fas fa-cogs mr-2"></i>
            Configuración
          </Link>
          <Link href="/tech-support/access-portal" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <i className="fas fa-th-large mr-2"></i>
            Portal de Acceso
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <i className={`${stat.icon} text-${stat.color}-600 text-xl`}></i>
              </div>
              <span className={`text-sm font-medium ${getChangeColor(stat.changeType)}`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-gray-600 text-sm">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className={`${getActivityIcon(activity.type)} text-gray-600 text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(activity.priority)}`}>
                        {activity.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Estado del Sistema</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Base de Datos</span>
                </div>
                <span className="text-sm text-green-600">Operativa</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">API</span>
                </div>
                <span className="text-sm text-green-600">Funcionando</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Almacenamiento</span>
                </div>
                <span className="text-sm text-yellow-600">75% usado</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Backup</span>
                </div>
                <span className="text-sm text-green-600">Actualizado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
