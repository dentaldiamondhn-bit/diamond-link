'use client';

import { useUser } from '@clerk/nextjs';

export interface RolePermissions {
  canViewDashboard: boolean;
  canViewPatients: boolean;
  canCreatePatients: boolean;
  canViewPatientPreview: boolean;
  canViewOdontogram: boolean;
  canViewTreatments: boolean;
  canViewCompletedTreatments: boolean;
  canViewConsentimientos: boolean;
  canViewCalendar: boolean;
  canViewMenuNavegacion: boolean;
  canManageDoctores: boolean;
  canManageUsers: boolean;
}

const rolePermissions: Record<string, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canViewPatients: true,
    canCreatePatients: true,
    canViewPatientPreview: true,
    canViewOdontogram: true,
    canViewTreatments: true,
    canViewCompletedTreatments: true,
    canViewConsentimientos: true,
    canViewCalendar: true,
    canViewMenuNavegacion: true,
    canManageDoctores: true,
    canManageUsers: true,
  },
  doctor: {
    canViewDashboard: true,
    canViewPatients: true,
    canCreatePatients: true,
    canViewPatientPreview: true,
    canViewOdontogram: true,
    canViewTreatments: true,
    canViewCompletedTreatments: true,
    canViewConsentimientos: true,
    canViewCalendar: true,
    canViewMenuNavegacion: true,
    canManageDoctores: true,
    canManageUsers: false,
  },
  staff: {
    canViewDashboard: false, // Hide dashboard from staff
    canViewPatients: true,
    canCreatePatients: false,
    canViewPatientPreview: true,
    canViewOdontogram: false,
    canViewTreatments: false,
    canViewCompletedTreatments: true,
    canViewConsentimientos: false,
    canViewCalendar: true,
    canViewMenuNavegacion: true,
    canManageDoctores: true,
    canManageUsers: false,
  },
};

export function useRoleBasedAccess() {
  const { user } = useUser();
  // Use the same metadata source as middleware
  let userRole = (user?.publicMetadata?.role as string) || 
                 (user?.unsafeMetadata?.role as string) || 
                 'staff';
  
  const finalRole = userRole === 'admin' ? 'admin' : userRole;
  
  const permissions = rolePermissions[finalRole] || rolePermissions.staff;
  
  return {
    userRole: finalRole,
    permissions,
    hasPermission: (permission: keyof RolePermissions) => permissions[permission],
  };
}

export function canAccessRoute(userRole: string, pathname: string): boolean {
  // Admin has access to everything
  if (userRole === 'admin') {
    return true;
  }

  const permissions = rolePermissions[userRole] || rolePermissions.staff;
  
  // Map routes to permissions
  const routePermissionMap: Record<string, keyof RolePermissions> = {
    '/dashboard': 'canViewDashboard',
    '/pacientes': 'canViewPatients',
    '/patient-form': 'canCreatePatients',
    '/patient-preview': 'canViewPatientPreview',
    '/odontogram': 'canViewOdontogram',
    '/tratamientos': 'canViewTreatments',
    '/tratamientos-completados': 'canViewCompletedTreatments',
    '/consentimientos': 'canViewConsentimientos',
    '/calendario': 'canViewCalendar',
    '/menu-navegacion': 'canViewMenuNavegacion',
    '/doctores': 'canManageDoctores',
    '/admin': 'canManageUsers',
    '/admin/users': 'canManageUsers',
  };

  // Check exact match first
  if (routePermissionMap[pathname]) {
    return permissions[routePermissionMap[pathname]];
  }

  // Check prefix matches
  for (const [route, permission] of Object.entries(routePermissionMap)) {
    if (pathname.startsWith(route + '/')) {
      return permissions[permission];
    }
  }

  return false;
}
