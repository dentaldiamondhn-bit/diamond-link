'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { DarkModeToggle } from '../../../components/DarkModeToggle';
import Link from 'next/link';

export default function AccountPage() {
  const { user } = useUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Cuenta de Usuario
          </h1>
          
          <div className="space-y-6">
            {/* User Info Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Información Personal
              </h2>
              <div className="flex items-center space-x-4">
                <UserButton afterSignOutUrl="/sign-in" />
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {user?.fullName || 'Usuario'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.primaryEmailAddress?.emailAddress || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Apariencia
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Modo Oscuro
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cambia entre tema claro y oscuro
                  </p>
                </div>
                <DarkModeToggle />
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-less4">
                Enlaces Rápidos
              </h2>
              <div className="space-y-2">
                <Link 
                  href="/dashboard" 
                  className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ← Volver al Dashboard
                </Link>
                <Link 
                  href="/patient-form" 
                  className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Nueva Historia Clínica
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
