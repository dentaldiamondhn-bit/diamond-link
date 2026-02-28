'use client';

import { useEffect, useRef, useState } from 'react';
import { getDeviceInfo } from '@/hooks/useDeviceInfo';

export interface MobileAnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
  deviceInfo: {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    screenWidth: number;
    screenHeight: number;
    orientation: string;
  };
  page: {
    url: string;
    title: string;
    referrer?: string;
  };
  performance?: {
    loadTime?: number;
    domContentLoaded?: number;
    firstContentfulPaint?: number;
  };
}

export interface MobileAnalyticsConfig {
  apiKey?: string;
  endpoint?: string;
  debug?: boolean;
  trackPageViews?: boolean;
  trackEvents?: boolean;
  trackPerformance?: boolean;
  sampleRate?: number;
}

class MobileAnalyticsService {
  private static instance: MobileAnalyticsService;
  private config: MobileAnalyticsConfig;
  private sessionId: string;
  private userId?: string;
  private eventQueue: MobileAnalyticsEvent[] = [];
  private isInitialized = false;

  private constructor(config: MobileAnalyticsConfig = {}) {
    this.config = {
      debug: false,
      trackPageViews: true,
      trackEvents: true,
      trackPerformance: true,
      sampleRate: 1.0,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
  }

  static getInstance(config?: MobileAnalyticsConfig): MobileAnalyticsService {
    if (!MobileAnalyticsService.instance) {
      MobileAnalyticsService.instance = new MobileAnalyticsService(config);
    }
    return MobileAnalyticsService.instance;
  }

  // Initialize analytics
  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) return;

    this.userId = userId;
    this.isInitialized = true;

    // Track initial page view
    if (this.config.trackPageViews) {
      this.trackPageView();
    }

    // Track performance metrics
    if (this.config.trackPerformance) {
      this.trackPerformance();
    }

    // Setup periodic flush
    this.setupPeriodicFlush();

    // Setup page unload
    this.setupPageUnload();

    if (this.config.debug) {
      console.log('✅ Mobile Analytics initialized', { sessionId: this.sessionId, userId });
    }
  }

  // Track page view
  trackPageView(): void {
    if (!this.shouldTrack()) return;

    const event: MobileAnalyticsEvent = {
      event: 'page_view',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.getDeviceInfo(),
      page: this.getPageInfo()
    };

    this.trackEvent(event);
  }

  // Track custom event
  track(event: string, properties?: Record<string, any>): void {
    if (!this.shouldTrack()) return;

    const analyticsEvent: MobileAnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.getDeviceInfo(),
      page: this.getPageInfo()
    };

    this.trackEvent(analyticsEvent);
  }

  // Track user interaction
  trackInteraction(element: string, action: string, properties?: Record<string, any>): void {
    this.track('user_interaction', {
      element,
      action,
      ...properties
    });
  }

  // Track mobile-specific events
  trackMobileGesture(gesture: string, properties?: Record<string, any>): void {
    this.track('mobile_gesture', {
      gesture,
      ...properties
    });
  }

  // Track camera usage
  trackCameraUsage(action: 'capture' | 'upload' | 'view', properties?: Record<string, any>): void {
    this.track('camera_usage', {
      action,
      ...properties
    });
  }

  // Track calendar interactions
  trackCalendarInteraction(action: 'view' | 'create' | 'edit' | 'delete', properties?: Record<string, any>): void {
    this.track('calendar_interaction', {
      action,
      ...properties
    });
  }

  // Track performance metrics
  private trackPerformance(): void {
    if (!window.performance) return;

    const navigation = window.performance.timing;
    const paint = window.performance.getEntriesByType('paint');

    const performanceData = {
      loadTime: navigation.loadEventEnd - navigation.navigationStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
    };

    const event: MobileAnalyticsEvent = {
      event: 'performance',
      properties: performanceData,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.getDeviceInfo(),
      page: this.getPageInfo(),
      performance: performanceData
    };

    this.trackEvent(event);
  }

  // Track error
  trackError(error: Error, context?: Record<string, any>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      context
    });
  }

  // Private methods
  private trackEvent(event: MobileAnalyticsEvent): void {
    this.eventQueue.push(event);

    if (this.config.debug) {
      console.log('📊 Analytics Event:', event);
    }

    // Flush immediately for important events
    if (event.event === 'error' || event.event === 'page_view') {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to analytics endpoint
      if (this.config.endpoint) {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey || ''
          },
          body: JSON.stringify({ events })
        });
      }

      if (this.config.debug) {
        console.log('📊 Analytics flushed:', events.length, 'events');
      }
    } catch (error) {
      console.error('❌ Failed to flush analytics:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...events);
    }
  }

  private setupPeriodicFlush(): void {
    setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  private setupPageUnload(): void {
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    window.addEventListener('pagehide', () => {
      this.flush();
    });
  }

  private shouldTrack(): boolean {
    return Math.random() < (this.config.sampleRate || 1.0);
  }

  private getDeviceInfo() {
    const deviceInfo = getDeviceInfo();
    return {
      isMobile: deviceInfo.isMobile,
      isTablet: deviceInfo.isTablet,
      isDesktop: deviceInfo.isDesktop,
      isIOS: deviceInfo.isIOS,
      isAndroid: deviceInfo.isAndroid,
      screenWidth: deviceInfo.screenWidth,
      screenHeight: deviceInfo.screenHeight,
      orientation: deviceInfo.orientation
    };
  }

  private getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer
    };
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get current session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      eventCount: this.eventQueue.length,
      isInitialized: this.isInitialized
    };
  }
}

// React Hook for using mobile analytics
export const useMobileAnalytics = (config?: MobileAnalyticsConfig) => {
  const serviceRef = useRef(MobileAnalyticsService.getInstance(config));
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const service = serviceRef.current;
    
    // Initialize analytics when component mounts
    service.initialize().then(() => {
      setIsInitialized(true);
    });

    // Track page views on route changes
    const handleRouteChange = () => {
      if (service.isInitialized) {
        service.trackPageView();
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const track = (event: string, properties?: Record<string, any>) => {
    serviceRef.current.track(event, properties);
  };

  const trackInteraction = (element: string, action: string, properties?: Record<string, any>) => {
    serviceRef.current.trackInteraction(element, action, properties);
  };

  const trackMobileGesture = (gesture: string, properties?: Record<string, any>) => {
    serviceRef.current.trackMobileGesture(gesture, properties);
  };

  const trackCameraUsage = (action: 'capture' | 'upload' | 'view', properties?: Record<string, any>) => {
    serviceRef.current.trackCameraUsage(action, properties);
  };

  const trackCalendarInteraction = (action: 'view' | 'create' | 'edit' | 'delete', properties?: Record<string, any>) => {
    serviceRef.current.trackCalendarInteraction(action, properties);
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    serviceRef.current.trackError(error, context);
  };

  return {
    isInitialized,
    track,
    trackInteraction,
    trackMobileGesture,
    trackCameraUsage,
    trackCalendarInteraction,
    trackError,
    getSessionInfo: () => serviceRef.current.getSessionInfo()
  };
};

export default MobileAnalyticsService;
