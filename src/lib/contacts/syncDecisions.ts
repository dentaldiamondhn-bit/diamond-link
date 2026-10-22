/**
 * Pure reconcile decisions for the local-first contacts sync. Kept dependency
 * free (no IndexedDB, no Supabase client) so it can be unit-tested directly.
 */

/**
 * Who wins when a remote contact row meets the local copy.
 *
 * - `take-remote`: no local row, or the local row is clean — the server copy is
 *   authoritative and replaces the local one.
 * - `keep-local`: an unsynced local edit is newer (or ties). `>=` (not `>`) stops
 *   a millisecond-equality collision from silently dropping a pending local edit;
 *   the next push re-stamps `updated_at`.
 */
export function decideContactReconcile(
  existing: { updated_at?: string | null; synced: number } | undefined,
  remote: { updated_at?: string | null },
): 'take-remote' | 'keep-local' {
  if (!existing) return 'take-remote'
  if (existing.synced !== 0) return 'take-remote'
  const remoteTs = new Date(remote.updated_at ?? 0).getTime()
  const localTs = new Date(existing.updated_at ?? 0).getTime()
  return localTs >= remoteTs ? 'keep-local' : 'take-remote'
}

/**
 * `patient_id` is written outside the contacts app too (the patient form links a
 * contact to an EHR server-side). When a pull keeps a dirty local row, the local
 * copy may still hold a stale `patient_id: null`; adopting the remote link here
 * stops the next push from upserting `null` and silently undoing the link.
 */
export function shouldAdoptRemotePatientLink(
  localPatientId: string | null | undefined,
  remotePatientId: string | null | undefined,
): boolean {
  return !localPatientId && Boolean(remotePatientId)
}
