'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import HydratedUserButton from './HydratedUserButton';
import { TutorialButton } from './TutorialButton';

const techSupportNavItems = [
  { href: '/tech-support/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
  { href: '/tech-support/tickets', label: 'Tickets de Soporte', icon: 'fas fa-ticket-alt' },
  { href: '/tech-support/system-logs', label: 'Logs del Sistema', icon: 'fas fa-file-alt' },
  { href: '/tech-support/system-settings', label: 'Configuración del Sistema', icon: 'fas fa-cogs' },
  { href: '/tech-support/terminal', label: 'Terminal', icon: 'fas fa-terminal' },
  { href: '/tech-support/code-runner', label: 'Code Runner', icon: 'fas fa-code' },
  { href: '/tech-support/claude-code', label: 'Claude Code', icon: 'fas fa-robot' },
  { href: '/tech-support/codespaces', label: 'Local Android Dev', icon: 'fas fa-mobile-alt' },
  { href: '/tech-support/github-codespaces', label: 'GitHub Codespaces', icon: 'fas fa-code-branch' },
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
    <div className="w-64 text-white flex flex-col h-screen overflow-y-auto" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #b91c1c 100%)' }}>
      {/* Logo Section */}
      <div className="p-6 border-b border-white/40 dark:border-white/40">
        <div className="flex items-center space-x-3">
          <img src="/Logo.svg" alt="Diamond Link" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-white">Diamond Link</h1>
            <p className="text-xs text-white/80">Soporte Técnico</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {techSupportNavItems.map((item) => {
          // Add GlobalSearch after dashboard item
          if (item.href === '/tech-support/dashboard') {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
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
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
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
      <div className="p-4 border-t border-white/40 dark:border-white/40">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-sm font-medium text-white">
                {user?.firstName || 'Usuario'} {user?.lastName || ''}
              </p>
              {/* Tech Support Role Badge */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white border border-white/60 dark:border-white/60">
                <i className="fas fa-tools mr-1"></i>
                Tech Support
              </span>
            </div>
            <p className="text-xs text-white/70">
              {user?.emailAddresses?.[0]?.emailAddress || 'usuario@ejemplo.com'}
            </p>
            {/* Tutorial Button */}
            <div className="mt-2">
              <TutorialButton variant="menu" />
            </div>
          </div>
          <div className="relative">
            <HydratedUserButton
              showOnlineDot
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButton: "hover:bg-white/10 rounded-lg transition-colors"
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
