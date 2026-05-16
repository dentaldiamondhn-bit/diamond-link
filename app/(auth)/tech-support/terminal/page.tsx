'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

export default function TechSupportTerminal() {
  const { userRole } = useRoleBasedAccess();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState('/home/techsupport');

  // Check if user is tech support
  if (userRole !== 'tech_support') {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permiso para acceder a esta página."
        explanation="Esta área es exclusiva para el personal de soporte técnico."
        contactInfo="Si necesitas acceso, contacta a un administrador del sistema."
        onGoBack={() => window.history.back()}
      />
    );
  }

  useEffect(() => {
    if (!terminalRef.current) return;

    // Only run on client
    if (typeof document === 'undefined') {
      return;
    }

    const initTerminal = async () => {
      try {
        // Dynamically import xterm only on client
        const xtermModule = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');
        const { WebLinksAddon } = await import('xterm-addon-web-links');

        const terminal = new xtermModule.Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          theme: {
            background: '#000000',
            foreground: '#ffffff',
            cursor: '#ffffff',
          },
          scrollback: 1000,
          cols: 80,
          rows: 24,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);

        terminal.open(terminalRef.current);
        terminalInstanceRef.current = terminal;

        // Fit terminal
        setTimeout(() => {
          fitAddon.fit();
        }, 100);

        terminal.writeln('Terminal initialized. Connecting to cluster...');
      } catch (error) {
        // If we are on the server, we expect the import to fail because xterm requires DOM.
        // We can ignore the error and return.
        console.warn('Failed to initialize terminal: ', error);
        return;
      }
    };

    initTerminal();

    return () => {
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="mb-4 text-green-400 font-mono">
        <p>Current directory: {currentDirectory}</p>
        <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      </div>
      <div ref={terminalRef} className="terminal-container" style={{ height: '600px' }} />
    </div>
  );
}
