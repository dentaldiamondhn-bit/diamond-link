import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import VercelAnalytics from '@/components/VercelAnalytics'
import './globals.css'
import './color-system.css'
import BannerAlert from '@/components/BannerAlert'
import AdminOverrideTimer from '@/components/AdminOverrideTimer'
import { AdminOverrideProvider } from '@/contexts/AdminOverrideContext'
import { QueryProvider } from '@/contexts/QueryProvider'
import { DocumentLang } from '@/chat/i18n/DocumentLang'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Diamond Link',
  description: 'Dental clinic management system',
  manifest: '/manifest.json',
  icons: {
    icon: '/Logo.svg',
    shortcut: '/Logo.svg',
    apple: '/Logo.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#14b8a6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="es">
        <head>
          <meta name="theme-color" content="#14b8a6" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Diamond Link" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="application-name" content="Diamond Link" />
          <link rel="manifest" href="/manifest.json" />
          <link 
            rel="stylesheet" 
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
            integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          <link rel="icon" href="/Logo.svg" />
          <link rel="shortcut icon" href="/Logo.svg" />
          <link rel="apple-touch-icon" href="/Logo.svg" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Show loading overlay immediately when page starts loading
                (function() {
                  var overlay = document.createElement('div');
                  overlay.id = 'loading-overlay';
                  overlay.innerHTML = '<img src="/Logo.svg" alt="Loading..." class="loading-logo" />';
                  document.documentElement.appendChild(overlay);
                  
                  // Preserve dark mode preference (don't force it)
                  function preserveThemeMode() {
                    if (document.body) {
                      // Check if dark mode was previously set in localStorage
                      const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                                       localStorage.getItem('theme') === 'dark' ||
                                       document.documentElement.classList.contains('dark');
                      
                      if (isDarkMode) {
                        document.body.classList.add('dark');
                        document.body.setAttribute('data-theme', 'dark');
                      }
                    } else {
                      // If body is not ready, wait for DOMContentLoaded
                      document.addEventListener('DOMContentLoaded', preserveThemeMode);
                    }
                  }
                  preserveThemeMode();
                  
                  // Hide overlay when page is fully loaded
                  window.addEventListener('load', function() {
                    setTimeout(function() {
                      overlay.style.opacity = '0';
                      overlay.style.transition = 'opacity 0.3s ease-out';
                      setTimeout(function() {
                        if (overlay.parentNode) {
                          overlay.parentNode.removeChild(overlay);
                        }
                      }, 300);
                    }, 100);
                  });
                  
                  // Show overlay when navigating away
                  window.addEventListener('beforeunload', function() {
                    overlay.style.display = 'flex';
                  });
})();
                 // On localhost, nuke the service worker + caches so a stale
                 // bundle can never keep running. Dev chunk URLs are stable
                 // names (chat/page.js), so an aggressive cache-first SW
                 // freezes whatever was first compiled. Remove it entirely.
                 (function () {
                   try {
                     if ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && 'serviceWorker' in navigator) {
                       var killed = sessionStorage.getItem('_dl_sw_killed');
                       navigator.serviceWorker.getRegistrations().then(function (regs) {
                         var hadSw = !!(regs && regs.length);
                         var unregs = (regs || []).map(function (r) { return r.unregister(); });
                         return Promise.all(unregs).then(function () {
                           if ('caches' in window) {
                             return caches.keys().then(function (keys) {
                               return Promise.all(keys.map(function (k) { return caches.delete(k); }));
                             });
                           }
                           return true;
                         }).then(function () {
                           if (hadSw && !killed) {
                             sessionStorage.setItem('_dl_sw_killed', '1');
                             location.reload();
                           }
                         });
                       }).catch(function () {});
                     }
                   } catch (e) {}
                 })();
               `,
            }}
          />
        </head>
        <body className={`${inter.className} bg-gray-800`} suppressHydrationWarning>
          <AdminOverrideProvider>
            <DocumentLang />
            <BannerAlert />
            <QueryProvider>
              {children}
            </QueryProvider>
            <AdminOverrideTimer />
            <Analytics />
            <VercelAnalytics />
          </AdminOverrideProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}