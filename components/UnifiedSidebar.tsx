'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import HydratedUserButton from './HydratedUserButton';
import { TutorialButton } from './TutorialButton';
import AnimatedUser from './AnimatedUser';
import AnimatedTratamientosCompletados from './AnimatedTratamientosCompletados';
import AnimatedUsers from './AnimatedUsers';
import AnimatedReport from './AnimatedReport';
import { DarkModeToggle } from './DarkModeToggle';
import { getDoctorById, getAvailableDoctorsSync, Doctor } from '../config/doctors';

interface NavItem {
  href: string;
  icon: string | React.ReactNode;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', roles: ['admin', 'doctor', 'staff'] },
  { href: '/patient-form', label: 'Nueva Historia Clínica', icon: 'fas fa-file-medical', roles: ['admin', 'doctor', 'staff'] },
  { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-users', roles: ['admin', 'doctor', 'staff'] },
  { href: '/doctores', label: 'Doctores', icon: 'fas fa-user-md', roles: ['admin'] },
  { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth', roles: ['admin', 'doctor'] },
  { href: '/tratamientos-completados', label: 'Tratamientos Completados', icon: <AnimatedTratamientosCompletados />, roles: ['admin', 'doctor', 'staff'] },
  { href: '/inventario', label: 'Inventario', icon: 'fas fa-warehouse', roles: ['admin'] },
  { href: '/patient-follow-up', label: 'Seguimiento', icon: 'fas fa-clipboard-check', roles: ['admin', 'doctor'] },
  { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar', roles: ['admin', 'doctor', 'staff'] },
  { href: '/reports', label: 'Reportes', icon: <AnimatedReport />, roles: ['admin', 'doctor'] },
  { href: '/tickets', label: 'Tickets', icon: 'fas fa-ticket-alt', roles: ['admin', 'doctor', 'staff'] },
  { href: '/facebook-ads', label: 'Facebook Ads', icon: 'fab fa-facebook', roles: ['admin'] },
  { href: '/dental-ai-vision', label: 'Dental AI Vision', icon: 'fas fa-eye', roles: ['admin'] },
  // Tech Support routes
  { href: '/tech-support/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', roles: ['tech_support'] },
  { href: '/tech-support/co-browse', label: 'Soporte Remoto', icon: 'fas fa-tower-broadcast', roles: ['tech_support'] },
  { href: '/tech-support/tickets', label: 'Tickets de Soporte', icon: 'fas fa-ticket-alt', roles: ['tech_support'] },
  { href: '/tech-support/system-logs', label: 'Logs del Sistema', icon: 'fas fa-file-alt', roles: ['tech_support'] },
  { href: '/tech-support/system-settings', label: 'Configuración del Sistema', icon: 'fas fa-cogs', roles: ['tech_support'] },
  { href: '/tech-support/terminal', label: 'Terminal', icon: 'fas fa-terminal', roles: ['tech_support'] },
  { href: '/tech-support/code-runner', label: 'Code Runner', icon: 'fas fa-code', roles: ['tech_support'] },
  { href: '/tech-support/claude-code', label: 'Claude Code', icon: 'fas fa-robot', roles: ['tech_support'] },
  { href: '/tech-support/codespaces', label: 'Local Android Dev', icon: 'fas fa-mobile-alt', roles: ['tech_support'] },
  { href: '/tech-support/github-codespaces', label: 'GitHub Codespaces', icon: 'fas fa-code-branch', roles: ['tech_support'] },
  { href: '/tech-support/access-portal', label: 'Portal de Acceso', icon: 'fas fa-th-large', roles: ['tech_support'] },
  { href: '/tech-support/users', label: 'Usuarios', icon: 'fas fa-users-cog', roles: ['tech_support'] },
];

// Role-based theme
function getRoleTheme(role: string | null, specialty: string | null) {
  if (role === 'doctor' && specialty) {
    const specialtyMap: Record<string, { background: string; activeBg: string; hoverBg: string; textClass: string; subTextClass: string; badgeClass: string; roleText: string; buttonHover: string; subtitle: string }> = {
      'Odontopediatría': {
        background: 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        badgeClass: 'bg-white/20 text-white border border-white/60',
        roleText: 'Odontopediatra',
        buttonHover: 'hover:bg-white/10',
        subtitle: 'Odontopediatría',
      },
      'Odontología General': {
        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        badgeClass: 'bg-white/20 text-white border border-white/60',
        roleText: 'Doctor General',
        buttonHover: 'hover:bg-white/10',
        subtitle: 'Odontología General',
      },
      'Ortodoncia': {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        badgeClass: 'bg-white/20 text-white border border-white/60',
        roleText: 'Ortodoncista',
        buttonHover: 'hover:bg-white/10',
        subtitle: 'Ortodoncia',
      },
      'Endodoncia': {
        background: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        badgeClass: 'bg-white/20 text-white border border-white/60',
        roleText: 'Endodoncista',
        buttonHover: 'hover:bg-white/10',
        subtitle: 'Endodoncia',
      },
      'Periodoncia': {
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        badgeClass: 'bg-white/20 text-white border border-white/60',
        roleText: 'Periodoncista',
        buttonHover: 'hover:bg-white/10',
        subtitle: 'Periodoncia',
      },
    };
    if (specialtyMap[specialty]) return specialtyMap[specialty];
    return {
      background: 'bg-blue-900',
      activeBg: 'bg-blue-600',
      hoverBg: 'hover:bg-blue-800',
      textClass: 'text-blue-200',
      subTextClass: 'text-blue-200',
      badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-white/20 dark:text-white dark:border-white/60',
      roleText: 'Doctor',
      buttonHover: 'hover:bg-blue-800',
      subtitle: 'Acceso Clínico',
    };
  }

  switch (role) {
    case 'admin':
      return {
        background: 'bg-gray-900',
        activeBg: 'bg-gray-600',
        hoverBg: 'hover:bg-gray-800',
        textClass: 'text-gray-200',
        subTextClass: 'text-gray-400',
        badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-white/20 dark:text-white dark:border-white/60',
        roleText: 'Admin',
        buttonHover: 'hover:bg-gray-800',
        subtitle: 'Acceso Administrativo',
      };
    case 'staff':
      return {
        background: 'bg-green-900',
        activeBg: 'bg-green-600',
        hoverBg: 'hover:bg-green-800',
        textClass: 'text-green-200',
        subTextClass: 'text-green-300',
        badgeClass: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-white/20 dark:text-white dark:border-white/60',
        roleText: 'Staff',
        buttonHover: 'hover:bg-green-800',
        subtitle: 'Acceso Limitado',
      };
    case 'tech_support':
      return {
        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #b91c1c 100%)',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        badgeClass: 'bg-white/20 text-white border border-white/60',
        roleText: 'Tech Support',
        buttonHover: 'hover:bg-white/10',
        subtitle: 'Soporte Técnico',
      };
    default:
      return {
        background: 'bg-gray-900',
        activeBg: 'bg-gray-600',
        hoverBg: 'hover:bg-gray-800',
        textClass: 'text-gray-200',
        subTextClass: 'text-gray-400',
        badgeClass: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-white/20 dark:text-white dark:border-white/60',
        roleText: 'Usuario',
        buttonHover: 'hover:bg-gray-800',
        subtitle: '',
      };
  }
}

function getRoleBadgeIcon(role: string | null) {
  switch (role) {
    case 'admin': return 'fa-crown';
    case 'doctor': return 'fa-user-md';
    case 'staff': return 'fa-user';
    case 'tech_support': return 'fa-tools';
    default: return 'fa-user';
  }
}

interface UnifiedSidebarProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export default function UnifiedSidebar({ sidebarOpen, setSidebarOpen }: UnifiedSidebarProps) {
  const [supabaseDoctors, setSupabaseDoctors] = useState<Doctor[]>([]);
  const pathname = usePathname();
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();

  useEffect(() => {
    if (userRole === 'doctor') {
      const loadDoctors = async () => {
        try {
          const { SupabaseDoctorService } = await import('../services/supabaseDoctorService');
          const doctors = await SupabaseDoctorService.getDoctors();
          setSupabaseDoctors(doctors);
        } catch (error) {
          console.error('UnifiedSidebar - Error loading doctors:', error);
        }
      };
      loadDoctors();
    }
  }, [userRole]);

  const getDoctorSpecialty = (): string | null => {
    if (userRole !== 'doctor') return null;
    if (user?.publicMetadata?.specialty) return user.publicMetadata.specialty as string;
    if (user?.id && supabaseDoctors.length > 0) {
      const doctor = supabaseDoctors.find((d: any) => d.user_id === user.id);
      if (doctor?.specialty) return doctor.specialty;
    }
    if (user?.id) {
      const doctors = getAvailableDoctorsSync();
      const doctor = doctors.find((d: any) => d.user_id === user.id);
      if (doctor?.specialty) return doctor.specialty;
    }
    if (user?.firstName && user?.lastName && supabaseDoctors.length > 0) {
      const fullName = `${user.firstName} ${user.lastName}`;
      const doctor = supabaseDoctors.find((d: any) => d.name === fullName);
      if (doctor?.specialty) return doctor.specialty;
    }
    return null;
  };

  const specialty = getDoctorSpecialty();
  const theme = getRoleTheme(userRole, specialty);

  const hasCustomGradient = (theme as any).background?.includes?.('gradient') || false;

  const getSidebarStyle = (): React.CSSProperties => {
    if (hasCustomGradient) return { background: (theme as any).background };
    return {};
  };

  const getSidebarClasses = () => {
    const base = 'w-64 text-white flex flex-col h-screen overflow-y-auto';
    if (hasCustomGradient) return base;
    return `${base} ${theme.background}`;
  };

  const handleLinkClick = () => {
    if (sidebarOpen && setSidebarOpen) setSidebarOpen(false);
  };

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(userRole || ''));

  const navItemClasses = (isActive: boolean) => {
    const base = 'flex items-center px-4 py-3 rounded-lg transition-all duration-200';
    if (isActive) return `${base} ${theme.activeBg} text-white shadow-lg`;
    return `${base} ${theme.textClass} ${theme.hoverBg} hover:text-white`;
  };

  return (
    <div className={getSidebarClasses()} style={getSidebarStyle()}>
      {/* Logo Section */}
      <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="flex items-center space-x-3">
          <img src="/Logo.svg" alt="Diamond Link" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-white">Diamond Link</h1>
            <p className={`text-xs ${theme.subTextClass}`}>{theme.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleLinkClick}
            className={navItemClasses(pathname === item.href || pathname.startsWith(item.href + '/'))}
          >
            {typeof item.icon === 'string' ? (
              <i className={`${item.icon} w-5 mr-3`}></i>
            ) : (
              <div className="w-5 mr-3">{item.icon}</div>
            )}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-sm font-medium text-white">
                {user?.firstName || 'Usuario'} {user?.lastName || ''}
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${theme.badgeClass}`}
                style={{ borderColor: 'rgba(255,255,255,0.6)' }}
              >
                <i className={`fas ${getRoleBadgeIcon(userRole)} mr-1`}></i>
                {theme.roleText}
              </span>
            </div>
            <p className={`text-xs ${theme.subTextClass}`}>
              {user?.emailAddresses?.[0]?.emailAddress || 'usuario@ejemplo.com'}
            </p>
            <div className="mt-2">
              <TutorialButton variant="menu" />
            </div>
          </div>
          <div className="relative">
            <HydratedUserButton
              showOnlineDot
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                  userButton: `${theme.buttonHover} rounded-lg transition-colors`,
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
