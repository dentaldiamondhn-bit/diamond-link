/**
 * Pure security decision helpers shared by API route gates.
 * Deliberately import-free so the module is unit-testable and edge-safe;
 * responses use the standard Response API, which Next route handlers accept.
 */

export type SecurityGateDecision = 'allow' | 'unauthorized' | 'forbidden';

/** Strict admin check: exact lowercase 'admin', case-sensitive. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}

/** Fail-closed admin gate decision from a resolved Clerk session. */
export function resolveAdminGate(input: {
  userId?: string | null;
  role?: string | null;
}): SecurityGateDecision {
  if (!input?.userId) return 'unauthorized';
  return isAdminRole(input.role ?? null) ? 'allow' : 'forbidden';
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

export type InfraEndpointDecision = 'allow' | 'deny';

/**
 * Maintenance/DDL endpoints are denied in production outright and require the
 * shared cron secret header in every other environment. Any unset or
 * mismatched value fails closed.
 */
export function resolveInfraEndpointAccess(input: {
  nodeEnv?: string | undefined;
  configuredSecret?: string | null | undefined;
  providedSecret?: string | null | undefined;
}): InfraEndpointDecision {
  if (input?.nodeEnv === 'production') return 'deny';
  const configured = input?.configuredSecret ?? '';
  const provided = (input?.providedSecret ?? '').trim();
  if (!configured || !provided) return 'deny';
  return provided === configured ? 'allow' : 'deny';
}

export function infraEndpointHiddenResponse(): Response {
  return Response.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Composed request guard for maintenance/DDL endpoints. Returns a 404
 * Response to short-circuit the handler, or null when the caller may proceed.
 */
export function infraEndpointGuard(request: Request): Response | null {
  const decision = resolveInfraEndpointAccess({
    nodeEnv: process.env.NODE_ENV,
    configuredSecret: process.env.CRON_SECRET,
    providedSecret: request.headers.get('x-cron-secret'),
  });
  return decision === 'allow' ? null : infraEndpointHiddenResponse();
}

/** Parse a comma-separated env value into a trimmed, de-duplicated free id list. */
export function parseCommaSeparatedIds(value?: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(',')) {
    const id = part.trim();
    if (id) seen.add(id);
  }
  return [...seen];
}
