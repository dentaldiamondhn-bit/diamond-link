'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { NAV_ITEMS } from '@/components/layout/sidebarNavItems';

export interface SidebarNavTheme {
  activeBg: string;
  hoverBg: string;
  textClass: string;
}

interface SidebarNavigationProps {
  collapsed: boolean;
  theme: SidebarNavTheme;
  onNavigate?: () => void;
}

/**
 * The link list is the only part of the sidebar that depends on the current
 * route, so it subscribes to the pathname on its own. The rest of the sidebar
 * never re-renders when the user navigates.
 */
function SidebarNavigation({ collapsed, theme, onNavigate }: SidebarNavigationProps) {
  const pathname = usePathname();
  const { userRole } = useRoleBasedAccess();

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter(item => item.roles.includes(userRole || '')),
    [userRole],
  );

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
    <nav className="flex-1 p-4 space-y-2">
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
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
  );
}

export default memo(SidebarNavigation);
