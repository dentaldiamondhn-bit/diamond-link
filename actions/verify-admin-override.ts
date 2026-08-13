'use server';

import { auth } from '@clerk/nextjs/server';
import { createClerkClient, type User } from '@clerk/backend';
import { createClient } from '@/lib/supabase/server';
import { isOverrideUser, signOverrideToken } from '@/lib/adminAuth';

export interface AdminOverrideResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface VerifyAdminOverrideInput {
  /** The Clerk session ID created by the completed client-side sign-in of the
   * ADMIN/SUPPORT account. Only created by Clerk after real credential
   * verification (password / email code / passkey / SSO). */
  createdSessionId: string;
  /** The admin account identifier shown in the modal (for display / errors). */
  identifier?: string;
  versionId: string;
  versionNumber: number;
  reason?: string;
}

/**
 * Authorizes editing a historical (read-only) orthodontic version.
 *
 * Security model — verified admin authorization, no unverified impersonation:
 *   1. The client runs Clerk's standard sign-in flow (password / SSO / magic
 *      link / passkey via the Clerk frontend API) against the admin/support
 *      account and passes back the completed sign-in's createdSessionId.
 *   2. THIS action resolves the session server-side (Clerk Backend SDK) and
 *      requires an admin/support role — typing an email alone is never enough
 *      to elevate; the session only exists after real credential verification.
 *   3. On success an audit_logs row is written with BOTH the active session
 *      user id (requester) and the authorized admin id, and a short-lived
 *      HMAC override token scoped to the version is returned.
 */
export async function verifyAdminOverride(
  input: VerifyAdminOverrideInput
): Promise<AdminOverrideResult> {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return { success: false, error: 'No autenticado' };
    }

    if (!input.createdSessionId) {
      return { success: false, error: 'Falta la cuenta de administrador verificada' };
    }

    // Resolve the verified admin account from the completed sign-in session
    // (Clerk Backend SDK). The session is created only when credentials pass.
    let adminUser: User;
    try {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const session = await clerk.sessions.getSession(input.createdSessionId);
      adminUser = await clerk.users.getUser(session.userId);
    } catch (err) {
      console.error('Error resolving verified admin user:', err);
      return { success: false, error: 'No se pudo verificar la cuenta de administrador' };
    }

    if (!isOverrideUser(adminUser)) {
      return {
        success: false,
        error: 'Unauthorized: Admin or Support privileges required',
      };
    }

    // Audit log: session_user_id (requester's active session) and
    // authorized_admin_id (the admin whose credentials passed verification).
    const supabase = createClient();
    const { error: auditError } = await supabase.from('audit_logs').insert({
      session_user_id: authResult.userId,
      authorized_admin_id: adminUser.id,
      record_id: input.versionId,
      version_number: input.versionNumber,
      reason: input.reason || null,
    });

    if (auditError) {
      console.error('Error writing admin override audit log:', auditError);
      return {
        success: false,
        error: 'No se pudo registrar la auditoría del desbloqueo',
      };
    }

    // Hygiene: destroy the admin's pending session so the verified account
    // never lingers (or becomes active) in the browser. Best-effort — pending
    // sessions also expire on their own if revocation is not supported.
    try {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      await clerk.sessions.revokeSession(input.createdSessionId);
    } catch (err) {
      console.warn('Could not revoke the admin verification session:', err);
    }

    return {
      success: true,
      token: signOverrideToken({
        versionId: input.versionId,
        adminUserId: adminUser.id,
      }),
    };
  } catch (err) {
    console.error('Error in verifyAdminOverride:', err);
    return { success: false, error: 'Error al verificar la autenticación' };
  }
}