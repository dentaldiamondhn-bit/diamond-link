'use client';

import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import animatedRubishData from '../animated-rubish.json';

interface AnimatedRubishProps {
  className?: string;
}

export default function AnimatedRubish({ className = '' }: AnimatedRubishProps) {
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
      animationData: animatedRubishData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true,
        hideOnTransparent: true,
      }
    });

    // Set appropriate speed
    animation.setSpeed(0.5);
    
    // Change all shapes to red color (for delete/remove actions)
    animation.addEventListener('DOMLoaded', () => {
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        // Target all possible SVG elements
        const allElements = svgElement.querySelectorAll('*');
        allElements.forEach(element => {
          // Set fill and stroke to red
          (element as SVGElement).style.fill = '#DC2626';
          (element as SVGElement).style.stroke = '#DC2626';
          (element as SVGElement).style.color = '#DC2626';
          
          // Override any inline styles
          element.setAttribute('fill', '#DC2626');
          element.setAttribute('stroke', '#DC2626');
          element.setAttribute('color', '#DC2626');
          
          // Override style attribute
          if (element.getAttribute('style')) {
            element.setAttribute('style', element.getAttribute('style')?.replace(/#[0-9a-fA-F]{3,6}/g, '#DC2626') || 'fill:#DC2626;stroke:#DC2626;color:#DC2626;');
          }
        });
        
        // Add CSS to override all colors within this specific animation only
        const style = document.createElement('style');
        style.textContent = `
          svg[data-rubish-animation] * {
            fill: #DC2626 !important;
            stroke: #DC2626 !important;
            color: #DC2626 !important;
          }
        `;
        svgElement.setAttribute('data-rubish-animation', 'true');
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
