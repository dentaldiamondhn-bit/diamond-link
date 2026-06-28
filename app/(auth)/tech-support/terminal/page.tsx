'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useRef, useState } from 'react';
import { useRoleBasedAccess } from '../../../../hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

export default function TechSupportTerminal() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  const { userRole } = useRoleBasedAccess();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isMounted || !terminalRef.current) return;
    const initTerminal = async () => {
      try {
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');
        const { WebLinksAddon } = await import('xterm-addon-web-links');
        const terminal = new Terminal();
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(new WebLinksAddon());
        terminal.open(terminalRef.current);
        fitAddon.fit();
        setIsConnected(true);
        terminal.writeln('Terminal Ready');
      } catch (e) { console.error(e); }
    };
    initTerminal();
  }, [isMounted]);

  if (!isMounted) return null;
  if (userRole !== 'tech_support') return <AccessDenied onGoBack={() => window.history.back()} />;

  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      <div className="bg-black rounded-lg overflow-hidden border border-gray-700">
        <div className="p-2 bg-gray-800 text-white text-xs flex justify-between">
          <span>Terminal</span>
          <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div ref={terminalRef} style={{ height: '500px' }} />
      </div>
    </div>
  );
}
