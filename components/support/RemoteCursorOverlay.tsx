'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface AgentCursor {
  x: number;
  y: number;
  // true: x/y are percent (0-100) over the agent's replayer box, which maps
  // 1:1 to this viewport. false: x/y are raw agent-window pixels scaled by
  // the viewport ratio (legacy agents that predate percent coordinates).
  percent: boolean;
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
// Walk up from the element under the remote pointer and return the first
// actually scrollable ancestor (a scroll container with room to scroll). This
// lets wheel gestures drive the exact sub-container the agent is pointing at
// instead of always scrolling the window.
function findScrollable(el: Element | null): Element | null {
  for (let cur: Element | null = el; cur && cur !== document.documentElement; cur = cur.parentElement) {
    const style = window.getComputedStyle(cur);
    const overflowY = style.overflowY === 'auto' || style.overflowY === 'scroll';
    const overflowX = style.overflowX === 'auto' || style.overflowX === 'scroll';
    if ((overflowY && cur.scrollHeight > cur.clientHeight) || (overflowX && cur.scrollWidth > cur.clientWidth)) {
      return cur;
    }
  }
  return null;
}

export function RemoteCursorOverlay({ socket }: { socket: Socket }) {
  const [cursor, setCursor] = useState<AgentCursor | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [, setViewport] = useState({ width: 0, height: 0 });
  const pingIdRef = useRef(0);

  // Recompute pixel positions when the serviced user resizes their window,
  // since the laser is positioned from percent coordinates.
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onCursorMove = (data: {
      x: number;
      y: number;
      viewportWidth?: number | null;
      viewportHeight?: number | null;
      percentX?: number;
      percentY?: number;
    }) => {
      // Prefer the percent coordinates (version-tolerant): legacy agents only
      // send pixels + viewport, which we fall back to with the old scaling.
      const hasPercent = typeof data.percentX === 'number' && typeof data.percentY === 'number';
      setCursor({
        x: hasPercent ? data.percentX : data.x,
        y: hasPercent ? data.percentY : data.y,
        percent: hasPercent,
        viewportWidth: typeof data.viewportWidth === 'number' ? data.viewportWidth : null,
        viewportHeight: typeof data.viewportHeight === 'number' ? data.viewportHeight : null,
      });
    };

    const onPing = (data: { x: number; y: number; label?: string }) => {
      const id = ++pingIdRef.current;
      setPings((prev) => [...prev, { id, x: data.x, y: data.y, label: data.label || 'Look Here!' }]);
      setTimeout(() => {
        setPings((prev) => prev.filter((p) => p.id !== id));
      }, 2500);
    };

    const onRemoteClick = (data: { x: number; y: number }) => {
      // Clamp to the viewport so clicks on the client's screen borders still
      // hit a real element (elementFromPoint is empty outside the window).
      const x = Math.min(window.innerWidth - 1, Math.max(0, (data.x / 100) * window.innerWidth));
      const y = Math.min(window.innerHeight - 1, Math.max(0, (data.y / 100) * window.innerHeight));
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
      // Give focus + caret placement to form fields so the agent can type
      // into inputs/selects after clicking them.
      const interactive = el.closest('input, textarea, select, [contenteditable="true"]') as
        | HTMLElement
        | null;
      if (interactive && typeof interactive.focus === 'function') {
        interactive.focus();
        const input = interactive as HTMLInputElement;
        if (typeof input.select === 'function' && input.type !== 'hidden') {
          input.select();
        }
      }
    };

    const onScroll = (data: {
      deltaX: number;
      deltaY: number;
      x?: number;
      y?: number;
      smooth?: boolean;
    }) => {
      const deltaX = data.deltaX || 0;
      const deltaY = data.deltaY || 0;
      if (!deltaX && !deltaY) return;
      const behavior: ScrollBehavior = data.smooth ? 'smooth' : 'auto';
      // When the agent includes a pointer position, scroll the sub-container
      // under that point if it can scroll; otherwise fall back to the window.
      let target: Element | null = null;
      if (data.x !== undefined && data.y !== undefined) {
        const x = Math.min(window.innerWidth - 1, Math.max(0, (data.x / 100) * window.innerWidth));
        const y = Math.min(window.innerHeight - 1, Math.max(0, (data.y / 100) * window.innerHeight));
        target = findScrollable(document.elementFromPoint(x, y));
      }
      if (target) {
        target.scrollBy({ left: deltaX, top: deltaY, behavior });
      } else {
        window.scrollBy({ left: deltaX, top: deltaY, behavior });
      }
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

  // Percent maps 1:1 onto this viewport (the agent's replayer box IS the
  // serviced user's viewport, scaled to fit). Legacy pixel coordinates are
  // scaled by the agent/client viewport ratio, as before.
  let left = 0;
  let top = 0;
  if (cursor) {
    if (cursor.percent) {
      left = (Math.min(100, Math.max(0, cursor.x)) / 100) * window.innerWidth;
      top = (Math.min(100, Math.max(0, cursor.y)) / 100) * window.innerHeight;
    } else {
      const scaleX = cursor.viewportWidth ? window.innerWidth / cursor.viewportWidth : 1;
      const scaleY = cursor.viewportHeight ? window.innerHeight / cursor.viewportHeight : 1;
      left = cursor.x * scaleX;
      top = cursor.y * scaleY;
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999]">
      {cursor && (
        <div
          className="absolute"
          style={{
            left,
            top,
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