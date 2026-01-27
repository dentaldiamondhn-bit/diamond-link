'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DarkModeToggle } from './DarkModeToggle';

export const NAVIGATION_GROUPS = [
  {
    id: 'patient-management',
    label: 'Gestión de Pacientes',
    icon: 'fa-users',
    items: [
      { href: '/patient-form', icon: 'fa-file-medical', label: 'Nueva Historia Clínica' },
      { href: '/pacientes', icon: 'fa-users', label: 'Lista de Pacientes' },
      { href: '/patient-records', icon: 'fa-notes-medical', label: 'Historias Clínicas' },
    ]
  },
  {
    id: 'clinical-tools',
    label: 'Herramientas Clínicas',
    icon: 'fa-tooth',
    items: [
      { href: '/odontogram', icon: 'fa-teeth', label: 'Estudio Odontológico' },
    ]
  },
  {
    id: 'treatment-management',
    label: 'Gestión de Tratamientos',
    icon: 'fa-procedures',
    items: [
      { href: '/tratamientos', icon: 'fa-plus', label: 'Crear Tratamientos' },
      { href: '/tratamientos-completados', icon: 'fa-check-circle', label: 'Tratamientos Completados' },
      { href: '/consentimientos', icon: 'fa-file-signature', label: 'Consentimientos' },
    ]
  },
  {
    id: 'business-management',
    label: 'Gestión de Negocio',
    icon: 'fa-chart-line',
    items: [
      { href: '/dashboard/appointments', icon: 'fa-calendar-check', label: 'Citas' },
      { href: '/dashboard/budgets', icon: 'fa-file-invoice-dollar', label: 'Presupuestos' },
      { href: '/dashboard/payments', icon: 'fa-credit-card', label: 'Pagos' },
      { href: '/dashboard/income', icon: 'fa-chart-line', label: 'Ingresos' },
    ]
  },
  {
    id: 'admin-settings',
    label: 'Administración',
    icon: 'fa-cog',
    items: [
      { href: '/dashboard/doctors', icon: 'fa-user-md', label: 'Doctores' },
      { href: '/dashboard/users', icon: 'fa-users-cog', label: 'Usuarios' },
      { href: '/dashboard/reports', icon: 'fa-chart-bar', label: 'Reportes' },
      { href: '/dashboard/settings', icon: 'fa-cog', label: 'Configuración' },
    ]
  },
  {
    id: 'user-settings',
    label: 'Mi Cuenta',
    icon: 'fa-user-cog',
    items: [
      { href: '/account', icon: 'fa-user', label: 'Mi Cuenta' },
      { href: '/dashboard/profile', icon: 'fa-user', label: 'Mi Perfil' },
    ]
  },
];

export default function UnifiedSidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Auto-expand group based on current page
    const currentGroup = NAVIGATION_GROUPS.find(group => 
      group.items.some(item => pathname === item.href)
    );
    setActiveGroup(currentGroup?.id || null);
  }, [pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div
      className={`${
        isSidebarOpen ? 'w-64' : 'w-20'
      } text-white transition-all duration-300 ease-in-out flex flex-col fixed top-0 left-0 bottom-0 z-40`}
      style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%) !important',
        height: '100vh',
      }}
    >
      <div className="p-4 flex items-center justify-between">
        {isSidebarOpen && (
          <div className="flex items-center space-x-2">
            <img
              src="/Logo.svg"
              alt="Clínica Dental"
              className="h-10 w-auto"
            />
            <span className="font-bold text-xl">Clínica Dental</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <i className={`fas fa-${isSidebarOpen ? 'times' : 'bars'}`}></i>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {/* Core Navigation */}
          <div className="mb-4">
            <Link
              href="/dashboard"
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                pathname === '/dashboard'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg'
                  : 'hover:bg-white/10'
              }`}
            >
              <i className="fas fa-home w-6 text-center"></i>
              {isSidebarOpen && <span className="ml-3">Inicio</span>}
            </Link>
          </div>

          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.id} className="relative">
              {/* Main Button */}
              <button
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                  activeGroup === group.id
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={() => setActiveGroup(activeGroup === group.id ? null : group.id)}
              >
                <i className={`fas ${group.icon} w-6 text-center`}></i>
                <span className="ml-3">{group.label}</span>
                <i className={`fas fa-chevron-${activeGroup === group.id ? 'up' : 'down'} ml-auto transition-transform duration-200`}></i>
              </button>

              {/* Contextual Menu */}
              {activeGroup === group.id && (
                <div className="absolute left-full top-0 ml-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-48">
                  <div className="py-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 whitespace-nowrap"
                      >
                        <i className={`fas ${item.icon} w-4 mr-3`}></i>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="font-medium">Usuario</p>
            <p className="text-sm text-gray-300">Administrador</p>
          </div>
          <DarkModeToggle />
        </div>
      </div>
    </div>
  );
}
