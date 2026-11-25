import { NextRequest, NextResponse } from 'next/server';
import { createServerServiceClient } from '@/lib/supabase/server';
import { authorizeCalendar } from '@/lib/calendarAuth';

export const runtime = 'nodejs';

/** Columns the API route is allowed to read/write. */
const ALLOWED_COLUMNS = [
  'clerk_user_id',
  'favorite_invitees',
  'appointment_confirmation',
  'page_preferences',
  'global_preferences',
  'updated_at',
] as const;

/** GET the current user's full preferences row. */
export async function GET(_req: NextRequest) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  const supabase = createServerServiceClient();
  const { data, error } = await supabase
    .from('user_preferences')
    .select(ALLOWED_COLUMNS.join(','))
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data as unknown) as Record<string, unknown> | null;
  return NextResponse.json({
    clerk_user_id: userId,
    favorite_invitees: Array.isArray(row?.[
      'favorite_invitees'
    ]) ? row['favorite_invitees'] : [],
    appointment_confirmation: typeof row?.['appointment_confirmation'] === 'boolean' ? row['appointment_confirmation'] : false,
    page_preferences: row?.[
      'page_preferences'
    ] ?? {},
    global_preferences: row?.[
      'global_preferences'
    ] ?? {},
    updated_at: row?.['updated_at'] ?? null,
  });
}

/** PUT (upsert) the current user's preferences. Accepts a partial row; only
 *  the provided updatable fields are changed — everything else is left intact
 *  so preferences from multiple pages and settings coexist in one row. */
export async function PUT(req: NextRequest) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prefs = body as Record<string, unknown>;
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
    return NextResponse.json({ error: 'Body must be a preferences object' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    clerk_user_id: userId,
    updated_at: new Date().toISOString(),
  };

  let hasUpdatable = false;

  if ('favorite_invitees' in prefs) {
    const v = prefs['favorite_invitees'];
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
      return NextResponse.json({ error: 'favorite_invitees must be an array of strings' }, { status: 400 });
    }
    update['favorite_invitees'] = v;
    hasUpdatable = true;
  }

  if ('appointment_confirmation' in prefs) {
    const v = prefs['appointment_confirmation'];
    if (typeof v !== 'boolean') {
      return NextResponse.json({ error: 'appointment_confirmation must be a boolean' }, { status: 400 });
    }
    update['appointment_confirmation'] = v;
    hasUpdatable = true;
  }

  if ('page_preferences' in prefs) {
    const v = prefs['page_preferences'];
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      return NextResponse.json({ error: 'page_preferences must be an object' }, { status: 400 });
    }
    update['page_preferences'] = v;
    hasUpdatable = true;
  }

  if ('global_preferences' in prefs) {
    const v = prefs['global_preferences'];
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      return NextResponse.json({ error: 'global_preferences must be an object' }, { status: 400 });
    }
    update['global_preferences'] = v;
    hasUpdatable = true;
  }

  if (!hasUpdatable) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const supabase = createServerServiceClient();
  const { error } = await supabase
    .from('user_preferences')
    .upsert(update, { onConflict: 'clerk_user_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE the current user's preferences row. */
export async function DELETE(_req: NextRequest) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  const supabase = createServerServiceClient();
  const { error } = await supabase
    .from('user_preferences')
    .delete()
    .eq('clerk_user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
