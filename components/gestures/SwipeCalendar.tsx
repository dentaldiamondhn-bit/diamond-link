'use client';

import React, { useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
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

  const bind = useGesture(
    {
      onDrag: ({ 
        direction: [xDir, yDir], 
        distance, 
        velocity: [vx, vy],
        last 
      }) => {
        // Threshold for swipe detection
        const threshold = 50;
        const velocityThreshold = 0.5;

        if (last && distance > threshold && Math.max(Math.abs(vx), Math.abs(vy)) > velocityThreshold) {
          // Horizontal swipe
          if (Math.abs(xDir) > Math.abs(yDir)) {
            if (xDir > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (xDir < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          }
          // Vertical swipe
          else {
            if (yDir > 0 && onSwipeDown) {
              onSwipeDown();
            } else if (yDir < 0 && onSwipeUp) {
              onSwipeUp();
            }
          }
        }
      }
    },
    {
      target: containerRef,
      eventOptions: { passive: false }
    }
  );

  return (
    <div 
      ref={containerRef}
      {...bind()}
      className={`touch-pan-y select-none ${className}`}
      style={{ touchAction: 'pan-y' }}
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

  const bind = useGesture(
    {
      onPointerDown: () => {
        if (disabled) return;
        
        onPressIn?.();
        
        // Start long press timer
        timeoutRef.current = setTimeout(() => {
          onLongPress?.();
        }, longPressDelay);
      },

      onPointerUp: () => {
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
      },

      onPointerLeave: () => {
        if (disabled) return;
        
        onPressOut?.();
        
        // Clear long press timer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    },
    {
      eventOptions: { passive: false }
    }
  );

  return (
    <div
      {...bind()}
      className={`touch-manipulation ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </div>
  );
};

export default SwipeCalendar;
