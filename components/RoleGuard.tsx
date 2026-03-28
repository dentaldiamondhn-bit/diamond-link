'use client';

import { useUserRole } from '@/hooks/useUserRole';
import { permissions } from '@/hooks/useUserRole';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'doctor' | 'staff';
  permission?: keyof typeof permissions;
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, requiredRole, permission, fallback = null }: RoleGuardProps) {
  const { userRole, isLoaded } = useUserRole();

  if (!isLoaded) {
    return null; // or loading spinner
  }

  if (!userRole) {
    return <>{fallback}</>;
  }

  // Check specific role requirement
  if (requiredRole && userRole !== requiredRole) {
    return <>{fallback}</>;
  }

  // Check specific permission requirement
  if (permission && !permissions[permission](userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Higher-order component for protecting pages
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<RoleGuardProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <RoleGuard {...options}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}
