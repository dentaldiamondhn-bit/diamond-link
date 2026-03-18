'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

interface Command {
  name: string;
  description: string;
  icon: string;
}

interface Agent {
  name: string;
  description: string;
  icon: string;
}

interface Skill {
  name: string;
  description: string;
  category: string;
}

export default function ClaudeCodePage() {
  const { userRole } = useRoleBasedAccess();
  const [activeTab, setActiveTab] = useState<'overview' | 'commands' | 'agents' | 'skills' | 'rules'>('overview');

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

  const commands: Command[] = [
    { name: '/tdd', description: 'Test-Driven Development workflow', icon: 'fas fa-vial' },
    { name: '/build-fix', description: 'Fix build errors automatically', icon: 'fas fa-wrench' },
    { name: '/code-review', description: 'Review code quality', icon: 'fas fa-search' },
    { name: '/refactor-clean', description: 'Clean up and refactor code', icon: 'fas fa-broom' },
    { name: '/e2e', description: 'End-to-end testing workflow', icon: 'fas fa-play' },
    { name: '/plan', description: 'Create implementation plans', icon: 'fas fa-clipboard-list' },
    { name: '/test-coverage', description: 'Check test coverage', icon: 'fas fa-percentage' },
    { name: '/verify', description: 'Verify code changes', icon: 'fas fa-check-circle' },
  ];

  const agents: Agent[] = [
    { name: 'Architect', description: 'System design and architecture planning', icon: 'fas fa-drafting-compass' },
    { name: 'Code Reviewer', description: 'Quality and security code review', icon: 'fas fa-user-secret' },
    { name: 'TDD Guide', description: 'Test-driven development assistance', icon: 'fas fa-flask' },
    { name: 'Build Error Resolver', description: 'Fix build and compilation errors', icon: 'fas fa-bug' },
    { name: 'Security Reviewer', description: 'Security vulnerability analysis', icon: 'fas fa-shield-alt' },
    { name: 'Refactor Cleaner', description: 'Code cleanup and refactoring', icon: 'fas fa-mop' },
  ];

  const skills: Skill[] = [
    { name: 'Coding Standards', description: 'Project coding standards and patterns', category: 'Development' },
    { name: 'Next.js Turbopack', description: 'Next.js optimization with Turbopack', category: 'Frontend' },
    { name: 'E2E Testing', description: 'End-to-end testing patterns', category: 'Testing' },
    { name: 'Security Review', description: 'Security analysis patterns', category: 'Security' },
    { name: 'Database Migrations', description: 'Database migration best practices', category: 'Database' },
    { name: 'Continuous Learning', description: 'Self-improving learning patterns', category: 'AI' },
  ];

  const rules = [
    { name: 'TypeScript', description: 'TypeScript coding style and best practices' },
    { name: 'Testing', description: 'Testing requirements and TDD workflow' },
    { name: 'Security', description: 'Security rules and vulnerability prevention' },
    { name: 'Performance', description: 'Performance optimization guidelines' },
    { name: 'Git Workflow', description: 'Commit conventions and PR process' },
  ];

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <i className="fas fa-robot text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Claude Code</h1>
            <p className="text-blue-100">AI-powered development assistant</p>
          </div>
        </div>
        <p className="mt-4 text-blue-100">
          Claude Code is already configured for this project. Use <code className="bg-black/30 px-2 py-1 rounded">npx claude</code> in your terminal.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: 'fas fa-home' },
          { id: 'commands', label: 'Commands', icon: 'fas fa-terminal' },
          { id: 'agents', label: 'Agents', icon: 'fas fa-robot' },
          { id: 'skills', label: 'Skills', icon: 'fas fa-book' },
          { id: 'rules', label: 'Rules', icon: 'fas fa-gavel' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <i className={`${tab.icon} mr-2`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <i className="fas fa-terminal text-blue-600 dark:text-blue-400"></i>
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">8+</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Commands</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Slash commands for workflows</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-purple-600 dark:text-purple-400"></i>
              </div>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">6+</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Agents</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Specialized sub-agents</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <i className="fas fa-book text-green-600 dark:text-green-400"></i>
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">100+</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Skills</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Predefined patterns</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <i className="fas fa-gavel text-red-600 dark:text-red-400"></i>
              </div>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">5+</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Rules</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Coding standards</p>
          </div>
        </div>
      )}

      {/* Commands Tab */}
      {activeTab === 'commands' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commands.map((cmd) => (
            <div
              key={cmd.name}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className={`${cmd.icon} text-blue-600 dark:text-blue-400`}></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white font-mono text-sm">
                    {cmd.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {cmd.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className={`${agent.icon} text-purple-600 dark:text-purple-400`}></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {agent.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          {['Development', 'Frontend', 'Testing', 'Security', 'Database', 'AI'].map((category) => (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {skills.filter((s) => s.category === category).map((skill) => (
                  <div
                    key={skill.name}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{skill.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{skill.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.name}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-gavel text-red-600 dark:text-red-400"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {rule.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {rule.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documentation Links */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-book mr-2"></i>
          Documentation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <a
            href="/everything-claude-code/the-shortform-guide.md"
            target="_blank"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-file-alt text-blue-600"></i>
            <span className="text-gray-700 dark:text-gray-300 text-sm">Shortform Guide - Quick Reference</span>
          </a>
          <a
            href="/everything-claude-code/the-longform-guide.md"
            target="_blank"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-book text-purple-600"></i>
            <span className="text-gray-700 dark:text-gray-300 text-sm">Longform Guide - Detailed Patterns</span>
          </a>
          <a
            href="/everything-claude-code/the-security-guide.md"
            target="_blank"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-shield-alt text-green-600"></i>
            <span className="text-gray-700 dark:text-gray-300 text-sm">Security Guide</span>
          </a>
          <a
            href="/everything-claude-code/AGENTS.md"
            target="_blank"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-robot text-yellow-600"></i>
            <span className="text-gray-700 dark:text-gray-300 text-sm">Agents Documentation</span>
          </a>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-keyboard mr-2"></i>
          Claude Code Shortcuts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 text-sm">Command Palette</span>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Cmd+K</kbd>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 text-sm">Quick File Open</span>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Cmd+P</kbd>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 text-sm">Slash Commands</span>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">/</kbd>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 text-sm">Search Files</span>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">@</kbd>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 text-sm">Toggle Thinking</span>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Tab</kbd>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 text-sm">Interrupt Claude</span>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Esc Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
