'use client';

import { useEffect, useState } from 'react';

interface VercelAnalyticsData {
  pageviews: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  visitors: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  realtime: {
    visitors: number;
    pageviews: number;
  };
  topPages: Array<{
    path: string;
    pageviews: number;
    visitors: number;
  }>;
  devices: Array<{
    device: string;
    visitors: number;
    percentage: number;
  }>;
  browsers: Array<{
    browser: string;
    visitors: number;
    percentage: number;
  }>;
  countries: Array<{
    country: string;
    visitors: number;
    percentage: number;
  }>;
}

export function useVercelAnalytics(timeRange: string = '24h') {
  const [data, setData] = useState<VercelAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // In a real implementation, you would use Vercel Analytics API
        // For now, we'll simulate data that matches Vercel's structure
        
        const mockData: VercelAnalyticsData = {
          pageviews: {
            total: Math.floor(Math.random() * 10000) + 5000,
            change: Math.floor(Math.random() * 100) - 50,
            trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'neutral'
          },
          visitors: {
            total: Math.floor(Math.random() * 1000) + 500,
            change: Math.floor(Math.random() * 50) - 25,
            trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'neutral'
          },
          realtime: {
            visitors: Math.floor(Math.random() * 50) + 10,
            pageviews: Math.floor(Math.random() * 100) + 20
          },
          topPages: [
            { path: '/dashboard', pageviews: Math.floor(Math.random() * 500) + 200, visitors: Math.floor(Math.random() * 100) + 50 },
            { path: '/pacientes', pageviews: Math.floor(Math.random() * 400) + 150, visitors: Math.floor(Math.random() * 80) + 40 },
            { path: '/calendario', pageviews: Math.floor(Math.random() * 300) + 100, visitors: Math.floor(Math.random() * 60) + 30 },
            { path: '/patient-form', pageviews: Math.floor(Math.random() * 200) + 80, visitors: Math.floor(Math.random() * 40) + 20 },
            { path: '/tratamientos', pageviews: Math.floor(Math.random() * 150) + 60, visitors: Math.floor(Math.random() * 30) + 15 }
          ],
          devices: [
            { device: 'Desktop', visitors: Math.floor(Math.random() * 500) + 300, percentage: 65 },
            { device: 'Mobile', visitors: Math.floor(Math.random() * 300) + 150, percentage: 30 },
            { device: 'Tablet', visitors: Math.floor(Math.random() * 100) + 50, percentage: 5 }
          ],
          browsers: [
            { browser: 'Chrome', visitors: Math.floor(Math.random() * 400) + 300, percentage: 60 },
            { browser: 'Safari', visitors: Math.floor(Math.random() * 200) + 100, percentage: 25 },
            { browser: 'Firefox', visitors: Math.floor(Math.random() * 100) + 50, percentage: 10 },
            { browser: 'Edge', visitors: Math.floor(Math.random() * 50) + 25, percentage: 5 }
          ],
          countries: [
            { country: 'Honduras', visitors: Math.floor(Math.random() * 300) + 200, percentage: 70 },
            { country: 'United States', visitors: Math.floor(Math.random() * 100) + 50, percentage: 20 },
            { country: 'Guatemala', visitors: Math.floor(Math.random() * 50) + 25, percentage: 7 },
            { country: 'Other', visitors: Math.floor(Math.random() * 30) + 15, percentage: 3 }
          ]
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setData(mockData);
      } catch (err) {
        setError('Failed to fetch analytics data');
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Set up real-time updates (every 30 seconds)
    const interval = setInterval(() => {
      setData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          realtime: {
            visitors: Math.max(0, prev.realtime.visitors + Math.floor(Math.random() * 10) - 5),
            pageviews: prev.realtime.pageviews + Math.floor(Math.random() * 5)
          }
        };
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange]);

  return { data, loading, error, refetch: () => {} };
}

// Custom event tracking
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // This would integrate with Vercel Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }
  
  // Also track with Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', properties);
  }
}

// Page view tracking
export function trackPageView(path: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: path,
    });
  }
  
  if (typeof window !== 'undefined' && window.va) {
    window.va('pageview');
  }
}

// Extend Window interface for Vercel Analytics
declare global {
  interface Window {
    va?: (event: "event" | "beforeSend" | "pageview", properties?: unknown) => void;
  }
}
