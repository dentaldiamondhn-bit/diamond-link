'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface AgentCursor {
  x: number;
  y: number;
  viewportWidth: number | null;
  viewportHeight: number | null;
}

interface Ping {
  id: number;
  x: number;
  y: number;
  label: string;
}

/**
 * Client overlay showing the support agent's remote cursor (laser pointer)
 * and visual pings. Rendered above everything with pointer-events disabled
 * so it never blocks the user's own interactions.
 *
 * Also receives the agent's remote-control actions:
 *  - remote clicks are replayed as synthetic mouse events on the element under
 *    the given point, so the agent can operate the serviced user's buttons.
 *  - scroll deltas drive the serviced user's DOM viewport.
 *
 * Coordinates are normalized (percent): the agent sends viewport-relative x/y
 * plus the viewport size they were computed against; we scale to the client's
 * current viewport so the cursor stays accurate across different screen sizes.
 */
export function RemoteCursorOverlay({ socket }: { socket: Socket }) {
  const [cursor, setCursor] = useState<AgentCursor | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const pingIdRef = useRef(0);

  useEffect(() => {
    const onCursorMove = (data: AgentCursor) => setCursor(data);

    const onPing = (data: { x: number; y: number; label?: string }) => {
      const id = ++pingIdRef.current;
      setPings((prev) => [...prev, { id, x: data.x, y: data.y, label: data.label || 'Look Here!' }]);
      setTimeout(() => {
        setPings((prev) => prev.filter((p) => p.id !== id));
      }, 2500);
    };

    const onRemoteClick = (data: { x: number; y: number }) => {
      const x = (data.x / 100) * window.innerWidth;
      const y = (data.y / 100) * window.innerHeight;
      const el = document.elementFromPoint(x, y);
      if (!el) return;
      // Dispatch a full mouse sequence so both native listeners and React's
      // synthetic onClick (attached at the root) are triggered.
      for (const type of ['mousedown', 'mouseup', 'click'] as const) {
        el.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0,
          })
        );
      }
    };

    const onScroll = (data: { deltaX: number; deltaY: number }) => {
      window.scrollBy({
        left: data.deltaX || 0,
        top: data.deltaY || 0,
        behavior: 'smooth',
      });
    };

    socket.on('client-show-agent-cursor', onCursorMove);
    socket.on('client-show-ping', onPing);
    socket.on('client-remote-click', onRemoteClick);
    socket.on('client-scroll', onScroll);
    return () => {
      socket.off('client-show-agent-cursor', onCursorMove);
      socket.off('client-show-ping', onPing);
      socket.off('client-remote-click', onRemoteClick);
      socket.off('client-scroll', onScroll);
    };
  }, [socket]);

  const scaleX = cursor?.viewportWidth
    ? window.innerWidth / cursor.viewportWidth
    : 1;
  const scaleY = cursor?.viewportHeight
    ? window.innerHeight / cursor.viewportHeight
    : 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999]">
      {cursor && (
        <div
          className="absolute"
          style={{
            left: cursor.x * scaleX,
            top: cursor.y * scaleY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Remote Cursor */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="drop-shadow-lg"
          >
            <path
              d="M4 2l16 8-7 2-3 7z"
              fill="#f43f5e"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute left-4 top-0 whitespace-nowrap rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            Soporte
          </span>
        </div>
      )}

      {pings.map((ping) => (
        <div
          key={ping.id}
          className="absolute"
          style={{
            left: `${ping.x}%`,
            top: `${ping.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Ping ripple */}
          <span className="block h-10 w-10 rounded-full border-4 border-amber-400 ping-ripple" />
          <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow">
            {ping.label}
          </span>
        </div>
      ))}

      <style jsx>{`
        .ping-ripple {
          animation: pingExpand 2.5s ease-out forwards;
        }
        @keyframes pingExpand {
          0% {
            transform: scale(0.3);
            opacity: 0.9;
          }
          60% {
            transform: scale(1.6);
            opacity: 0.4;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}