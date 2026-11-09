'use client';

import React from 'react';

interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ children, defaultValue, value, onValueChange, className = '' }: TabsProps) {
  const [activeValue, setActiveValue] = React.useState(defaultValue || '');
  
  const handleValueChange = (newValue: string) => {
    setActiveValue(newValue);
    onValueChange?.(newValue);
  };

  const controlledValue = value !== undefined ? value : activeValue;

  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        
        if (child.type === TabsList) {
          return React.cloneElement(child, { controlledValue, onValueChange: handleValueChange });
        }
        
        if (child.type === TabsContent) {
          return React.cloneElement(child, { controlledValue });
        }
        
        return child;
      })}
    </div>
  );
}

export function TabsList({ children, className = '', controlledValue, onValueChange }: TabsListProps & { controlledValue?: string; onValueChange?: (value: string) => void }) {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`} role="tablist">
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        if (child.type === TabsTrigger) {
          return React.cloneElement(child, { controlledValue, onValueChange });
        }
        return child;
      })}
    </div>
  );
}

export function TabsTrigger({ value, children, disabled = false, className = '', controlledValue, onValueChange }: TabsTriggerProps & { controlledValue?: string; onValueChange?: (value: string) => void }) {
  const isActive = controlledValue === value;
  
  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && onValueChange?.(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'} ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '', controlledValue }: TabsContentProps & { controlledValue?: string }) {
  if (controlledValue !== value) return null;
  
  return (
    <div role="tabpanel" className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}

Tabs.displayName = 'Tabs';
TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';