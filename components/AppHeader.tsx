'use client';

import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
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
    <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900">
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
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            {title}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2">
              <RoleBadge role={userRole} />
              <p className="font-medium text-gray-900 dark:text-white">
                {user?.fullName || "Usuario"}
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user?.primaryEmailAddress?.emailAddress || ""}
            </p>
          </div>
          <DarkModeToggle />
          <div className="relative">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </div>
    </header>
  );
}
