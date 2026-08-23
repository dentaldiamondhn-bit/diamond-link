import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function getUserId(req: NextRequest) {
  return req.headers.get('x-user-id') || '';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = id;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('event_invitees')
      .select('*')
      .eq('event_id', eventId)
      .order('invited_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = id;
    const body = await req.json();
    const { user_id, status = 'pending' } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('event_invitees')
      .insert({
        event_id: eventId,
        user_id,
        status,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User is already invited' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = id;
    const body = await req.json();
    const { user_id } = body;

    const supabase = await createClient();

    if (user_id) {
      const { error } = await supabase
        .from('event_invitees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user_id);

      if (error) throw error;
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { error } = await supabase
      .from('event_invitees')
      .delete()
      .eq('event_id', eventId);

    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
