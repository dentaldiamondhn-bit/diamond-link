// Server-side role access utility (no React hooks)
export interface ServerRolePermissions {
  canViewDashboard: boolean;
  canViewPatients: boolean;
  canCreatePatients: boolean;
  canViewPatientPreview: boolean;
  canViewOdontogram: boolean;
  canViewTreatments: boolean;
  canViewCompletedTreatments: boolean;
  canViewConsentimientos: boolean;
  canViewMenuNavegacion: boolean;
  canManageDoctores: boolean;
  // Tech support specific permissions
  canViewTickets: boolean;
  canManageTickets: boolean;
  canViewSystemLogs: boolean;
  canAccessAllUserData: boolean;
  canManageSystemSettings: boolean;
  canManageUsers: boolean;
}

const serverRolePermissions: Record<string, ServerRolePermissions> = {
  admin: {
    canViewDashboard: true,
    canViewPatients: true,
    canCreatePatients: true,
    canViewPatientPreview: true,
    canViewOdontogram: true,
    canViewTreatments: true,
    canViewCompletedTreatments: true,
    canViewConsentimientos: true,
    canViewMenuNavegacion: true,
    canManageDoctores: true,
    canViewTickets: false,
    canManageTickets: false,
    canViewSystemLogs: false,
    canAccessAllUserData: false,
    canManageSystemSettings: false,
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
    canViewMenuNavegacion: true,
    canManageDoctores: false,
    canViewTickets: false,
    canManageTickets: false,
    canViewSystemLogs: false,
    canAccessAllUserData: false,
    canManageSystemSettings: false,
    canManageUsers: false,
  },
  staff: {
    canViewDashboard: true,
    canViewPatients: true,
    canCreatePatients: false,
    canViewPatientPreview: true,
    canViewOdontogram: true,
    canViewTreatments: false,
    canViewCompletedTreatments: true,
    canViewConsentimientos: true,
    canViewMenuNavegacion: true,
    canManageDoctores: false,
    canViewTickets: false,
    canManageTickets: false,
    canViewSystemLogs: false,
    canAccessAllUserData: false,
    canManageSystemSettings: false,
    canManageUsers: false,
  },
  tech_support: {
    canViewDashboard: true,
    canViewPatients: true,
    canCreatePatients: true,
    canViewPatientPreview: true,
    canViewOdontogram: true,
    canViewTreatments: true,
    canViewCompletedTreatments: true,
    canViewConsentimientos: true,
    canViewMenuNavegacion: true,
    canManageDoctores: true,
    canViewTickets: true,
    canManageTickets: true,
    canViewSystemLogs: true,
    canAccessAllUserData: true,
    canManageSystemSettings: true,
    canManageUsers: true,
  },
};

export function canAccessRouteServer(userRole: string, pathname: string): boolean {
  // Tech support has access to everything - no restrictions
  if (userRole === 'tech_support') {
    return true;
  }
  
  // Admin has access to everything except tech support and user management routes
  if (userRole === 'admin') {
    // Block admin from accessing tech support specific routes
    if (pathname.startsWith('/tech-support') || 
        pathname.startsWith('/tickets') || 
        pathname.startsWith('/system-logs') || 
        pathname.startsWith('/system-settings')) {
      return false;
    }
    // Allow admin to access everything else (including their own pages)
    return true;
  }

  // Doctor has limited access - only clinical functions
  if (userRole === 'doctor') {
    // Block doctors from user management
    if (pathname.startsWith('/doctores') || 
        pathname.startsWith('/admin/users') ||
        pathname.startsWith('/tech-support/users')) {
      return false;
    }
  }

  // Staff has very limited access - daily tasks only
  if (userRole === 'staff') {
    // Block staff from admin and tech support routes
    if (pathname.startsWith('/admin/') || 
        pathname.startsWith('/tech-support/') ||
        pathname.startsWith('/tickets') ||
        pathname.startsWith('/system-logs') ||
        pathname.startsWith('/system-settings')) {
      return false;
    }
    // Block staff from user management
    if (pathname.startsWith('/doctores') || 
        pathname.startsWith('/admin/users') ||
        pathname.startsWith('/tech-support/users')) {
      return false;
    }
    // Block staff from sensitive clinical functions
    if (pathname.startsWith('/xray-viewer') ||
        pathname === '/tratamientos' || // Block only main treatments page, not completed
        pathname === '/reports' || 
        pathname === '/reportes') { // Block staff from reports (both English and Spanish)
      return false;
    }
  }

  const permissions = serverRolePermissions[userRole] || serverRolePermissions.staff;
  
  // Map routes to permissions
  const routePermissionMap: Record<string, keyof ServerRolePermissions> = {
    '/dashboard': 'canViewDashboard',
    '/pacientes': 'canViewPatients',
    '/patient-form': 'canCreatePatients',
    '/patient-preview': 'canViewPatientPreview',
    '/odontogram': 'canViewOdontogram',
    '/tratamientos': 'canViewTreatments',
    '/tratamientos-completados': 'canViewCompletedTreatments',
    '/consentimientos': 'canViewConsentimientos',
    '/menu-navegacion': 'canViewMenuNavegacion',
    '/doctores': 'canManageDoctores',
    '/reports': 'canViewDashboard', // Reports use dashboard permission
    '/reportes': 'canViewDashboard', // Spanish reports route also uses dashboard permission
    '/admin': 'canManageUsers',
    '/admin/users': 'canManageUsers',
    '/tech-support/users': 'canManageUsers',
    // Tech support routes
    '/tickets': 'canViewTickets',
    '/tech-support': 'canViewTickets',
    '/system-logs': 'canViewSystemLogs',
    '/system-settings': 'canManageSystemSettings',
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
