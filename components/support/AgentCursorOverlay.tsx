'use client';

/**
 * Agent-side overlay showing the serviced user's real pointer over the
 * replayed DOM (client -> agent cursor sync). Position is given in pixels
 * relative to the replayer container (computed against the scaled/centered
 * iframe by the agent page). pointer-events are disabled so it never blocks
 * the agent's own input.
 */
export function AgentCursorOverlay({
  cursor,
}: {
  cursor: { left: number; top: number } | null;
}) {
  if (!cursor) return null;

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: cursor.left,
        top: cursor.top,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-lg">
        <path
          d="M4 2l16 8-7 2-3 7z"
          fill="#3b82f6"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute left-4 top-0 whitespace-nowrap rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
        Usuario
      </span>
    </div>
  );
}
