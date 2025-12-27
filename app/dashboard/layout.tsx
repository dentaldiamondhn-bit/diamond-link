// app/dashboard/layout.tsx
'use client';

import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { DarkModeToggle } from "../../components/DarkModeToggle";

const menuItems = [
  { href: "/search", icon: "fa-search", label: "Buscar Expedientes" },
  { href: "/patient-form", icon: "fa-file-medical", label: "Nueva Historia Clínica" },
  { href: "/account", icon: "fa-user-cog", label: "Mi Cuenta" },
  { href: "/pacientes", icon: "fa-users", label: "Pacientes" },
  { href: "/dashboard/doctors", icon: "fa-user-md", label: "Doctores" },
  { href: "/dashboard/appointments", icon: "fa-calendar-check", label: "Citas" },
  { href: "/dashboard/medical-records", icon: "fa-notes-medical", label: "Historias Clínicas" },
  { href: "/dashboard/odontogram", icon: "fa-tooth", label: "Odontograma" },
  { href: "/dashboard/periodontal", icon: "fa-teeth", label: "Estudio Periodontal" },
  { href: "/dashboard/budgets", icon: "fa-file-invoice-dollar", label: "Presupuestos" },
  { href: "/dashboard/payments", icon: "fa-credit-card", label: "Pagos" },
  { href: "/dashboard/income", icon: "fa-chart-line", label: "Ingresos" },
  { href: "/dashboard/users", icon: "fa-users-cog", label: "Usuarios" },
  { href: "/dashboard/consents", icon: "fa-file-signature", label: "Consentimientos" },
  { href: "/dashboard/reports", icon: "fa-chart-bar", label: "Reportes" },
  { href: "/dashboard/settings", icon: "fa-cog", label: "Configuración" },
  { href: "/dashboard/profile", icon: "fa-user", label: "Mi Perfil" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { user } = useUser();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } text-white transition-all duration-300 ease-in-out flex flex-col fixed top-0 left-0 bottom-0`}
        style={{
          background: 'linear-gradient(135deg, #0a4d4a 0%, #0d6d69 100%) !important',
          height: '100vh',
          zIndex: 40
        }}
      >
        <div className="p-4 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center space-x-2">
              <img
                src="/Logo.svg"
                alt="Clínica Dental"
                className="h-10 w-auto"
              />
              <span className="font-bold text-xl">Clínica Dental</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <i className={`fas fa-${isSidebarOpen ? "times" : "bars"}`}></i>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center p-3 rounded-lg ${
                    pathname === item.href || 
                    (item.href === "/patient-form" && pathname === "/patient-form") ||
                    (item.href === "/account" && pathname === "/account") ||
                    (item.href === "/pacientes" && pathname === "/patients")
                      ? "bg-white/10"
                      : "hover:bg-white/5"
                  }`}
                >
                  <i className={`fas ${item.icon} w-6 text-center`}></i>
                  {isSidebarOpen && <span className="ml-3">{item.label}</span>}
                </Link>
              </li>
            ))}
            <li>
              <UserButton afterSignOutUrl="/" signInUrl="/sign-in" />
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col ${
          isSidebarOpen ? "ml-64" : "ml-20"
        } transition-all duration-300`}
      >
        {/* Top Bar */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <i className="fas fa-bars"></i>
              </button>
              <h1 className="text-xl font-semibold text-gray-800">
                {pathname === "/patient-form" 
                  ? "Nueva Historia Clínica" 
                  : pathname === "/account"
                  ? "Mi Cuenta"
                  : pathname === "/patients"
                  ? "Pacientes"
                  : pathname === "/search"
                  ? "Buscar Expedientes"
                  : menuItems.find((item) => item.href === pathname)?.label || "Dashboard"
                }
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium">
                  {user?.fullName || "Usuario"}
                </p>
                <p className="text-sm text-gray-500">
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

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}