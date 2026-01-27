'use client';

import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '../../hooks/useRoleBasedAccess';
import { UserButton } from '@clerk/nextjs';
import { DarkModeToggle } from '../../components/DarkModeToggle';
import { NotificationDropdown } from '../../components/NotificationDropdown';
import AdminSidebar from '../../components/AdminSidebar';
import DoctorSidebar from '../../components/DoctorSidebar';
import StaffSidebar from '../../components/StaffSidebar';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { HistoricalModeProvider } from '../../contexts/HistoricalModeContext';
import { BellNotificationProvider } from '../../contexts/BellNotificationContext';
import { EventModalProvider, useEventModal } from '../../contexts/EventModalContext';
import { EventModal } from '../../components/calendar/EventModal';
import { TutorialProvider } from '../../contexts/TutorialContext';
import { TutorialModal } from '../../components/TutorialModal';
import { TutorialButton } from '../../components/TutorialButton';

// Separate component for modal content
function EventModalWrapper() {
  const { isEventModalOpen, selectedEvent, closeEventModal } = useEventModal();
  
  return (
    <>
      {isEventModalOpen && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={closeEventModal}
          onSave={async (eventData) => {
            // TODO: Implement save functionality
            console.log('Saving event:', eventData);
          }}
          onDelete={async (eventId) => {
            // TODO: Implement delete functionality
            console.log('Deleting event:', eventId);
          }}
        />
      )}
    </>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();

  if (!user) {
    return <div>Loading...</div>;
  }

  // Role badge colors and styles
  const getRoleBadgeInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          icon: 'fas fa-crown',
          label: 'Administrador'
        };
      case 'doctor':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: 'fas fa-user-md',
          label: 'Doctor'
        };
      case 'staff':
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: 'fas fa-user',
          label: 'Staff'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: 'fas fa-question',
          label: 'Desconocido'
        };
    }
  };

  const roleBadgeInfo = getRoleBadgeInfo(userRole || 'staff');

  return (
    <TutorialProvider>
      <ThemeProvider>
        <HistoricalModeProvider>
          <BellNotificationProvider>
            <EventModalProvider>
              <div className="flex h-screen bg-gray-100">
          {/* Role-based Sidebar */}
          <div className="flex-shrink-0">
            {userRole === 'admin' && <AdminSidebar />}
            {userRole === 'doctor' && <DoctorSidebar />}
            {userRole === 'staff' && <StaffSidebar />}
            
            {/* Fallback sidebar if role detection fails */}
            {(!userRole || !['admin', 'doctor', 'staff'].includes(userRole)) && (
              <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-exclamation-triangle text-white"></i>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">Unknown Role</h1>
                      <p className="text-xs text-gray-400">{userRole || 'undefined'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Main Content */}
          <div className="flex-1 overflow-auto flex flex-col">
            {/* Header with User Info */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left side - Empty or could add logo/title */}
                <div className="flex items-center">
                  {/* Could add app logo or title here */}
                </div>
                
                {/* Right side - User Info and Actions */}
                <div className="flex items-center space-x-4">
                  {/* Header Actions - Left of User Info */}
                  <div className="flex items-center space-x-3">
                    {/* Tutorial Button */}
                    <TutorialButton />
                    
                    {/* Dark Mode Toggle */}
                    <DarkModeToggle />
                    
                    {/* Notifications */}
                    <NotificationDropdown />
                  </div>
                  
                  {/* User Info */}
                  <div className="flex items-center space-x-3">
                    {/* User Name and Email */}
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {user?.firstName || 'Usuario'} {user?.lastName || ''}
                        </h2>
                        {/* Role Badge */}
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeInfo.bgColor} ${roleBadgeInfo.textColor} ${roleBadgeInfo.borderColor} border`}>
                          <i className={`${roleBadgeInfo.icon} mr-1`}></i>
                          {roleBadgeInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {user?.emailAddresses?.[0]?.emailAddress || 'usuario@ejemplo.com'}
                      </p>
                    </div>
                    
                    {/* Clerk User Avatar */}
                    <div className="relative">
                      <UserButton 
                        appearance={{
                          elements: {
                            avatarBox: "w-10 h-10 shadow-md",
                            userButton: "hover:bg-gray-100 rounded-lg transition-colors"
                          }
                        }}
                      />
                      {/* Online indicator */}
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </header>
            
            {/* Page Content */}
            <div className="flex-1 p-6 overflow-auto">
              {children}
            </div>
          </div>
          
          {/* Event Modal */}
          <EventModalWrapper />
          
          {/* Tutorial Modal */}
          <TutorialModal />
        </div>
        </EventModalProvider>
        </BellNotificationProvider>
      </HistoricalModeProvider>
    </ThemeProvider>
    </TutorialProvider>
  );
}
