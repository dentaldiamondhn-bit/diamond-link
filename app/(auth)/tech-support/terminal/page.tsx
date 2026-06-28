'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState } from 'react';
import { useRoleBasedAccess } from '../../../../hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

export default function TechSupportTerminal() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { userRole } = useRoleBasedAccess();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentDirectory] = useState('/home/techsupport');

  useEffect(() => {
    if (!isMounted || !terminalRef.current) return;

    let terminal: any;

    const initTerminal = async () => {
      try {
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');
        const { WebLinksAddon } = await import('xterm-addon-web-links');
        
        if (!terminalRef.current) return;

        terminal = new Terminal({
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
          rows: 24
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        terminal.open(terminalRef.current);

        setTimeout(() => fitAddon.fit(), 100);

        let currentLine = '';
        let promptShown = false;

        const showPrompt = () => {
          if (!promptShown) {
            terminal.write(`${currentDirectory} $ `);
            promptShown = true;
          }
        };

        const handleCommand = async (command: string) => {
          const trimmedCommand = command.trim();
          if (!trimmedCommand) { showPrompt(); return; }

          switch (trimmedCommand) {
            case 'help':
              terminal.writeln('\r\n🦷 Diamond Link Terminal Commands:');
              terminal.writeln('  help           - Show this help message');
              terminal.writeln('  clear          - Clear terminal');
              terminal.writeln('  pwd            - Print working directory');
              terminal.writeln('  ls             - List directory contents');
              terminal.writeln('  diamond-status - Show application status');
              terminal.writeln('  diamond-logs   - Show recent logs');
              terminal.writeln('  diamond-users  - List active users');
              terminal.writeln('  diamond-db     - Database status');
              terminal.writeln('  test-terminal  - Test terminal API');
              terminal.writeln('  env-test       - Show environment info');
              break;
            case 'clear':
              terminal.clear();
              promptShown = false;
              showPrompt();
              return;
            case 'pwd':
              terminal.writeln(`\r\n${currentDirectory}`);
              break;
            case 'whoami':
              terminal.writeln('\r\n👤 techsupport@dentaldiamondhn');
              break;
            case 'date':
              terminal.writeln(`\r\n📅 ${new Date().toString()}`);
              break;
            default:
              try {
                terminal.write(`\r\n⏳ Executing: ${trimmedCommand}...`);
                const response = await fetch('/api/terminal/execute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ command: trimmedCommand, cwd: currentDirectory })
                });
                const result = await response.json();
                if (response.ok) terminal.writeln(`\r\n${result.output}`);
                else terminal.writeln(`\r\n❌ Error: ${result.error}`);
              } catch (error) {
                terminal.writeln(`\r\n❌ Command execution failed: ${error}`);
              }
          }
          showPrompt();
        };

        terminal.onData((data: string) => {
          const char = data.charCodeAt(0);
          if (char === 13) {
            terminal.write('\r\n');
            handleCommand(currentLine);
            currentLine = '';
            promptShown = false;
          } else if (char === 127) {
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              terminal.write('\b \b');
            }
          } else if (char === 3) {
            terminal.write('^C\r\n');
            currentLine = '';
            promptShown = false;
            showPrompt();
          } else if (char >= 32 && char <= 126) {
            currentLine += data;
            terminal.write(data);
          }
        });

        terminal.writeln('\x1b[32m🦷 Diamond Link Dental - Tech Support Terminal\x1b[0m');
        terminal.writeln('🚀 Real terminal with backend execution support');
        terminal.writeln('💡 Type "help" for available commands');
        showPrompt();
        setIsConnected(true);
      } catch (err) {
        console.error('Terminal initialization failed:', err);
      }
    };

    initTerminal();
    return () => { if (terminal) terminal.dispose(); };
  }, [isMounted, currentDirectory]);

  if (!isMounted) return null;

  if (isMounted && userRole !== 'tech_support') {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permiso para acceder a esta página."
        explanation="Esta área es exclusiva para el personal de soporte técnico."
        contactInfo="Si necesitas acceso, contacta a un administrador del sistema."
        onGoBack={() => typeof window !== 'undefined' ? window.history.back() : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🦷 Diamond Link Terminal
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`text-xs px-2 py-1 rounded ${isConnected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span className="text-gray-400 text-xs">{currentDirectory}</span>
              </div>
            </div>
          </div>
          <div ref={terminalRef} style={{ height: '600px' }} className="bg-black" />
        </div>
      </div>
    </div>
  );
}
