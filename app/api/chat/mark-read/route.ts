import { NextRequest, NextResponse } from 'next/server';
import { createServerServiceClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * Mark a chat conversation read for the current user.
 *
 * Server-side counterpart of ChatService.markConversationRead, callable from
 * the service worker when the user taps "Marcar leído" (or swipes a thread
 * notification away) without a chat tab open. Clerk session (cookie) is the
 * only identity, and every write is scoped to that user.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await request.json().catch(() => ({}));
    if (typeof conversationId !== 'string' || !conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const supabase = createServerServiceClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('chat_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Per-message reads (mirrors ChatService.markConversationRead).
    try {
      const { data: unreadMsgs } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_deleted', false);

      if (unreadMsgs && unreadMsgs.length > 0) {
        await supabase.from('chat_message_reads').upsert(
          unreadMsgs.map((m) => ({
            message_id: m.id,
            conversation_id: conversationId,
            user_id: userId,
            delivered_at: now,
            read_at: now,
          })),
          { onConflict: 'message_id,user_id' }
        );
      }
    } catch {
      // chat_message_reads may not be migrated yet; last_read_at is the source
      // of truth for unread counts either way.
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}