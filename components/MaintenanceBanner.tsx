'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, TicketType } from '@/types/ticket';
import { useTheme } from '@/contexts/ThemeContext';

interface MaintenanceBannerProps {
  tickets: Ticket[];
}

export function MaintenanceBanner({ tickets }: MaintenanceBannerProps) {
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMaintenance, setActiveMaintenance] = useState<Ticket[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<Ticket[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const maintenanceTickets = tickets.filter(ticket => 
      ticket.type === TicketType.MAINTENANCE && 
      ticket.maintenance_start && 
      ticket.maintenance_end
    );

    const now = currentTime;
    
    // Filter active maintenance (currently in progress)
    const active = maintenanceTickets.filter(ticket => {
      const start = new Date(ticket.maintenance_start!);
      const end = new Date(ticket.maintenance_end!);
      return now >= start && now <= end;
    });

    // Filter upcoming maintenance (within next 24 hours)
    const upcoming = maintenanceTickets.filter(ticket => {
      const start = new Date(ticket.maintenance_start!);
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return start > now && start <= twentyFourHoursFromNow;
    });

    setActiveMaintenance(active);
    setUpcomingMaintenance(upcoming);
  }, [tickets, currentTime]);

  if (activeMaintenance.length === 0 && upcomingMaintenance.length === 0) {
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

  const getMaintenanceStatus = (ticket: Ticket) => {
    const now = currentTime;
    const start = new Date(ticket.maintenance_start!);
    const end = new Date(ticket.maintenance_end!);
    
    if (now >= start && now <= end) {
      return { status: 'active', text: 'EN PROGRESO', color: 'red' };
    } else if (now < start) {
      return { status: 'upcoming', text: 'PRÓXIMO', color: 'orange' };
    } else {
      return { status: 'completed', text: 'COMPLETADO', color: 'green' };
    }
  };

  return (
    <div className="space-y-2">
      {/* Active Maintenance */}
      {activeMaintenance.map((ticket) => {
        const status = getMaintenanceStatus(ticket);
        return (
          <div
            key={ticket.id}
            className={`p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-red-900/20 border-red-600' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-red-900 dark:text-red-100">
                    Mantenimiento del Sistema {status.text}
                  </h3>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-600 text-white`}>
                    {status.text}
                  </span>
                </div>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p className="font-medium">{ticket.title}</p>
                  {ticket.description && (
                    <p className="mt-1">{ticket.description}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <p><strong>Inicio:</strong> {formatTime(ticket.maintenance_start!)}</p>
                    <p><strong>Fin:</strong> {formatTime(ticket.maintenance_end!)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Upcoming Maintenance */}
      {upcomingMaintenance.map((ticket) => {
        const status = getMaintenanceStatus(ticket);
        return (
          <div
            key={ticket.id}
            className={`p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-orange-900/20 border-orange-600' 
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Mantenimiento Programado
                  </h3>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full bg-orange-600 text-white`}>
                    {status.text}
                  </span>
                </div>
                <div className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                  <p className="font-medium">{ticket.title}</p>
                  {ticket.description && (
                    <p className="mt-1">{ticket.description}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <p><strong>Inicio:</strong> {formatTime(ticket.maintenance_start!)}</p>
                    <p><strong>Fin:</strong> {formatTime(ticket.maintenance_end!)}</p>
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
