import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Use Clerk ID directly as user ID
    const dbUserId = userId;

    // Check if user is participant
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', dbUserId)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    let query = supabase
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
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark messages as read
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', dbUserId);

    return NextResponse.json({ data: messages || [] });
  } catch (error) {
    console.error('Error in chat messages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const body = await request.json();
    const { content, message_type, reply_to_id, attachments, patient_case_link } = body;

    // Use Clerk ID directly as user ID
    const dbUserId = userId;

    // Check if user is participant
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', dbUserId)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Create message
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: dbUserId,
        content,
        message_type: message_type || 'text',
        reply_to_id
      })
      .select(`
        *,
        sender:users(id, email, first_name, last_name, profile_image_url)
      `)
      .single();

    if (msgError) {
      console.error('Error creating message:', msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      const attachmentRecords = attachments.map((att: any) => ({
        message_id: message.id,
        file_name: att.file_name,
        file_type: att.file_type,
        file_size: att.file_size,
        file_url: att.file_url,
        thumbnail_url: att.thumbnail_url,
        uploaded_by: dbUserId
      }));

      await supabase.from('chat_attachments').insert(attachmentRecords);
    }

    // Add patient case link if any
    if (patient_case_link) {
      await supabase.from('chat_patient_case_links').insert({
        message_id: message.id,
        patient_id: patient_case_link.patient_id,
        link_type: patient_case_link.link_type,
        linked_id: patient_case_link.linked_id,
        title: patient_case_link.title,
        description: patient_case_link.description,
        metadata: patient_case_link.metadata,
        created_by: dbUserId
      });
    }

    // Update conversation last_message_at
    await supabase
      .from('chat_conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    // Get full message with attachments
    const { data: fullMessage } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:users(id, email, first_name, last_name, profile_image_url),
        reply_to:chat_messages(id, content, sender:users(id, email, first_name, last_name)),
        attachments:chat_attachments(*),
        patient_case_link:chat_patient_case_links(
          *,
          patient:patients(paciente_id, nombre_completo)
        )
      `)
      .eq('id', message.id)
      .single();

    return NextResponse.json({ data: fullMessage });
  } catch (error) {
    console.error('Error in chat messages POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
