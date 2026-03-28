'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function AccessDeniedAlert() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Remove the access_denied parameter after showing the message
    if (searchParams.get('access_denied')) {
      const timer = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('access_denied');
        window.history.replaceState({}, '', url.toString());
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!searchParams.get('access_denied')) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Acceso Denegado
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              No tienes permisos para acceder a esta página. Por favor contacta al administrador si necesitas acceso.
            </p>
          </div>
          <div className="mt-3">
            <button
              type="button"
              className="text-sm font-medium text-red-600 hover:text-red-500 underline"
              onClick={() => router.push('/dashboard')}
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              className="inline-flex rounded-md p-1.5 text-red-400 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('access_denied');
                window.history.replaceState({}, '', url.toString());
              }}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
