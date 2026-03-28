'use client';

import React, { useEffect, useState } from 'react';
import { useDeviceInfo, getDeviceSpecificStyles } from '@/hooks/useDeviceInfo';
import { useMobileNotifications } from '@/services/mobileNotificationService';
import { useMobileAnalytics } from '@/services/mobileAnalyticsService';
import { registerServiceWorker } from '@/lib/serviceWorker';
import { SwipeCalendar, TouchButton } from '@/components/gestures/SwipeCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Bell, 
  BellOff,
  Camera,
  Calendar,
  Users,
  Settings
} from 'lucide-react';

interface MobileLayoutProps {
  children: React.ReactNode;
  showDeviceIndicator?: boolean;
  showNetworkStatus?: boolean;
  showNotificationStatus?: boolean;
  enableGestures?: boolean;
  className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showDeviceIndicator = true,
  showNetworkStatus = true,
  showNotificationStatus = true,
  enableGestures = true,
  className = ''
}) => {
  const deviceInfo = useDeviceInfo();
  const deviceStyles = getDeviceSpecificStyles(deviceInfo);
  const { permission: notificationPermission, requestPermission, showNotification } = useMobileNotifications();
  const { track, trackMobileGesture, isInitialized: analyticsInitialized } = useMobileAnalytics();
  
  const [isOnline, setIsOnline] = useState(true);
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      track('network_status_changed', { status: 'online' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      track('network_status_changed', { status: 'offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [track]);

  // Service worker registration
  useEffect(() => {
    if (deviceInfo.isMobile || deviceInfo.isTablet) {
      registerServiceWorker().then((wb) => {
        if (wb) {
          setServiceWorkerRegistered(true);
          track('service_worker_registered');
        }
      });
    }
  }, [deviceInfo, track]);

  // Request notification permission on mobile
  useEffect(() => {
    if (deviceInfo.isMobile && notificationPermission.default) {
      // Auto-request permission on mobile after user interaction
      const handleUserInteraction = () => {
        requestPermission();
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };

      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);

      return () => {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
    }
  }, [deviceInfo, notificationPermission, requestPermission]);

  // Track device info
  useEffect(() => {
    if (analyticsInitialized) {
      track('device_info_loaded', {
        deviceType: deviceInfo.isMobile ? 'mobile' : deviceInfo.isTablet ? 'tablet' : 'desktop',
        os: deviceInfo.osName,
        browser: deviceInfo.browserName,
        screenWidth: deviceInfo.screenWidth,
        screenHeight: deviceInfo.screenHeight,
        orientation: deviceInfo.orientation
      });
    }
  }, [deviceInfo, analyticsInitialized, track]);

  const handleSwipeLeft = () => {
    if (enableGestures) {
      trackMobileGesture('swipe_left', { context: 'mobile_layout' });
      setShowMobileMenu(false);
    }
  };

  const handleSwipeRight = () => {
    if (enableGestures) {
      trackMobileGesture('swipe_right', { context: 'mobile_layout' });
      setShowMobileMenu(true);
    }
  };

  const handleNotificationRequest = async () => {
    const permission = await requestPermission();
    if (permission.granted) {
      showNotification({
        id: 'welcome',
        title: 'Notificaciones Activadas',
        body: 'Recibirás recordatorios de citas y actualizaciones importantes',
        icon: '/Logo.svg',
        tag: 'welcome'
      });
    }
  };

  const getDeviceIcon = () => {
    if (deviceInfo.isMobile) return <Smartphone className="h-4 w-4" />;
    if (deviceInfo.isTablet) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceLabel = () => {
    if (deviceInfo.isMobile) return 'Mobile';
    if (deviceInfo.isTablet) return 'Tablet';
    return 'Desktop';
  };

  const content = (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          {/* Device Indicator */}
          {showDeviceIndicator && (
            <div className="flex items-center gap-2">
              {getDeviceIcon()}
              <span className="font-medium">{getDeviceLabel()}</span>
              <Badge variant="outline" className="text-xs">
                {deviceInfo.screenWidth}×{deviceInfo.screenHeight}
              </Badge>
            </div>
          )}

          {/* Network Status */}
          {showNetworkStatus && (
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Offline</span>
                </>
              )}
            </div>
          )}

          {/* Notification Status */}
          {showNotificationStatus && (deviceInfo.isMobile || deviceInfo.isTablet) && (
            <div className="flex items-center gap-2">
              {notificationPermission.granted ? (
                <>
                  <Bell className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Notifications</span>
                </>
              ) : (
                <TouchButton
                  onTap={handleNotificationRequest}
                  className="flex items-center gap-2 text-orange-600"
                >
                  <BellOff className="h-4 w-4" />
                  <span>Enable</span>
                </TouchButton>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        {(deviceInfo.isMobile || deviceInfo.isTablet) && (
          <div className="flex items-center justify-between mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-xs"
            >
              {showMobileMenu ? 'Hide Menu' : 'Show Menu'}
            </Button>

            {/* Service Worker Status */}
            {serviceWorkerRegistered && (
              <Badge variant="outline" className="text-xs">
                PWA Ready
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (deviceInfo.isMobile || deviceInfo.isTablet) && (
        <div className="fixed top-20 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg">
          <div className="p-4 space-y-2">
            <TouchButton
              onTap={() => {
                track('mobile_menu_item_clicked', { item: 'calendar' });
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
            >
              <Calendar className="h-5 w-5" />
              <span>Calendar</span>
            </TouchButton>

            <TouchButton
              onTap={() => {
                track('mobile_menu_item_clicked', { item: 'patients' });
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
            >
              <Users className="h-5 w-5" />
              <span>Patients</span>
            </TouchButton>

            <TouchButton
              onTap={() => {
                track('mobile_menu_item_clicked', { item: 'camera' });
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
            >
              <Camera className="h-5 w-5" />
              <span>Camera</span>
            </TouchButton>

            <TouchButton
              onTap={() => {
                track('mobile_menu_item_clicked', { item: 'settings' });
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </TouchButton>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`pt-${deviceInfo.isMobile ? '32' : '28'}`}>
        {enableGestures ? (
          <SwipeCalendar
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            className="w-full"
          >
            {children}
          </SwipeCalendar>
        ) : (
          children
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {(deviceInfo.isMobile || deviceInfo.isTablet) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-around">
            <TouchButton
              onTap={() => track('bottom_nav_clicked', { item: 'home' })}
              className="flex flex-col items-center gap-1 p-2"
            >
              <Monitor className="h-5 w-5" />
              <span className="text-xs">Home</span>
            </TouchButton>

            <TouchButton
              onTap={() => track('bottom_nav_clicked', { item: 'calendar' })}
              className="flex flex-col items-center gap-1 p-2"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Calendar</span>
            </TouchButton>

            <TouchButton
              onTap={() => track('bottom_nav_clicked', { item: 'patients' })}
              className="flex flex-col items-center gap-1 p-2"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Patients</span>
            </TouchButton>

            <TouchButton
              onTap={() => track('bottom_nav_clicked', { item: 'camera' })}
              className="flex flex-col items-center gap-1 p-2"
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs">Camera</span>
            </TouchButton>
          </div>
        </div>
      )}
    </div>
  );

  return content;
};

export default MobileLayout;
