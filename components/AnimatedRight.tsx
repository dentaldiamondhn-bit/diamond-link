'use client';

import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import animatedRightData from '../animated-right.json';

interface AnimatedRightProps {
  className?: string;
}

export default function AnimatedRight({ className = '' }: AnimatedRightProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const animation = lottie.loadAnimation({
      container: container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animatedRightData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true,
        hideOnTransparent: true,
      }
    });

    animation.setSpeed(0.5);
    
    animation.addEventListener('DOMLoaded', () => {
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        const allElements = svgElement.querySelectorAll('*');
        allElements.forEach(element => {
          (element as SVGElement).style.fill = '#ffffff';
          (element as SVGElement).style.stroke = '#ffffff';
          (element as SVGElement).style.color = '#ffffff';
          element.setAttribute('fill', '#ffffff');
          element.setAttribute('stroke', '#ffffff');
          element.setAttribute('color', '#ffffff');
          if (element.getAttribute('style')) {
            element.setAttribute('style', element.getAttribute('style')?.replace(/#[0-9a-fA-F]{3,6}/g, '#ffffff') || 'fill:#ffffff;stroke:#ffffff;color:#ffffff;');
          }
        });
        
        const style = document.createElement('style');
        style.textContent = `
          svg[data-right-animation] * {
            fill: #ffffff !important;
            stroke: #ffffff !important;
            color: #ffffff !important;
          }
        `;
        svgElement.setAttribute('data-right-animation', 'true');
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
