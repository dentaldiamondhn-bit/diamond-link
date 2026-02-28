'use client';

import React, { useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeCalendarProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
}

export const SwipeCalendar: React.FC<SwipeCalendarProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - startX.current;
    const deltaY = endY - startY.current;
    
    const threshold = 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
    
    isDragging.current = false;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return (
    <div 
      ref={containerRef}
      className={`touch-pan-y select-none ${className}`}
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

interface TouchButtonProps {
  children: React.ReactNode;
  onTap?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  className?: string;
  disabled?: boolean;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onTap,
  onLongPress,
  onPressIn,
  onPressOut,
  className = '',
  disabled = false
}) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const longPressDelay = 500;

  const handleTouchStart = useCallback(() => {
    if (disabled) return;
    
    onPressIn?.();
    
    // Start long press timer
    timeoutRef.current = setTimeout(() => {
      onLongPress?.();
    }, longPressDelay);
  }, [disabled, onPressIn, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;
    
    onPressOut?.();
    
    // Clear long press timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      
      // If long press didn't trigger, treat as tap
      if (onTap) {
        onTap();
      }
    }
  }, [disabled, onPressOut, onTap]);

  const handleTouchCancel = useCallback(() => {
    if (disabled) return;
    
    onPressOut?.();
    
    // Clear long press timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [disabled, onPressOut]);

  return (
    <div
      className={`touch-manipulation ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {children}
    </div>
  );
};

export default SwipeCalendar;
