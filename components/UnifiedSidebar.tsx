'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import HydratedUserButton from './HydratedUserButton';
import { useTutorial } from '../contexts/TutorialContext';
import AnimatedUser from './AnimatedUser';
import AnimatedTratamientosCompletados from './AnimatedTratamientosCompletados';
import AnimatedUsers from './AnimatedUsers';
import AnimatedReport from './AnimatedReport';
import { DarkModeToggle } from './DarkModeToggle';
import { getAvailableDoctorsSync, Doctor } from '../config/doctors';
import { cn } from '@/lib/utils';
import { ChevronRight, GraduationCap } from 'lucide-react';

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
  { href: '/contactos', label: 'Contactos', icon: 'fas fa-address-book', roles: ['admin', 'doctor', 'staff'] },
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

interface UnifiedSidebarProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  /** When true the sidebar renders as an icon-only rail (expands on hover). */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function UnifiedSidebar({
  sidebarOpen,
  setSidebarOpen,
  collapsed = false,
  onToggleCollapsed,
}: UnifiedSidebarProps) {
  const [supabaseDoctors, setSupabaseDoctors] = useState<Doctor[]>([]);
  const pathname = usePathname();
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();
  const { startTutorial } = useTutorial();

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
  const footerRoleLabel =
    userRole === 'doctor' ? 'Doctor' :
    userRole === 'admin' ? 'Admin' :
    userRole === 'tech_support' ? 'Support' :
    userRole === 'staff' ? 'Staff' : 'Staff';

  const hasCustomGradient = (theme as any).background?.includes?.('gradient') || false;

  const getSidebarStyle = (): React.CSSProperties => {
    if (hasCustomGradient) return { background: (theme as any).background };
    return {};
  };

  const getSidebarClasses = () => {
    const base = 'text-white flex flex-col h-screen overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out group/sidebar';
    if (hasCustomGradient) return base;
    return `${base} ${theme.background}`;
  };

  const getSidebarWidth = () => (collapsed ? 'w-16 hover:w-64' : 'w-64');

  const handleLinkClick = () => {
    if (sidebarOpen && setSidebarOpen) setSidebarOpen(false);
  };

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(userRole || ''));

  const navItemClasses = (isActive: boolean) => {
    const base = `flex items-center rounded-lg transition-all duration-200 ${
      collapsed
        ? 'justify-center w-10 h-10 mx-auto group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:w-full group-hover/sidebar:px-4 group-hover/sidebar:py-2.5'
        : 'justify-start gap-3 w-full px-4 py-2.5'
    }`;
    if (isActive) return `${base} ${theme.activeBg} text-white shadow-lg`;
    return `${base} ${theme.textClass} ${theme.hoverBg} hover:text-white`;
  };

  const navLabelClasses = () =>
    cn(
      'text-sm font-medium whitespace-nowrap',
      collapsed ? 'hidden group-hover/sidebar:inline' : 'inline',
    );

  return (
    <div className={`${getSidebarClasses()} ${getSidebarWidth()}`} style={getSidebarStyle()}>
      {/* HEADER BLOCK - Translucent White Divider Line */}
      <div className="relative flex items-center justify-between px-4 py-4 border-b !border-white/20 w-full min-h-[64px]">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Logo */}
          <img src="/Logo.svg" alt="Diamond Link" className="w-8 h-8 flex-shrink-0" />

          {/* Brand Text (Hidden when collapsed) */}
          <div
            className={cn(
              'flex flex-col truncate transition-opacity duration-200',
              collapsed ? 'hidden group-hover/sidebar:flex' : 'flex',
            )}
          >
            <span className="font-bold text-white text-base leading-tight truncate">Diamond Link</span>
            <span className="text-xs text-white/80 truncate">{theme.subtitle}</span>
          </div>
        </div>

        {/* Collapse Toggle Button - ABSOLUTE RIGHT POSITIONED */}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors',
              collapsed && 'hidden group-hover/sidebar:block',
            )}
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                collapsed ? 'rotate-0' : '-rotate-180',
              )}
            />
          </button>
        )}
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
              <i className={`${item.icon} w-5 h-5 flex-shrink-0`}></i>
            ) : (
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">{item.icon}</div>
            )}
            <span className={navLabelClasses()}>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* FOOTER BLOCK - Single Top White Divider, Unclipped Avatar & Status Dot */}
      <div className="mt-auto border-t !border-white/20 p-3 w-full bg-white/5 flex flex-col gap-2.5">
        {/* User Profile Container */}
        <div className="flex items-center gap-3 w-full overflow-visible">

          {/* Avatar (overflow-visible to prevent status dot cutoff) */}
          <div className="relative flex-shrink-0 overflow-visible">
            <HydratedUserButton
              appearance={{
                elements: {
                  avatarBox: 'w-9 h-9 rounded-full border !border-white/30',
                  userButton: `${theme.buttonHover} rounded-full overflow-visible`,
                },
              }}
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 !border-purple-600 z-10" />
          </div>

          {/* Right Column: Name + Badge (Top) / Email (Bottom) */}
          <div
            className={cn(
              'flex flex-col min-w-0 flex-1 overflow-hidden transition-opacity duration-200 justify-center',
              collapsed ? 'hidden group-hover/sidebar:flex' : 'flex',
            )}
          >
            {/* Name + White-Bordered Badge */}
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs font-bold text-white truncate max-w-[110px]">
                {user?.firstName || 'Usuario'} {user?.lastName || ''}
              </span>
              <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full border !border-white/40 flex-shrink-0">
                {footerRoleLabel}
              </span>
            </div>

            {/* Email */}
            <span className="text-[10px] text-white/80 truncate w-full mt-0.5">
              {user?.emailAddresses?.[0]?.emailAddress || ''}
            </span>
          </div>

        </div>

        {/* Ver Tutorial Button - NO DIVIDER LINE ABOVE IT */}
        <div
          className={cn(
            'w-full',
            collapsed ? 'hidden group-hover/sidebar:block' : 'block',
          )}
        >
          <button
            onClick={startTutorial}
            className="flex items-center gap-2 text-xs text-white/90 hover:text-white w-full px-2 py-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Ver Tutorial</span>
          </button>
        </div>
      </div>
    </div>
  );
}
