'use client';

import { useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function VercelAnalytics() {
  useEffect(() => {
    // Custom analytics tracking
    const trackPageView = (url: string) => {
      // Send custom page view events
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX', {
          page_path: url,
        });
      }
    };

    // Track route changes
    const handleRouteChange = () => {
      trackPageView(window.location.pathname);
    };

    // Listen for route changes
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange);
      
      // Track initial page load
      trackPageView(window.location.pathname);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handleRouteChange);
      }
    };
  }, []);

  return <SpeedInsights />;
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
  }
}
