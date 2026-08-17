'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { onBroadcastEvent } from '@/lib/cobrowse';

interface AgentCursor {
  x: number;
  y: number;
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

export function RemoteCursorOverlay({ channel }: { channel: RealtimeChannel }) {
  const [cursor, setCursor] = useState<AgentCursor | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [, setViewport] = useState({ width: 0, height: 0 });
  const pingIdRef = useRef(0);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const cleanups = [
      onBroadcastEvent(channel, 'agent-cursor-move', (payload) => {
        const data = payload as {
          x: number;
          y: number;
          viewportWidth?: number;
          viewportHeight?: number;
          percentX?: number;
          percentY?: number;
        };
        const hasPercent = typeof data.percentX === 'number' && typeof data.percentY === 'number';
        setCursor({
          x: hasPercent ? data.percentX! : data.x,
          y: hasPercent ? data.percentY! : data.y,
          percent: hasPercent,
          viewportWidth: typeof data.viewportWidth === 'number' ? data.viewportWidth : null,
          viewportHeight: typeof data.viewportHeight === 'number' ? data.viewportHeight : null,
        });
      }),

      onBroadcastEvent(channel, 'agent-ping-click', (payload) => {
        const data = payload as { x: number; y: number; label?: string };
        const id = ++pingIdRef.current;
        setPings((prev) => [...prev, { id, x: data.x, y: data.y, label: data.label || 'Look Here!' }]);
        setTimeout(() => {
          setPings((prev) => prev.filter((p) => p.id !== id));
        }, 2500);
      }),

      onBroadcastEvent(channel, 'agent-remote-click', (payload) => {
        const data = payload as { x: number; y: number };
        const x = Math.min(window.innerWidth - 1, Math.max(0, (data.x / 100) * window.innerWidth));
        const y = Math.min(window.innerHeight - 1, Math.max(0, (data.y / 100) * window.innerHeight));
        const el = document.elementFromPoint(x, y);
        console.debug(`[co-browse] client remote-click raw=(${data.x},${data.y}) px=(${x.toFixed(0)},${y.toFixed(0)}) element=${el?.tagName ?? 'null'} class="${el?.className ?? ''}"`);
        if (!el) return;
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
      }),

      onBroadcastEvent(channel, 'agent-scroll', (payload) => {
        const data = payload as {
          deltaX: number;
          deltaY: number;
          x?: number;
          y?: number;
          smooth?: boolean;
        };
        const deltaX = data.deltaX || 0;
        const deltaY = data.deltaY || 0;
        if (!deltaX && !deltaY) return;
        const behavior: ScrollBehavior = data.smooth ? 'smooth' : 'auto';
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
      }),

      onBroadcastEvent(channel, 'agent-remote-keypress', (payload) => {
        const { type, key, code, keyCode, altKey, ctrlKey, metaKey, shiftKey } = payload as {
          type: string;
          key: string;
          code: string;
          keyCode: number;
          altKey: boolean;
          ctrlKey: boolean;
          metaKey: boolean;
          shiftKey: boolean;
        };
        const target = document.activeElement;
        if (!target || !(target instanceof HTMLElement)) return;
        target.dispatchEvent(
          new KeyboardEvent(type as 'keydown' | 'keyup', {
            key,
            code,
            keyCode,
            altKey,
            ctrlKey,
            metaKey,
            shiftKey,
            bubbles: true,
            cancelable: true,
            view: window,
          })
        );
      }),
    ];

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [channel]);

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
