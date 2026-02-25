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

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!terminalRef.current) return;

      // Initialize terminal
      const terminal = new Terminal({
        cursorBlink: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5',
        },
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        rows: 30,
        cols: 100,
      });

      // Add addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // Mount terminal
      terminal.open(terminalRef.current);
      
      // Small delay before fitting to ensure dimensions are available
      setTimeout(() => {
        try {
          fitAddon.fit();
        } catch (error) {
          console.warn('Failed to fit terminal:', error);
          // Fallback dimensions
          terminal.resize(80, 24);
        }
      }, 100);

      // Store instance
      terminalInstanceRef.current = terminal;

      // Custom command handler
      const handleCommand = async (command: string) => {
        const trimmedCommand = command.trim();
        
        if (!trimmedCommand) {
          return;
        }

        const parts = trimmedCommand.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);

        switch (cmd) {
          case 'help':
            terminal.writeln('\r\nAvailable commands:');
            terminal.writeln('  help          - Show this help message');
            terminal.writeln('  clear         - Clear terminal');
            terminal.writeln('  ls            - List directory contents');
            terminal.writeln('  cd <dir>      - Change directory');
            terminal.writeln('  pwd           - Print working directory');
            terminal.writeln('  cat <file>    - Display file contents');
            terminal.writeln('  mkdir <dir>   - Create directory');
            terminal.writeln('  touch <file>  - Create empty file');
            terminal.writeln('  rm <file>     - Remove file');
            terminal.writeln('  status        - Show system status');
            terminal.writeln('  logs          - View system logs');
            terminal.writeln('  users         - List users');
            terminal.writeln('  tickets       - List support tickets');
            terminal.writeln('  backup        - Create system backup');
            terminal.writeln('  config        - View system config');
            terminal.writeln('  whoami        - Display current user');
            terminal.writeln('  date          - Show current date and time');
            terminal.writeln('  exit          - Exit terminal');
            break;

          case 'clear':
            terminal.clear();
            return;

          case 'pwd':
            terminal.writeln(`\r\n${currentDirectory}`);
            break;

          case 'ls':
            terminal.writeln('\r\ndrwxr-xr-x  2 techsupport techsupport 4096 Jan 15 10:30 documents');
            terminal.writeln('drwxr-xr-x  2 techsupport techsupport 4096 Jan 15 10:30 downloads');
            terminal.writeln('drwxr-xr-x  2 techsupport techsupport 4096 Jan 15 10:30 logs');
            terminal.writeln('drwxr-xr-x  2 techsupport techsupport 4096 Jan 15 10:30 backups');
            terminal.writeln('-rw-r--r--  1 techsupport techsupport  256 Jan 15 10:30 config.json');
            terminal.writeln('-rw-r--r--  1 techsupport techsupport 1024 Jan 15 10:30 system.log');
            break;

          case 'cd':
            if (args.length === 0) {
              setCurrentDirectory('/home/techsupport');
            } else if (args[0] === '..') {
              setCurrentDirectory('/home');
            } else if (args[0].startsWith('/')) {
              setCurrentDirectory(args[0]);
            } else {
              setCurrentDirectory(`${currentDirectory}/${args[0]}`);
            }
            break;

          case 'whoami':
            terminal.writeln('\r\ntechsupport');
            break;

          case 'date':
            terminal.writeln(`\r\n${new Date().toString()}`);
            break;

          case 'status':
            terminal.writeln('\r\nSystem Status:');
            terminal.writeln('  Database:     ✓ Online');
            terminal.writeln('  API Server:   ✓ Running');
            terminal.writeln('  Storage:      75% used');
            terminal.writeln('  Backup:       ✓ Up to date');
            terminal.writeln('  Active Users: 12');
            terminal.writeln('  Open Tickets: 5');
            break;

          case 'logs':
            terminal.writeln('\r\nRecent System Logs:');
            terminal.writeln('  [2024-01-15 10:30:00] INFO: User login successful');
            terminal.writeln('  [2024-01-15 10:25:00] WARN: High memory usage detected');
            terminal.writeln('  [2024-01-15 10:20:00] ERROR: Database connection failed');
            terminal.writeln('  [2024-01-15 10:15:00] INFO: Backup completed successfully');
            break;

          case 'users':
            terminal.writeln('\r\nActive Users:');
            terminal.writeln('  admin          - Administrator     (Online)');
            terminal.writeln('  dr_perez       - Doctor           (Online)');
            terminal.writeln('  maria_g        - Staff            (Away)');
            terminal.writeln('  dr_sanchez     - Doctor           (Offline)');
            break;

          case 'tickets':
            terminal.writeln('\r\nSupport Tickets:');
            terminal.writeln('  #123 - Open     - High   - Error en calendario');
            terminal.writeln('  #122 - Progress - Medium - Problema firma digital');
            terminal.writeln('  #121 - Resolved - Low    - Lentitud dashboard');
            break;

          case 'backup':
            terminal.write('\r\nCreating backup...');
            setTimeout(() => {
              terminal.writeln(' ✓');
              terminal.writeln('Backup created: backup_20240115_103000.tar.gz');
            }, 2000);
            break;

          case 'config':
            terminal.writeln('\r\nSystem Configuration:');
            terminal.writeln('  APP_NAME: Diamond Link Dental');
            terminal.writeln('  VERSION: 1.0.0');
            terminal.writeln('  NODE_ENV: production');
            terminal.writeln('  DB_HOST: localhost');
            terminal.writeln('  BACKUP_ENABLED: true');
            terminal.writeln('  LOG_LEVEL: info');
            break;

          case 'cat':
            if (args.length === 0) {
              terminal.writeln('\r\ncat: missing file operand');
            } else {
              terminal.writeln(`\r\nContents of ${args[0]}:`);
              terminal.writeln('This is a simulated file content.');
              terminal.writeln('In a real implementation, this would read actual files.');
            }
            break;

          case 'mkdir':
          case 'touch':
          case 'rm':
            terminal.writeln(`\r\n${cmd}: ${args.join(' ')} - Command simulated`);
            break;

          case 'exit':
            terminal.writeln('\r\nGoodbye!');
            setTimeout(() => {
              terminal.clear();
              terminal.writeln('Terminal session ended. Refresh to restart.');
            }, 1000);
            break;

          default:
            terminal.writeln(`\r\nCommand not found: ${cmd}. Type 'help' for available commands.`);
        }
      };

      // Handle terminal input
      let currentLine = '';
      let promptShown = false;

      const showPrompt = () => {
        if (!promptShown) {
          terminal.write(`\r\n${currentDirectory} $ `);
          promptShown = true;
        }
      };

      const handleData = (data: string) => {
        const char = data.charCodeAt(0);
        
        if (char === 13) { // Enter
          terminal.write('\r\n');
          handleCommand(currentLine);
          currentLine = '';
          promptShown = false;
          showPrompt();
        } else if (char === 127) { // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            terminal.write('\b \b');
          }
        } else if (char >= 32 && char <= 126) { // Printable characters
          currentLine += data;
          terminal.write(data);
        }
      };

      terminal.onData(handleData);

      // Show welcome message and initial prompt
      terminal.writeln('\x1b[32mDiamond Link Dental - Tech Support Terminal\x1b[0m');
      terminal.writeln('Type "help" for available commands');
      showPrompt();

      // Handle window resize
      const handleResize = () => {
        try {
          fitAddon.fit();
        } catch (error) {
          console.warn('Failed to resize terminal:', error);
        }
      };
      window.addEventListener('resize', handleResize);

      setIsConnected(true);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        terminal.dispose();
      };
    }, 100); // Initial delay for DOM readiness

    return () => {
      clearTimeout(timer);
    };
  }, [currentDirectory]);

  return (
    <div className="p-6">
      <div className="bg-black rounded-lg shadow-2xl overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="ml-3 text-gray-300 text-sm">Terminal</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`text-xs px-2 py-1 rounded ${isConnected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="text-gray-400 text-xs">{currentDirectory}</span>
          </div>
        </div>
        <div 
          ref={terminalRef} 
          className="bg-black p-2"
          style={{ height: '600px' }}
        />
      </div>
      
      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Terminal Commands</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><code className="bg-gray-100 px-2 py-1 rounded">help</code> - Show commands</div>
          <div><code className="bg-gray-100 px-2 py-1 rounded">clear</code> - Clear terminal</div>
          <div><code className="bg-gray-100 px-2 py-1 rounded">ls</code> - List files</div>
          <div><code className="bg-gray-100 px-2 py-1 rounded">status</code> - System status</div>
          <div><code className="bg-gray-100 px-2 py-1 rounded">logs</code> - View logs</div>
          <div><code className="bg-gray-100 px-2 py-1 rounded">users</code> - List users</div>
          <div><code className="bg-gray-100 px-2 py-1 rounded">tickets</code> - Support tickets</div>
          <div><code className="bg-gray-100 px-2 py-1 rounded">backup</code> - Create backup</div>
          <div><code className="bg-gray-100 px-2 py-1 rounded">config</code> - System config</div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          This is a simulated terminal for demonstration. Real command execution requires backend implementation.
        </p>
      </div>
    </div>
  );
}
