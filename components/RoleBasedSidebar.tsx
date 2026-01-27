'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRoleBasedAccess } from '../hooks/useRoleBasedAccess';
import GlobalSearch from './GlobalSearch';

interface SidebarItem {
  href: string;
  label: string;
  icon: string;
  permission: keyof import('../hooks/useRoleBasedAccess').RolePermissions;
}

const sidebarItems: SidebarItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', permission: 'canViewDashboard' },
  { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured', permission: 'canViewPatients' },
  { href: '/patient-form', label: 'Nueva Historia', icon: 'fas fa-plus-circle', permission: 'canCreatePatients' },
  { href: '/patient-preview', label: 'Vista Paciente', icon: 'fas fa-eye', permission: 'canViewPatientPreview' },
  { href: '/odontogram', label: 'Odontograma', icon: 'fas fa-teeth', permission: 'canViewOdontogram' },
  { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth', permission: 'canViewTreatments' },
  { href: '/tratamientos-completados', label: 'Tratamientos Completados', icon: 'fas fa-check-circle', permission: 'canViewCompletedTreatments' },
  { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract', permission: 'canViewConsentimientos' },
  { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar', permission: 'canViewCalendar' },
  { href: '/doctores', label: 'Doctores', icon: 'fas fa-user-md', permission: 'canManageDoctores' },
  { href: '/admin/users', label: 'Usuarios', icon: 'fas fa-users', permission: 'canManageUsers' },
];

export default function RoleBasedSidebar() {
  const pathname = usePathname();
  const { userRole, hasPermission } = useRoleBasedAccess();

  // Filter items based on user permissions
  const visibleItems = sidebarItems.filter(item => hasPermission(item.permission));

  return (
    <div className="w-64 bg-gray-800 text-white h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-6 text-teal-400">
          <i className="fas fa-tooth mr-2"></i>
          Clínica Dental
        </h2>
        
        <nav className="space-y-2">
          {visibleItems.map((item) => {
            // Add GlobalSearch after dashboard item
            if (item.href === '/dashboard') {
              return (
                <React.Fragment key={item.href}>
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <i className={`${item.icon} mr-3 w-5`}></i>
                    <span>{item.label}</span>
                  </Link>
                  {/* Global Search Component */}
                  <div className="px-4 py-2">
                    <GlobalSearch />
                  </div>
                </React.Fragment>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <i className={`${item.icon} mr-3 w-5`}></i>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* User info section */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex items-center space-x-3 px-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-sm"></i>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userRole === 'admin' ? 'Administrador' : userRole === 'doctor' ? 'Doctor' : 'Staff'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
