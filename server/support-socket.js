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
 *   agent  -> client : 'agent-cursor-move'  { roomId, x, y, viewportWidth, viewportHeight }
 *   agent  -> client : 'agent-ping-click'   { roomId, x, y, label }
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
});

// roomId -> { events: event[], sockets: Map<socketId, role> }
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, { events: [], sockets: new Map() });
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  const joined = new Set();

  socket.on('join-room', ({ roomId, role }) => {
    if (typeof roomId !== 'string' || !roomId) return;
    socket.join(roomId);
    joined.add(roomId);
    const room = getRoom(roomId);
    room.sockets.set(socket.id, role || 'client');

    // Backfill for agents joining mid-session.
    if (room.events.length > 0) {
      socket.emit('room-buffer', { events: room.events });
    }
    console.log(`[relay] joined room=${roomId} role=${role || 'client'} socket=${socket.id}`);
  });

  // Client -> Agent: DOM Mutation Events (Stream)
  socket.on('dom-mutation-event', ({ roomId, event }) => {
    if (typeof roomId !== 'string' || !roomId || !event) return;
    const room = getRoom(roomId);
    room.events.push(event);
    if (room.events.length > BUFFER_SIZE) room.events.shift();
    socket.to(roomId).emit('replay-event', event);
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