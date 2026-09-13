'use client';

import { useEffect, useRef } from 'react';
import { useBellNotifications, BellNotification } from '../contexts/BellNotificationContext';
import { showBrowserNotification as showNotification, requestNotificationPermission } from '../lib/browserNotification';

// Notification types already delivered as an OS card by the service worker
// (server-pushed via /api/push/*). The listener must NOT toast those again or
// every reminder/invite would appear twice — once from the SW tray card and
// once here.
const SERVER_PUSHED_TYPES = new Set([
  'calendar_event',
  'calendar_reminder',
  'chat_message',
  'task',
  'task_reminder',
]);

export function useNotificationListener() {
  const { notifications } = useBellNotifications();
  const processed = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    // First run after mount (or refresh): seed the "already seen" set WITHOUT
    // toasting anything. Otherwise every unread notification would pop again
    // in the OS tray every time the page reloads.
    if (!initialized.current) {
      initialized.current = true;
      for (const n of notifications) processed.current.add(n.id);
      return;
    }

    for (const n of notifications) {
      if (!n.read && !processed.current.has(n.id)) {
        processed.current.add(n.id);
        if (SERVER_PUSHED_TYPES.has(n.type ?? '')) continue;
        // Foreground UX: toast here only while the tab is visible, so the
        // SW tray card (shown when the app is hidden) is never doubled.
        if (document.visibilityState !== 'visible') continue;
        showBrowserNotification(n);
      }
    }
  }, [notifications]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      const recent = new Set(notifications.slice(0, 50).map(n => n.id));
      processed.current = new Set([...processed.current].filter(id => recent.has(id)));
    }, 60000);
    return () => clearInterval(cleanup);
  }, [notifications]);
}

function showBrowserNotification(n: BellNotification) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      requestNotificationPermission();
    }
    return;
  }

  let body = n.message || '';
  const meta = n.metadata || {};
  if (meta.eventTime || meta.taskTime || meta.itemTime) {
    const d = new Date(meta.eventTime || meta.taskTime || meta.itemTime);
    if (!isNaN(d.getTime())) {
      body += ` | ${d.toLocaleDateString('es-HN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })}`;
    }
  }

  let onClickUrl = '/';
  if (n.type === 'calendar_event' || n.type === 'calendar_reminder') {
    onClickUrl = '/calendario';
  } else if (meta.patientId) {
    onClickUrl = `/menu-navegacion?id=${meta.patientId}`;
  }

  showNotification({
    title: n.title,
    body,
    icon: '/Logo.svg',
    badge: '/Logo.svg',
    tag: n.type || 'general',
    requireInteraction: false,
    data: {
      ...meta,
      bellId: n.id,
      url: onClickUrl,
    },
    onClickUrl,
  });
}
