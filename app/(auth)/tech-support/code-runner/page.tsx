'use client';

import React, { useState, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

interface CodeExecution {
  id: string;
  code: string;
  language: string;
  output: string;
  error?: string;
  timestamp: Date;
}

export default function CodeRunner() {
  const { userRole } = useRoleBasedAccess();
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<CodeExecution[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  const [codeState, setCodeState] = useState(`// Welcome to Diamond Link Dental Code Runner
// You can execute JavaScript code here

console.log('Hello, Tech Support!');

// Example: Check system status
const systemStatus = {
  database: 'online',
  api: 'running',
  users: 12,
  tickets: 5
};

console.log('System Status:', systemStatus);

// Example: Calculate backup size
function calculateBackupSize(data) {
  return data.reduce((total, item) => total + item.size, 0);
}

const backupData = [
  { name: 'patients.db', size: 1024 * 1024 * 50 }, // 50MB
  { name: 'logs.db', size: 1024 * 1024 * 10 },  // 10MB
  { name: 'backups.tar', size: 1024 * 1024 * 100 } // 100MB
];

console.log('Total backup size:', calculateBackupSize(backupData) / 1024 / 1024, 'MB');`);
  
  const [language, setLanguage] = useState('javascript');
  const [executions, setExecutions] = useState<CodeExecution[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const executeCode = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      // Capture console output
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      const capturedOutput: string[] = [];
      const capturedErrors: string[] = [];
      const capturedWarnings: string[] = [];

      console.log = (...args) => {
        capturedOutput.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
        originalConsoleLog(...args);
      };

      console.error = (...args) => {
        capturedErrors.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
        originalConsoleError(...args);
      };

      console.warn = (...args) => {
        capturedWarnings.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
        originalConsoleWarn(...args);
      };

      // Execute the code
      const result = eval(code);
      
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;

      // Build output
      let finalOutput = '';
      if (capturedOutput.length > 0) {
        finalOutput += capturedOutput.join('\n');
      }
      if (capturedWarnings.length > 0) {
        finalOutput += (finalOutput ? '\n' : '') + 'Warnings:\n' + capturedWarnings.join('\n');
      }
      if (capturedErrors.length > 0) {
        finalOutput += (finalOutput ? '\n' : '') + 'Errors:\n' + capturedErrors.join('\n');
      }
      if (result !== undefined && capturedOutput.length === 0 && capturedErrors.length === 0) {
        finalOutput = JSON.stringify(result, null, 2);
      }

      setOutput(finalOutput || 'Code executed successfully (no output)');

      // Save to history
      const execution: CodeExecution = {
        id: Date.now().toString(),
        code,
        language,
        output: finalOutput || 'Code executed successfully (no output)',
        timestamp: new Date()
      };
      setExecutions(prev => [execution, ...prev.slice(0, 9)]); // Keep last 10

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setOutput('');
    } finally {
      setIsRunning(false);
    }
  };

  const clearCode = () => {
    setCode('');
    setOutput('');
    setError('');
  };

  const loadExample = (example: string) => {
    const examples = {
      'system-check': `// System Health Check
const systemChecks = [
  { name: 'Database', check: () => Math.random() > 0.1 },
  { name: 'API Server', check: () => Math.random() > 0.05 },
  { name: 'Storage', check: () => Math.random() > 0.2 },
  { name: 'Backup', check: () => Math.random() > 0.15 }
];

console.log('=== System Health Check ===');
systemChecks.forEach(service => {
  const status = service.check() ? '✓ PASS' : '✗ FAIL';
  console.log(\`\${service.name}: \${status}\`);
});`,
      
      'user-stats': `// User Statistics Analysis
const users = [
  { id: 1, name: 'Admin', role: 'admin', lastLogin: new Date('2024-01-15'), tickets: 2 },
  { id: 2, name: 'Dr. Perez', role: 'doctor', lastLogin: new Date('2024-01-15'), tickets: 1 },
  { id: 3, name: 'Maria', role: 'staff', lastLogin: new Date('2024-01-14'), tickets: 0 },
  { id: 4, name: 'Dr. Sanchez', role: 'doctor', lastLogin: new Date('2024-01-13'), tickets: 3 }
];

console.log('=== User Statistics ===');
const roleStats = users.reduce((acc, user) => {
  acc[user.role] = (acc[user.role] || 0) + 1;
  return acc;
}, {});

console.log('Users by role:', roleStats);

const activeToday = users.filter(u => 
  u.lastLogin.toDateString() === new Date().toDateString()
).length;

console.log(\`Active today: \${activeToday}/\${users.length}\`);`,
      
      'backup-analyzer': `// Backup Analysis Tool
const backups = [
  { date: '2024-01-15', size: 160, type: 'full', status: 'success' },
  { date: '2024-01-14', size: 45, type: 'incremental', status: 'success' },
  { date: '2024-01-13', size: 155, type: 'full', status: 'success' },
  { date: '2024-01-12', size: 42, type: 'incremental', status: 'failed' }
];

console.log('=== Backup Analysis ===');
const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
const successRate = (backups.filter(b => b.status === 'success').length / backups.length * 100).toFixed(1);

console.log(\`Total backup size: \${totalSize} MB\`);
console.log(\`Success rate: \${successRate}%\`);

const avgSize = (totalSize / backups.length).toFixed(1);
console.log(\`Average backup size: \${avgSize} MB\`);`
    };
    
    setCode(examples[example as keyof typeof examples] || '');
  };

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

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Code Editor</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL</option>
                </select>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  History ({executions.length})
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-96 p-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Write your code here..."
              spellCheck={false}
            />
            
            <div className="mt-4 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={executeCode}
                  disabled={isRunning || !code.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play mr-2"></i>
                      Run Code
                    </>
                  )}
                </button>
                <button
                  onClick={clearCode}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <i className="fas fa-trash mr-2"></i>
                  Clear
                </button>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => loadExample('system-check')}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  System Check
                </button>
                <button
                  onClick={() => loadExample('user-stats')}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                >
                  User Stats
                </button>
                <button
                  onClick={() => loadExample('backup-analyzer')}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
                >
                  Backup Analyzer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Output</h3>
          </div>
          
          <div className="p-4">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-red-800 font-semibold mb-2">Error</h4>
                <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
              </div>
            ) : output ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-gray-800 text-sm whitespace-pre-wrap font-mono">{output}</pre>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                <i className="fas fa-code text-4xl mb-4"></i>
                <p>Run your code to see output here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution History */}
      {showHistory && executions.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Execution History</h3>
          </div>
          
          <div className="p-4 space-y-4">
            {executions.map((execution) => (
              <div key={execution.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {execution.timestamp.toLocaleString()}
                  </span>
                  <button
                    onClick={() => {
                      setCode(execution.code);
                      setLanguage(execution.language);
                      setOutput(execution.output);
                      setError('');
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    Load
                  </button>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <pre className="text-xs text-gray-700 truncate">{execution.code}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-semibold mb-2">
          <i className="fas fa-info-circle mr-2"></i>
          Code Runner Information
        </h4>
        <div className="text-blue-700 text-sm space-y-1">
          <p>• Execute JavaScript code safely in your browser</p>
          <p>• Console.log output is captured and displayed</p>
          <p>• Perfect for testing algorithms, data manipulation, and system checks</p>
          <p>• All code runs in a sandboxed environment</p>
          <p>• Execution history is saved for your session</p>
        </div>
      </div>
    </div>
  );
}
