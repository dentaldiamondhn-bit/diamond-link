'use client';

import { useUser } from '@clerk/nextjs';
import { Calendar } from '../../../components/calendar/Calendar';
import { useEffect, useState } from 'react';

export default function CalendarPage() {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<string>('staff');

  useEffect(() => {
    if (isLoaded && user) {
      // Get user role from metadata
      const role = user.publicMetadata?.role as string || 'staff';
      setUserRole(role);
    }
  }, [user, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">No autorizado</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Calendario
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gestiona tus citas y eventos
        </p>
      </div>

      <Calendar userId={user.id} userRole={userRole} />
    </div>
  );
}
