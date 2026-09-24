import { NextRequest, NextResponse } from 'next/server';

// RFC 6764 well-known CardDAV discovery. iOS and DAVx5 resolve
// https://host/.well-known/carddav before attempting PROPFIND.
// The address book resource lives at /api/dav/contacts.
export function GET(request: NextRequest) {
  const host = request.headers.get('Host') ?? 'app.dentaldiamondhn.com';
  const base = `${request.nextUrl.protocol}//${host}`;
  return NextResponse.redirect(new URL('/api/dav/contacts', base), 301);
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'DAV': '1, addressbook', 'Allow': 'GET, OPTIONS' },
  });
}