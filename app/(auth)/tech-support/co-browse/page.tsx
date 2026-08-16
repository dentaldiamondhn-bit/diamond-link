'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { hasOverrideRole } from '@/lib/adminAuth';

/**
 * Entry point for tech-support agents: paste the session link that the
 * client's Soporte Remoto widget generated (or just the session code) and
 * jump straight into the live co-browsing view.
 */
export default function CoBrowseJoinPage() {
  const router = useRouter();
  const { sessionClaims, userId } = useAuth();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isPrivileged = hasOverrideRole(sessionClaims, userId);

  const extractSessionId = (raw: string): string | null => {
    const value = raw.trim().split(/[\s,;]+/).pop() || raw.trim();
    // Accept a full co-browse URL or a bare UUID.
    const match = value.match(
      /(?:tech-support\/co-browse\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    );
    return match ? match[1].toLowerCase() : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const sessionId = extractSessionId(input);
    if (!sessionId) {
      setError('No se pudo reconocer el enlace. Pega el enlace completo que compartió el usuario (incluye /tech-support/co-browse/… o el código de sesión).');
      return;
    }
    router.push(`/tech-support/co-browse/${sessionId}`);
  };

  if (!isPrivileged) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="fas fa-user-shield text-5xl text-gray-300" />
          <p className="mt-4 font-semibold text-gray-700">Acceso restringido</p>
          <p className="text-sm text-gray-500">
            Solo el personal de soporte técnico puede usar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-gray-200 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md">
              <i className="fas fa-tower-broadcast text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Unirse a una sesión de Soporte Remoto</h1>
              <p className="text-sm text-gray-500">
                El usuario inicia el soporte desde su widget «Soporte Remoto» y comparte el enlace con
                el número de sesión. Pégalo aquí para entrar en su pantalla.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="session-link" className="block text-sm font-medium text-gray-700">
              Enlace o código de sesión
            </label>
            <input
              id="session-link"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://tudominio.com/tech-support/co-browse/262eec17-4b99-4c4b-8d5f-1f6da44f2b8e"
              autoFocus
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                <i className="fas fa-exclamation-triangle mr-1.5" />
                {error}
              </p>
            )}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-teal-700 hover:to-cyan-700"
            >
              <i className="fas fa-eye" />
              Entrar a la sesión
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
            <p className="mb-1 font-semibold text-gray-600">¿Cómo obtiene el enlace el usuario?</p>
            <p>
              1. En su pantalla hace clic en <span className="font-semibold">Soporte Remoto</span> (abajo a la derecha).
              <br />
              2. En el panel toca <span className="font-semibold">Compartir pantalla → Iniciar sesión en vivo</span>.
              <br />
              3. Copia el enlace de sesión y te lo envía por chat/correo. Pega aquí y entra.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}