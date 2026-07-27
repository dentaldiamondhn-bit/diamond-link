'use client';

import React from 'react';

interface AnimatedBorderContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function AnimatedBorderContainer({ children, className = '' }: AnimatedBorderContainerProps) {
  return (
    <div className={`relative rounded-2xl p-[2px] overflow-hidden ${className}`}>
      <div
        className="absolute inset-[-200%] animate-spin-gradient bg-conic-gradient pointer-events-none"
        style={{ transformOrigin: 'center center' }}
      />
      <div className="relative z-10 w-full h-full bg-[#161c24] rounded-[14px]">
        {children}
      </div>
    </div>
  );
}