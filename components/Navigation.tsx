'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import AnimatedUser from './AnimatedUser';
import AnimatedTratamientosCompletados from './AnimatedTratamientosCompletados';
import { CalendarNotificationCounter } from './calendar/CalendarNotificationCounter';

interface NavItem {
  href: string;
  label: string;
  icon?: string | React.ReactNode;
}

const roleBasedNavItems: Record<string, NavItem[]> = {
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured' },
    { href: '/doctores', label: 'Doctores', icon: 'fas fa-user-md' },
    { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth' },
    { href: '/tratamientos-completados', label: 'Tratamientos Completados', icon: <AnimatedTratamientosCompletados className="w-4 h-4" /> },
    { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
    { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
  ],
  doctor: [
    { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured' },
    { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth' },
    { href: '/tratamientos-completados', label: 'Tratamientos Completados', icon: <AnimatedTratamientosCompletados className="w-4 h-4" /> },
    { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
    { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
  ],
  staff: [
    { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured' },
    { href: '/tratamientos-completados', label: 'Tratamientos', icon: <AnimatedTratamientosCompletados className="w-4 h-4" /> },
    { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
    { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
  ],
  'tech-support': [
    { href: '/tech-support/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { href: '/tech-support/analytics', label: 'Analytics', icon: 'fas fa-chart-line' },
    { href: '/tech-support/tickets', label: 'Tickets', icon: 'fas fa-ticket-alt' },
    { href: '/tech-support/system-logs', label: 'System Logs', icon: 'fas fa-file-alt' },
    { href: '/tech-support/system-settings', label: 'Settings', icon: 'fas fa-cog' },
    { href: '/tech-support/dental-ai-vision', label: 'Dental AI Vision', icon: 'fas fa-eye' },
  ],
};

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useUser();
  
  // Get user role from metadata with special handling for tech-support
  let userRole = (user?.publicMetadata?.role as string) || 'staff';
  
  // Special case for known tech support user
  if (user?.id === 'user_3A1mYfR054eV3tqtellpfMKZ7f6') {
    userRole = 'tech-support';
  }
  
  const navItems = roleBasedNavItems[userRole] || roleBasedNavItems.staff;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-teal-700">
                <i className="fas fa-tooth mr-2"></i>
                Clínica Dental
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'border-teal-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {typeof item.icon === 'string' ? (
                    <div className="mr-2">
                      <i className={`${item.icon}`}></i>
                      {item.href === '/calendario' && <CalendarNotificationCounter className="ml-1" />}
                    </div>
                  ) : (
                    <>{item.icon}</>
                  )}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* User info and role badge */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Rol:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                userRole === 'admin' 
                  ? 'bg-red-100 text-red-800' 
                  : userRole === 'doctor' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {userRole === 'admin' ? 'Administrador' : userRole === 'doctor' ? 'Doctor' : 'Staff'}
              </span>
            </div>
            
            {/* User menu */}
            <div className="relative">
              <button className="flex items-center text-sm text-gray-700 hover:text-gray-900">
                <i className="fas fa-user-circle mr-2"></i>
                {user?.firstName || 'Usuario'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
