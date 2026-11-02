'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import AnimatedBurger from '@/components/AnimatedBurger';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { HistoricalModeProvider } from '@/contexts/HistoricalModeContext';
import { BellNotificationProvider } from '@/contexts/BellNotificationContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { TutorialModal } from '@/components/TutorialModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TutorialButton } from '@/components/TutorialButton';
import AppHeader from '@/components/layout/AppHeader';
import { usePathname } from 'next/navigation';
import { NotificationListenerWrapper } from '@/components/notifications/NotificationListenerWrapper';
import AdminOverrideTimerGate from '@/components/AdminOverrideTimerGate';
import { useGlobalPreferences } from '@/hooks/useUserPreferences';
import {
  DEFAULT_SIDEBAR_COLLAPSED,
  readSavedSidebarCollapsed,
  resolveNextSidebarCollapsed,
  resolveSidebarCollapsed,
  shouldApplySavedSidebarCollapsed,
  shouldPersistSidebarCollapsed,
} from '@/lib/shell/sidebarCollapse';
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded: userLoaded } = useUser();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const {
    preferences: globalPrefs,
    updatePreferences: updateGlobalPrefs,
    loading: globalPrefsLoading,
  } = useGlobalPreferences();

  const isContactsPage = pathname.startsWith('/contactos') || pathname.includes('/contacts');

  // The rail starts collapsed and the choice is saved in global_preferences,
  // so it follows the user to their other devices. The Contacts page keeps its
  // own forced icon rail and only honours a manual toggle for that visit.
  const [preferredCollapsed, setPreferredCollapsed] = React.useState(
    DEFAULT_SIDEBAR_COLLAPSED,
  );
  const [contactsOverride, setContactsOverride] = React.useState<boolean | null>(null);

  const primaryCollapsed = resolveSidebarCollapsed({
    isContactsPage,
    preferredCollapsed,
    contactsOverride,
  });

  // Apply the saved preference once the preferences have loaded, unless the
  // user has already made a choice while the load was still in flight.
  const userChoseRail = React.useRef(false);
  React.useEffect(() => {
    if (!shouldApplySavedSidebarCollapsed(globalPrefsLoading, userChoseRail.current)) {
      return;
    }

    const saved = readSavedSidebarCollapsed(globalPrefs);
    if (saved !== null) {
      setPreferredCollapsed(saved);
    }
  }, [globalPrefs, globalPrefsLoading]);

  // Leaving the Contacts page drops its manual override.
  React.useEffect(() => {
    setContactsOverride(null);
  }, [isContactsPage]);

  const ready = userLoaded && !!user;
  const isAIChatPage = pathname === '/tech-support/ai-chat';

  // Stable identity across renders that do not touch the rail state, so the
  // memoized sidebar can bail out of re-rendering.
  const toggleCollapsed = React.useCallback(() => {
    if (!isContactsPage) {
      userChoseRail.current = true;
    }

    const next = resolveNextSidebarCollapsed({
      isContactsPage,
      preferredCollapsed,
      contactsOverride,
    });

    setPreferredCollapsed(next.preferredCollapsed);
    setContactsOverride(next.contactsOverride);

    if (!shouldPersistSidebarCollapsed(isContactsPage, !!user?.id)) return;

    void updateGlobalPrefs({ sidebarCollapsed: next.preferredCollapsed }).catch(() => {
      console.warn('Could not save the sidebar preference.');
    });
  }, [
    contactsOverride,
    isContactsPage,
    preferredCollapsed,
    setContactsOverride,
    setPreferredCollapsed,
    updateGlobalPrefs,
    user?.id,
  ]);

  const providers = (content: React.ReactNode) => (
    <TutorialProvider>
      <ThemeProvider>
        <HistoricalModeProvider>
          <NotificationProvider>
          <BellNotificationProvider>
            <NotificationListenerWrapper>
              {content}
            </NotificationListenerWrapper>
          </BellNotificationProvider>
          </NotificationProvider>
        </HistoricalModeProvider>
      </ThemeProvider>
    </TutorialProvider>
  );

  if (isAIChatPage) {
    return providers(children);
  }

  return providers(
    <>
    <div className="ambient flex h-screen w-full min-w-0 bg-slate-100 relative overflow-x-clip dark:bg-[#0a0e17] print:block print:h-auto print:overflow-visible">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`xl:hidden fixed top-4 left-4 z-50 p-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 active:scale-95 group portrait-hamburger print:hidden ${ready ? '' : 'hidden'}`}
        aria-label="Toggle menu"
      >
        <div className="w-6 h-6 flex items-center justify-center">
          <AnimatedBurger />
        </div>
      </button>

      {/* Mobile Overlay */}
      {ready && sidebarOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-40 portrait-overlay print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Unified Sidebar */}
      <div className={`
        transition-all duration-300 ${ready ? 'opacity-100' : 'opacity-0'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        xl:translate-x-0 fixed
        ${primaryCollapsed
          ? 'xl:absolute xl:left-0 xl:top-0 xl:h-full xl:z-40'
          : 'xl:relative xl:flex-shrink-0 xl:z-auto'}
        z-50
        print:hidden
      `}>
        <UnifiedSidebar
          setSidebarOpen={setSidebarOpen}
          collapsed={primaryCollapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </div>
                  {/* Main Content */}
                  <div className={`flex-1 xl:ml-0 min-h-0 overflow-auto flex flex-col w-full min-w-0 transition-all duration-300 ${primaryCollapsed ? 'xl:pl-16' : ''} print:overflow-visible print:h-auto`}>
                    {/* Header with User Info */}
                    <AppHeader />
                   {/* Page Content */}
                   <div className="flex-1 min-h-0 overflow-auto w-full min-w-0 print:overflow-visible print:h-auto">
                     <ErrorBoundary>
                       {children}
                     </ErrorBoundary>
                   </div>
                </div>
                
                {/* Tutorial Modal */}
                {ready && <TutorialModal />}
                <AdminOverrideTimerGate />
              </div>
    <style>{`
      @media (orientation: portrait) {
        .portrait-sidebar-closed {
          transform: translateX(-100%) !important;
        }
        .portrait-sidebar-open {
          transform: translateX(0) !important;
        }
        .portrait-hamburger {
          display: flex !important;
        }
        .portrait-overlay {
          display: block !important;
        }
      }
    `}</style>
    </>
  );  
}
