'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface ActiveOverride {
  versionId: string;
  versionNumber: number;
  token: string;
  /** Authoritative expiry timestamp (ms) decoded from the override token. */
  expiresAt: number;
}

interface AdminOverrideContextValue {
  /** versionId -> active override (never includes expired entries). */
  overrides: Record<string, ActiveOverride>;
  /** versionId of the most recently unlocked version (drives the timer bubble). */
  recentVersionId: string | null;
  unlockVersion: (versionId: string, versionNumber: number, token: string) => void;
  getOverrideToken: (versionId: string) => string | null;
  clearOverride: (versionId: string) => void;
}

const AdminOverrideContext = createContext<AdminOverrideContextValue | null>(null);

/**
 * Decode the `exp` timestamp (ms) embedded in the HMAC override token body.
 * The token is `base64url(JSON).base64url(HMAC)`; the payload is public
 * (integrity comes from the signature, only ever verified server-side).
 * Returns 0 when the token is not decodable.
 */
export function decodeOverrideExpiry(token: string): number {
  try {
    const body = token.split('.')[0];
    if (!body) return 0;
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : 0;
  } catch {
    return 0;
  }
}

export function AdminOverrideProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, ActiveOverride>>({});
  const [recentVersionId, setRecentVersionId] = useState<string | null>(null);

  const pruneExpired = (current: Record<string, ActiveOverride>) => {
    const now = Date.now();
    let changed = false;
    const next: Record<string, ActiveOverride> = {};
    for (const [id, override] of Object.entries(current)) {
      if (override.expiresAt > now) next[id] = override;
      else changed = true;
    }
    return changed ? next : current;
  };

  const unlockVersion = useCallback((versionId: string, versionNumber: number, token: string) => {
    const expiresAt = decodeOverrideExpiry(token);
    const override: ActiveOverride = {
      versionId,
      versionNumber,
      token,
      expiresAt: expiresAt > 0 ? expiresAt : Date.now() + 10 * 60 * 1000,
    };
    setOverrides((current) => pruneExpired({ ...current, [versionId]: override }));
    setRecentVersionId(versionId);
  }, []);

  const getOverrideToken = useCallback(
    (versionId: string): string | null => {
      const override = overrides[versionId];
      if (!override) return null;
      if (override.expiresAt <= Date.now()) {
        setOverrides((current) => pruneExpired(current));
        return null;
      }
      return override.token;
    },
    [overrides]
  );

  const clearOverride = useCallback((versionId: string) => {
    setOverrides((current) => {
      const next = { ...current };
      delete next[versionId];
      return next;
    });
    setRecentVersionId((current) => (current === versionId ? null : current));
  }, []);

  const value = useMemo<AdminOverrideContextValue>(
    () => ({
      overrides,
      recentVersionId,
      unlockVersion,
      getOverrideToken,
      clearOverride,
    }),
    [overrides, recentVersionId, unlockVersion, getOverrideToken, clearOverride]
  );

  return <AdminOverrideContext.Provider value={value}>{children}</AdminOverrideContext.Provider>;
}

export function useAdminOverride(): AdminOverrideContextValue {
  const context = useContext(AdminOverrideContext);
  if (!context) {
    throw new Error('useAdminOverride must be used within an AdminOverrideProvider');
  }
  return context;
}