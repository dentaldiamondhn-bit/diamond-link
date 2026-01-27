import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/api/promociones',
  '/api/tratamientos',
  '/api/patients',
  '/api/get-current-user',
  '/api/google-calendar',
  '/api/validate-id',
  '/api/migrate-historical-settings',
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  
  // Allow all API routes to pass through without authentication
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes - check authentication
  const authResult = await auth();
  const { userId } = authResult;
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Declare userRole variable
  let userRole: string;
  
  // TEMPORARY DEBUG: Force admin for specific user ID
  if (userId === 'user_37GsUyGI3pcCRZy17WPN8YpzgsO') {
    userRole = 'admin';
  } else {
    // Get user role from metadata
    userRole = (authResult.sessionClaims?.metadata as any)?.role || 
                   (authResult.sessionClaims?.unsafeMetadata as any)?.role || 
                   'staff';
  }
  
  // Admin has access to everything
  if (userRole === 'admin') {
    return NextResponse.next();
  }
  
  // Define permissions for each role (only for non-admin users)
  const rolePermissions = {
    doctor: {
      '/auth/dashboard': true,
      '/auth/pacientes': true,
      '/auth/patient-form': true,
      '/auth/patient-preview': true,
      '/auth/patient-preview/': true,
      '/auth/odontogram': true,
      '/auth/tratamientos': true,
      '/auth/tratamientos-completados': true,
      '/auth/doctores': true,
      '/auth/consentimientos': true,
      '/auth/calendario': true,
      '/auth/menu-navegacion': true,
    },
    staff: {
      '/auth/dashboard': true,
      '/auth/pacientes': true,
      '/auth/patient-form': true,
      '/auth/patient-preview': true,
      '/auth/patient-preview/': true,
      '/auth/odontogram': true,
      '/auth/tratamientos': true,
      '/auth/tratamientos-completados': true,
      '/auth/doctores': true,
      '/auth/consentimientos': true,
      '/auth/calendario': true,
      '/auth/menu-navegacion': true,
    },
  };

  const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || {};
  
  // Check exact match first
  if (permissions[pathname] !== undefined) {
    if (permissions[pathname]) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(new URL('/auth/menu-navegacion', req.url));
    }
  }
  
  // Check prefix matches
  for (const [route, permitted] of Object.entries(permissions)) {
    if (pathname.startsWith(route + '/') && permitted === true) {
      return NextResponse.next();
    }
  }

  // If no permission found, deny access
  return NextResponse.redirect(new URL('/auth/menu-navegacion', req.url));
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/auth/:path*',
  ],
};