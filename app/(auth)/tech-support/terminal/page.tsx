'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useRoleBasedAccess } from '../../../../hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

export default function TechSupportTerminal() {
  const { userRole } = useRoleBasedAccess();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
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

    const timer = setTimeout(() => {
      if (!terminalRef.current) return;

      // Simple terminal initialization
      const terminal = new Terminal({
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

      // Add addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // Mount terminal
      terminal.open(terminalRef.current);
      terminalInstanceRef.current = terminal;

      // Fit terminal
      setTimeout(() => {
        fitAddon.fit();
      }, 100);

      // Handle terminal input
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
        
        if (!trimmedCommand) {
          showPrompt();
          return;
        }

        // Handle built-in commands
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

          case 'exit':
            terminal.writeln('\r\n👋 Goodbye!');
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
            // Handle all other commands via backend API
            try {
              terminal.write(`\r\n⏳ Executing: ${trimmedCommand}...`);
              
              const response = await fetch('/api/terminal/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: trimmedCommand, cwd: currentDirectory })
              });
              
              const result = await response.json();
              
              if (response.ok) {
                terminal.writeln(`\r\n${result.output}`);
              } else {
                terminal.writeln(`\r\n❌ Error: ${result.error}`);
              }
            } catch (error) {
              terminal.writeln(`\r\n❌ Command execution failed: ${error}`);
            }
        }

        showPrompt();
      };

      const handleData = (data: string) => {
        const char = data.charCodeAt(0);
        
        if (char === 13) { // Enter
          terminal.write('\r\n');
          handleCommand(currentLine);
          currentLine = '';
          promptShown = false;
        } else if (char === 127) { // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            terminal.write('\b \b');
          }
        } else if (char === 3) { // Ctrl+C
          terminal.write('^C\r\n');
          currentLine = '';
          promptShown = false;
          showPrompt();
        } else if (char >= 32 && char <= 126) { // Printable characters
          currentLine += data;
          terminal.write(data);
        }
      };

      // Handle paste
      const handlePaste = (event: ClipboardEvent) => {
        event.preventDefault();
        const pastedText = event.clipboardData?.getData('text') || '';
        if (pastedText) {
          const cleanText = pastedText.replace(/[\x00-\x1F\x7F]/g, '');
          currentLine += cleanText;
          terminal.write(cleanText);
        }
      };

      // Handle Ctrl+V
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === 'v') {
          event.preventDefault();
          navigator.clipboard.readText().then(text => {
            if (text) {
              const cleanText = text.replace(/[\x00-\x1F\x7F]/g, '');
              currentLine += cleanText;
              terminal.write(cleanText);
            }
          }).catch(() => {});
        }
        // Handle Ctrl+C for copy
        if (event.ctrlKey && event.key === 'c' && terminal.hasSelection()) {
          event.preventDefault();
          const selection = terminal.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection).then(() => {});
          }
        }
      };

      // Attach event handlers
      terminal.onData(handleData);

      setTimeout(() => {
        const textarea = terminal.textarea;
        if (textarea) {
          textarea.addEventListener('paste', handlePaste);
          textarea.addEventListener('keydown', handleKeyDown);
        }
      }, 100);

      // Show welcome message and prompt
      terminal.writeln('\x1b[32m🦷 Diamond Link Dental - Tech Support Terminal\x1b[0m');
      terminal.writeln('🚀 Real terminal with backend execution support');
      terminal.writeln('💡 Type "help" for available commands');
      showPrompt();

      setIsConnected(true);

      // Cleanup
      return () => {
        const textarea = terminal.textarea;
        if (textarea) {
          textarea.removeEventListener('paste', handlePaste);
          textarea.removeEventListener('keydown', handleKeyDown);
        }
        terminal.dispose();
      };
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [currentDirectory]);

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
          <div 
            ref={terminalRef}
            style={{ height: '600px' }}
            className="bg-black"
          />
        </div>
        
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">🦷 Diamond Link Terminal Commands</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📋 System Commands</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">help</code> - Show commands</div>
              <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">clear</code> - Clear terminal</div>
              <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">pwd</code> - Current directory</div>
              <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">ls</code> - List files</div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">🦷 Diamond Link Commands</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">diamond-status</code> - App status</div>
              <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">diamond-logs</code> - System logs</div>
              <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">diamond-users</code> - Active users</div>
              <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">diamond-db</code> - Database status</div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✅ Real Terminal:</strong> This terminal executes actual system commands with proper security restrictions.
              Use it for system administration, debugging, and Diamond Link management tasks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
