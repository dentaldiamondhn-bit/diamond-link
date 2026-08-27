import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Roles allowed to perform a step-up (reverification) override of a
 * historical version. Mirrors the tech-support role names used across the
 * codebase (middleware.ts uses 'tech_support' / 'tech-support').
 */
export const OVERRIDE_ROLES = ['admin', 'support', 'tech_support', 'tech-support'];

/** Known tech-support user whose Clerk metadata is missing (see middleware.ts). */
const KNOWN_TECH_SUPPORT_USER_ID = 'user_3A1mYfR054eV3tqtellpfMKZ7f6';

export function normalizeRole(role: unknown): string {
  return String(role ?? 'staff').toLowerCase();
}

export function isOverrideRole(role: unknown): boolean {
  return OVERRIDE_ROLES.includes(normalizeRole(role));
}

/**
 * Extract the role from Clerk session claims, trying the same metadata
 * locations used by middleware.ts.
 */
export function extractRoleFromClaims(claims: unknown): string {
  const c = (claims ?? {}) as Record<string, Record<string, unknown> | unknown>;
  if (typeof c?.public_metadata === 'object' && c.public_metadata !== null) {
    const role = (c.public_metadata as Record<string, unknown>).role;
    if (role) return String(role);
  }
  if (typeof c?.metadata === 'object' && c.metadata !== null) {
    const role = (c.metadata as Record<string, unknown>).role;
    if (role) return String(role);
  }
  if (typeof c?.role === 'string') return c.role;
  return 'staff';
}

/** Check role from raw claims + the known tech-support user fallback. */
export function hasOverrideRole(claims: unknown, userId?: string | null): boolean {
  if (isOverrideRole(extractRoleFromClaims(claims))) return true;
  return userId === KNOWN_TECH_SUPPORT_USER_ID;
}

interface ClerkUserLike {
  id?: string;
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
}

/**
 * Check a Clerk user object (Clerk Backend SDK) for an admin/support role.
 * Used by verify-admin-override to authorize the VERIFIED admin account.
 */
export function isOverrideUser(user: ClerkUserLike | null | undefined): boolean {
  if (!user) return false;
  const role = user.publicMetadata?.role ?? user.privateMetadata?.role ?? 'staff';
  if (isOverrideRole(role)) return true;
  return user.id === KNOWN_TECH_SUPPORT_USER_ID;
}

const OVERRIDE_TOKEN_TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  return process.env.OVERRIDE_TOKEN_SECRET || process.env.CLERK_SECRET_KEY || 'ortho-override-secret';
}

export interface OverrideTokenPayload {
  versionId: string;
  adminUserId: string;
  exp: number;
}

/**
 * Sign a short-lived override token. Only issued by the verify-admin-override
 * server action AFTER Clerk reverification + admin/support role verification.
 */
export function signOverrideToken(payload: { versionId: string; adminUserId: string }): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + OVERRIDE_TOKEN_TTL_MS })
  ).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** Verify a previously issued override token (HMAC + TTL + version binding). */
export function verifyOverrideToken(token: string | null, expected: { versionId: string }): boolean {
  const payload = decodeOverrideToken(token);
  return !!payload && payload.versionId === expected.versionId;
}

/**
 * Decode a previously issued override token, verifying HMAC integrity and TTL.
 * Returns the payload (versionId, adminUserId, exp) or null when invalid/expired.
 */
export function decodeOverrideToken(token: string | null): OverrideTokenPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expectedSig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(expectedSig);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as OverrideTokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
