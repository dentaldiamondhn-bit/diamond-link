'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUsersRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new tech-support users location
    router.replace('/tech-support/users');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Redirigiendo a gestión de usuarios...
        </p>
      </div>
    </div>
  );
}
