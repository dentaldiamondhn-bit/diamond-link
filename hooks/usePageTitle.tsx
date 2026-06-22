'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import AnimatedReport from '@/components/AnimatedReport';
import AnimatedFolder from '@/components/AnimatedFolder';
import AnimatedUsers from '@/components/AnimatedUsers';

export function usePageTitle() {
  const pathname = usePathname();

  const getPageTitle = () => {
    // Tech Support Pages
    if (pathname === '/tech-support/dashboard') {
      return (
        <>
          <i className="fas fa-tachometer-alt mr-2"></i>
          Dashboard de Soporte Técnico
        </>
      );
    }
    if (pathname === '/tickets') {
      return (
        <>
          <i className="fas fa-ticket-alt mr-2"></i>
          Tickets
        </>
      );
    }
    if (pathname === '/tech-support/tickets') {
      return (
        <>
          <i className="fas fa-ticket-alt mr-2"></i>
          Tickets de Soporte
        </>
      );
    }
    if (pathname === '/tech-support/system-logs') {
      return (
        <>
          <i className="fas fa-file-alt mr-2"></i>
          Logs del Sistema
        </>
      );
    }
    if (pathname === '/tech-support/system-settings') {
      return (
        <>
          <i className="fas fa-cogs mr-2"></i>
          Configuración del Sistema
        </>
      );
    }
    if (pathname === '/tech-support/access-portal') {
      return (
        <>
          <i className="fas fa-th-large mr-2"></i>
          Portal de Acceso
        </>
      );
    }
    if (pathname === '/tech-support/terminal') {
      return (
        <>
          <i className="fas fa-terminal mr-2"></i>
          Terminal
        </>
      );
    }
    if (pathname === '/tech-support/code-runner') {
      return (
        <>
          <i className="fas fa-code mr-2"></i>
          Code Runner
        </>
      );
    }

    // Existing Admin Pages
    if (pathname === '/reports') {
      return (
        <>
          <div className="w-6 h-6 mr-3 flex items-center justify-center">
            <AnimatedReport />
          </div>
          Reportes y Análisis
        </>
      );
    }
    if (pathname === '/pacientes') {
      return (
        <>
          <i className="fas fa-user-injured mr-2"></i>
          Todos los Pacientes
        </>
      );
    }
    if (pathname === '/tratamientos') {
      return (
        <>
          <i className="fas fa-tooth mr-2"></i>
          Tratamientos
        </>
      );
    }
    if (pathname === '/historia-clinica-ortodoncia') {
      return (
        <>
          <i className="fas fa-tooth mr-2"></i>
          Historia Ortodoncia
        </>
      );
    }
    if (pathname === '/doctores') {
      return (
        <>
          <i className="fas fa-user-md mr-2"></i>
          Gestión de Doctores
        </>
      );
    }
    if (pathname === '/estudio-periodontal') {
      return (
        <>
          <i className="fas fa-teeth mr-2 text-teal-600"></i>
          Estudio Periodontal
        </>
      );
    }
    if (pathname === '/calendario') {
      return (
        <>
          <i className="fas fa-calendar-alt mr-2 text-blue-600"></i>
          Calendario
        </>
      );
    }
    if (pathname === '/dashboard/documents' || pathname.startsWith('/dashboard/documents')) {
      return (
        <>
          <div className="w-6 h-6 mr-2 flex items-center justify-center">
            <AnimatedFolder />
          </div>
          Gestión Documental
        </>
      );
    }
    if (pathname.startsWith('/admin/users')) {
      return (
        <>
          <div className="w-6 h-6 mr-2 flex items-center justify-center">
            <AnimatedUsers />
          </div>
          User Administration
        </>
      );
    }
    if (pathname.startsWith('/tech-support/users')) {
      return (
        <>
          <div className="w-6 h-6 mr-2 flex items-center justify-center">
            <AnimatedUsers />
          </div>
          User Management
        </>
      );
    }
    if (pathname.startsWith('/odontogram-test')) {
      return (
        <>
          <i className="fas fa-tooth mr-2 text-teal-600"></i>
          Odontogram Testing
        </>
      );
    }
    if (pathname === '/xray-viewer' || pathname.startsWith('/xray-viewer/')) {
      return (
        <div className="flex items-center">
          <i className="fas fa-x-ray text-2xl text-teal-600 mr-3"></i>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              Visor de Rayos X
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Gestiona y visualiza estudios radiográficos de pacientes
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return { getPageTitle };
}
