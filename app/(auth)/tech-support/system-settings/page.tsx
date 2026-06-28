'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { useTheme } from '@/contexts/ThemeContext';
import AccessDenied from '@/components/AccessDenied';
import { 
  Settings, 
  Mail, 
  Shield, 
  Database, 
  Save, 
  RotateCcw, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string | boolean | number;
  description: string;
  category: string;
  type: 'string' | 'boolean' | 'number' | 'select';
  options?: string[];
}

export default function SystemSettings() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const { userRole } = useRoleBasedAccess();
  const { resolvedTheme } = useTheme();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Check if user is tech support
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

  // Mock data for demonstration
  useEffect(() => {
    setTimeout(() => {
      setSettings([
        // General Settings
        {
          key: 'app_name',
          value: 'Diamond Link Dental',
          description: 'Nombre de la aplicación',
          category: 'general',
          type: 'string'
        },
        {
          key: 'maintenance_mode',
          value: false,
          description: 'Modo de mantenimiento',
          category: 'general',
          type: 'boolean'
        },
        {
          key: 'max_file_size',
          value: 10,
          description: 'Tamaño máximo de archivo (MB)',
          category: 'general',
          type: 'number'
        },
        // Email Settings
        {
          key: 'smtp_host',
          value: 'smtp.gmail.com',
          description: 'Servidor SMTP',
          category: 'email',
          type: 'string'
        },
        {
          key: 'smtp_port',
          value: 587,
          description: 'Puerto SMTP',
          category: 'email',
          type: 'number'
        },
        {
          key: 'email_notifications',
          value: true,
          description: 'Notificaciones por email',
          category: 'email',
          type: 'boolean'
        },
        // Security Settings
        {
          key: 'session_timeout',
          value: 30,
          description: 'Tiempo de sesión (minutos)',
          category: 'security',
          type: 'number'
        },
        {
          key: 'password_min_length',
          value: 8,
          description: 'Longitud mínima de contraseña',
          category: 'security',
          type: 'number'
        },
        {
          key: 'two_factor_auth',
          value: false,
          description: 'Autenticación de dos factores',
          category: 'security',
          type: 'boolean'
        },
        // Backup Settings
        {
          key: 'auto_backup',
          value: true,
          description: 'Backup automático',
          category: 'backup',
          type: 'boolean'
        },
        {
          key: 'backup_frequency',
          value: 'daily',
          description: 'Frecuencia de backup',
          category: 'backup',
          type: 'select',
          options: ['hourly', 'daily', 'weekly', 'monthly']
        },
        {
          key: 'backup_retention',
          value: 30,
          description: 'Retención de backups (días)',
          category: 'backup',
          type: 'number'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredSettings = settings.filter(setting => setting.category === activeTab);

  const updateSetting = (key: string, value: string | boolean | number) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
  };

  const saveSettings = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      alert('Configuración guardada exitosamente');
    }, 1000);
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
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            value={setting.value as number}
            onChange={(e) => updateSetting(setting.key, parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-24"
          />
        );
      case 'select':
        return (
          <select
            value={setting.value as string}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex-1 min-w-0"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings, color: 'blue' },
    { id: 'email', label: 'Email', icon: Mail, color: 'green' },
    { id: 'security', label: 'Seguridad', icon: Shield, color: 'purple' },
    { id: 'backup', label: 'Backup', icon: Database, color: 'orange' }
  ];

  const getTabColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) {
      return 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600';
    }
    const colors: Record<string, string> = {
      blue: 'border-blue-500 text-blue-600 dark:text-blue-400',
      green: 'border-green-500 text-green-600 dark:text-green-400',
      purple: 'border-purple-500 text-purple-600 dark:text-purple-400',
      orange: 'border-orange-500 text-orange-600 dark:text-orange-400'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Configuración del Sistema
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona las configuraciones del sistema • {new Date().toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50"
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

      {/* Tabs */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <nav className="flex -mb-px space-x-6 overflow-x-auto">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${getTabColorClasses(tab.color, isActive)}`}
              >
                <TabIcon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Form */}
      <div className={`rounded-xl shadow-sm ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4 md:p-6">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredSettings.map(setting => (
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

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <button className="inline-flex items-center justify-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restablecer Valores
              </button>
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="inline-flex items-center justify-center px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Config
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estado del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="text-green-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Base de Datos</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Conectada</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Operativo
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="text-green-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">API</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Funcionando</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Operativo
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="text-yellow-500">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Almacenamiento</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">75% usado</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              Degradado
            </span>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recursos del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">CPU</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">45%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
          {/* Memory */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Memoria</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">62%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '62%' }}></div>
            </div>
          </div>
          {/* Storage */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Almacenamiento</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">75%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
