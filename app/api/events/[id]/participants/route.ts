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
    const participants: any[] = [];

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('user_id, title')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(participants, { status: 200 });
    }

    const userIdsToFetch = new Set<string>();
    if (eventData.user_id) userIdsToFetch.add(eventData.user_id);

    const { data: invitees, error: inviteesError } = await supabase
      .from('event_invitees')
      .select('user_id, status')
      .eq('event_id', eventId)
      .in('status', ['pending', 'accepted']);

    if (!inviteesError && invitees && invitees.length > 0) {
      for (const invitee of invitees) {
        userIdsToFetch.add(invitee.user_id);
      }
    }

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, profile_image_url')
      .in('id', Array.from(userIdsToFetch));

    const userMap = new Map((usersData || []).map((u) => [u.id, u]));

    if (eventData.user_id) {
      const owner = userMap.get(eventData.user_id);
      participants.push({
        id: eventData.user_id,
        role: 'owner',
        first_name: owner?.first_name || 'Usuario',
        last_name: owner?.last_name || '',
        email: owner?.email || '',
        profileImageUrl: owner?.profile_image_url || null,
      });
    }

    if (!inviteesError && invitees && invitees.length > 0) {
      for (const invitee of invitees) {
        const userData = userMap.get(invitee.user_id);
        participants.push({
          id: invitee.user_id,
          role: invitee.status === 'accepted' ? 'invitee_accepted' : 'invitee_pending',
          first_name: userData?.first_name || 'Usuario',
          last_name: userData?.last_name || '',
          email: userData?.email || '',
          profileImageUrl: userData?.profile_image_url || null,
        });
      }
    }

    return NextResponse.json(participants, { status: 200 });
  } catch (err: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[participants] error', err);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
