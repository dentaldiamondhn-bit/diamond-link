'use client';

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

/**
 * Supabase Realtime channel management for co-browsing.
 *
 * Replaces the custom Socket.IO relay (server/support-socket.js) with
 * Supabase Broadcast + Presence channels. Works on Vercel, mobile, PWA,
 * and any HTTPS origin without a separate relay server.
 *
 * Architecture:
 *  - Broadcast channels for ephemeral events (cursor, click, scroll, DOM mutations)
 *  - Presence for peer-info exchange + connection detection
 *  - No ring buffer: the client re-sends its FullSnapshot when Presence
 *    detects the agent joining (late-join backfill)
 *
 * Channel naming: cobrowse:${sessionId}
 *   - Isolates each session's events (like Socket.IO rooms)
 *   - Both client and agent join the same channel
 */

export interface PeerInfo {
  userId: string;
  name: string;
  imageUrl: string | null;
}

export interface PresenceState {
  role: 'client' | 'agent';
  info: PeerInfo;
  joinedAt: number;
}

// Singleton Supabase client for co-browsing (higher eventsPerSecond than the
// default client used for database queries).
let cobrowseClient: SupabaseClient | null = null;

/**
 * Return the singleton cobrowse Supabase client.
 *
 * This client is guaranteed to be anonymous (persistSession: false) and is
 * safe for both Realtime channels and Storage operations (uploads/downloads)
 * that rely on anon RLS policies.
 */
export function getCobrowseClient(): SupabaseClient {
  if (!cobrowseClient) {
    cobrowseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: {
          params: { eventsPerSecond: 30 },
        },
      }
    );
  }
  return cobrowseClient;
}

/**
 * Create and subscribe to a co-browsing channel.
 *
 * Broadcast handlers MUST be registered before subscribe to guarantee delivery.
 * Pass them via `opts.broadcastHandlers` so they are attached before
 * `.subscribe()` is called internally.
 *
 * @param sessionId - The unique session ID (UUID)
 * @param opts.broadcastHandlers - Array of {event, handler} to register before subscribe
 * @param opts.onAgentJoin - Called when the agent's Presence is detected
 * @param opts.onAgentLeave - Called when the agent's Presence disconnects
 * @param opts.onClientJoin - Called when the client's Presence is detected (agent side)
 * @param opts.onClientLeave - Called when the client's Presence disconnects (agent side)
 * @returns The RealtimeChannel and a cleanup function
 */
export function createCobrowseChannel(
  sessionId: string,
  opts: {
    broadcastHandlers?: Array<{
      event: string;
      handler: (payload: Record<string, unknown>) => void;
    }>;
    onAgentJoin?: (info: PeerInfo) => void;
    onAgentLeave?: () => void;
    onClientJoin?: (info: PeerInfo) => void;
    onClientLeave?: () => void;
    onStatusChange?: (status: string) => void;
  } = {}
): { channel: RealtimeChannel; cleanup: () => void } {
  const client = getCobrowseClient();
  const channelName = `cobrowse:${sessionId}`;
  const channel = client.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: crypto.randomUUID() },
    },
  });

  // Track Presence events for peer discovery.
  const peerStates = new Map<string, PresenceState>();

  // Register broadcast handlers BEFORE subscribe so the channel's join
  // message includes the event filter and the client-side callbacks are
  // attached before any messages can arrive.
  if (opts.broadcastHandlers) {
    for (const { event, handler } of opts.broadcastHandlers) {
      channel.on('broadcast', { event }, ({ payload }) => {
        try {
          handler(payload as Record<string, unknown>);
        } catch (err) {
          console.error(`[cobrowse] handler failed for ${event}`, err);
        }
      });
    }
  }

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, PresenceState[]>;
      const currentKeys = new Set(Object.keys(state));

      // Detect leaves
      for (const [key] of peerStates) {
        if (!currentKeys.has(key)) {
          const left = peerStates.get(key)!;
          peerStates.delete(key);
          if (left.role === 'agent') opts.onAgentLeave?.();
          if (left.role === 'client') opts.onClientLeave?.();
        }
      }

      // Detect joins
      for (const [key, presences] of Object.entries(state)) {
        if (!peerStates.has(key) && presences.length > 0) {
          const presence = presences[0] as unknown as PresenceState;
          peerStates.set(key, presence);
          if (presence.role === 'agent') opts.onAgentJoin?.(presence.info);
          if (presence.role === 'client') opts.onClientJoin?.(presence.info);
        }
      }
    })
    .subscribe(async (status) => {
      console.log(`[cobrowse] channel ${channelName} status: ${status}`);
      opts.onStatusChange?.(status as string);
    });

  return {
    channel,
    cleanup: () => {
      peerStates.clear();
      client.removeChannel(channel);
    },
  };
}

/**
 * Broadcast an event on the co-browse channel.
 *
 * Supabase Realtime truncates broadcast messages at ~20 KB wire size.
 * Events under ~16 KB JSON are sent directly. Larger events (especially
 * the rrweb FullSnapshot) should be uploaded to Supabase Storage and
 * sent as a reference event instead.
 */
export function broadcastEvent(
  channel: RealtimeChannel,
  event: string,
  payload: Record<string, unknown>
): void {
  channel.send({ type: 'broadcast', event, payload });
}

/**
 * Register a broadcast event handler on an already-subscribed channel.
 *
 * Use this when you receive the channel as a prop (e.g. RemoteCursorOverlay)
 * and cannot pass handlers at createCobrowseChannel time. For events created
 * via createCobrowseChannel, prefer the broadcastHandlers option instead,
 * which registers handlers before .subscribe() for guaranteed delivery.
 */
export function onBroadcastEvent(
  channel: RealtimeChannel,
  event: string,
  handler: (payload: Record<string, unknown>) => void
): () => void {
  channel.on('broadcast', { event }, ({ payload }) => {
    try {
      handler(payload as Record<string, unknown>);
    } catch (err) {
      console.error(`[cobrowse] handler failed for ${event}`, err);
    }
  });
  // No individual unsubscribe — channel.on() returns the same channel object,
  // so calling .unsubscribe() would close the entire channel. Handlers are
  // cleaned up when removeCobrowseChannel() is called on channel teardown.
  return () => {};
}

/**
 * Track Presence on the channel (sends identity to all subscribers).
 * Must be called after the channel is SUBSCRIBED.
 */
export function trackPresence(
  channel: RealtimeChannel,
  role: 'client' | 'agent',
  info: PeerInfo
): void {
  channel.track({
    role,
    info,
    joinedAt: Date.now(),
  } satisfies PresenceState);
}

/**
 * Untrack Presence (removes identity from the channel).
 */
export function untrackPresence(channel: RealtimeChannel): void {
  channel.untrack();
}

/**
 * Check if the channel is subscribed (ready to send/receive).
 */
export function isChannelReady(channel: RealtimeChannel): boolean {
  return channel.state === 'joined';
}

/**
 * Remove a co-browse channel from the Supabase client.
 */
export function removeCobrowseChannel(channel: RealtimeChannel): void {
  const client = getCobrowseClient();
  client.removeChannel(channel);
}

// ---------------------------------------------------------------------------
// Storage helpers — always use the anonymous cobrowse client so uploads and
// downloads succeed via the anon RLS policies regardless of any auth session
// on the main app Supabase client.
// ---------------------------------------------------------------------------

const BUCKET = 'support-sessions';

export async function uploadFullSnapshotStorage(
  sessionId: string,
  data: Blob
): Promise<{ path: string } | { error: string }> {
  const client = getCobrowseClient();
  const path = `fullsnapshots/${sessionId}_${Date.now()}.json.gz`;
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, data, { contentType: 'application/json' });
  if (error) return { error: error.message };
  return { path };
}

export async function downloadFullSnapshotStorage(
  path: string
): Promise<{ data: Blob } | { error: string }> {
  const client = getCobrowseClient();
  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error) return { error: error.message };
  return { data };
}
