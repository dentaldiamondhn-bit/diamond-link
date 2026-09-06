'use client';

/**
 * Phase 5 — client-side "hidden tab" push trigger.
 *
 * Web push is the only way to reach the user when the app's tab is in the
 * background (and fully closed). ChatLayout calls this whenever a realtime
 * incoming message arrives for the current user while the tab is hidden or the
 * conversation is not in focus, so the user still sees the notification in the
 * OS tray instead of missing it entirely.
 */
export async function triggerHiddenTabPush(params: {
  title: string;
  body: string;
  tag: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (typeof document === 'undefined' || document.visibilityState === 'visible') return;

  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (err) {
    // Best-effort: never break the chat on a push failure.
    console.warn('[push] hidden-tab trigger failed:', err);
  }
}