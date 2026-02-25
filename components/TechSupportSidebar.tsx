'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import GlobalSearch from './GlobalSearch';
import { TutorialButton } from './TutorialButton';

const techSupportNavItems = [
  { href: '/tech-support/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
  { href: '/tech-support/tickets', label: 'Tickets de Soporte', icon: 'fas fa-ticket-alt' },
  { href: '/tech-support/system-logs', label: 'Logs del Sistema', icon: 'fas fa-file-alt' },
  { href: '/tech-support/system-settings', label: 'Configuración del Sistema', icon: 'fas fa-cogs' },
  { href: '/tech-support/terminal', label: 'Terminal', icon: 'fas fa-terminal' },
  { href: '/tech-support/code-runner', label: 'Code Runner', icon: 'fas fa-code' },
  { href: '/tech-support/access-portal', label: 'Portal de Acceso', icon: 'fas fa-th-large' },
  // User management (usuarios only - doctores handled by admin)
  { href: '/tech-support/users', label: 'Usuarios', icon: 'fas fa-users-cog' },
];

interface TechSupportSidebarProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export default function TechSupportSidebar({ sidebarOpen, setSidebarOpen }: TechSupportSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const handleLinkClick = () => {
    // Close sidebar on mobile when clicking a menu item
    if (sidebarOpen && setSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="w-64 bg-gradient-to-b from-red-900 to-red-800 text-white flex flex-col h-screen overflow-y-auto">
      {/* Logo Section */}
      <div className="p-6 border-b border-red-700">
        <div className="flex items-center space-x-3">
          <img src="/Logo.svg" alt="Diamond Link" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-white">Diamond Link</h1>
            <p className="text-xs text-red-200">Soporte Técnico</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {techSupportNavItems.map((item) => {
          // Add GlobalSearch after dashboard item
          if (item.href === '/dashboard') {
            return (
              <React.Fragment key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-red-700 text-white shadow-lg'
                      : 'text-red-100 hover:bg-red-800 hover:text-white'
                  }`}
                >
                  {typeof item.icon === 'string' ? (
                    <i className={`${item.icon} w-5 mr-3`}></i>
                  ) : (
                    <div className="w-5 mr-3">{item.icon}</div>
                  )}
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
              onClick={handleLinkClick}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-red-700 text-white shadow-lg'
                  : 'text-red-100 hover:bg-red-800 hover:text-white'
              }`}
            >
              {typeof item.icon === 'string' ? (
                <i className={`${item.icon} w-5 mr-3`}></i>
              ) : (
                <div className="w-5 mr-3">{item.icon}</div>
              )}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-red-700">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-sm font-medium text-white">
                {user?.firstName || 'Usuario'} {user?.lastName || ''}
              </p>
              {/* Tech Support Role Badge */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                <i className="fas fa-tools mr-1"></i>
                Tech Support
              </span>
            </div>
            <p className="text-xs text-red-200">
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
                  userButton: "hover:bg-red-800 rounded-lg transition-colors"
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
