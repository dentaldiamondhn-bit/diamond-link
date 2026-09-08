import { NextRequest, NextResponse } from 'next/server';
import { createServerServiceClient } from '@/lib/supabase/server';
import { authorizeCalendar } from '@/lib/calendarAuth';
import { isEventMember } from '@/lib/calendarAccess';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const { id } = await params;
    const supabase = createServerServiceClient();

    if (!(await isEventMember(supabase, id, userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const participants: any[] = [];

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('user_id, title')
      .eq('id', id)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(participants);
    }

    const userIdsToFetch = new Set<string>();
    if (eventData.user_id) userIdsToFetch.add(eventData.user_id);

    const { data: invitees, error: inviteesError } = await supabase
      .from('event_invitees')
      .select('user_id, status')
      .eq('event_id', id)
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

    if (usersError) throw usersError;

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

    return NextResponse.json(participants);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[participants] error', err);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}