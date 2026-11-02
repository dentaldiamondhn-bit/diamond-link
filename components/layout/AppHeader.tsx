'use client';

import { memo, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import HydratedUserButton from '@/components/HydratedUserButton';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import GlobalSearch from '@/components/GlobalSearch';
import { SupportWidget } from '@/components/support/SupportWidget';
import PageHeaderTitle from '@/components/layout/PageHeaderTitle';

/** Created once so Clerk's UserButton keeps a stable appearance prop. */
const USER_BUTTON_APPEARANCE = {
  elements: {
    avatarBox: 'w-8 h-8 lg:w-10 lg:h-10 shadow-md',
    userButton: 'hover:bg-gray-100 rounded-lg transition-colors',
  },
};

// Role badge colors and styles
function getRoleBadgeInfo(role: string) {
  switch (role) {
    case 'tech_support':
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        icon: 'fas fa-tools',
        label: 'Tech Support'
      };
    case 'admin':
      return {
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200',
        icon: 'fas fa-crown',
        label: 'Administrador'
      };
    case 'doctor':
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        icon: 'fas fa-user-md',
        label: 'Doctor'
      };
    case 'staff':
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        icon: 'fas fa-user',
        label: 'Staff'
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        icon: 'fas fa-question',
        label: 'Desconocido'
      };
  }
}

/**
 * The application header. It takes no props and does not subscribe to the
 * route, so it stays mounted and unchanged while the user navigates — only the
 * page title inside it reacts to the current pathname.
 */
function AppHeader() {
  const { user, isLoaded: userLoaded } = useUser();
  const { userRole } = useRoleBasedAccess();

  const ready = userLoaded && !!user;
  const roleBadgeInfo = useMemo(
    () => getRoleBadgeInfo(userRole || 'staff'),
    [userRole],
  );

  return (
    <header className={`transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'} bg-white backdrop-blur-xl border-b border-slate-200 text-slate-800 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-b dark:border-white/10 dark:text-slate-100 px-3 sm:px-4 py-3 print:hidden`}>
      <div className="flex items-center justify-between">
        {/* Left side - Page Title */}
        <PageHeaderTitle />

        {/* Right side - User Info and Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          {/* Header Actions - Left of User Info */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Soporte Remoto */}
            {ready && <SupportWidget variant="header" />}

            {/* Global Search */}
            <GlobalSearch />

            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* Notifications */}
            <NotificationDropdown />
          </div>

          {/* Mobile Actions */}
          <div className="flex sm:hidden items-center space-x-2">
            {ready && <SupportWidget variant="header" />}
            <GlobalSearch />
            <DarkModeToggle />
            <NotificationDropdown />
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* User Name and Email - Hidden on mobile */}
            <div className="hidden sm:block text-right">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm lg:text-lg font-semibold text-gray-900 truncate max-w-[100px] lg:max-w-none">
                  {user?.firstName || 'Usuario'} {user?.lastName || ''}
                </h2>
                {/* Role Badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeInfo.bgColor} ${roleBadgeInfo.textColor} ${roleBadgeInfo.borderColor} border`}>
                  <i className={`${roleBadgeInfo.icon} mr-1`}></i>
                  {roleBadgeInfo.label}
                </span>
              </div>
              <p className="text-xs text-gray-600 truncate max-w-[120px] lg:max-w-none">
                {user?.emailAddresses?.[0]?.emailAddress || 'usuario@ejemplo.com'}
              </p>
            </div>

            {/* Clerk User Avatar */}
            <div className="relative flex-shrink-0">
              <HydratedUserButton
                placeholderClassName="w-8 h-8 lg:w-10 lg:h-10"
                showOnlineDot
                appearance={USER_BUTTON_APPEARANCE}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default memo(AppHeader);
