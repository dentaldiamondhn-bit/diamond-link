import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lightweight CardDAV stream for device address books (iOS / DAVx5 / similar).
// GET /api/dav/contacts returns a vCard 3.0 multi-vcard covering active clinic
// contacts, with a stable ETag from the newest updated_at so clients can issue
// conditional (delta) requests. Full RFC 6352 (PROPFIND/REPORT) is intentionally
// out of scope for this lightweight endpoint.

const CLINIC_NAME = 'Clínica Dental Diamond';

interface DavPhoneRow {
  phone_number?: string | null;
}
interface DavEmailRow {
  email?: string | null;
}
interface DavContactRow {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  job_title?: string | null;
  updated_at?: string | null;
  contact_phones?: DavPhoneRow[] | null;
  contact_emails?: DavEmailRow[] | null;
}

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/:/g, '\\:').replace(/\n/g, '\\n');
}

function toVCard(c: DavContactRow): string {
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `UID:${c.id}`, 'PRODID:-//Diamond Link//Contactos v1.0//ES'];
  lines.push(`FN:${esc(name || 'Sin nombre')}`);
  lines.push(`N:${esc(c.last_name ?? '')};${esc(c.first_name ?? '')};;;`);
  const phones = c.contact_phones ?? [];
  for (const p of phones) {
    if (p.phone_number) lines.push(`TEL;TYPE=CELL:${p.phone_number}`);
  }
  const emails = c.contact_emails ?? [];
  for (const e of emails) {
    if (e.email) lines.push(`EMAIL;TYPE=WORK:${e.email}`);
  }
  lines.push(`ORG:${esc(c.company ?? CLINIC_NAME)}`);
  if (c.job_title) lines.push(`TITLE:${esc(c.job_title)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function isAuthorized(request: NextRequest): boolean {
  const token = process.env.DAV_SYNC_TOKEN;
  if (token) {
    const header = request.headers.get('authorization');
    const fromHeader = header && header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
    const fromQuery = request.nextUrl.searchParams.get('token') ?? '';
    return fromHeader === token || fromQuery === token;
  }
  // Without an explicit secret, gate on the public Supabase anon key so random
  // crawlers cannot dump the clinic directory (same key the browser client uses).
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = request.headers.get('apikey');
  const accessToken = request.nextUrl.searchParams.get('access_token') ?? '';
  return (!!anon && (apiKey === anon || accessToken === anon)) || !!token;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, company, job_title, updated_at, contact_phones(phone_number), contact_emails(email)')
    .is('deleted_at', null)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(2000);

  if (error) {
    console.error('[dav] fetch fallida:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  const contacts = (Array.isArray(data) ? data : []) as DavContactRow[];
  const body = contacts.map(toVCard).join('\r\n');

  const maxUpdated =
    contacts.reduce<string | null>((max, c) => (c.updated_at && (!max || c.updated_at > max) ? c.updated_at : max), null);
  const etag = `"${maxUpdated ? new Date(maxUpdated).getTime() : '0'}:${contacts.length}"`;

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': 'inline; filename="contactos.vcf"',
      ETag: etag,
      'Cache-Control': 'no-cache',
    },
  });
}