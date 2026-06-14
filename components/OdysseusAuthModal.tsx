'use client';

import React, { useState } from 'react';

interface OdysseusAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: OdysseusConfig) => void;
}

interface OdysseusConfig {
  baseUrl: string;
  username: string;
  password: string;
  chatEndpoint?: string;
  workspace?: string;
}

export default function OdysseusAuthModal({ isOpen, onClose, onSave }: OdysseusAuthModalProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:7000');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [chatEndpoint, setChatEndpoint] = useState('/api/chat');
  const [workspace, setWorkspace] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [validationSuccess, setValidationSuccess] = useState(false);

  const handleValidate = async () => {
    if (!username || !password) {
      setValidationError('Username and password are required');
      return false;
    }

    setIsValidating(true);
    setValidationError('');
    setValidationSuccess(false);

    try {
      const response = await fetch('/api/odysseus-auth/validate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-call': 'true'
        },
        body: JSON.stringify({ baseUrl, username, password, chatEndpoint }),
      });

      const data = await response.json();

      if (data.valid) {
        setValidationSuccess(true);
        return true;
      } else {
        setValidationError(data.error || data.details || 'Validation failed');
        return false;
      }
    } catch (error) {
      setValidationError('Failed to validate credentials. Please try again.');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save credentials without mandatory validation
    // Users can test connection separately if they want
    onSave({ baseUrl, username, password, chatEndpoint, workspace });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 dark:text-indigo-400 text-lg">🏛️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Odysseus AI Login
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter your Odysseus credentials to authenticate.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Make sure your Odysseus server is running before connecting.
          </p>
          
          {validationError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {validationError}
              </p>
              <p className="text-xs text-red-500 dark:text-red-500 mt-1">
                Make sure your Odysseus server is running and you have the correct credentials.
              </p>
            </div>
          )}
          
          {validationSuccess && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Credentials validated successfully
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Server URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:7000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your Odysseus server URL (e.g., http://localhost:7000)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-username"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="your-password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chat Endpoint
            </label>
            <input
              type="text"
              value={chatEndpoint}
              onChange={(e) => setChatEndpoint(e.target.value)}
              placeholder="/api/v1/chat/completions"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              API path for chat completions (check your Odysseus API docs)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workspace Path (Optional)
            </label>
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="/home/dentaldiamondhn/diamond-link-original"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Path to your codebase for agent file operations (agent mode only)
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
              className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              disabled={isValidating}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Login & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}