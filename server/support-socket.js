/**
 * Support Relay (Co-Browsing Socket Server)
 * ------------------------------------------
 * Standalone Socket.IO server that forwards co-browsing events between the
 * client (dental clinic UI) and the support agent (tech-support page).
 *
 * Deploy separately: the Next.js app runs on Vercel (serverless), which
 * cannot host long-running sockets. Run this file with Node on a VPS/Railway
 * and point NEXT_PUBLIC_SOCKET_SERVER_URL at it.
 *
 * Channels (spec):
 *   client -> agent  : 'dom-mutation-event' { roomId, event }  (rrweb events)
 *   client -> agent  : 'client-cursor-move' { roomId, x, y }  (client pointer, % of client viewport)
 *   agent  -> client : 'agent-cursor-move'  { roomId, x, y, viewportWidth, viewportHeight }
 *   agent  -> client : 'agent-ping-click'   { roomId, x, y, label }   (% of replayer viewport)
 *   agent  -> client : 'agent-remote-click' { roomId, x, y }          (% of replayer viewport)
 *   agent  -> client : 'agent-scroll'       { roomId, deltaX, deltaY }
 *   either -> other  : 'peer-info'          { roomId, role, info }    (identity: userId/name/imageUrl)
 *
 * Extra (privacy-first):
 *   - per-room ring buffer (last 500 events) replayed to agents that join
 *     late via 'room-buffer', so recording/QA backfill works mid-session
 *   - rooms are dropped from memory once the last socket disconnects
 *   - nothing is persisted to disk
 */

import http from 'node:http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 4000;
const BUFFER_SIZE = 500;

const server = http.createServer((_req, res) => {
  res.writeHead(204);
  res.end();
});

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  // Full snapshots of large pages (Next.js + Tailwind) can exceed Socket.IO's
  // default 1MB limit; without this the relay silently drops the snapshot and
  // the agent sees a blank screen with only the mouse tail.
  maxHttpBufferSize: 50 * 1024 * 1024,
});

// roomId -> { events: event[], fullSnapshot: event | null, metaEvent: event | null, sockets: Map<socketId, role>, clientInfo: object|null, agentInfo: object|null }
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { events: [], fullSnapshot: null, metaEvent: null, sockets: new Map(), clientInfo: null, agentInfo: null });
  }
  return rooms.get(roomId);
}

function sanitizeInfo(info) {
  if (!info || typeof info !== 'object') return null;
  const out = {};
  if (typeof info.userId === 'string') out.userId = info.userId;
  if (typeof info.name === 'string' && info.name) out.name = info.name;
  if (typeof info.imageUrl === 'string' && info.imageUrl) out.imageUrl = info.imageUrl;
  return Object.keys(out).length > 0 ? out : null;
}

io.on('connection', (socket) => {
  const joined = new Set();

  socket.on('join-room', ({ roomId, role, info }) => {
    if (typeof roomId !== 'string' || !roomId) return;
    socket.join(roomId);
    joined.add(roomId);
    const room = getRoom(roomId);
    room.sockets.set(socket.id, role || 'client');

    // Store the joining peer's identity and tell everyone else in the room.
    // The joining socket is also immediately given the other peer's identity
    // (if any) so both sides can render profile image + name right away.
    const cleanRole = role === 'agent' ? 'agent' : 'client';
    const cleanInfo = sanitizeInfo(info);
    if (cleanInfo) {
      if (cleanRole === 'agent') {
        room.agentInfo = cleanInfo;
      } else {
        room.clientInfo = cleanInfo;
      }
      socket.to(roomId).emit('peer-info', { role: cleanRole, info: cleanInfo });
    }
    if (cleanRole === 'agent' && room.clientInfo) {
      socket.emit('peer-info', { role: 'client', info: room.clientInfo });
    } else if (cleanRole !== 'agent' && room.agentInfo) {
      socket.emit('peer-info', { role: 'agent', info: room.agentInfo });
    }

    // Backfill for agents joining mid-session. The room buffer only keeps
    // the last BUFFER_SIZE events; without the initial Meta + FullSnapshot
    // pair the Replayer has no viewport dimensions (Meta, type 4 — needed
    // for the iframe to get dimensions via 'resize') and no DOM tree
    // (FullSnapshot, type 2) to build on (blank screen). The relay retains
    // the latest Meta + FullSnapshot pair and prepends them so backfills
    // always start from a complete, renderable state.
    if (room.events.length > 0 || room.fullSnapshot) {
      const events = [];
      // Strip any Meta or FullSnapshot events that are still in the ring
      // buffer to avoid duplicates — we'll prepend the retained pair instead.
      // (Periodic snapshots every 60s produce new Meta+FullSnapshot pairs;
      // we want only the latest one, so we filter ALL Meta/FullSnapshot from
      // the ring buffer portion and prepend exactly one clean pair.)
      const bufferSansSnapshots = room.events.filter(
        (e) => e.type !== 4 && e.type !== 2
      );
      if (room.metaEvent) {
        events.push(room.metaEvent);
      }
      if (room.fullSnapshot) {
        events.push(room.fullSnapshot);
      }
      events.push(...bufferSansSnapshots);
      socket.emit('room-buffer', { events });
      console.log(`[relay] room-buffer sent to ${socket.id} room=${roomId} events=${events.length}`);
    }
    console.log(`[relay] joined room=${roomId} role=${role || 'client'} socket=${socket.id}`);
  });

  // Client -> Agent: DOM Mutation Events (Stream)
  socket.on('dom-mutation-event', ({ roomId, event }) => {
    if (typeof roomId !== 'string' || !roomId || !event) return;
    const room = getRoom(roomId);
    room.events.push(event);
    if (room.events.length > BUFFER_SIZE) room.events.shift();
    // Retain the latest Meta (type 4) and FullSnapshot (type 2) pair.
    // Both are needed for a late-joining agent: the Meta gives the Replayer
    // viewport dimensions (it emits 'resize' when processed), and the
    // FullSnapshot provides the DOM tree to rebuild. We keep the latest
    // pair so periodic snapshots (every 60s) refresh the retained state.
    if (event.type === 4) {
      room.metaEvent = event;
      if (process.env.DEBUG_RELAY) {
        console.log(`[relay] retained meta event for room=${roomId}`);
      }
    }
    if (event.type === 2) {
      room.fullSnapshot = event;
      console.log(`[relay] retained full snapshot for room=${roomId}`);
    }
    socket.to(roomId).emit('replay-event', event);
    if (process.env.DEBUG_RELAY) {
      console.log(
        `[relay] mutation room=${roomId} type=${event.type} buffer=${room.events.length} members=${room.sockets.size}`
      );
    }
  });

  // Agent -> Client: Remote Cursor Movements (Laser)
  socket.on('agent-cursor-move', ({ roomId, x, y, viewportWidth, viewportHeight }) => {
    if (typeof roomId !== 'string' || !roomId) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    socket.to(roomId).emit('client-show-agent-cursor', {
      x,
      y,
      viewportWidth: typeof viewportWidth === 'number' ? viewportWidth : null,
      viewportHeight: typeof viewportHeight === 'number' ? viewportHeight : null,
    });
  });

  // Agent -> Client: Visual Ping / Ripple Effect
  socket.on('agent-ping-click', ({ roomId, x, y, label }) => {
    if (typeof roomId !== 'string' || !roomId) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    socket.to(roomId).emit('client-show-ping', {
      x,
      y,
      label: typeof label === 'string' && label ? label : 'Look Here!',
    });
  });

  // Client -> Agent: Client Pointer Position (sync the serviced user's cursor)
  socket.on('client-cursor-move', ({ roomId, x, y }) => {
    if (typeof roomId !== 'string' || !roomId) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    socket.to(roomId).emit('agent-show-client-cursor', { x, y });
  });

  // Agent -> Client: Remote Control Click (drive the serviced user's buttons)
  socket.on('agent-remote-click', ({ roomId, x, y }) => {
    if (typeof roomId !== 'string' || !roomId) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    socket.to(roomId).emit('client-remote-click', { x, y });
  });

  // Agent -> Client: Remote Scroll (drive the serviced user's DOM viewport)
  socket.on('agent-scroll', ({ roomId, deltaX, deltaY }) => {
    if (typeof roomId !== 'string' || !roomId) return;
    if (typeof deltaX !== 'number' && typeof deltaY !== 'number') return;
    socket.to(roomId).emit('client-scroll', {
      deltaX: typeof deltaX === 'number' ? deltaX : 0,
      deltaY: typeof deltaY === 'number' ? deltaY : 0,
    });
  });

  socket.on('disconnect', () => {
    for (const roomId of joined) {
      const room = rooms.get(roomId);
      if (!room) continue;
      room.sockets.delete(socket.id);
      if (room.sockets.size === 0) {
        rooms.delete(roomId); // free memory when the session ends
        console.log(`[relay] room closed room=${roomId}`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`[relay] Support relay listening on port ${PORT}`);
});