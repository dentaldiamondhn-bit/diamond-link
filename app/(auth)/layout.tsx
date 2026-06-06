'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { UserButton } from '@clerk/nextjs';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import AdminSidebar from '@/components/AdminSidebar';
import DoctorSidebar from '@/components/DoctorSidebar';
import StaffSidebar from '@/components/StaffSidebar';
import TechSupportSidebar from '@/components/TechSupportSidebar';
import AnimatedReport from '@/components/AnimatedReport';
import AnimatedBurger from '@/components/AnimatedBurger';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { HistoricalModeProvider } from '@/contexts/HistoricalModeContext';
import { BellNotificationProvider } from '@/contexts/BellNotificationContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { TutorialModal } from '@/components/TutorialModal';
import { TutorialButton } from '@/components/TutorialButton';
import AnimatedTratamientosCompletados from '@/components/AnimatedTratamientosCompletados';
import AnimatedFolder from '@/components/AnimatedFolder';
import AnimatedUsers from '@/components/AnimatedUsers';
import { usePathname } from 'next/navigation';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import { NotificationListenerWrapper } from '@/components/notifications/NotificationListenerWrapper';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded: userLoaded } = useUser();
  const { userRole } = useRoleBasedAccess();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Always wrap with providers, but conditionally render the full layout
  // This ensures context providers are available for all pages
  if (!userLoaded || !user) {
    return (
      <TutorialProvider>
        <ThemeProvider>
          <HistoricalModeProvider>
            <BellNotificationProvider>
              <NotificationListenerWrapper>
                {children}
              </NotificationListenerWrapper>
            </BellNotificationProvider>
          </HistoricalModeProvider>
        </ThemeProvider>
      </TutorialProvider>
    );
  }

  // Role badge colors and styles
  const getRoleBadgeInfo = (role: string) => {
    switch (role) {
      case 'tech_support':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: 'fas fa-tools',
          label: 'Tech Support'
        };
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
            <NotificationListenerWrapper>
              <div className="flex h-screen bg-gray-100 relative">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 active:scale-95 group"
                  aria-label="Toggle menu"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <AnimatedBurger />
                  </div>
                </button>

                {/* Mobile Overlay */}
                {sidebarOpen && (
                  <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setSidebarOpen(false)}
                  />
                )}

                {/* Role-based Sidebar */}
                <div className={`
                  ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                  lg:translate-x-0 fixed lg:relative lg:flex-shrink-0 
                  transition-transform duration-300 ease-in-out z-50 lg:z-auto
                `}>
                  <div className="w-64 lg:w-64 bg-gray-900 text-white flex flex-col h-screen overflow-y-auto">
                    {userRole === 'tech_support' && <TechSupportSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                    {userRole === 'admin' && <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                    {userRole === 'doctor' && <DoctorSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                    {userRole === 'staff' && <StaffSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                    
                    {/* Fallback sidebar if role detection fails */}
                    {(!userRole || !['tech_support', 'admin', 'doctor', 'staff'].includes(userRole)) && (
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
                </div>
                {/* Main Content */}
                <div className="flex-1 lg:ml-0 overflow-auto flex flex-col">
                  {/* Header with User Info */}
                  <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                      {/* Left side - Page Title */}
                      <div className="flex items-center">
                        {/* Tech Support Pages */}
                        {pathname === '/tech-support/dashboard' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-tachometer-alt mr-2"></i>
                            Dashboard de Soporte Técnico
                          </h1>
                        )}
                        {pathname === '/tickets' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-ticket-alt mr-2"></i>
                            Tickets
                          </h1>
                        )}
                        {pathname === '/tech-support/tickets' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-ticket-alt mr-2"></i>
                            Tickets de Soporte
                          </h1>
                        )}
                        {pathname === '/tech-support/system-logs' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-file-alt mr-2"></i>
                            Logs del Sistema
                          </h1>
                        )}
                        {pathname === '/tech-support/system-settings' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-cogs mr-2"></i>
                            Configuración del Sistema
                          </h1>
                        )}
                        {pathname === '/tech-support/access-portal' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-th-large mr-2"></i>
                            Portal de Acceso
                          </h1>
                        )}
                        {pathname === '/tech-support/terminal' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-terminal mr-2"></i>
                            Terminal
                          </h1>
                        )}
                        {pathname === '/tech-support/code-runner' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-code mr-2"></i>
                            Code Runner
                          </h1>
                        )}
                        {pathname === '/tech-support/analytics' && (
                          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                            <i className="fas fa-chart-line mr-2"></i>
                            Analytics del Sistema
                          </h1>
                        )}
                        
                         {/* Existing Admin Pages */}
                         {pathname === '/reports' && (
                           <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                             <div className="w-6 h-6 mr-3 flex items-center justify-center">
                               <AnimatedReport />
                             </div>
                             Reportes y Análisis
                           </h1>
                         )}
                         {pathname === '/pacientes' && (
                           <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-user-injured mr-2"></i>
                             Todos los Pacientes
                           </h1>
                         )}
                         {pathname === '/tratamientos' && (
                           <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-tooth mr-2"></i>
                             Tratamientos
                           </h1>
                         )}
                         {pathname === '/historia-clinica-ortodoncia' && (
                           <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-tooth mr-2"></i>
                             Historia Ortodoncia
                           </h1>
                         )}
                         {pathname === '/doctores' && (
                           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-user-md mr-2"></i>
                             Gestión de Doctores
                           </h1>
                         )}
                         {pathname === '/estudio-periodontal' && (
                           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-teeth mr-2 text-teal-600"></i>
                             Estudio Periodontal
                           </h1>
                         )}
{pathname === '/calendario' && (
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                              <i className="fas fa-calendar-alt mr-2 text-blue-600"></i>
                              Calendario
                            </h1>
                          )}
                          {pathname === '/tratamientos' && (
                           <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-tooth mr-2"></i>
                             Tratamientos
                           </h1>
                         )}
                         {pathname === '/historia-clinica-ortodoncia' && (
                           <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-tooth mr-2"></i>
                             Historia Ortodoncia
                           </h1>
                         )}
                         {pathname === '/doctores' && (
                           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-user-md mr-2"></i>
                             Gestión de Doctores
                           </h1>
                         )}
                         {pathname === '/estudio-periodontal' && (
                           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                             <i className="fas fa-teeth mr-2 text-teal-600"></i>
                             Estudio Periodontal
                           </h1>
                         )}
{pathname === '/calendario' && (
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                              <i className="fas fa-calendar-alt mr-2 text-blue-600"></i>
                              Calendario
                            </h1>
                          )}
                          {pathname.startsWith('/admin/users') && (
                           <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                             <div className="w-6 h-6 mr-2 flex items-center justify-center">
                               <AnimatedUsers />
                             </div>
                             User Administration
                           </h1>
                         )}
                         {pathname.startsWith('/tech-support/users') && (
                           <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                             <div className="w-6 h-6 mr-2 flex items-center justify-center">
                               <AnimatedUsers />
                             </div>
                             User Management
                           </h1>
                         )}
                         {pathname.startsWith('/odontogram-test') && (
                           <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                             <i className="fas fa-tooth mr-2 text-teal-600"></i>
                             Odontogram Testing
                           </h1>
                         )}
                         {pathname.startsWith('/odontogram-pilot') && (
                           <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                             <i className="fas fa-circle-notch mr-2 text-teal-600"></i>
                             Odontograma Pilot
                           </h1>
                         )}
                         {(pathname === '/xray-viewer' || pathname.startsWith('/xray-viewer/')) && (
                           <div className="flex items-center">
                             <i className="fas fa-x-ray text-2xl text-teal-600 mr-3"></i>
                             <div>
                               <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                                 Visor de Rayos X
                               </h1>
                               <p className="text-xs text-gray-600 dark:text-gray-400">
                                 Gestiona y visualiza estudios radiográficos de pacientes
                               </p>
                             </div>
                           </div>
                         )}
                         {pathname === '/notas-linea-de-tiempo' && (
                           <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                             <i className="fas fa-stream mr-2 text-teal-600"></i>
                             Notas - Línea de Tiempo
                           </h1>
                         )}
                      </div>
                      
                      {/* Right side - User Info and Actions */}
                      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                        {/* Header Actions - Left of User Info */}
                        <div className="hidden sm:flex items-center space-x-3">
                          {/* Dark Mode Toggle */}
                          <DarkModeToggle />
                          
                          {/* Notifications */}
                          <NotificationDropdown />
                        </div>
                        
                        {/* Mobile Actions */}
                        <div className="flex sm:hidden items-center space-x-2">
                          <DarkModeToggle />
                          <NotificationDropdown />
                        </div>
                        
                        {/* User Info */}
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          {/* User Name and Email - Hidden on mobile */}
                          <div className="hidden sm:block text-right">
                            <div className="flex items-center space-x-2">
                              <h2 className="text-sm lg:text-lg font-semibold text-gray-900 truncate max-w-[100px] lg:max-w-none">
                                {user?.firstName || 'Usuario'} {user?.lastName || ''}
                              </h2>
                              {/* Role Badge */}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeInfo.bgColor} ${roleBadgeInfo.textColor} ${roleBadgeInfo.borderColor} border`}>
                                <i className={`${roleBadgeInfo.icon} mr-1`}></i>
                                {roleBadgeInfo.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate max-w-[120px] lg:max-w-none">
                              {user?.emailAddresses?.[0]?.emailAddress || 'usuario@ejemplo.com'}
                            </p>
                          </div>
                          
                          {/* Clerk User Avatar */}
                          <div className="relative flex-shrink-0">
                            <UserButton 
                              appearance={{
                                elements: {
                                  avatarBox: "w-8 h-8 lg:w-10 lg:h-10 shadow-md",
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
                
                {/* Tutorial Modal */}
                <TutorialModal />
              </div>
            </NotificationListenerWrapper>
          </BellNotificationProvider>
        </HistoricalModeProvider>
      </ThemeProvider>
    </TutorialProvider>
  );  
}
