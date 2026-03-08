'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { MaintenanceAlert } from '@/services/maintenanceService';

interface MaintenanceBannerProps {
  alerts?: MaintenanceAlert[];
}

export function MaintenanceBanner({ alerts: propAlerts }: MaintenanceBannerProps) {
  const { theme } = useTheme();
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>(propAlerts || []);
  const [loading, setLoading] = useState(!propAlerts);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Only fetch if no alerts were provided as props
    if (!propAlerts) {
      fetchMaintenanceAlerts();
    }
  }, [propAlerts]);

  const fetchMaintenanceAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/maintenance-alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance alerts');
      }
      
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching maintenance alerts:', error);
      setError('No se pudieron cargar las alertas de mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-900 dark:text-red-100 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    // Convert to Honduras time (Central Time)
    return date.toLocaleString('es-HN', {
      timeZone: 'America/Tegucigalpa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return theme === 'dark' ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-200';
      case 'HIGH':
        return theme === 'dark' ? 'bg-orange-900/20 border-orange-600' : 'bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return theme === 'dark' ? 'bg-yellow-900/20 border-yellow-600' : 'bg-yellow-50 border-yellow-200';
      case 'LOW':
        return theme === 'dark' ? 'bg-blue-900/20 border-blue-600' : 'bg-blue-50 border-blue-200';
      default:
        return theme === 'dark' ? 'bg-gray-900/20 border-gray-600' : 'bg-gray-50 border-gray-200';
    }
  };

  const getAlertStatus = (alert: MaintenanceAlert) => {
    const now = currentTime;
    const start = new Date(alert.maintenance_start);
    const end = new Date(alert.maintenance_end);
    
    if (alert.status === 'CANCELLED') {
      return { status: 'cancelled', text: 'CANCELADO', color: 'gray' };
    }
    if (alert.status === 'COMPLETED') {
      return { status: 'completed', text: 'COMPLETADO', color: 'green' };
    }
    if (now >= start && now <= end) {
      return { status: 'active', text: 'EN PROGRESO', color: 'red' };
    } else if (now < start) {
      return { status: 'upcoming', text: 'PRÓXIMO', color: 'orange' };
    } else {
      return { status: 'completed', text: 'COMPLETADO', color: 'green' };
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'EMERGENCY':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'SYSTEM_UPDATE':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default: // MAINTENANCE
        return (
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const status = getAlertStatus(alert);
        const severityColor = getSeverityColor(alert.severity);
        
        return (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${severityColor}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getAlertIcon(alert.alert_type)}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {alert.alert_type === 'EMERGENCY' ? 'Emergencia del Sistema' :
                       alert.alert_type === 'SYSTEM_UPDATE' ? 'Actualización del Sistema' :
                       'Mantenimiento del Sistema'} {status.text}
                    </h3>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                      status.color === 'red' ? 'bg-red-600 text-white' :
                      status.color === 'orange' ? 'bg-orange-600 text-white' :
                      status.color === 'green' ? 'bg-green-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {status.text}
                    </span>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                      alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-medium">{alert.title}</p>
                  {alert.description && (
                    <p className="mt-1">{alert.description}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <p><strong>Inicio:</strong> {formatTime(alert.maintenance_start)}</p>
                    <p><strong>Fin:</strong> {formatTime(alert.maintenance_end)}</p>
                    {alert.affected_systems && alert.affected_systems.length > 0 && (
                      <p><strong>Sistemas afectados:</strong> {alert.affected_systems.join(', ')}</p>
                    )}
                    {alert.contact_person && (
                      <p><strong>Contacto:</strong> {alert.contact_person}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
