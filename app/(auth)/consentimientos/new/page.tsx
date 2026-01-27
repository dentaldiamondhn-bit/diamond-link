'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function NewConsentimientoRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const pacienteId = searchParams.get('id');
    
    if (pacienteId) {
      // Redirect to the consentimientos/[id] page with the patient ID
      // This will trigger the creation flow since no existing consentimiento will be found
      router.replace(`/consentimientos/${pacienteId}?id=${pacienteId}`);
    } else {
      // If no patient ID, redirect to consentimientos list
      router.replace('/consentimientos');
    }
  }, [router, searchParams]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-gray-600 dark:text-gray-400 text-xl flex items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
        Redirigiendo a creación de consentimiento...
      </div>
    </div>
  );
}

export default function NewConsentimientoRedirect() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 text-xl flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
          Cargando...
        </div>
      </div>
    }>
      <NewConsentimientoRedirectContent />
    </Suspense>
  );
}
