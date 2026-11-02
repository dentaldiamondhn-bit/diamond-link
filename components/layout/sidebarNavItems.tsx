import AnimatedTratamientosCompletados from '@/components/AnimatedTratamientosCompletados';
import AnimatedUsers from '@/components/AnimatedUsers';
import AnimatedReport from '@/components/AnimatedReport';

export interface NavItem {
  href: string;
  icon: string | React.ReactNode;
  label: string;
  roles: string[];
}

/**
 * The icons are created once at module scope so React can bail out of
 * re-rendering the Lottie animations when the active link changes.
 */
export const NAV_ITEMS: NavItem[] = [
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
