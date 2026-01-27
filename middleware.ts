import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware((auth, req) => {
  // No protection for now - just let everything through
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/auth/:path*',
  ],
};