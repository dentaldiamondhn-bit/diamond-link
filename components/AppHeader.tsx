'use client';

import { useUser } from "@clerk/nextjs";
import HydratedUserButton from "./HydratedUserButton";
import { DarkModeToggle } from "./DarkModeToggle";
import { RoleBadge } from "./RoleBadge";
import { useUserRole } from "@/hooks/useUserRole";

interface AppHeaderProps {
  title: string;
  showSidebarToggle?: boolean;
  onSidebarToggle?: () => void;
  isMobile?: boolean;
}

export function AppHeader({ 
  title, 
  showSidebarToggle = false, 
  onSidebarToggle,
  isMobile = false 
}: AppHeaderProps) {
  const { user } = useUser();
  const { userRole } = useUserRole();

  return (
    <header className="bg-white backdrop-blur-xl border-b border-slate-200 text-slate-800 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-b dark:border-white/10 dark:text-slate-100 transition-colors duration-300">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {showSidebarToggle && onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className={`${isMobile ? 'block' : 'md:hidden'} p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700`}
            >
              <i className="fas fa-bars"></i>
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2">
              <RoleBadge role={userRole} />
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {user?.fullName || "Usuario"}
              </p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {user?.primaryEmailAddress?.emailAddress || ""}
            </p>
          </div>
          <DarkModeToggle />
          <div className="relative">
            <HydratedUserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </div>
    </header>
  );
}
