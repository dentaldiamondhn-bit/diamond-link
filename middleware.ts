import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/api/(.*)',
  '/api/terminal/(.*)',
  '/api/tickets/(.*)',  // Add tickets API routes
  '/tech-support/terminal',
  '/tech-support/(.*)',
  '/capacitor-demo',  // Add capacitor demo as public route
]);

// Server-side access control logic (copied from client hook)
function canAccessRouteServer(userRole: string, pathname: string): boolean {
  // Define route permissions
  const routePermissions: Record<string, string[]> = {
    '/dashboard': ['admin', 'doctor', 'assistant'],
    '/pacientes': ['admin', 'doctor', 'assistant'],
    '/calendario': ['admin', 'doctor', 'assistant'],
    '/odontogram': ['admin', 'doctor', 'assistant'],
    '/odontogram-test': ['admin', 'doctor', 'assistant'],
    '/tratamientos': ['admin', 'doctor', 'assistant'],
    '/tratamientos-completados': ['admin', 'doctor', 'assistant'],
    '/presupuestos': ['admin', 'doctor', 'assistant'],
    '/consentimientos': ['admin', 'doctor', 'assistant'],
    '/estudio-periodontal': ['admin', 'doctor', 'assistant'],
    '/patient-form': ['admin', 'doctor', 'assistant'],
    '/menu-navegacion': ['admin', 'doctor', 'assistant'],
    '/reports': ['admin', 'doctor', 'assistant'], // Allow doctors to access reports for testing
    '/doctores': ['admin'],
    '/tech-support': ['admin'],
  };

  console.log('🔍 ROUTE PERMISSIONS CHECK:', {
    pathname,
    userRole,
    allowedRoles: routePermissions[pathname],
    routeExists: !!routePermissions[pathname]
  });

  // Check if route exists in permissions
  const allowedRoles = routePermissions[pathname];
  
  // If route not found, allow access (default behavior)
  if (!allowedRoles) {
    console.log('✅ ROUTE NOT FOUND - ALLOWING ACCESS');
    return true;
  }

  // Check if user role is allowed
  const hasAccess = allowedRoles.includes(userRole);
  console.log('🔍 ACCESS CHECK RESULT:', {
    pathname,
    userRole,
    allowedRoles,
    hasAccess
  });

  return hasAccess;
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Get auth data for each request
    const { userId } = await auth();
    
    if (!userId) {
      const { redirectToSignIn } = await auth();
      return redirectToSignIn();
    }

    // Get user role from metadata - check multiple locations
    const { sessionClaims, userId: recheckedUserId } = await auth();
    
    // Try different metadata locations from session claims
    let userRole = 'staff'; // default
    if ((sessionClaims as any)?.public_metadata?.role) {
      userRole = (sessionClaims as any).public_metadata.role;
    } else if ((sessionClaims as any)?.metadata?.role) {
      userRole = (sessionClaims as any).metadata.role;
    } else if ((sessionClaims as any)?.role) {
      userRole = (sessionClaims as any).role as string;
    }
    
    // Special case for known tech support user
    if (recheckedUserId === 'user_3A1mYfR054eV3tqtellpfMKZ7f6') {
      userRole = 'tech_support';
    }
    
    // DEBUG: Log user role and access attempt
    console.log('🔍 MIDDLEWARE DEBUG:', {
      userId: recheckedUserId,
      pathname: req.nextUrl.pathname,
      detectedRole: userRole,
      sessionClaims: sessionClaims,
      publicMetadata: sessionClaims?.public_metadata,
      metadata: sessionClaims?.metadata
    });
    
    // MULTIPLE FALLBACKS FOR TECH SUPPORT ACCESS
    if (userRole === 'tech_support' || 
        userRole === 'tech-support' || 
        req.nextUrl.pathname.startsWith('/tech-support/') ||
        recheckedUserId === 'user_3A1mYfR054eV3tqtellpfMKZ7f6') { // Specific tech support user
      
      // If tech support user is trying to access general dashboard, redirect to tech support dashboard
      if (req.nextUrl.pathname === '/dashboard' || req.nextUrl.pathname === '/') {
        console.log('🔄 REDIRECTING TECH SUPPORT TO TECH DASHBOARD');
        return NextResponse.redirect(new URL('/tech-support/dashboard', req.url));
      }
      
      return NextResponse.next();
    }
    
    // TEMPORARY: Allow basic access for common routes while metadata issue is fixed
    // Check if any of the allowed routes match
    const allowedRoutes = [
      '/dashboard',
      '/pacientes',
      '/doctores',
      '/calendario',
      '/patient-form',
      '/consentimientos',
      '/odontogram',
      '/estudio-periodontal',
      '/menu-navegacion',
      '/tratamientos',
      '/presupuestos',
      '/tickets',
      '/xray-viewer',
      '/historia-clinica-ortodoncia',
      '/tratamientos-completados'
    ];
    
    // Check for exact match or starts with
    const isAllowedRoute = allowedRoutes.some(route => 
      req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(route)
    );
    
    if (isAllowedRoute) {
      console.log('✅ TEMPORARY ACCESS ALLOWED:', { pathname: req.nextUrl.pathname, userRole });
      return NextResponse.next();
    }

    // Reports page - restricted to doctors, admins, and tech-support only
    if (req.nextUrl.pathname === '/reports' || req.nextUrl.pathname === '/reportes') {
      // TEMPORARY: Allow all authenticated users to access reports for testing
      return NextResponse.next();
      
      if (userRole === 'doctor' || userRole === 'admin' || userRole === 'tech_support') {
        return NextResponse.next();
      } else {
        return new Response('Access Denied', { status: 403 });
      }
    }
    
    // EMERGENCY BYPASS: Allow tech-support/users access for tech support user while metadata is broken
    if (recheckedUserId === 'user_3A1mYfR054eV3tqtellpfMKZ7f6' && 
        req.nextUrl.pathname === '/tech-support/users') {
      return NextResponse.next();
    }
    
    // TEMPORARY: Allow tech-support/users for component-level access control
    if (req.nextUrl.pathname === '/tech-support/users') {
      return NextResponse.next();
    }
    
    // TESTING: Allow odontogram-test for all roles (testing page)
    if (req.nextUrl.pathname.startsWith('/odontogram-test')) {
      return NextResponse.next();
    }
    
    // Check route access using server-side function
    const hasAccess = canAccessRouteServer(userRole, req.nextUrl.pathname);
    console.log('🔍 ACCESS CONTROL DEBUG:', {
      userRole,
      pathname: req.nextUrl.pathname,
      hasAccess,
      routePermissions: {
        '/patient-form': ['admin', 'doctor', 'assistant'],
        '/dashboard': ['admin', 'doctor', 'assistant'],
        '/pacientes': ['admin', 'doctor', 'assistant'],
        '/calendario': ['admin', 'doctor', 'assistant']
      }
    });
    
    if (!hasAccess) {
      console.log('🚫 ACCESS DENIED for:', { userRole, pathname: req.nextUrl.pathname });
      return new Response('Access Denied', { status: 403 });
    } else {
      console.log('✅ ACCESS GRANTED for:', { userRole, pathname: req.nextUrl.pathname });
      return NextResponse.next();
    }
  }
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc|auth)/(.*)',
  ],
};