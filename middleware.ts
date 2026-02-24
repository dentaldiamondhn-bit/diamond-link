import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { canAccessRoute } from './hooks/useRoleBasedAccess';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/api/(.*)',
]);

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
    
    // DEBUG: Log everything with request ID
    console.log('=== MIDDLEWARE DEBUG ===');
    console.log('Request URL:', req.url);
    console.log('User ID:', userId);
    console.log('Session claims:', sessionClaims);
    console.log('Public metadata:', sessionClaims?.public_metadata);
    console.log('Metadata:', sessionClaims?.metadata);
    console.log('Role in claims:', sessionClaims?.role);
    console.log('Detected role:', userRole);
    console.log('Pathname:', req.nextUrl.pathname);
    
    // MULTIPLE FALLBACKS FOR TECH SUPPORT ACCESS
    if (userRole === 'tech_support' || 
        userRole === 'tech-support' || 
        req.nextUrl.pathname.startsWith('/tech-support/') ||
        userId === 'user_3A1mYfR054eV3tqtellpfMKZ7f6') { // Specific tech support user
      console.log('TECH SUPPORT ACCESS GRANTED - Multiple checks passed');
      return NextResponse.next();
    }
    
    // TEMPORARY: Allow basic access for common routes while metadata issue is fixed
    if (req.nextUrl.pathname === '/dashboard' ||
        req.nextUrl.pathname === '/pacientes' ||
        req.nextUrl.pathname === '/doctores' ||
        req.nextUrl.pathname === '/calendario' ||
        req.nextUrl.pathname === '/tratamientos' ||
        req.nextUrl.pathname.startsWith('/xray-viewer') ||
        req.nextUrl.pathname === '/reports' ||
        req.nextUrl.pathname.startsWith('/historia-clinica-ortodoncia') ||
        req.nextUrl.pathname.startsWith('/tratamientos-completados')) {
      console.log('BASIC ACCESS GRANTED - Common route bypass');
      return NextResponse.next();
    }
    
    // EMERGENCY BYPASS: Allow tech-support/users access for tech support user while metadata is broken
    if (userId === 'user_3A1mYfR054eV3tqtellpfMKZ7f6' && 
        req.nextUrl.pathname === '/tech-support/users') {
      console.log('EMERGENCY BYPASS - Tech support users access granted');
      return NextResponse.next();
    }
    
    // TEMPORARY: Allow tech-support/users for component-level access control
    if (req.nextUrl.pathname === '/tech-support/users') {
      console.log('TECH SUPPORT USERS BYPASS - Component-level access control');
      return NextResponse.next();
    }
    
    // TESTING: Allow odontogram-test for all roles (testing page)
    if (req.nextUrl.pathname.startsWith('/odontogram-test')) {
      console.log('ODONTOGRAM TEST BYPASS - All roles allowed for testing');
      return NextResponse.next();
    }
    
    console.log('CanAccessRoute result:', canAccessRoute(userRole, req.nextUrl.pathname));
    
    // Check route access based on role
    if (!canAccessRoute(userRole, req.nextUrl.pathname)) {
      console.log('ACCESS DENIED - Returning 403');
      return new Response('Access Denied', { status: 403 });
    } else {
      console.log('ACCESS GRANTED');
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