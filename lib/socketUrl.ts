/**
 * Resolve the co-browsing relay (Socket.IO server) URL.
 *
 * The relay runs as a standalone Node process (server/support-socket.js) on a
 * VPS/Railway host and cannot live inside the serverless Next.js app, so it
 * cannot rely on `localhost` once real users (not just the dev machine) are
 * served. Resolution order:
 *
 *  1. NEXT_PUBLIC_SOCKET_SERVER_URL (explicit, required for production).
 *  2. On localhost dev only: fall back to http://localhost:4000.
 *
 * In production (HTTPS), the env var MUST be set — the fallback to
 * hostname:4000 would point at the Vercel domain where no relay runs,
 * causing "Relay desconectado" for every non-localhost user.
 */
export function getSocketServerUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
  if (explicit) return explicit;

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local');

    if (isLocal) {
      const scheme = protocol === 'https:' ? 'https' : 'http';
      return `${scheme}://${hostname}:4000`;
    }

    // Production without NEXT_PUBLIC_SOCKET_SERVER_URL — surface a clear error
    // instead of silently connecting to the wrong host (which causes the
    // unhelpful "Relay desconectado" message).
    console.error(
      '[socket-url] NEXT_PUBLIC_SOCKET_SERVER_URL is not set. ' +
        'Co-browsing relay will not work outside localhost. ' +
        'Set this env var to the relay\'s public URL (e.g. https://relay.example.com:4000).'
    );
    // Return a value that will fail fast (connection refused) rather than
    // silently connecting to the wrong host.
    return `${protocol}//${hostname}:4000`;
  }

  return 'http://localhost:4000';
}
