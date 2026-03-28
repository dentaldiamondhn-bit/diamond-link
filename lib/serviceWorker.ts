import { Workbox } from 'workbox-window';

export const registerServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const wb = new Workbox('/sw.js');
      
      // Listen for waiting service worker
      wb.addEventListener('waiting', (event) => {
        // Show update prompt to user
        if (confirm('New version available! Reload to update?')) {
          wb.messageSkipWaiting();
        }
      });

      // Listen for controlling service worker
      wb.addEventListener('controlling', () => {
        // Reload the page to get the new version
        window.location.reload();
      });

      // Register the service worker
      await wb.register();
      console.log('✅ Service Worker registered successfully');
      
      return wb;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export const unregisterServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      console.log('✅ Service Worker unregistered successfully');
    } catch (error) {
      console.error('❌ Service Worker unregistration failed:', error);
    }
  }
};

export const checkServiceWorkerUpdate = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      console.log('🔄 Service Worker update checked');
    } catch (error) {
      console.error('❌ Service Worker update check failed:', error);
    }
  }
};
