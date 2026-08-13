'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { verifyAdminOverride, VerifyAdminOverrideInput } from '@/actions/verify-admin-override';
import { OrthodonticVersion } from '@/utils/versionUtils';

interface AdminOverrideModalProps {
  open: boolean;
  version: OrthodonticVersion | null;
  onClose: () => void;
  onUnlocked: (token: string) => void;
}

/** Key under which the SSO redirect round-trip data is kept. */
const PENDING_KEY = 'admin_override_pending';

interface PendingOverride {
  versionId: string;
  versionNumber: number;
  reason: string;
}

type FactorStep = 'email' | 'factor' | 'second-factor';

/**
 * "Admin / Support Unlock" modal.
 *
 * Verifies a SEPARATE admin/support account using Clerk's standard sign-in
 * flow (the verified admin may differ from the active session user):
 *   1. Enter the admin/support email -> Clerk returns the available factors
 *      (password, email code, passkey, SSO/OAuth).
 *   2. Complete a factor with Clerk's own primitives (no custom password
 *      handling that could break SSO / magic links / passkeys).
 *   3. The completed sign-in's createdSessionId is sent to the server action,
 *      which resolves the verified admin user via the Clerk Backend SDK,
 *      checks its role, writes the audit log (session_user_id +
 *      authorized_admin_id) and issues the override token.
 * The active session is NOT switched (signIn.finalize() is never called).
 */
const AdminOverrideModal: React.FC<AdminOverrideModalProps> = ({
  open,
  version,
  onClose,
  onUnlocked,
}) => {
  const { signIn } = useSignIn();

  const [step, setStep] = useState<FactorStep>('email');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [reason, setReason] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resume, setResume] = useState<PendingOverride | null>(null);
  const [resumeReady, setResumeReady] = useState(false);

  const isVisible = open || (resume !== null && resumeReady);

  const currentVersionId = version?.id ?? resume?.versionId ?? '';
  const currentVersionNumber = version?.versionNumber ?? resume?.versionNumber ?? 0;

  const finalizeOverride = useCallback(
    async (createdSessionId: string, identifier: string, pending: PendingOverride) => {
      setVerifying(true);
      setUnlockError('');
      try {
        const result = await verifyAdminOverride({
          createdSessionId,
          identifier,
          versionId: pending.versionId,
          versionNumber: pending.versionNumber,
          reason: pending.reason || undefined,
        });
        if (result.success && result.token) {
          // Clear the completed sign-in attempt (multi-session mode allows it
          // to linger as a pending task otherwise). The created session itself
          // was revoked server-side; it is never activated in this browser.
          try {
            await signIn?.reset();
          } catch {
            // best-effort: attempt state expires on its own
          }
          sessionStorage.removeItem(PENDING_KEY);
          setStep('email');
          setReason('');
          setResume(null);
          setResumeReady(false);
          onUnlocked(result.token);
        } else if (result.error) {
          setUnlockError(result.error);
        }
      } catch (err) {
        console.error('Error requesting admin override:', err);
        setUnlockError(err instanceof Error ? err.message : 'Error al desbloquear la versión');
      } finally {
        setVerifying(false);
      }
    },
    [onUnlocked, signIn]
  );

  // Resume an SSO/OAuth redirect round-trip: the page reloaded, the modal
  // reopens from sessionStorage and Clerk's restored sign-in attempt is complete.
  useEffect(() => {
    if (!signIn) return;
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    let pending: PendingOverride;
    try {
      pending = JSON.parse(raw) as PendingOverride;
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }

    const url = new URL(window.location.href);
    const hadRedirectParam = url.searchParams.has('admin_override_redirect');
    if (hadRedirectParam) {
      url.searchParams.delete('admin_override_redirect');
      window.history.replaceState({}, '', url.toString());
    }

    // Only resume when this page load is the SSO round-trip return (redirect
    // param present) or the Clerk attempt already completed, so stale pending
    // data can never auto-open the modal on unrelated visits.
    if (!hadRedirectParam && signIn.status !== 'complete') {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }

    setResume(pending);
    setResumeReady(true);

    if (signIn.status === 'complete' && signIn.createdSessionId && signIn.identifier) {
      sessionStorage.removeItem(PENDING_KEY);
      finalizeOverride(signIn.createdSessionId, signIn.identifier, pending);
    }
  }, [signIn, finalizeOverride]);

  if (!signIn) return null;

  if (!isVisible) return null;

  const handleClose = () => {
    setStep('email');
    setUnlockError('');
    setPassword('');
    setShowPassword(false);
    setCode('');
    setTotpCode('');
    onClose();
  };

  /** Reset the current Clerk attempt and go back to pick another admin account. */
  const handleChangeAccount = async () => {
    if (!signIn) return;
    try {
      await signIn.reset();
    } catch {
      // best-effort: attempt state expires on its own
    }
    setStep('email');
    setUnlockError('');
    setPassword('');
    setShowPassword(false);
    setCode('');
    setEmailCodeSent(false);
    setTotpCode('');
  };

  const handleEmailSubmit = async () => {
    if (!signIn) return;
    setUnlockError('');
    setVerifying(true);
    try {
      const { error } = await signIn.create({ identifier: adminEmail.trim() });
      if (error) {
        setUnlockError(
          error.message.includes('already signed in') || error.message.includes('session_exists')
            ? 'Ya hay una sesión activa: habilita "Manage multiple sessions" en Clerk (User & Authentication > Sessions).'
            : error.message.includes('not found') || error.message.includes('identifier')
              ? 'No se encontró una cuenta con ese correo'
              : error.message
        );
        return;
      }
      setStep('factor');
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'No se pudo iniciar la verificación');
    } finally {
      setVerifying(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!signIn) return;
    setUnlockError('');
    setVerifying(true);
    try {
      const { error } = await signIn.password({ password });
      if (error) {
        setUnlockError(error.message.includes('password') ? 'Contraseña incorrecta' : error.message);
        return;
      }
      if (signIn.status === 'complete' && signIn.createdSessionId && signIn.identifier) {
        await finalizeOverride(signIn.createdSessionId, signIn.identifier, {
          versionId: currentVersionId,
          versionNumber: currentVersionNumber,
          reason: reason.trim(),
        });
      } else if (signIn.status === 'needs_second_factor') {
        setStep('second-factor');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Credenciales incorrectas';
      setUnlockError(message.includes('password') ? 'Contraseña incorrecta' : message);
    } finally {
      setVerifying(false);
    }
  };

  const handleEmailCode = async () => {
    if (!signIn) return;
    setUnlockError('');
    setVerifying(true);
    try {
      const { error } = await signIn.emailCode.sendCode();
      if (error) {
        setUnlockError(error.message);
        return;
      }
      setEmailCodeSent(true);
      setUnlockError('Código enviado. Revisa el correo del administrador.');
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'No se pudo enviar el código');
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!signIn) return;
    setUnlockError('');
    setVerifying(true);
    try {
      const { error } = await signIn.emailCode.verifyCode({ code });
      if (error) {
        setUnlockError(error.message.includes('code') ? 'Código incorrecto' : error.message);
        return;
      }
      if (signIn.status === 'complete' && signIn.createdSessionId && signIn.identifier) {
        await finalizeOverride(signIn.createdSessionId, signIn.identifier, {
          versionId: currentVersionId,
          versionNumber: currentVersionNumber,
          reason: reason.trim(),
        });
      } else if (signIn.status === 'needs_second_factor') {
        setStep('second-factor');
      }
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'Código incorrecto');
    } finally {
      setVerifying(false);
    }
  };

  const handlePasskey = async () => {
    if (!signIn) return;
    setUnlockError('');
    setVerifying(true);
    try {
      const { error } = await signIn.passkey();
      if (error) {
        setUnlockError(error.message);
        return;
      }
      if (signIn.status === 'complete' && signIn.createdSessionId && signIn.identifier) {
        await finalizeOverride(signIn.createdSessionId, signIn.identifier, {
          versionId: currentVersionId,
          versionNumber: currentVersionNumber,
          reason: reason.trim(),
        });
      }
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'No se pudo usar la llave de acceso');
    } finally {
      setVerifying(false);
    }
  };

  const handleSSO = async () => {
    if (!signIn) return;
    setUnlockError('');
    setVerifying(true);
    try {
      const ssoFactor = signIn.supportedFirstFactors?.find((f) =>
        f.strategy === 'enterprise_sso' || String(f.strategy).startsWith('oauth_')
      );
      if (!ssoFactor) {
        setUnlockError('No hay método SSO disponible para esta cuenta');
        return;
      }
      // Persist the target before redirecting; the mount effect resumes it.
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          versionId: currentVersionId,
          versionNumber: currentVersionNumber,
          reason: reason.trim(),
        })
      );
      const redirectUrl = `${window.location.origin}${window.location.pathname}?admin_override_redirect=1`;
      const { error } = await signIn.sso({
        strategy: ssoFactor.strategy as Parameters<typeof signIn.sso>[0]['strategy'],
        redirectUrl,
        redirectCallbackUrl: redirectUrl,
      });
      if (error) {
        setUnlockError(error.message);
      }
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con SSO');
    } finally {
      setVerifying(false);
    }
  };

  const handleTotpSubmit = async () => {
    if (!signIn) return;
    setUnlockError('');
    setVerifying(true);
    try {
      const { error } = await signIn.mfa.verifyTOTP({ code: totpCode });
      if (error) {
        setUnlockError(error.message.includes('code') ? 'Código incorrecto' : error.message);
        return;
      }
      if (signIn.status === 'complete' && signIn.createdSessionId && signIn.identifier) {
        await finalizeOverride(signIn.createdSessionId, signIn.identifier, {
          versionId: currentVersionId,
          versionNumber: currentVersionNumber,
          reason: reason.trim(),
        });
      }
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'Código incorrecto');
    } finally {
      setVerifying(false);
    }
  };

  const supported = signIn.supportedFirstFactors ?? [];
  const hasPassword = supported.some((f) => f.strategy === 'password');
  const hasEmailCode = supported.some((f) => f.strategy === 'email_code');
  const hasPasskey = supported.some((f) => f.strategy === 'passkey');
  const hasSSO = supported.some(
    (f) => f.strategy === 'enterprise_sso' || String(f.strategy).startsWith('oauth_')
  );

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-white';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
  const buttonClass =
    'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <i className="fas fa-user-shield text-amber-500"></i>
            Admin / Support Unlock
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Estás editando la <strong>Versión {currentVersionNumber}</strong> (histórica / solo lectura).
            Ingresa el correo de una cuenta <strong>administrador o soporte</strong> para autorizar el
            desbloqueo. Clerk verificará sus credenciales (contraseña, código, passkey o SSO) y la
            operación quedará registrada en la auditoría.
          </p>

          <div className="space-y-4">
            {step === 'email' && (
              <>
                <div>
                  <label className={labelClass}>Correo del administrador / soporte</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@clinica.com"
                    className={inputClass}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className={labelClass}>Motivo del desbloqueo (opcional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej.: Corrección de datos de contacto del paciente..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </>
            )}

            {step === 'factor' && (
              <>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between gap-2">
                  <span>
                    Cuenta: <strong>{adminEmail || '—'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleChangeAccount}
                    disabled={verifying}
                    className="text-amber-600 dark:text-amber-400 hover:underline text-xs font-medium shrink-0 disabled:opacity-50"
                  >
                    <i className="fas fa-exchange-alt mr-1"></i>
                    Cambiar cuenta
                  </button>
                </div>

                {hasPassword && (
                  <div>
                    <label className={labelClass}>Contraseña de la cuenta</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pr-10`}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                )}

                {hasEmailCode && !emailCodeSent && (
                  <button onClick={handleEmailCode} disabled={verifying} className={`${buttonClass} w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`}>
                    <i className="fas fa-envelope"></i>
                    Enviar código al correo
                  </button>
                )}

                {hasEmailCode && emailCodeSent && (
                  <div>
                    <label className={labelClass}>Código recibido en el correo</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      className={inputClass}
                      autoComplete="off"
                    />
                  </div>
                )}

                {hasPasskey && (
                  <button onClick={handlePasskey} disabled={verifying} className={`${buttonClass} w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`}>
                    <i className="fas fa-fingerprint"></i>
                    Usar llave de acceso (Passkey)
                  </button>
                )}

                {hasSSO && (
                  <button onClick={handleSSO} disabled={verifying} className={`${buttonClass} w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`}>
                    <i className="fas fa-id-badge"></i>
                    Continuar con SSO / OAuth
                  </button>
                )}
              </>
            )}

            {step === 'second-factor' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`${labelClass} mb-0`}>Código de verificación (autenticador)</label>
                  <button
                    type="button"
                    onClick={handleChangeAccount}
                    disabled={verifying}
                    className="text-amber-600 dark:text-amber-400 hover:underline text-xs font-medium disabled:opacity-50"
                  >
                    <i className="fas fa-exchange-alt mr-1"></i>
                    Cambiar cuenta
                  </button>
                </div>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="6 dígitos"
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
            )}

            {unlockError && (
              <p className="text-sm text-red-600 dark:text-red-400">{unlockError}</p>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3">
              <i className="fas fa-clock text-amber-500 mt-0.5"></i>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                El desbloqueo caduca a los 10 minutos y queda registrado con tu sesión actual y la
                cuenta de administrador verificada.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleClose}
              disabled={verifying}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            {step === 'email' && (
              <button
                onClick={handleEmailSubmit}
                disabled={verifying || !adminEmail.trim()}
                className={`${buttonClass} bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md`}
              >
                {verifying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-arrow-right"></i>
                    <span>Continuar</span>
                  </>
                )}
              </button>
            )}

            {step === 'factor' && hasPassword && (
              <button
                onClick={handlePasswordSubmit}
                disabled={verifying || !password}
                className={`${buttonClass} bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md`}
              >
                {verifying ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <i className="fas fa-unlock"></i>
                    <span>Verificar y Desbloquear</span>
                  </>
                )}
              </button>
            )}

            {step === 'factor' && hasEmailCode && emailCodeSent && code && (
              <button
                onClick={handleCodeSubmit}
                disabled={verifying}
                className={`${buttonClass} bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md`}
              >
                <i className="fas fa-unlock"></i>
                <span>Verificar Código</span>
              </button>
            )}

            {step === 'second-factor' && (
              <button
                onClick={handleTotpSubmit}
                disabled={verifying || !totpCode}
                className={`${buttonClass} bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md`}
              >
                <i className="fas fa-unlock"></i>
                <span>Verificar Código</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverrideModal;