'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function Header() {
  const { user } = useUser();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-semibold text-teal-700">
              Clínica Dental
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/dashboard" 
              className="text-gray-700 hover:text-teal-700 px-3 py-2 text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link 
              href="/patient-form" 
              className="text-gray-700 hover:text-teal-700 px-3 py-2 text-sm font-medium"
            >
              Nueva Historia Clínica
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {user?.fullName || 'Usuario'}
            </span>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </div>
    </header>
  );
}
