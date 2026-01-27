import { clerkMiddleware, auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  
  // Handle public routes FIRST - before any auth checks
  const publicRoutes = [
    '/',
    '/sign-in',
    '/sign-in(.*)',
    '/api/promociones',
    '/api/tratamientos',
    '/api/patients',
    '/api/get-current-user',
    '/api/google-calendar',
    '/api/validate-id',
    '/api/migrate-historical-settings',
  ];
  
  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(route => {
    if (route.includes('*')) {
      const regex = new RegExp(route.replace('*', '.*'));
      return regex.test(pathname);
    }
    return pathname === route;
  });
  
  if (isPublicRoute) {
    console.log('PUBLIC ROUTE - ALLOWING');
    return NextResponse.next();
  }
  
  // Allow all API routes to pass through without authentication
  if (pathname.startsWith('/api')) {
    console.log('API ROUTE - ALLOWING');
    return NextResponse.next();
  }
  
  // Protect all other routes - check authentication
  const authResult = await auth();
  const { userId } = authResult;
  if (!userId) {
    console.log('NO USER ID - REDIRECTING TO SIGN-IN');
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Declare userRole variable
  let userRole: string;
  
  // TEMPORARY DEBUG: Force admin for specific user ID
  if (userId === 'user_37GsUyGI3pcCRZy17WPN8YpzgsO') {
    userRole = 'admin';
    console.log('🔧 DEBUG: Forcing admin role for user:', userId);
  } else {
    // Get user role from metadata
    userRole = (authResult.sessionClaims?.metadata as any)?.role || 
                   (authResult.sessionClaims?.unsafeMetadata as any)?.role || 
                   'staff';
  }
  
  // Debug logging
  console.log('🔍 Middleware Debug:', {
    userId,
    userRole,
    pathname,
    sessionClaims: authResult.sessionClaims
  });
  
  // Admin has access to everything
  if (userRole === 'admin') {
    console.log('👑 ADMIN ACCESS GRANTED TO:', pathname);
    console.log('🔍 Admin user details:', { userId, userRole, pathname });
    return NextResponse.next();
  } else {
    console.log('❌ User is NOT admin:', { userId, userRole });
  }
  
  // Define permissions for each role (only for non-admin users)
  const rolePermissions = {
    doctor: {
      '/auth/dashboard': true,
      '/auth/pacientes': true,
      '/auth/patient-form': true,
      '/auth/patient-preview': true,
      '/auth/patient-preview/': true, // Add prefix match
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
      '/auth/patient-preview/': true, // Add prefix match
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
  console.log('🔍 Checking permissions for pathname:', pathname);
  if (permissions[pathname] !== undefined) {
    console.log('📍 Exact match found:', { pathname, permitted: permissions[pathname] });
    if (permissions[pathname]) {
      console.log('✅ Permission granted for exact match');
      return NextResponse.next();
    } else {
      console.log('🚫 Permission denied, redirecting to /auth/menu-navegacion (exact match)');
      return NextResponse.redirect(new URL('/auth/menu-navegacion', req.url));
    }
  }
  
  // Check prefix matches
  console.log('🔍 Checking prefix matches...');
  for (const [route, permitted] of Object.entries(permissions)) {
    if (pathname.startsWith(route + '/') && permitted === true) {
      console.log('✅ Permission granted for prefix match:', { route, pathname });
      return NextResponse.next();
    }
  }

  // If no permission found, deny access
  console.log('🚫 No permission found for pathname, redirecting to /auth/menu-navegacion:', { pathname, userRole, permissions });
  return NextResponse.redirect(new URL('/auth/menu-navegacion', req.url));
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/auth/:path*',
  ],
};