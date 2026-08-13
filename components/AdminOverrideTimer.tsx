'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminOverride } from '@/contexts/AdminOverrideContext';

/**
 * Floating countdown bubble shown right above the GlobalChatBubble while an
 * admin/support unlock of a historical version is active. Counts down the
 * override token's remaining lifetime (10 minutes from issuance); turns red
 * during the last minute and auto-clears (re-locks the version) on expiry.
 */
export default function AdminOverrideTimer() {
  const { overrides, recentVersionId, clearOverride } = useAdminOverride();
  const [now, setNow] = useState(() => Date.now());

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

  if (!override) return null;

  const remainingMs = Math.max(0, override.expiresAt - now);
  const remainingSecTotal = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSecTotal / 60);
  const seconds = remainingSecTotal % 60;
  const timeText = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = remainingMs <= 60 * 1000;
  const isExpired = remainingMs <= 0;

  return (
    <div className="fixed z-40 bottom-24 right-6">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-2 rounded-full pl-3 pr-2 py-2 shadow-xl border ${
            isExpired
              ? 'bg-red-600 text-white border-red-700'
              : isUrgent
                ? 'bg-red-500 text-white border-red-600 animate-pulse'
                : 'bg-amber-500 text-white border-amber-600'
          }`}
          title="Tiempo restante del desbloqueo Admin/Support (10 minutos)"
        >
          <i className={`fas ${isExpired ? 'fa-lock' : 'fa-hourglass-half'} text-sm`}></i>
          <span className="text-xs font-medium leading-none">
            Unlock v{override.versionNumber}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-bold tabular-nums bg-white/25 text-white">
            {isExpired ? 'expirado' : timeText}
          </span>
          <button
            type="button"
            onClick={() => clearOverride(override.versionId)}
            className="p-1 rounded-full hover:bg-white/25 transition-colors"
            aria-label="Bloquear de nuevo"
            title="Bloquear de nuevo"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}