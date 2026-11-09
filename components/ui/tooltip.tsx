'use client';

import React from 'react';

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
}

export function Tooltip({ children, content, side = 'top', align = 'center', delayDuration = 200 }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(true), delayDuration);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" onMouseEnter={showTooltip} onMouseLeave={hideTooltip} onFocus={showTooltip} onBlur={hideTooltip}>
      {children}
      {isOpen && (
        <div
          className={`absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded shadow-lg animate-in fade-in-0 zoom-in-95 ${getPositionClasses(side, align)}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}

function getPositionClasses(side: string, align: string): string {
  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  const alignClasses = {
    start: 'translate-x-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0 translate-x-0',
  };

  return `${sideClasses[side as keyof typeof sideClasses] || ''} ${alignClasses[align as keyof typeof alignClasses] || ''}`;
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

TooltipProvider.displayName = 'TooltipProvider';
Tooltip.displayName = 'Tooltip';