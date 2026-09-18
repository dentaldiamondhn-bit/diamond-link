import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/privacy',
  '/terms',
  '/api/(.*)',
  '/api/terminal/(.*)',
  '/api/tickets/(.*)',
  '/api/tickets/system-logs(.*)',
  '/tech-support/terminal',
  '/tech-support/(.*)',
  '/capacitor-demo',
]);

function addCloudflareHeaders(response: NextResponse, req: NextRequest) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()');
  response.headers.set('Vary', 'Accept-Encoding');

  if (req.nextUrl.pathname.startsWith('/api/')) {
    const isUserScopedCalendarApi =
      req.nextUrl.pathname.startsWith('/api/events') ||
      req.nextUrl.pathname.startsWith('/api/tasks') ||
      req.nextUrl.pathname.startsWith('/api/reminders');
    const isCalendarRealtime = req.nextUrl.pathname.includes('/api/events/realtime');

    if (isUserScopedCalendarApi && !isCalendarRealtime) {
      response.headers.set('Cache-Control', 'no-store');
    } else if (
      !req.nextUrl.pathname.includes('/api/odysseus-chat') &&
      !req.nextUrl.pathname.includes('/api/groq-chat') &&
      !req.nextUrl.pathname.includes('/api/ollama-chat')
    ) {
      response.headers.set('Cache-Control', 'public, max-age=7200, s-maxage=7200');
    }
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '99');
    response.headers.set('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());
  }

  if (req.nextUrl.pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
}

export default clerkMiddleware(async (auth, req) => {
  // IMMEDIATE BYPASS for system-logs API
  if (req.nextUrl.pathname.startsWith('/api/tickets/system-logs')) {
    const response = NextResponse.next();
    addCloudflareHeaders(response, req);
    return response;
  }

  // Skip ALL auth for public routes - don't call auth() at all
  if (isPublicRoute(req)) {
    const response = NextResponse.next();
    addCloudflareHeaders(response, req);
    return response;
  }

  // For protected routes, only check if user exists (minimal auth call)
  const { userId } = await auth();

  if (!userId) {
    // Allow chat routes to handle auth in component
    if (req.nextUrl.pathname === '/chat' || req.nextUrl.pathname.startsWith('/chat/')) {
      const response = NextResponse.next();
      addCloudflareHeaders(response, req);
      return response;
    }
    // Redirect to custom sign-in with redirect_url
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  // User is authenticated - let the page/component handle role-based access
  // Add Cloudflare headers and continue
  const response = NextResponse.next();
  addCloudflareHeaders(response, req);
  return response;
});

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
};