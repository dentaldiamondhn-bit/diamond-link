/**
 * Resolve the co-browsing relay (Socket.IO server) URL.
 *
 * The relay runs as a standalone Node process (server/support-socket.js) on a
 * VPS/Railway host and cannot live inside the serverless Next.js app, so it
 * cannot rely on `localhost` once real users (not just the dev machine) are
 * served. Resolution order:
 *
 *  1. NEXT_PUBLIC_SOCKET_SERVER_URL (explicit, recommended for production).
 *  2. The current origin's hostname on port 4000 — same protocol as the page
 *     so HTTPS pages never hit a mixed-content ws:// endpoint. Falls back to
 *     http://localhost:4000 on the dev machine.
 */
export function getSocketServerUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
  if (explicit) return explicit;
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const scheme = protocol === 'https:' ? 'https' : 'http';
    return `${scheme}://${hostname}:4000`;
  }
  return 'http://localhost:4000';
}
