import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/api/(.*)',
  '/api/terminal/(.*)',
  '/api/tickets/(.*)',  // Add tickets API routes
  '/api/tickets/system-logs(.*)',  // Explicitly add system-logs API
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
    '/odontogram-pilot': ['admin', 'doctor', 'assistant'],
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
  // IMMEDIATE BYPASS for system-logs API - skip all auth logic
  if (req.nextUrl.pathname.startsWith('/api/tickets/system-logs')) {
    console.log('🔓 BYPASSING AUTH FOR SYSTEM-LOGS API');
    return NextResponse.next();
  }
  
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
      
      const response = NextResponse.next();
      // Add Cloudflare-specific headers to all responses
      addCloudflareHeaders(response, req);
      return response;
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
      '/odontogram-pilot',
      '/odontogram-test',
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
      const response = NextResponse.next();
      // Add Cloudflare-specific headers to all responses
      addCloudflareHeaders(response, req);
      return response;
    }

    // Reports page - restricted to doctors, admins, and tech-support only
    if (req.nextUrl.pathname === '/reports' || req.nextUrl.pathname === '/reportes') {
      // TEMPORARY: Allow all authenticated users to access reports for testing
      const response = NextResponse.next();
      addCloudflareHeaders(response, req);
      return response;
      
      if (userRole === 'doctor' || userRole === 'admin' || userRole === 'tech_support') {
        const response = NextResponse.next();
        addCloudflareHeaders(response, req);
        return response;
      } else {
        return new Response('Access Denied', { status: 403 });
      }
    }
    
    // EMERGENCY BYPASS: Allow tech-support/users access for tech support user while metadata is broken
    if (recheckedUserId === 'user_3A1mYfR054eV3tqtellpfMKZ7f6' && 
        req.nextUrl.pathname === '/tech-support/users') {
      const response = NextResponse.next();
      addCloudflareHeaders(response, req);
      return response;
    }
    
    // TEMPORARY: Allow tech-support/users for component-level access control
    if (req.nextUrl.pathname === '/tech-support/users') {
      const response = NextResponse.next();
      addCloudflareHeaders(response, req);
      return response;
    }
    
    // TESTING: Allow odontogram-test for all roles (testing page)
    if (req.nextUrl.pathname.startsWith('/odontogram-test')) {
      const response = NextResponse.next();
      addCloudflareHeaders(response, req);
      return response;
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
      const response = NextResponse.next();
      addCloudflareHeaders(response, req);
      return response;
    }
  }
  
  // For public routes, also add Cloudflare headers
  const response = NextResponse.next();
  addCloudflareHeaders(response, req);
  return response;
});

// Helper function to add Cloudflare headers
function addCloudflareHeaders(response: NextResponse, req: NextRequest) {
  // Cloudflare security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  
  // Cloudflare optimization headers
  response.headers.set('Vary', 'Accept-Encoding');
  
  // Handle API routes differently for Cloudflare caching
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Exclude odysseus-chat from caching to allow real-time health checks
    if (!req.nextUrl.pathname.includes('/api/odysseus-chat') && !req.nextUrl.pathname.includes('/api/groq-chat') && !req.nextUrl.pathname.includes('/api/ollama-chat')) {
      response.headers.set('Cache-Control', 'public, max-age=7200, s-maxage=7200');
    }
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '99');
    response.headers.set('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());
  }
  
  // Handle static assets for Cloudflare caching
  if (req.nextUrl.pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
}

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc|auth)/(.*)',
  ],
};