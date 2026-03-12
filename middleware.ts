import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { canAccessRoute } from './hooks/useRoleBasedAccess';

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
    
    // Check route access using the same function as frontend
    if (!canAccessRoute(userRole, req.nextUrl.pathname)) {
      return new Response('Access Denied', { status: 403 });
    } else {
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