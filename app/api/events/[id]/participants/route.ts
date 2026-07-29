import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function getUserId(req: NextRequest) {
  return req.headers.get('x-user-id') || '';
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    const supabase = createServiceClient();
    const participants: any[] = [];

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('user_id, title')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(participants, { status: 200 });
    }

    if (eventData.user_id) {
    const { data: ownerUser, error: ownerError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, profile_image_url')
      .eq('id', eventData.user_id)
      .single();

    if (!ownerError && ownerUser) {
      participants.push({
        id: ownerUser.id,
        role: 'owner',
        first_name: ownerUser.first_name,
        last_name: ownerUser.last_name,
        email: ownerUser.email,
        profile_image_url: ownerUser.profile_image_url,
      });
    }
    }

    const { data: invitees, error: inviteesError } = await supabase
      .from('event_invitees')
      .select('user_id, status')
      .eq('event_id', eventId)
      .in('status', ['pending', 'accepted']);

    if (!inviteesError && invitees && invitees.length > 0) {
      const userIds = invitees.map((inv) => inv.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, profile_image_url')
        .in('id', userIds);

      if (!usersError && usersData) {
        const userMap = new Map(usersData.map((u) => [u.id, u]));
        for (const invitee of invitees) {
          const userData = userMap.get(invitee.user_id);
          participants.push({
            id: invitee.user_id,
            role: invitee.status === 'accepted' ? 'invitee_accepted' : 'invitee_pending',
            first_name: userData?.first_name || 'Invited',
            last_name: userData?.last_name || 'User',
            email: userData?.email || '',
            profile_image_url: userData?.profile_image_url || null,
          });
        }
      }
    }

    return NextResponse.json(participants, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
