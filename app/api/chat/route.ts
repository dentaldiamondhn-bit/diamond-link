import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use Clerk ID directly as user ID
    const dbUserId = userId;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let query = supabase
      .from('chat_conversations')
      .select(`
        *,
        participants:chat_participants(*),
        last_message:chat_messages(
          id,
          content,
          sender_id,
          message_type,
          created_at
        )
      `)
      .eq('chat_participants.user_id', dbUserId)
      .order('last_message_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        const lastRead = conv.participants?.find((p: any) => p.user_id === dbUserId)?.last_read_at || '1970-01-01';
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', dbUserId)
          .gt('created_at', lastRead);

        return { ...conv, unread_count: count || 0 };
      })
    );

    return NextResponse.json({ data: conversationsWithUnread });
  } catch (error) {
    console.error('Error in chat conversations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use Clerk ID directly as user ID
    const dbUserId = userId;

    const body = await request.json();
    const { name, type, description, participant_ids } = body;

    // Determine conversation type and name
    let conversationName = name;
    let conversationType = type || 'direct';

    // For direct messages, check if conversation already exists
    if (type === 'direct' && participant_ids?.length === 1) {
      const existingConv = await supabase
        .from('chat_conversations')
        .select(`
          id,
          chat_participants(user_id)
        `)
        .eq('type', 'direct')
        .execute();

      const existing = (existingConv.data || []).find((conv: any) => {
        const participantIds = conv.chat_participants?.map((p: any) => p.user_id) || [];
        return participantIds.includes(dbUserId) && participantIds.includes(participant_ids[0]);
      });

      if (existing) {
        return NextResponse.json({ data: existing, existing: true });
      }
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .insert({
        name: conversationName,
        type: conversationType,
        description,
        created_by: dbUserId
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    // Add participants (including creator)
    const allParticipantIds = [dbUserId, ...participant_ids];
    const participants = allParticipantIds.map((uid, index) => ({
      conversation_id: conversation.id,
      user_id: uid,
      role: index === 0 ? 'owner' : 'member'
    }));

    const { error: partError } = await supabase
      .from('chat_participants')
      .insert(participants);

    if (partError) {
      console.error('Error adding participants:', partError);
      // Rollback conversation creation
      await supabase.from('chat_conversations').delete().eq('id', conversation.id);
      return NextResponse.json({ error: partError.message }, { status: 500 });
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    console.error('Error in chat conversations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
