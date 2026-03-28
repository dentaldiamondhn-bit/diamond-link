'use client';

import React from 'react';
import { useRoleBasedAccess } from '../hooks/useRoleBasedAccess';
import AdminSidebar from './AdminSidebar';
import TechSupportSidebar from './TechSupportSidebar';

export default function RoleBasedSidebar({ sidebarOpen, setSidebarOpen }: { 
  sidebarOpen?: boolean; 
  setSidebarOpen?: (open: boolean) => void;
}) {
  const { userRole } = useRoleBasedAccess();

  // Render different sidebar based on user role
  if (userRole === 'tech_support') {
    return <TechSupportSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />;
  }

  // For admin, doctor, and staff roles, use the existing AdminSidebar
  return <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />;
}
