'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'error' | 'success' | 'warning';
  message: string;
  details?: any;
}

interface DebugContextType {
  logs: DebugLog[];
  addLog: (level: DebugLog['level'], message: string, details?: any) => void;
  clearLogs: () => void;
  isDebugMode: boolean;
  toggleDebugMode: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within DebugProvider');
  }
  return context;
};

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isDebugMode, setIsDebugMode] = useState(false);

  const addLog = (level: DebugLog['level'], message: string, details?: any) => {
    const newLog: DebugLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      details
    };
    
    setLogs(prev => [...prev.slice(-19), newLog]); // Keep last 20 logs
    
    // Also log to console for development
    console.log(`[${level.toUpperCase()}] ${message}`, details || '');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const toggleDebugMode = () => {
    setIsDebugMode(prev => !prev);
  };

  return (
    <DebugContext.Provider value={{
      logs,
      addLog,
      clearLogs,
      isDebugMode,
      toggleDebugMode
    }}>
      {children}
    </DebugContext.Provider>
  );
};

export const MobileDebugPanel: React.FC = () => {
  const { logs, clearLogs, isDebugMode, toggleDebugMode } = useDebug();

  if (!isDebugMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleDebugMode}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Show Debug Panel"
        >
          🐛
        </button>
      </div>
    );
  }

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLevelIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  return (
    <div className="fixed inset-4 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Debug Console</h3>
        <div className="flex space-x-2">
          <button
            onClick={clearLogs}
            className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={toggleDebugMode}
            className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="h-full overflow-y-auto p-4 space-y-2">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No logs yet. Try using the widget features.
          </div>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className={`p-3 rounded-lg border ${getLevelColor(log.level)}`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">{getLevelIcon(log.level)}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{log.message}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                  {log.details && (
                    <div className="mt-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
