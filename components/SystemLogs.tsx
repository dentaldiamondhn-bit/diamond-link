import React, { useState, useEffect } from 'react';
import { TicketActivity } from '@/types/ticket';
import { Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { format } from 'date-fns';

interface SystemLogsProps {
  className?: string;
}

export default function SystemLogs({ className = '' }: SystemLogsProps) {
  const [logs, setLogs] = useState<TicketActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemLogs();
  }, []);

  const fetchSystemLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tickets/system-logs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch system logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching system logs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Cargando logs del sistema...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button
          onClick={fetchSystemLogs}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <Settings className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No hay logs del sistema disponibles</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Logs del Sistema
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Actividades del sistema y actualizaciones importantes
        </p>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            >
              <div className="flex-shrink-0">
                <LogIcon type={log.activity_type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {log.content}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(log.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
                
                {log.metadata && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs">
                    <pre className="text-gray-600 dark:text-gray-300 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogIcon({ type }: { type: string }) {
  const baseClasses = "flex h-8 w-8 items-center justify-center rounded-full";
  
  switch (type) {
    case "SYSTEM_UPDATE":
      return (
        <div className={`${baseClasses} bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300`}>
          <Settings size={16} />
        </div>
      );
    case "STATUS_CHANGE":
      return (
        <div className={`${baseClasses} bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300`}>
          <CheckCircle size={16} />
        </div>
      );
    default:
      return (
        <div className={`${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`}>
          <AlertCircle size={16} />
        </div>
      );
  }
}
