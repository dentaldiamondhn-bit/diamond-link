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
    '/reports': ['admin', 'doctor'],
    '/doctores': ['admin'],
    '/tech-support': ['admin'],
    '/patient-form': ['admin', 'doctor', 'assistant'],
  };

  // Check if route exists in permissions
  const allowedRoles = routePermissions[pathname];
  
  // If route not found, allow access (default behavior)
  if (!allowedRoles) {
    return true;
  }

  // Check if user role is allowed
  return allowedRoles.includes(userRole);
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Get fresh auth for each request - no caching
    const authResult = await auth();
    const { userId } = authResult;
    
    if (!userId) {
      const { redirectToSignIn } = await auth();
      return redirectToSignIn();
    }

    // Get user role from metadata - check multiple locations
    const session = await auth();
    const sessionClaims = session?.sessionClaims as any;
    
    // Try different metadata locations
    let userRole = 'staff';
    if (sessionClaims?.public_metadata?.role) {
      userRole = sessionClaims.public_metadata.role;
    } else if (sessionClaims?.metadata?.role) {
      userRole = sessionClaims.metadata.role;
    } else if (sessionClaims?.role) {
      userRole = sessionClaims.role;
    }
    
    // DEBUG: Log user role and access attempt
    console.log('🔍 MIDDLEWARE DEBUG:', {
      userId,
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
        userId === 'user_3A1mYfR054eV3tqtellpfMKZ7f6') { // Specific tech support user
      return NextResponse.next();
    }
    
    // TEMPORARY: Allow basic access for common routes while metadata issue is fixed
    if (req.nextUrl.pathname === '/dashboard' ||
        req.nextUrl.pathname === '/pacientes' ||
        req.nextUrl.pathname === '/doctores' ||
        req.nextUrl.pathname === '/calendario' ||
        req.nextUrl.pathname === '/patient-form' ||
        req.nextUrl.pathname.startsWith('/patient-form') ||
        req.nextUrl.pathname === '/tratamientos' ||
        req.nextUrl.pathname === '/presupuestos' ||
        req.nextUrl.pathname === '/tickets' ||  // Add tickets route
        req.nextUrl.pathname.startsWith('/xray-viewer') ||
        req.nextUrl.pathname.startsWith('/historia-clinica-ortodoncia') ||
        req.nextUrl.pathname.startsWith('/tratamientos-completados')) {
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
    if (userId === 'user_3A1mYfR054eV3tqtellpfMKZ7f6' && 
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