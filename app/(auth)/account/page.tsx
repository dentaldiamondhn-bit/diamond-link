'use client';

import React from 'react';
import { useClerk, useUser } from '@clerk/nextjs';
import { UserProfile } from '@clerk/nextjs';
import { FiLogOut, FiMail, FiShield, FiUser } from 'react-icons/fi';
import HydratedUserButton from '@/components/HydratedUserButton';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Doctor',
  staff: 'Staff',
  tech_support: 'Soporte técnico',
};

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  doctor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  staff: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  tech_support: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { userRole } = useRoleBasedAccess();

  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const roleBadge = ROLE_BADGES[userRole] || ROLE_BADGES.staff;

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi Cuenta</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Perfil, correo de acceso y preferencias de esta cuenta.
          </p>
        </header>

        {/* Identidad */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <HydratedUserButton
              placeholderClassName="w-12 h-12"
              appearance={{ elements: { avatarBox: 'w-12 h-12 rounded-full' } }}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                <FiUser className="h-4 w-4 shrink-0 text-gray-400" />
                {isLoaded ? user?.fullName || 'Usuario' : 'Cargando…'}
              </p>
              {user?.primaryEmailAddress?.emailAddress && (
                <p className="mt-0.5 flex items-center gap-2 truncate text-sm text-gray-500 dark:text-gray-400">
                  <FiMail className="h-4 w-4 shrink-0 text-gray-400" />
                  {user.primaryEmailAddress.emailAddress}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${roleBadge}`}>{roleLabel}</span>
                {user?.id && (
                  <span className="flex items-center gap-1 truncate font-mono text-xs text-gray-400 dark:text-gray-500">
                    <FiShield className="h-3 w-3 shrink-0" />
                    {user.id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Perfil de Clerk: nombre, correo, contraseña, sesiones */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Datos de acceso
          </h2>
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full',
                cardBox: 'shadow-none bg-transparent w-full',
                profileSectionTitle: 'text-sm font-semibold text-gray-700 dark:text-gray-200',
                profileSectionContent: 'text-sm text-gray-600 dark:text-gray-300',
                label: 'text-xs text-gray-500 dark:text-gray-400',
                fieldInput: 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md',
                formFieldInput: 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md',
                formButtonPrimary: 'bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-500',
                formButtonReset: 'bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-500',
                profileSectionPrimaryButton:
                  'bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-500',
                accordionTrigger: 'text-sm text-gray-600 dark:text-gray-300',
                badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
              },
            }}
          />
        </section>

        {/* Preferencias y sesión */}
        <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Apariencia</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cambia entre el tema claro y oscuro.</p>
          </div>
          <DarkModeToggle />
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sesión</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cierra la sesión en este dispositivo.</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: '/sign-in' })}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            <FiLogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </section>
      </div>
    </div>
  );
}
