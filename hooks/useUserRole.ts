'use client';

import { useUser } from '@clerk/nextjs';

export type UserRole = 'admin' | 'doctor' | 'staff';

export function useUserRole() {
  const { user, isLoaded } = useUser();
  
  // Get role from user object public metadata
  const userRole = user?.publicMetadata?.role as UserRole | undefined;
  
  console.log('User object:', user);
  console.log('Public metadata:', user?.publicMetadata);
  console.log('Extracted role:', userRole);
  
  return {
    userRole,
    userId: user?.id,
    isLoaded,
    isAdmin: userRole === 'admin',
    isDoctor: userRole === 'doctor',
    isStaff: userRole === 'staff',
    hasRole: !!userRole,
  };
}

// Permission checking functions
export const permissions = {
  canAccessPayments: (role: UserRole | undefined) => role === 'admin',
  canAccessBudgets: (role: UserRole | undefined) => role === 'admin',
  canAccessReports: (role: UserRole | undefined) => role === 'admin',
  canAccessSettings: (role: UserRole | undefined) => role === 'admin',
  canAccessPatientRecords: (role: UserRole | undefined) => ['admin', 'doctor'].includes(role || ''),
  canManageTreatments: (role: UserRole | undefined) => ['admin', 'doctor', 'staff'].includes(role || ''),
  canManagePatients: (role: UserRole | undefined) => ['admin', 'doctor', 'staff'].includes(role || ''),
  canAccessCalendar: (role: UserRole | undefined) => ['admin', 'doctor'].includes(role || ''),
};
