'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import AnimatedReport from '@/components/AnimatedReport';
import AnimatedTratamientosCompletados from '@/components/AnimatedTratamientosCompletados';
import AnimatedUsers from '@/components/AnimatedUsers';

/**
 * Created once at module scope so React bails out of re-rendering the Lottie
 * animations when the active page changes.
 */
const REPORT_ICON = <AnimatedReport />;
const TRATAMIENTOS_ICON = <AnimatedTratamientosCompletados />;
const USERS_ICON = <AnimatedUsers />;

/**
 * The page title is the only part of the header that depends on the current
 * route, so it subscribes to the pathname on its own. The rest of the header
 * never re-renders when the user navigates.
 */
function PageHeaderTitle() {
  const pathname = usePathname();

  return (
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
            {REPORT_ICON}
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
      {pathname === '/dashboard' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-tachometer-alt mr-2"></i>
          Dashboard
        </h1>
      )}
      {pathname === '/tratamientos-completados' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <div className="w-6 h-6 mr-2 flex items-center justify-center">
            {TRATAMIENTOS_ICON}
          </div>
          Tratamientos Completados
        </h1>
      )}
      {pathname === '/tratamientos' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-tooth mr-2 text-teal-600"></i>
          Tratamientos
        </h1>
      )}
      {pathname === '/calendario' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-calendar-alt mr-2 text-teal-600"></i>
          Calendario
        </h1>
      )}
      {pathname === '/consentimientos' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-file-contract mr-2"></i>
          Consentimientos
        </h1>
      )}
      {pathname === '/patient-form' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-file-medical mr-2"></i>
          Historia Clínica
        </h1>
      )}
      {pathname === '/patient-preview' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-user mr-2"></i>
          Vista Previa del Paciente
        </h1>
      )}
      {pathname === '/presupuestos' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-file-invoice-dollar mr-2"></i>
          Presupuestos
        </h1>
      )}
      {pathname === '/chat' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-comments mr-2"></i>
          Mensajes
        </h1>
      )}
      {pathname === '/menu-navegacion' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-bars mr-2"></i>
          Menú de Navegación
        </h1>
      )}
      {pathname.startsWith('/admin/users') && (
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <div className="w-6 h-6 mr-2 flex items-center justify-center">
            {USERS_ICON}
          </div>
          User Administration
        </h1>
      )}
      {pathname.startsWith('/tech-support/users') && (
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <div className="w-6 h-6 mr-2 flex items-center justify-center">
            {USERS_ICON}
          </div>
          User Management
        </h1>
      )}
      {pathname.startsWith('/odontogram-pilot') && (
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-circle-notch mr-2 text-teal-600"></i>
          Odontograma
        </h1>
      )}
      {pathname === '/dental-ai-vision' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-eye mr-2 text-teal-600"></i>
          Dental AI Vision
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
          <i className="fas fa-stream mr-2"></i>
          Notas - Línea de Tiempo
        </h1>
      )}
      {pathname === '/patient-follow-up' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <span className="mr-2">📋</span>
          Seguimiento de Pacientes
        </h1>
      )}
      {pathname === '/inventario' && (
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          <i className="fas fa-warehouse mr-3 text-teal-600"></i>
          Inventario y Accountability
        </h1>
      )}
    </div>
  );
}

export default memo(PageHeaderTitle);
