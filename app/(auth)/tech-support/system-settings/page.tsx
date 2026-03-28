'use client';

import React, { useState, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

interface SystemSetting {
  key: string;
  value: string | boolean | number;
  description: string;
  category: string;
  type: 'string' | 'boolean' | 'number' | 'select';
  options?: string[];
}

export default function SystemSettings() {
  const { userRole } = useRoleBasedAccess();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
  
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

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

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
  };

  const saveSettings = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      // Show success message
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            value={setting.value as number}
            onChange={(e) => updateSetting(setting.key, parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
      case 'select':
        return (
          <select
            value={setting.value as string}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: 'fas fa-cog' },
    { id: 'email', label: 'Email', icon: 'fas fa-envelope' },
    { id: 'security', label: 'Seguridad', icon: 'fas fa-shield-alt' },
    { id: 'backup', label: 'Backup', icon: 'fas fa-database' }
  ];

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-6">
            {filteredSettings.map(setting => (
              <div key={setting.key} className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {setting.description}
                  </label>
                  <p className="text-xs text-gray-500">{setting.key}</p>
                </div>
                <div className="ml-4">
                  {renderSettingInput(setting)}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between">
              <button
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-undo mr-2"></i>
                Restablecer Valores
              </button>
              <div className="space-x-3">
                <button
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <i className="fas fa-download mr-2"></i>
                  Exportar Config
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-green-800">Base de Datos</p>
                  <p className="text-xs text-green-600">Conectada</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-green-800">API</p>
                  <p className="text-xs text-green-600">Funcionando</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Almacenamiento</p>
                  <p className="text-xs text-yellow-600">75% usado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
