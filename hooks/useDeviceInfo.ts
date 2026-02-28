'use client';

import React, { useState, useEffect } from 'react';
import { 
  isMobile, 
  isTablet, 
  isBrowser, 
  isIOS, 
  isAndroid,
  isChrome,
  isSafari,
  deviceType,
  osName,
  browserName
} from 'react-device-detect';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  isSafari: boolean;
  deviceType: string;
  osName: string;
  browserName: string;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

export const useDeviceInfo = (): DeviceInfo => {
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateScreenInfo = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    updateScreenInfo();
    window.addEventListener('resize', updateScreenInfo);
    window.addEventListener('orientationchange', updateScreenInfo);

    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      window.removeEventListener('orientationchange', updateScreenInfo);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: isBrowser && !isMobile && !isTablet,
    isIOS,
    isAndroid,
    isChrome,
    isSafari,
    deviceType,
    osName,
    browserName,
    screenWidth,
    screenHeight,
    orientation
  };
};

export const getDeviceSpecificStyles = (deviceInfo: DeviceInfo) => {
  const { isMobile, isTablet, screenWidth } = deviceInfo;

  return {
    // Responsive breakpoints
    isSmallMobile: isMobile && screenWidth < 380,
    isMediumMobile: isMobile && screenWidth >= 380 && screenWidth < 480,
    isLargeMobile: isMobile && screenWidth >= 480,
    isSmallTablet: isTablet && screenWidth < 768,
    isLargeTablet: isTablet && screenWidth >= 768,
    
    // Touch-friendly sizing
    touchTargetSize: isMobile ? 44 : 32,
    fontSize: {
      xs: isMobile ? '0.75rem' : '0.7rem',
      sm: isMobile ? '0.875rem' : '0.8rem',
      base: isMobile ? '1rem' : '0.9rem',
      lg: isMobile ? '1.125rem' : '1rem',
      xl: isMobile ? '1.25rem' : '1.125rem'
    },
    
    // Spacing
    spacing: {
      xs: isMobile ? '0.25rem' : '0.2rem',
      sm: isMobile ? '0.5rem' : '0.4rem',
      md: isMobile ? '1rem' : '0.8rem',
      lg: isMobile ? '1.5rem' : '1.2rem',
      xl: isMobile ? '2rem' : '1.6rem'
    }
  };
};

export default useDeviceInfo;
