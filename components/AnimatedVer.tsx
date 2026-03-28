'use client';

import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import animatedVerData from '../animated-ver.json';

interface AnimatedVerProps {
  className?: string;
}

export default function AnimatedVer({ className = '' }: AnimatedVerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Load Lottie animation
    const animation = lottie.loadAnimation({
      container: container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animatedVerData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true,
        hideOnTransparent: true,
      }
    });

    // Set appropriate speed
    animation.setSpeed(0.5);
    
    // Change all shapes to green color (for view/preview actions)
    animation.addEventListener('DOMLoaded', () => {
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        // Target all possible SVG elements
        const allElements = svgElement.querySelectorAll('*');
        allElements.forEach(element => {
          // Set fill and stroke to green
          (element as SVGElement).style.fill = '#10B981';
          (element as SVGElement).style.stroke = '#10B981';
          (element as SVGElement).style.color = '#10B981';
          
          // Override any inline styles
          element.setAttribute('fill', '#10B981');
          element.setAttribute('stroke', '#10B981');
          element.setAttribute('color', '#10B981');
          
          // Override style attribute
          if (element.getAttribute('style')) {
            element.setAttribute('style', element.getAttribute('style')?.replace(/#[0-9a-fA-F]{3,6}/g, '#10B981') || 'fill:#10B981;stroke:#10B981;color:#10B981;');
          }
        });
        
        // Add CSS to override all colors within this specific animation only
        const style = document.createElement('style');
        style.textContent = `
          svg[data-ver-animation] * {
            fill: #10B981 !important;
            stroke: #10B981 !important;
            color: #10B981 !important;
          }
        `;
        svgElement.setAttribute('data-ver-animation', 'true');
        svgElement.appendChild(style);
      }
    });
    
    return () => {
      animation.destroy();
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`${className}`}
      style={{ width: 'auto', height: 'auto' }}
    />
  );
}
