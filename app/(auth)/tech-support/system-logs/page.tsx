'use client';

import React, { useState, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { useTheme } from '@/contexts/ThemeContext';
import AccessDenied from '@/components/AccessDenied';
import { 
  FileText,
  Search,
  Download,
  Trash2,
  Clock,
  Tag,
  LayoutGrid,
  MessageSquare,
  User,
  Settings,
  Eye,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  RefreshCw
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  module: string;
  userId?: string;
  details?: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
}

export default function SystemLogs() {
  const { userRole } = useRoleBasedAccess();
  const { resolvedTheme } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

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

  // Fetch real system logs from API
  useEffect(() => {
    fetchSystemLogs();
  }, []);

  const fetchSystemLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tickets/system-logs');
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Unauthorized to access system logs');
          setLogs([]);
          return;
        }
        if (response.status === 403) {
          console.error('Insufficient permissions to access system logs');
          setLogs([]);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Transform the data to match the LogEntry interface
      const transformedLogs = data.logs.map((log: any) => ({
        id: log.id,
        timestamp: log.created_at,
        level: getLogLevel(log.activity_type, log.content),
        message: log.content,
        module: getLogModule(log.activity_type, log.metadata),
        userId: log.user_id,
        details: log.metadata ? JSON.stringify(log.metadata) : undefined,
        user: log.user
      }));
      
      setLogs(transformedLogs);
    } catch (error) {
      console.error('Error fetching system logs:', error);
      // Fallback to empty array if API fails
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to transform log data
  const getLogLevel = (activityType: string, content: string): LogEntry['level'] => {
    if (content.toLowerCase().includes('error') || activityType.includes('ERROR')) return 'error';
    if (content.toLowerCase().includes('warning') || activityType.includes('WARNING')) return 'warning';
    if (content.toLowerCase().includes('debug') || activityType.includes('DEBUG')) return 'debug';
    return 'info';
  };

  const getLogModule = (activityType: string, metadata: any): string => {
    if (metadata?.module) return metadata.module;
    if (activityType.includes('TICKET')) return 'Tickets';
    if (activityType.includes('ATTACHMENT')) return 'Storage';
    if (activityType.includes('SYSTEM')) return 'System';
    return 'Application';
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.module.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'debug': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="w-3 h-3 mr-1" />;
      case 'warning': return <AlertCircle className="w-3 h-3 mr-1" />;
      case 'info': return <Info className="w-3 h-3 mr-1" />;
      case 'debug': return <Bug className="w-3 h-3 mr-1" />;
      default: return <AlertCircle className="w-3 h-3 mr-1" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar logs por mensaje o módulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Todos los niveles</option>
                <option value="error">Errores</option>
                <option value="warning">Advertencias</option>
                <option value="info">Información</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={fetchSystemLogs}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors">
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className={`rounded-xl shadow-sm overflow-hidden ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timestamp
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Nivel
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    Módulo
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Mensaje
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Usuario
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Acciones
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getLevelColor(log.level)}`}>
                      {getLevelIcon(log.level)}
                      <span className="capitalize">{log.level}</span>
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {log.module}
                  </td>
                  <td className="px-4 md:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <div className="max-w-xs truncate">{log.message}</div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.userId || (
                      <span className="text-gray-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No se encontraron logs</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-sm w-full max-w-2xl overflow-hidden ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Detalles del Log
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Timestamp</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nivel</label>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getLevelColor(selectedLog.level)}`}>
                    {getLevelIcon(selectedLog.level)}
                    <span className="capitalize">{selectedLog.level}</span>
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Módulo</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.module}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Usuario</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.userId || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mensaje</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">{selectedLog.message}</p>
              </div>
              
              {selectedLog.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Detalles</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">{selectedLog.details}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 md:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
