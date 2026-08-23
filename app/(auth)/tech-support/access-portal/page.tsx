'use client';

import React from 'react';
import Link from 'next/link';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

export default function TechSupportAccessPortal() {
  const { userRole, isLoaded } = useRoleBasedAccess();

  // Check if user is tech support
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

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

  const accessTiles = [
    // Clinical Access
    {
      category: 'Acceso Clínico',
      items: [
        { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured', color: 'blue' },
        { href: '/patient-form', label: 'Nueva Historia', icon: 'fas fa-user-plus', color: 'green' },
        { href: '/odontogram-pilot', label: 'Odontograma', icon: 'fas fa-teeth', color: 'purple' },
        { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth', color: 'indigo' },
        { href: '/xray-viewer', label: 'Visor Rayos X', icon: 'fas fa-x-ray', color: 'pink' },
        { href: '/dental-ai-vision', label: 'Dental AI Vision', icon: 'fas fa-eye', color: 'teal' },
        { href: '/estudio-periodontal', label: 'Estudio Periodontal', icon: 'fas fa-teeth-open', color: 'teal' },
        { href: '/historia-clinica-ortodoncia', label: 'Historia Ortodoncia', icon: 'fas fa-notes-medical', color: 'purple' },
        { href: '/notas-linea-de-tiempo', label: 'Notas Línea de Tiempo', icon: 'fas fa-timeline', color: 'pink' },
        { href: '/patient-follow-up', label: 'Seguimiento Pacientes', icon: 'fas fa-user-clock', color: 'green' },
        { href: '/presupuestos', label: 'Presupuestos', icon: 'fas fa-file-invoice-dollar', color: 'yellow' },
      ]
    },
    // Administrative Access
    {
      category: 'Acceso Administrativo',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', color: 'yellow' },
        { href: '/dashboard/documents', label: 'Documentos', icon: 'fas fa-file-alt', color: 'pink' },
        { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar', color: 'orange' },
        { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract', color: 'teal' },
        { href: '/tratamientos-completados', label: 'Tratamientos Completados', icon: 'fas fa-check-circle', color: 'green' },
        { href: '/reports', label: 'Reportes', icon: 'fas fa-chart-bar', color: 'red' },
        { href: '/inventario', label: 'Inventario', icon: 'fas fa-warehouse', color: 'teal' },
        { href: '/facebook-ads', label: 'Facebook Ads', icon: 'fas fa-ad', color: 'indigo' },
        { href: '/chat', label: 'Chat', icon: 'fas fa-comments', color: 'teal' },
        { href: '/tickets', label: 'Tickets', icon: 'fas fa-ticket-alt', color: 'orange' },
        { href: '/menu-navegacion', label: 'Menú Navegación', icon: 'fas fa-bars', color: 'purple' },
        { href: '/account', label: 'Mi Cuenta', icon: 'fas fa-user-cog', color: 'blue' },
      ]
    },
    // User Management (split by role)
    {
      category: 'Gestión de Usuarios',
      items: [
        { href: '/doctores', label: 'Doctores', icon: 'fas fa-user-md', color: 'blue' },
        { href: '/admin/users', label: 'Usuarios Admin', icon: 'fas fa-users-cog', color: 'red' },
      ]
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; hover: string; icon: string }> = {
      blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', icon: 'text-blue-600' },
      green: { bg: 'bg-green-500', hover: 'hover:bg-green-600', icon: 'text-green-600' },
      purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', icon: 'text-purple-600' },
      indigo: { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', icon: 'text-indigo-600' },
      pink: { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', icon: 'text-pink-600' },
      yellow: { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', icon: 'text-yellow-600' },
      orange: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', icon: 'text-orange-600' },
      teal: { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', icon: 'text-teal-600' },
      red: { bg: 'bg-red-500', hover: 'hover:bg-red-600', icon: 'text-red-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6">
      <div className="space-y-8">
        {accessTiles.map((category) => (
          <div key={category.category}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{category.category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {category.items.map((item) => {
                const colorClasses = getColorClasses(item.color);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${colorClasses.bg} ${colorClasses.hover} text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 hover:shadow-lg`}
                  >
                    <div className="text-center">
                      <i className={`${item.icon} text-3xl mb-3`}></i>
                      <h3 className="font-semibold text-lg">{item.label}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
