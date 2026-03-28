'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock } from 'lucide-react';

interface MaintenanceAlert {
  id: string;
  title: string;
  description: string;
  maintenance_start: string;
  maintenance_end: string;
  priority: string;
  created_at: string;
}

interface BannerAlertProps {
  className?: string;
}

export default function BannerAlert({ className = '' }: BannerAlertProps) {
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMaintenanceAlerts();
  }, []);

  const fetchMaintenanceAlerts = async () => {
    try {
      const response = await fetch('/api/maintenance-alerts');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch maintenance alerts:', error);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100';
      case 'MEDIUM':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100';
      case 'HIGH':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100';
      case 'URGENT':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100';
    }
  };

  const getPriorityBadgeColors = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'Bajo';
      case 'MEDIUM':
        return 'Medio';
      case 'HIGH':
        return 'Alto';
      case 'URGENT':
        return 'Urgente';
      default:
        return priority;
    }
  };

  const formatHondurasTime = (dateString: string) => {
    const date = new Date(dateString);
    // Use UTC time directly as stored in database
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
  };

  const activeAlerts = maintenanceAlerts.filter(
    alert => !dismissedAlerts.has(alert.id)
  );

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between px-4 py-2 border-b ${getPriorityColors(activeAlerts[0]?.priority || 'MEDIUM')}`}>
      <div className="flex items-center space-x-3">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">
          Mantenimiento Programado
        </span>
        {activeAlerts.map(alert => (
          <span key={alert.id} className="flex items-center space-x-1 text-xs">
            <span className={`px-2 py-1 rounded ${getPriorityBadgeColors(alert.priority)}`}>
              {getPriorityLabel(alert.priority)}
            </span>
            <span>
              {alert.title}
            </span>
            <span>
              ({formatHondurasTime(alert.maintenance_start)} - {formatHondurasTime(alert.maintenance_end)})
            </span>
          </span>
        ))}
      </div>
      <button
        onClick={() => activeAlerts.forEach(alert => dismissAlert(alert.id))}
        className="transition-colors"
        title="Descartar alerta"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
