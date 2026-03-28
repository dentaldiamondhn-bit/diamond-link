'use client';

import type { UserRole } from '@/hooks/useUserRole';

interface RoleBadgeProps {
  role: UserRole | undefined;
  className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const getRoleConfig = (role: UserRole | undefined) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrador',
          bgGradient: 'bg-gradient-to-r from-purple-500 to-purple-600',
          textColor: 'text-white',
          icon: 'fa-crown'
        };
      case 'doctor':
        return {
          label: 'Doctor',
          bgGradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
          textColor: 'text-white',
          icon: 'fa-user-md'
        };
      case 'staff':
        return {
          label: 'Personal',
          bgGradient: 'bg-gradient-to-r from-gray-500 to-gray-600',
          textColor: 'text-white',
          icon: 'fa-user'
        };
      default:
        return {
          label: 'Sin Rol',
          bgGradient: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
          textColor: 'text-white',
          icon: 'fa-question'
        };
    }
  };

  const config = getRoleConfig(role);

  return (
    <div
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${config.bgGradient} ${config.textColor} ${className}`}
      title={`Rol: ${config.label}`}
    >
      <i className={`fas ${config.icon} mr-1.5`}></i>
      {config.label}
    </div>
  );
}
