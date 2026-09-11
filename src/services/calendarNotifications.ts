import type { SupabaseClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/push/pushService';
import type { PushNotificationPayload } from '@/lib/push/pushService';

/**
 * Phase 5 — one delivery helper for calendar notifications so the OS tray
 * (push) and the in-app bell (`notifications` table) always stay in sync.
 *
 * The bell is written service-role (drive-by) because these calls come from the
 * pg_net webhook and the Vercel cron tick — there is no live Clerk session.
 * The `BellNotificationProvider` realtime subscription picks the row up for the
 * target user via RLS + Postgres realtime.
 */

export interface BellPayload {
  /** Bell record type (`calendar_event` / `calendar_reminder`). */
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

/** Write one in-app bell row (service-role; failures are logged, never fatal). */
export async function notifyBell(
  db: SupabaseClient,
  userId: string,
  bell: BellPayload
): Promise<void> {
  if (!userId) return;
  const { error } = await db.from('notifications').insert({
    user_id: userId,
    type: bell.type,
    title: bell.title,
    message: bell.message,
    data: bell.metadata || {},
    read: false,
  });
  if (error) {
    console.error('[calendarNotifications] bell insert failed', error);
  }
}

/** Push + bell for one user (tray and bell stay in lockstep). */
export async function deliverCalendarToUser(
  db: SupabaseClient,
  userId: string,
  push: PushNotificationPayload,
  bell: BellPayload
): Promise<{ sent: number; failed: number; removed: number }> {
  const pushResult = await sendPushToUser(userId, push);
  await notifyBell(db, userId, bell);
  return pushResult;
}