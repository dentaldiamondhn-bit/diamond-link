'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import GlobalSearch from './GlobalSearch';
import { TutorialButton } from './TutorialButton';

const doctorNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
  { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured' },
  { href: '/patient-form', label: 'Nueva Historia', icon: 'fas fa-plus-circle' },
  { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth' },
  { href: '/tratamientos-completados', label: 'Tratamientos Completados', icon: 'fas fa-check-circle' },
  { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
  { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
];

export default function DoctorSidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="w-64 bg-blue-900 text-white flex flex-col h-screen overflow-y-auto">
      {/* Logo Section */}
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center space-x-3">
          <img src="/Logo.svg" alt="Diamond Link" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-white">Diamond Link</h1>
            <p className="text-xs text-blue-200">Acceso Clínico</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {doctorNavItems.map((item) => {
          // Add GlobalSearch after dashboard item
          if (item.href === '/dashboard') {
            return (
              <React.Fragment key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <i className={`${item.icon} w-5 mr-3`}></i>
                  <span className="font-medium">{item.label}</span>
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
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <i className={`${item.icon} w-5 mr-3`}></i>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-sm font-medium text-white">
                {user?.firstName || 'Usuario'} {user?.lastName || ''}
              </p>
              {/* Doctor Role Badge */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <i className="fas fa-user-md mr-1"></i>
                Doctor
              </span>
            </div>
            <p className="text-xs text-blue-200">
              {user?.emailAddresses?.[0]?.emailAddress || 'usuario@ejemplo.com'}
            </p>
            {/* Tutorial Button */}
            <div className="mt-2">
              <TutorialButton variant="menu" />
            </div>
          </div>
          <div className="relative">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButton: "hover:bg-blue-800 rounded-lg transition-colors"
                }
              }}
            />
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
