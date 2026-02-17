'use client';

import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import burgerMenuData from '../burger-menu.json';

interface AnimatedBurgerProps {
  className?: string;
}

export default function AnimatedBurger({ className = '' }: AnimatedBurgerProps) {
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
      animationData: burgerMenuData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true,
        hideOnTransparent: true,
      }
    });

    // Set appropriate size and color
    animation.setSpeed(0.5);
    
    // Change all shapes to white color
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
        
        // Add CSS to override all colors
        const style = document.createElement('style');
        style.textContent = `
          svg * {
            fill: #ffffff !important;
            stroke: #ffffff !important;
            color: #ffffff !important;
          }
        `;
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
