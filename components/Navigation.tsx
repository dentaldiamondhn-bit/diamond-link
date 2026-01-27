'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

const roleBasedNavItems: Record<string, NavItem[]> = {
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { href: '/admin/users', label: 'Usuarios', icon: 'fas fa-users' },
    { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured' },
    { href: '/patient-form', label: 'Nueva Historia', icon: 'fas fa-plus-circle' },
    { href: '/patient-preview', label: 'Vista Paciente', icon: 'fas fa-eye' },
    { href: '/odontogram', label: 'Odontograma', icon: 'fas fa-teeth' },
    { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth' },
    { href: '/tratamientos-completados', label: 'Tratamientos Completados', icon: 'fas fa-check-circle' },
    { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
    { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
  ],
  doctor: [
    { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured' },
    { href: '/patient-form', label: 'Nueva Historia', icon: 'fas fa-plus-circle' },
    { href: '/odontogram', label: 'Odontograma', icon: 'fas fa-teeth' },
    { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth' },
    { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
    { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
  ],
  staff: [
    { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-user-injured' },
    { href: '/tratamientos-completados', label: 'Tratamientos', icon: 'fas fa-check-circle' },
    { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
  ],
};

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useUser();
  
  // Get user role from metadata
  const userRole = (user?.publicMetadata?.role as string) || 'staff';
  const navItems = roleBasedNavItems[userRole] || roleBasedNavItems.staff;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-teal-700">
                <i className="fas fa-tooth mr-2"></i>
                Clínica Dental
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'border-teal-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.icon && <i className={`${item.icon} mr-2`}></i>}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* User info and role badge */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Rol:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                userRole === 'admin' 
                  ? 'bg-red-100 text-red-800' 
                  : userRole === 'doctor' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {userRole === 'admin' ? 'Administrador' : userRole === 'doctor' ? 'Doctor' : 'Staff'}
              </span>
            </div>
            
            {/* User menu */}
            <div className="relative">
              <button className="flex items-center text-sm text-gray-700 hover:text-gray-900">
                <i className="fas fa-user-circle mr-2"></i>
                {user?.firstName || 'Usuario'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
