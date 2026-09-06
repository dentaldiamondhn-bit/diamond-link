import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/push/pushService';

export const dynamic = 'force-dynamic';

/**
 * Supabase webhook target for new chat messages (pg_net trigger or a Supabase
 * Database Webhook). Called with every INSERT into chat_messages and fans out
 * web-push to the OTHER participants' subscriptions (muted conversations are
 * skipped). Protected by PUSH_WEBHOOK_SECRET, not Clerk, because the origin is
 * the database itself.
 */

const MAX_BODY_LENGTH = 140;

const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function mediaLabel(messageType: string | undefined): string {
  switch (messageType) {
    case 'image':
      return '📷 Foto';
    case 'file':
      return '📎 Archivo';
    case 'voice':
      return '🎤 Nota de voz';
    case 'patient_case':
      return '🩺 Ficha de paciente';
    default:
      return 'Nuevo mensaje';
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 503 });

  const provided = request.headers.get('x-webhook-secret');
  if (!provided || provided !== secret) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const record = payload?.record || payload?.new;
  if (!record?.id || !record?.conversation_id || !record?.sender_id) {
    // Not a chat_messages INSERT shape — nothing to do.
    return NextResponse.json({ ok: true, skipped: true });
  }
  if (record.message_type === 'system' || record.is_deleted) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const db = createServiceClient();
  const conversationId = record.conversation_id;
  const senderId = record.sender_id;

  const [{ data: conv }, { data: parts }] = await Promise.all([
    db
      .from('chat_conversations')
      .select('id, type, name')
      .eq('id', conversationId)
      .maybeSingle(),
    db
      .from('chat_participants')
      .select('user_id, is_muted')
      .eq('conversation_id', conversationId),
  ]);

  const recipients = (parts || [])
    .filter((p) => p.user_id !== senderId && !p.is_muted)
    .map((p) => p.user_id);

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, recipients: 0 });
  }

  let senderName = '';
  try {
    const client = await clerkClient();
    const sender = await client.users.getUser(senderId);
    senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.username || '';
  } catch (err) {
    console.warn('[push] could not resolve sender name:', (err as Error)?.message);
  }

  const text = stripHtml(record.content || '');
  const clipped = text.slice(0, MAX_BODY_LENGTH) + (text.length > MAX_BODY_LENGTH ? '…' : '');
  const fallback = mediaLabel(record.message_type);
  const isGroup = conv?.type === 'group' || conv?.type === 'channel';
  const title = isGroup ? conv?.name || 'Grupo' : senderName || 'Diamond Link';
  const body = isGroup && senderName ? `${senderName}: ${clipped || fallback}` : clipped || fallback;

  const tag = `chat-${conversationId}`;
  const summary = await Promise.all(
    recipients.map((userId) =>
      sendPushToUser(userId, {
        title,
        body,
        icon: '/Logo.svg',
        badge: '/Logo.svg',
        tag,
        renotify: false,
        data: { conversationId, senderId, type: 'chat' },
      })
    )
  );

  const totals = summary.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      removed: acc.removed + r.removed,
      failed: acc.failed + r.failed,
    }),
    { sent: 0, removed: 0, failed: 0 }
  );

  return NextResponse.json({
    ok: true,
    recipients: recipients.length,
    ...totals,
  });
}