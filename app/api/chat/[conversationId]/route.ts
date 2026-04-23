import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Use Clerk ID directly as user ID
    const dbUserId = userId;

    const { data: participant } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', dbUserId)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select(`*, participants:chat_participants(*)`)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select(`
        *,
        reply_to:chat_messages(id, content),
        attachments:chat_attachments(*),
        patient_case_link:chat_patient_case_links(
          *,
          patient:patients(paciente_id, nombre_completo)
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(100);

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', dbUserId);

    return NextResponse.json({ data: { conversation, messages: messages || [] } });
  } catch (error) {
    console.error('Error in chat conversation GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const body = await request.json();
    const { name, description, avatar_url, is_pinned, is_archived } = body;

    // Use Clerk ID directly as user ID
    const dbUserId = userId;

    const { data: participant } = await supabase
      .from('chat_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', dbUserId)
      .single();

    if (!participant || !['owner', 'admin'].includes(participant.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_archived !== undefined) updateData.is_archived = is_archived;

    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .update(updateData)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    console.error('Error in chat conversation PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Use Clerk ID directly as user ID
    const dbUserId = userId;

    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('created_by')
      .eq('id', conversationId)
      .single();

    if (!conversation || conversation.created_by !== dbUserId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in chat conversation DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
