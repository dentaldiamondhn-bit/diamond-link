'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminOverride } from '@/contexts/AdminOverrideContext';

/** Collapse to a circle shortly after the unlock appears. */
const COLLAPSE_DELAY_MS = 10_000;

/** Smooth color fades last 8-10s, so zone crossings feel gradual. */
const COLOR_TRANSITION = 'background-color 9s ease, border-color 9s ease';

/** Smooth expand/collapse morph of the inner segments. */
const MORPH_TRANSITION = { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const };

type Zone = 'green' | 'yellow' | 'orange' | 'red';

const ZONE_STYLES: Record<Zone, { bg: string; border: string; pulse: boolean }> = {
  green: { bg: 'bg-green-500', border: 'border-green-600', pulse: false },
  yellow: { bg: 'bg-yellow-500', border: 'border-yellow-600', pulse: false },
  orange: { bg: 'bg-orange-500', border: 'border-orange-600', pulse: false },
  red: { bg: 'bg-red-500', border: 'border-red-600', pulse: true },
};

function getZone(remainingMs: number): Zone {
  if (remainingMs <= 90_000) return 'red'; // 1:30 -> pulsating red
  if (remainingMs <= 300_000) return 'orange'; // 5:00 -> orange
  if (remainingMs <= 420_000) return 'yellow'; // 7:00 -> yellow
  return 'green'; // 10:00 -> green
}

/**
 * Floating countdown bubble shown next to the support widget while an
 * admin/support unlock of a historical version is active. Counts down the
 * override token's remaining lifetime (10 minutes from issuance). Collapses
 * to a small circle 10s after unlocking; hovering (or tapping on touch
 * devices) expands it again with a smooth morph. Color fades green -> yellow
 * -> orange -> red (pulsing) as time runs out; auto-clears (re-locks) on
 * expiry.
 */
export default function AdminOverrideTimer() {
  const { overrides, recentVersionId, clearOverride } = useAdminOverride();
  const [now, setNow] = useState(() => Date.now());
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const override = recentVersionId ? overrides[recentVersionId] : null;

  // Auto re-lock when the token lifetime ends.
  useEffect(() => {
    if (override && override.expiresAt <= Date.now()) {
      clearOverride(override.versionId);
    }
  }, [override, clearOverride]);

  // Start expanded on a fresh unlock (adjusting state in render, the
  // recommended pattern for resetting state when a prop changes).
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  if (override?.versionId && override.versionId !== activeVersionId) {
    setActiveVersionId(override.versionId);
    setCollapsed(false);
    setTapped(false);
  }

  // Then collapse to the circle after the delay.
  useEffect(() => {
    if (!activeVersionId) return;
    const id = setTimeout(() => setCollapsed(true), COLLAPSE_DELAY_MS);
    return () => clearTimeout(id);
  }, [activeVersionId]);

  if (!override) return null;

  const remainingMs = Math.max(0, override.expiresAt - now);
  const remainingSecTotal = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSecTotal / 60);
  const seconds = remainingSecTotal % 60;
  const timeText = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const isExpired = remainingMs <= 0;
  const zone = getZone(remainingMs);
  const { bg, border, pulse } = ZONE_STYLES[zone];
  const expanded = !collapsed || hovered || tapped;

  return (
    <div
      className="fixed z-40 bottom-24 right-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setTapped((value) => !value)}
    >
      <AnimatePresence>
        <motion.div
          key="bubble"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center rounded-full shadow-xl border text-white ${bg} ${border} ${pulse ? 'animate-pulse' : ''}`}
          style={{ transition: COLOR_TRANSITION, overflow: 'hidden' }}
          title="Tiempo restante del desbloqueo Admin/Support (10 minutos)"
        >
          {/* Leading: icon + label — smoothly shrinks away when collapsed */}
          <motion.div
            initial={false}
            animate={{ width: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
            transition={MORPH_TRANSITION}
            className="flex items-center gap-2 overflow-hidden whitespace-nowrap pl-3"
          >
            <i className={`fas ${isExpired ? 'fa-lock' : 'fa-hourglass-half'} text-sm`}></i>
            <span className="text-xs font-medium leading-none">
              Unlock v{override.versionNumber}
            </span>
          </motion.div>

          {/* Time chip — always visible, grows slightly when expanded */}
          <motion.span
            initial={false}
            animate={{
              paddingLeft: expanded ? 10 : 14,
              paddingRight: expanded ? 10 : 14,
            }}
            transition={MORPH_TRANSITION}
            className="py-1.5 rounded-full text-xs font-bold tabular-nums bg-white/25 text-white whitespace-nowrap"
          >
            {isExpired ? 'expirado' : timeText}
          </motion.span>

          {/* Trailing: lock-again button — smoothly shrinks away when collapsed */}
          <motion.div
            initial={false}
            animate={{ width: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
            transition={MORPH_TRANSITION}
            className="overflow-hidden whitespace-nowrap"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearOverride(override.versionId);
              }}
              className="p-1 pr-2 rounded-full hover:bg-white/25 transition-colors"
              aria-label="Bloquear de nuevo"
              title="Bloquear de nuevo"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
