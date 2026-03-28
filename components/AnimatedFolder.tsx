'use client';

import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import animatedFolderData from '../animated-folder.json';

interface AnimatedFolderProps {
  className?: string;
}

export default function AnimatedFolder({ className = '' }: AnimatedFolderProps) {
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
      animationData: animatedFolderData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true,
        hideOnTransparent: true,
      }
    });

    // Set appropriate size and speed
    animation.setSpeed(0.8);
    
    // Change all shapes to white color for dark backgrounds
    animation.addEventListener('DOMLoaded', () => {
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        // Target all possible SVG elements
        const allElements = svgElement.querySelectorAll('*');
        allElements.forEach(element => {
          // Set fill and stroke to white
          (element as SVGElement).style.fill = '#ffffff';
          (element as SVGElement).style.stroke = '#ffffff';
          (element as SVGElement).style.color = '#ffffff';
          
          // Override any inline styles
          element.setAttribute('fill', '#ffffff');
          element.setAttribute('stroke', '#ffffff');
          element.setAttribute('color', '#ffffff');
          
          // Override style attribute
          if (element.getAttribute('style')) {
            element.setAttribute('style', element.getAttribute('style')?.replace(/#[0-9a-fA-F]{3,6}/g, '#ffffff') || 'fill:#ffffff;stroke:#ffffff;color:#ffffff;');
          }
        });
        
        // Add CSS to override all colors within this specific animation only
        const style = document.createElement('style');
        style.textContent = `
          svg[data-folder-animation] * {
            fill: #ffffff !important;
            stroke: #ffffff !important;
            color: #ffffff !important;
          }
        `;
        svgElement.setAttribute('data-folder-animation', 'true');
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
