'use client';

import React, { useState, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { useTheme } from '@/contexts/ThemeContext';
import AccessDenied from '@/components/AccessDenied';
import { 
  Save, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Activity,
  Zap,
  BarChart3,
  TrendingUp
} from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string | boolean | number;
  description: string;
  category: string;
  type: 'string' | 'boolean' | 'number' | 'select';
  options?: string[];
}

const DEFAULT_SETTINGS: SystemSetting[] = [
  // TanStack Query
  {
    key: 'query_devtools',
    value: false,
    description: 'React Query Devtools (dev only)',
    category: 'performance',
    type: 'boolean'
  },
  {
    key: 'query_stale_time',
    value: 30,
    description: 'Query Stale Time (seconds)',
    category: 'performance',
    type: 'number'
  },
  {
    key: 'query_retry_count',
    value: 3,
    description: 'Query Retry Count',
    category: 'performance',
    type: 'number'
  },
  {
    key: 'query_refetch_window',
    value: true,
    description: 'Refetch on Window Focus',
    category: 'performance',
    type: 'boolean'
  },
  // Bundle analyzer
  {
    key: 'bundle_last_analyzed',
    value: 'Never',
    description: 'Last Bundle Analysis',
    category: 'performance',
    type: 'string'
  }
];

export default function SystemSettings() {
  const { userRole } = useRoleBasedAccess();
  const { resolvedTheme } = useTheme();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
        setLoading(false);
        return;
      } catch (e) {}
    }
    setSettings(DEFAULT_SETTINGS);
    setLoading(false);
  }, []);

  const updateSetting = (key: string, value: string | boolean | number) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
  };

  const saveSettings = () => {
    setSaving(true);
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    setTimeout(() => {
      setSaving(false);
    }, 300);
  };

  const renderSettingInput = (setting: SystemSetting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value as boolean}
              onChange={(e) => updateSetting(setting.key, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            value={setting.value as number}
            onChange={(e) => updateSetting(setting.key, Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-24"
          />
        );
      case 'select':
        return (
          <select
            value={setting.value as string}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {setting.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={setting.value as string}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex-1 min-w-0"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitoreo y rendimiento • {new Date().toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 rounded-lg text-white transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      {/* Performance Settings */}
      <div className={`rounded-xl shadow-sm ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rendimiento y Monitoreo</h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {settings.map(setting => (
              <div key={setting.key} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 first:pt-0 last:pb-0 gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    {setting.description}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{setting.key}</p>
                </div>
                <div className="sm:ml-4 flex-shrink-0">
                  {renderSettingInput(setting)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estado de Servicios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="text-green-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Vercel Analytics</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">@vercel/analytics v1</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Activo</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="text-green-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Vercel Speed Insights</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">@vercel/speed-insights v2</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Activo</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="text-green-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">TanStack Query</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">@tanstack/react-query v5 — ready</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Instalado</span>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bundle Analyzer */}
        <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-start gap-3">
            <BarChart3 className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bundle Analyzer</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Run <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-teal-600 dark:text-teal-400">npm run analyze</code> to visualize bundle composition and check for large packages leaking into client chunks.
              </p>
            </div>
          </div>
        </div>

        {/* Image Optimization */}
        <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Image Optimization</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-teal-600 dark:text-teal-400">sharp</code> is installed and used by <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-teal-600 dark:text-teal-400">next/image</code> automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Package Versions */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-teal-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paquetes Instalados</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { name: '@tanstack/react-query', version: '^5', status: 'installed' },
            { name: '@next/bundle-analyzer', version: '^15', status: 'dev' },
            { name: 'sharp', version: '^0.33', status: 'installed' },
            { name: '@vercel/analytics', version: '^1', status: 'installed' },
            { name: '@vercel/speed-insights', version: '^2', status: 'installed' },
            { name: 'react-icons', version: '^5', status: 'optimized' },
            { name: 'lucide-react', version: '^0.562', status: 'optimized' },
          ].map(pkg => (
            <span
              key={pkg.name}
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                pkg.status === 'installed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : pkg.status === 'dev'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
              }`}
            >
              {pkg.name} <span className="ml-1 opacity-75">{pkg.version}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
