'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import HydratedUserButton from './HydratedUserButton';
import { useTutorial } from '../contexts/TutorialContext';
import { getAvailableDoctorsSync, Doctor } from '../config/doctors';
import { cn } from '@/lib/utils';
import { ChevronRight, GraduationCap } from 'lucide-react';
import SidebarNavigation from '@/components/layout/SidebarNavigation';

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
  setSidebarOpen?: (open: boolean) => void;
  /** When true the sidebar renders as an icon-only rail (expands on hover). */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

/** Created once so Clerk's UserButton keeps a stable appearance prop. */
const USER_BUTTON_APPEARANCE = {
  elements: {
    avatarBox: 'w-9 h-9 rounded-full border !border-white/30',
    userButton: 'rounded-full overflow-visible',
  },
};

function UnifiedSidebar({
  setSidebarOpen,
  collapsed = false,
  onToggleCollapsed,
}: UnifiedSidebarProps) {
  const [supabaseDoctors, setSupabaseDoctors] = useState<Doctor[]>([]);
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
  const theme = useMemo(() => getRoleTheme(userRole, specialty), [userRole, specialty]);
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

  // Close the mobile drawer after a navigation. Written as a functional update
  // so the callback identity stays stable and the memoized nav list can bail out.
  const handleLinkClick = useCallback(() => {
    setSidebarOpen?.(false);
  }, [setSidebarOpen]);

  // The appearance prop drives Clerk's UserButton, so it must keep a stable
  // identity or the button re-renders on every navigation.
  const userButtonAppearance = useMemo(() => ({
    elements: {
      ...USER_BUTTON_APPEARANCE.elements,
      userButton: `${theme.buttonHover} ${USER_BUTTON_APPEARANCE.elements.userButton}`,
    },
  }), [theme.buttonHover]);

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
      <SidebarNavigation
        collapsed={collapsed}
        theme={theme}
        onNavigate={handleLinkClick}
      />

      {/* FOOTER BLOCK - Single Top White Divider, Unclipped Avatar & Status Dot */}
      <div className="mt-auto border-t !border-white/20 p-3 w-full bg-white/5 flex flex-col gap-2.5">
        {/* User Profile Container */}
        <div className="flex items-center gap-3 w-full overflow-visible">

          {/* Avatar (overflow-visible to prevent status dot cutoff) */}
          <div className="relative flex-shrink-0 overflow-visible">
            <HydratedUserButton appearance={userButtonAppearance} />
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

export default memo(UnifiedSidebar);
