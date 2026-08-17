'use client';

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import pako from 'pako';

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

function getCobrowseClient(): SupabaseClient {
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
          handler(decodeSinglePayload(payload as Record<string, unknown>));
        } catch (err) {
          console.error(`[cobrowse] decode failed for ${event}`, err);
        }
      });
      // Also listen for chunked variants of the same event.
      channel.on('broadcast', { event: `${event}:chunk` }, ({ payload }) => {
        const reassembled = reassemble(event, payload as Record<string, unknown>);
        if (reassembled) handler(reassembled);
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

// ─── binary ↔ base64 helpers (safe for arbitrary Uint8Array data) ──────────

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── pako compression ──────────────────────────────────────────────────────

function compressPayload(payload: Record<string, unknown>): Uint8Array {
  const json = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(json);
  return pako.deflate(encoded, { level: 9 });
}

function decompressPayload(compressed: Uint8Array): Record<string, unknown> {
  const json = pako.inflate(compressed, { to: 'string' });
  return JSON.parse(json) as Record<string, unknown>;
}

// ─── chunking constants ────────────────────────────────────────────────────
//
// Supabase Realtime truncates broadcast messages at ~20 KB (20 480 bytes).
// After pako compression the compressed bytes are base64-encoded (×1.33),
// then wrapped in a JSON envelope {chunkId,i,t,d} (~80 bytes overhead).
// Use 12 KB compressed-byte chunks → ~16 KB base64 → well under the limit.

const CHUNK_RAW_BYTES = 12 * 1024;

// Events below this size after JSON.stringify skip compression entirely.
const COMPRESS_THRESHOLD = 4 * 1024;

/**
 * Broadcast an event on the co-browse channel.
 *
 * 1. Small payloads (<4 KB JSON) → sent as-is (fast path, no overhead).
 * 2. Compressed payload fits in one message (<18 KB wire) → single compressed event.
 * 3. Compressed payload too large → chunked compressed event.
 */
export function broadcastEvent(
  channel: RealtimeChannel,
  event: string,
  payload: Record<string, unknown>
): void {
  const serialized = JSON.stringify(payload);

  // Fast path: tiny event, no compression needed
  if (serialized.length <= COMPRESS_THRESHOLD) {
    channel.send({ type: 'broadcast', event, payload });
    return;
  }

  // Compress
  const compressed = compressPayload(payload);
  const b64 = uint8ToBase64(compressed);

  // Wire size ≈ base64 + ~80 bytes envelope overhead
  if (b64.length + 80 < 18 * 1024) {
    // Fits in a single message
    channel.send({
      type: 'broadcast',
      event,
      payload: { compressed: true, d: b64 },
    });
    return;
  }

  // Chunk the compressed bytes
  const totalChunks = Math.ceil(compressed.length / CHUNK_RAW_BYTES);
  const chunkId = crypto.randomUUID();
  console.debug(
    `[cobrowse] chunking ${event}: ${serialized.length} raw → ${compressed.length} compressed → ${totalChunks} chunks`
  );

  for (let i = 0; i < totalChunks; i++) {
    const slice = compressed.slice(i * CHUNK_RAW_BYTES, (i + 1) * CHUNK_RAW_BYTES);
    const sliceB64 = uint8ToBase64(slice);
    channel.send({
      type: 'broadcast',
      event: `${event}:chunk`,
      payload: { chunkId, i, t: totalChunks, d: sliceB64 },
    });
  }
}

// ─── chunk reassembly ──────────────────────────────────────────────────────

const pendingChunks = new Map<string, { t: number; parts: (string | undefined)[]; ts: number }>();

function reassemble(
  event: string,
  payload: Record<string, unknown>
): Record<string, unknown> | null {
  const { chunkId, i, t, d } = payload as {
    chunkId: string;
    i: number;
    t: number;
    d: string;
  };

  if (typeof chunkId !== 'string' || typeof i !== 'number' || typeof t !== 'number' || typeof d !== 'string') {
    console.warn(`[cobrowse] invalid chunk for ${event}`, payload);
    return null;
  }

  const key = `${event}:${chunkId}`;
  let entry = pendingChunks.get(key);
  if (!entry) {
    entry = { t, parts: new Array(t), ts: Date.now() };
    pendingChunks.set(key, entry);
  }

  if (entry.t !== t) {
    console.warn(`[cobrowse] chunk count mismatch for ${event}:${chunkId}, discarding`);
    pendingChunks.delete(key);
    return null;
  }

  entry.parts[i] = d;

  if (entry.parts.every((p) => p !== undefined)) {
    pendingChunks.delete(key);
    try {
      const b64 = entry.parts.join('');
      const bytes = base64ToUint8(b64);
      return decompressPayload(bytes);
    } catch (err) {
      console.error(`[cobrowse] reassemble failed for ${event}`, err);
      return null;
    }
  }

  return null;
}

// Evict chunks older than 30 s to prevent memory leaks from lost packets.
setInterval(() => {
  const cutoff = Date.now() - 30_000;
  for (const [key, entry] of pendingChunks) {
    if (entry.ts < cutoff) {
      console.warn(`[cobrowse] evicting stale chunk: ${key}`);
      pendingChunks.delete(key);
    }
  }
}, 15_000);

// ─── receive helpers ───────────────────────────────────────────────────────

function decodeSinglePayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (payload.compressed) {
    const bytes = base64ToUint8(payload.d as string);
    return decompressPayload(bytes);
  }
  return payload;
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
      handler(decodeSinglePayload(payload as Record<string, unknown>));
    } catch (err) {
      console.error(`[cobrowse] decode failed for ${event}`, err);
    }
  });
  channel.on('broadcast', { event: `${event}:chunk` }, ({ payload }) => {
    const reassembled = reassemble(event, payload as Record<string, unknown>);
    if (reassembled) handler(reassembled);
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
