'use client';

import type { RemoteCursor, Ping } from '@/hooks/useCoBrowse';

export function RemoteCursorOverlay({
  remoteCursor,
  pings,
}: {
  remoteCursor: RemoteCursor | null;
  pings: Ping[];
}) {
  let left = 0;
  let top = 0;
  if (remoteCursor) {
    if (remoteCursor.percent) {
      left = (Math.min(100, Math.max(0, remoteCursor.x)) / 100) * window.innerWidth;
      top = (Math.min(100, Math.max(0, remoteCursor.y)) / 100) * window.innerHeight;
    } else {
      const scaleX = remoteCursor.viewportWidth ? window.innerWidth / remoteCursor.viewportWidth : 1;
      const scaleY = remoteCursor.viewportHeight ? window.innerHeight / remoteCursor.viewportHeight : 1;
      left = remoteCursor.x * scaleX;
      top = remoteCursor.y * scaleY;
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999]">
      {remoteCursor && (
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
