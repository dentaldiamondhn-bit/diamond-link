export interface ShowBrowserNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: Record<string, unknown>;
  onClickUrl?: string;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export async function showBrowserNotification({
  title,
  body = '',
  icon = '/Logo.svg',
  badge = '/Logo.svg',
  tag,
  requireInteraction = false,
  silent = false,
  data = {},
  onClickUrl,
}: ShowBrowserNotificationOptions): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body,
    icon,
    badge,
    tag,
    requireInteraction,
    silent,
    data,
    ...(data.url ? { data: { ...data } } : {}),
  };

  if (onClickUrl) {
    options.data = { ...data, url: onClickUrl };
  }

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      return true;
    }
  } catch (e) {
    console.error('[showBrowserNotification] service worker notification failed:', e);
  }

  try {
    const bn = new Notification(title, options);
    if (onClickUrl) {
      bn.onclick = () => {
        bn.close();
        window.location.href = onClickUrl;
      };
    }
    if (!requireInteraction) {
      setTimeout(() => bn.close(), 8000);
    }
    return true;
  } catch (e) {
    console.error('[showBrowserNotification] fallback Notification constructor failed:', e);
  }

  return false;
}
