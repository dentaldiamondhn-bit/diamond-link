import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClerkClient } from '@clerk/backend';

export const runtime = 'nodejs';

function getUserId(req: NextRequest) {
  return req.headers.get('x-user-id') || '';
}

async function fetchClerkUsersByIds(userIds: string[]): Promise<Map<string, any>> {
  try {
    if (!process.env.CLERK_SECRET_KEY) return new Map();
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const userMap = new Map<string, any>();

    if (userIds.length === 0) return userMap;

    const clerkUsers = await clerk.users.getUserList({
      userId: userIds,
      limit: Math.min(userIds.length, 100),
    });

    if (clerkUsers?.data) {
      for (const user of clerkUsers.data) {
        userMap.set(user.id, {
          id: user.id,
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          email: user.emailAddresses?.[0]?.emailAddress || '',
          profileImageUrl: user.imageUrl || null,
        });
      }
    }

    return userMap;
  } catch {
    return new Map();
  }
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

    if (process.env.NODE_ENV === 'development') {
      console.debug('[participants] event lookup', eventId, eventData, eventError);
    }

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

    const userMap = await fetchClerkUsersByIds(Array.from(userIdsToFetch));

    if (eventData.user_id) {
      const owner = userMap.get(eventData.user_id);
      participants.push({
        id: eventData.user_id,
        role: 'owner',
        first_name: owner?.first_name || 'Usuario',
        last_name: owner?.last_name || '',
        email: owner?.email || '',
        profile_image_url: owner?.profileImageUrl || null,
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
          profile_image_url: userData?.profileImageUrl || null,
        });
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[participants] final response', eventId, participants);
    }

    return NextResponse.json(participants, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
