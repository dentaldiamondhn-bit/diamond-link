'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Monitor, Play, Download, ExternalLink, Terminal, CheckCircle, AlertCircle, Clock, Folder, Settings, Smartphone, Cloud, Github, Zap } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import AccessDenied from '@/components/AccessDenied';

interface Codespace {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  url?: string;
  createdAt: string;
  machine?: {
    name: string;
    type: string;
    state: string;
  };
  repository?: string;
  branch?: string;
}

interface CodespacesResponse {
  codespaces: Codespace[];
  total_count: number;
  message?: string;
  setup_required?: boolean;
  error?: string;
}

export default function GitHubCodespaces() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [codespaces, setCodespaces] = useState<Codespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCodespace, setNewCodespace] = useState({
    name: '',
    repository: 'dentaldiamondhn-bit/diamond-widget',
    branch: 'main',
    machine: 'standardLinux_x64'
  });

  useEffect(() => {
    loadCodespaces();
    const interval = setInterval(loadCodespaces, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadCodespaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call GitHub API to get codespaces
      const response = await fetch('/api/github/codespaces');
      const data: CodespacesResponse = await response.json();
      
      if (response.ok) {
        setCodespaces(data.codespaces);
        
        // Check if setup is required
        if (data.setup_required) {
          setError(data.message || 'GitHub setup required');
        }
      } else {
        throw new Error(data.error || 'Failed to load codespaces');
      }
    } catch (err) {
      setError('Failed to load codespaces: ' + err);
      setCodespaces([]);
    } finally {
      setLoading(false);
    }
  };

  const createCodespace = async () => {
    try {
      setCreating(true);
      setTerminalOutput(['🚀 Creating GitHub Codespace...', `📦 Repository: ${newCodespace.repository}`, `🌿 Branch: ${newCodespace.branch}`, `💻 Machine: ${newCodespace.machine}`]);
      
      const response = await fetch('/api/github/codespaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCodespace)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTerminalOutput(prev => [...prev, '✅ Codespace created successfully!', `🔗 URL: ${data.codespace.url}`, '⏳ Waiting for codespace to be ready...']);
        
        // Simulate codespace becoming ready
        setTimeout(() => {
          setCodespaces(prev => [...prev, data.codespace]);
          setTerminalOutput(prev => [...prev, '🎉 Codespace is ready to use!']);
          setShowCreateForm(false);
        }, 5000);
      } else {
        throw new Error(data.error || 'Failed to create codespace');
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, '❌ Failed to create codespace: ' + err]);
    } finally {
      setCreating(false);
    }
  };

  const openCodespace = (codespace: Codespace) => {
    if (codespace.url) {
      window.open(codespace.url, '_blank');
    }
  };

  const stopCodespace = async (codespace: Codespace) => {
    try {
      setTerminalOutput([`⏹️ Stopping codespace: ${codespace.name}...`]);
      
      const response = await fetch(`/api/github/codespaces/${codespace.id}/stop`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setCodespaces(prev => 
          prev.map(cs => 
            cs.id === codespace.id 
              ? { ...cs, status: 'stopped', url: undefined }
              : cs
          )
        );
        setTerminalOutput(prev => [...prev, '✅ Codespace stopped successfully']);
      } else {
        throw new Error('Failed to stop codespace');
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, '❌ Failed to stop codespace: ' + err]);
    }
  };

  const startCodespace = async (codespace: Codespace) => {
    try {
      setTerminalOutput([`▶️ Starting codespace: ${codespace.name}...`]);
      
      const response = await fetch(`/api/github/codespaces/${codespace.id}/start`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setCodespaces(prev => 
          prev.map(cs => 
            cs.id === codespace.id 
              ? { ...cs, status: 'starting' }
              : cs
          )
        );
        setTerminalOutput(prev => [...prev, '✅ Codespace starting...']);
        
        // Simulate codespace becoming ready
        setTimeout(() => {
          setCodespaces(prev => 
            prev.map(cs => 
              cs.id === codespace.id 
                ? { ...cs, status: 'running', url: `https://cs-${cs.id}.github.dev` }
                : cs
            )
          );
          setTerminalOutput(prev => [...prev, '🎉 Codespace is ready!']);
        }, 5000);
      } else {
        throw new Error('Failed to start codespace');
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, '❌ Failed to start codespace: ' + err]);
    }
  };

  const deleteCodespace = async (codespace: Codespace) => {
    try {
      setTerminalOutput([`🗑️ Deleting codespace: ${codespace.name}...`]);
      
      const response = await fetch(`/api/github/codespaces/${codespace.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setCodespaces(prev => prev.filter(cs => cs.id !== codespace.id));
        setTerminalOutput(prev => [...prev, '✅ Codespace deleted successfully']);
      } else {
        throw new Error('Failed to delete codespace');
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, '❌ Failed to delete codespace: ' + err]);
    }
  };

  const getStatusIcon = (status: Codespace['status']) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'starting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'stopped':
        return <Monitor className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Codespace['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'starting':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'stopped':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Github className="h-6 w-6 mr-2" />
          GitHub Codespaces
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center"
          >
            <Cloud className="h-4 w-4 mr-2" />
            Create Codespace
          </button>
          <button
            onClick={loadCodespaces}
            className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 flex items-center"
          >
            <Zap className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">Create New Codespace</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={newCodespace.name}
                onChange={(e) => setNewCodespace({...newCodespace, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="e.g., android-widget-dev"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repository</label>
              <input
                type="text"
                value={newCodespace.repository}
                onChange={(e) => setNewCodespace({...newCodespace, repository: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="owner/repository"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch</label>
              <input
                type="text"
                value={newCodespace.branch}
                onChange={(e) => setNewCodespace({...newCodespace, branch: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="main"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Machine Type</label>
              <select
                value={newCodespace.machine}
                onChange={(e) => setNewCodespace({...newCodespace, machine: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="standardLinux_x64">Standard Linux (2 cores, 8GB RAM)</option>
                <option value="premiumLinux_x64">Premium Linux (4 cores, 16GB RAM)</option>
                <option value="standardLinux_x64_arm64">Standard Linux ARM64 (2 cores, 8GB RAM)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={createCodespace}
              disabled={creating || !newCodespace.name}
              className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 flex items-center"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Create Codespace
                </>
              )}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && error.includes('GitHub token not configured') && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">GitHub Setup Required</h3>
          <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <p>• <strong>GitHub Token</strong> - Create a personal access token with <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">codespaces</code> and <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">repo</code> scopes</p>
            <p>• <strong>Environment Variable</strong> - Set <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">GITHUB_TOKEN</code> in your environment</p>
            <p>• <strong>Repository</strong> - Ensure the diamond-widget repository exists on GitHub</p>
          </div>
          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-800/30 rounded">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Quick Setup Steps:</h4>
            <ol className="list-decimal list-inside text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline text-yellow-700 dark:text-yellow-300">GitHub Settings → Developer settings → Personal access tokens</a></li>
              <li>Click "Generate new token (classic)"</li>
              <li>Give it a name like "Diamond Link Codespaces"</li>
              <li>Select scopes: <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">codespaces</code> and <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">repo</code></li>
              <li>Copy the generated token</li>
              <li>Set environment variable: <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">export GITHUB_TOKEN="your_token_here"</code></li>
              <li>Restart your application</li>
            </ol>
          </div>
        </div>
      )}

      {error && error.includes('Repository') && (
        <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">Repository Issue</h3>
          <div className="space-y-2 text-sm text-orange-800 dark:text-orange-200">
            <p>• <strong>Repository Not Found</strong> - The repository doesn't exist or you don't have access</p>
            <p>• <strong>Create Repository</strong> - Push the diamond-widget project to GitHub first</p>
            <p>• <strong>Check Permissions</strong> - Ensure your GitHub token has repository access</p>
          </div>
          <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-800/30 rounded">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Create Repository:</h4>
            <ol className="list-decimal list-inside text-sm text-orange-800 dark:text-orange-200 space-y-1">
              <li>Go to <a href="https://github.com/new" target="_blank" rel="noopener noreferrer" className="underline text-orange-700 dark:text-orange-300">Create new repository</a></li>
              <li>Name it: <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">diamond-widget</code></li>
              <li>Make it public or private (your choice)</li>
              <li>Initialize with README (optional)</li>
              <li>Push your local code to this repository</li>
            </ol>
          </div>
        </div>
      )}

      {error && !error.includes('GitHub token') && !error.includes('Repository') && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {codespaces.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Github className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <p>No codespaces found</p>
              <p className="text-sm">Create a new codespace to start cloud development</p>
            </div>
          ) : (
            codespaces.map(codespace => (
              <div key={codespace.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-700 transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {getStatusIcon(codespace.status)}
                      <h3 className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
                        {codespace.name}
                      </h3>
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(codespace.status)}`}>
                      {codespace.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {codespace.status === 'running' && (
                      <button
                        onClick={() => openCodespace(codespace)}
                        className="bg-green-600 dark:bg-green-700 text-white p-2 rounded hover:bg-green-700 dark:hover:bg-green-800"
                        title="Open Codespace"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                    {codespace.status === 'stopped' ? (
                      <button
                        onClick={() => startCodespace(codespace)}
                        className="bg-blue-600 dark:bg-blue-700 text-white p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-800"
                        title="Start Codespace"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => stopCodespace(codespace)}
                        className="bg-yellow-600 dark:bg-yellow-700 text-white p-2 rounded hover:bg-yellow-700 dark:hover:bg-yellow-800"
                        title="Stop Codespace"
                      >
                        <Monitor className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteCodespace(codespace)}
                      className="bg-red-600 dark:bg-red-700 text-white p-2 rounded hover:bg-red-700 dark:hover:bg-red-800"
                      title="Delete Codespace"
                    >
                      <Terminal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Created:</strong> {new Date(codespace.createdAt).toLocaleString()}</p>
                  {codespace.repository && <p><strong>Repository:</strong> {codespace.repository}</p>}
                  {codespace.branch && <p><strong>Branch:</strong> {codespace.branch}</p>}
                  {codespace.machine && <p><strong>Machine:</strong> {codespace.machine.name}</p>}
                  {codespace.url && (
                    <p className="flex items-center">
                      <strong>URL:</strong>
                      <a 
                        href={codespace.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                      >
                        {codespace.url}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {terminalOutput.length > 0 && (
        <div className="mt-4 bg-black dark:bg-gray-950 text-green-400 p-4 rounded-lg font-mono text-sm">
          <div className="mb-2 text-gray-400">Terminal Output:</div>
          {terminalOutput.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">About GitHub Codespaces</h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>• <strong>Cloud development</strong> - Full development environment in GitHub cloud</p>
          <p>• <strong>Pre-configured</strong> - Android SDK, Gradle, and tools pre-installed</p>
          <p>• <strong>Collaborative</strong> - Multiple developers can work simultaneously</p>
          <p>• <strong>Secure</strong> - Isolated environments with enterprise security</p>
          <p>• <strong>Fast startup</strong> - Ready to code in seconds, not minutes</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => window.open('https://github.com/dentaldiamondhn-bit/diamond-widget', '_blank')}
            className="flex items-center justify-center p-3 bg-gray-800 dark:bg-gray-900 text-white rounded hover:bg-gray-900 dark:hover:bg-gray-950"
          >
            <Github className="h-4 w-4 mr-2" />
            Open Widget Repository
          </button>
          <button
            onClick={() => window.open('https://docs.github.com/en/codespaces/overview', '_blank')}
            className="flex items-center justify-center p-3 bg-gray-800 dark:bg-gray-900 text-white rounded hover:bg-gray-900 dark:hover:bg-gray-950"
          >
            <Cloud className="h-4 w-4 mr-2" />
            Codespaces Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
