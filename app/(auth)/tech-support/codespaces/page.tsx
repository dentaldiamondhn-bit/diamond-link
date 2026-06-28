'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Monitor, Play, Download, Terminal, CheckCircle, AlertCircle, Clock, Folder, Settings, Smartphone } from 'lucide-react';

interface LocalEnvironment {
  id: string;
  name: string;
  status: 'ready' | 'building' | 'running' | 'error';
  path: string;
  androidPath: string;
  androidSdkInstalled: boolean;
  gradleInstalled: boolean;
  lastBuild?: string;
  apkPath?: string;
  projectType?: string;
}

export default function LocalAndroidDev() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [environments, setEnvironments] = useState<LocalEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  useEffect(() => {
    checkLocalEnvironment();
  }, []);

  const checkLocalEnvironment = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/check-android-environment');
      const data = await response.json();
      
      const envs: LocalEnvironment[] = [];
      
      // If API returns multiple projects, use them
      if (data.androidProjects && data.androidProjects.length > 0) {
        data.androidProjects.forEach((project: any, index: number) => {
          const env: LocalEnvironment = {
            id: `local-android-${index}`,
            name: `${project.name} - Local Android Development`,
            status: data.androidReady ? 'ready' : 'error',
            path: project.path,
            androidPath: project.androidPath,
            androidSdkInstalled: data.androidSdkInstalled,
            gradleInstalled: data.gradleInstalled,
            projectType: 'android'
          };
          
          // Check if this project has APKs
          const projectApks = data.apks?.filter((apk: any) => apk.project === project.name);
          if (projectApks && projectApks.length > 0) {
            // Use the most recent APK
            const latestApk = projectApks.reduce((latest: any, current: any) => {
              return new Date(current.lastBuild) > new Date(latest.lastBuild) ? current : latest;
            });
            env.lastBuild = latestApk.lastBuild;
            env.apkPath = latestApk.path;
          }
          
          envs.push(env);
        });
      } else {
        // Fallback to single project if API format is old
        const widgetPath = '/home/dentaldiamondhn/diamond-widget';
        const env: LocalEnvironment = {
          id: 'local-android-widget',
          name: 'Local Android Widget Development',
          status: data.androidReady ? 'ready' : 'error',
          path: widgetPath,
          androidPath: widgetPath + '/android',
          androidSdkInstalled: data.androidSdkInstalled,
          gradleInstalled: data.gradleInstalled,
          projectType: 'android'
        };
        
        if (data.lastBuild) env.lastBuild = data.lastBuild;
        if (data.apkPath) env.apkPath = data.apkPath;
        
        envs.push(env);
      }
      
      setEnvironments(envs);
    } catch (err) {
      setError('Failed to check local environment: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const buildAPK = async (projectName?: string) => {
    try {
      setBuilding(true);
      setTerminalOutput(['🚀 Starting Android build...', '📦 Building APK...']);
      
      const requestBody = projectName ? { project: projectName } : {};
      
      const response = await fetch('/api/build-android-widget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          setTerminalOutput(prev => [...prev, text]);
        }
      }
      
      setTerminalOutput(prev => [...prev, '✅ Build completed!']);
      checkLocalEnvironment();
    } catch (err) {
      setTerminalOutput(prev => [...prev, '❌ Build failed: ' + err]);
    } finally {
      setBuilding(false);
    }
  };

  const downloadAPK = (projectName?: string) => {
    const url = projectName ? `/api/download-apk?project=${projectName}` : '/api/download-apk';
    window.open(url, '_blank');
  };

  const openProjectFolder = () => {
    window.open('/api/open-project-folder', '_blank');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Smartphone className="h-6 w-6 mr-2" />
          Local Android Development
        </h2>
        <button
          onClick={() => buildAPK()}
          disabled={building}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
        >
          {building ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Building All...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Build All
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {environments.map(env => (
        <div key={env.id} className="border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {env.status === 'ready' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <h3 className="text-lg font-semibold">{env.name}</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.open('/api/open-project-folder', '_blank')}
                className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                title="Open Root Folder"
              >
                <Folder className="h-4 w-4" />
              </button>
              <button
                onClick={() => buildAPK(env.name.split(' - ')[0])}
                disabled={building}
                className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
                title={`Build ${env.name.split(' - ')[0]} APK`}
              >
                <Play className="h-4 w-4" />
              </button>
              {env.apkPath && (
                <button
                  onClick={() => downloadAPK(env.name.split(' - ')[0])}
                  className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700"
                  title="Download APK"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center">
              <Settings className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm">Android SDK: {env.androidSdkInstalled ? '✅' : '❌'}</span>
            </div>
            <div className="flex items-center">
              <Terminal className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm">Gradle: {env.gradleInstalled ? '✅' : '❌'}</span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p><strong>Path:</strong> {env.path}</p>
            {env.androidPath && <p><strong>Android Path:</strong> {env.androidPath}</p>}
            {env.lastBuild && <p><strong>Last Build:</strong> {env.lastBuild}</p>}
            {env.apkPath && <p><strong>APK:</strong> {env.apkPath}</p>}
          </div>
        </div>
      ))}

      {terminalOutput.length > 0 && (
        <div className="mt-4 bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
          <div className="mb-2 text-gray-400">Build Output:</div>
          {terminalOutput.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Local Android Development</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• <strong>Multiple projects</strong> - All detected Android projects shown</p>
          <p>• <strong>Individual builds</strong> - Build specific projects</p>
          <p>• <strong>Root folder access</strong> - Navigate to any project</p>
          <p>• <strong>Real builds</strong> - Generate actual APK files</p>
          <p>• <strong>Terminal output</strong> - See build process in real-time</p>
        </div>
      </div>
    </div>
  );
}
