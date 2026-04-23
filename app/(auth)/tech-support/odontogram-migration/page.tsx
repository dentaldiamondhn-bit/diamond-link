'use client';

import { useState } from 'react';

interface MigrationStats {
  totalOdontograms: number;
  uniquePatients: number;
}

interface MigrationResult {
  success: boolean;
  patientId?: string;
  error?: string;
}

interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
}

export default function OdontogramMigrationPage() {
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [pacienteId, setPacienteId] = useState('');
  const [batchLimit, setBatchLimit] = useState('10');
  const [results, setResults] = useState<BatchResult | null>(null);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/migrate-odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' })
      });
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const migrateSingle = async () => {
    if (!pacienteId) {
      setError('Please enter a patient ID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/migrate-odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'single', pacienteId })
      });
      const data = await response.json();
      setResults({
        total: data.results.length,
        successful: data.results.filter((r: MigrationResult) => r.success).length,
        failed: data.results.filter((r: MigrationResult) => !r.success).length,
        results: data.results
      });
    } catch (err) {
      setError('Migration failed');
    } finally {
      setLoading(false);
    }
  };

  const migrateBatch = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/migrate-odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', limit: parseInt(batchLimit) })
      });
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError('Batch migration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Odontogram Migration Control
      </h1>

      {/* Statistics Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Migration Statistics
        </h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get Statistics'}
          </button>
        </div>
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalOdontograms}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Odontograms
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.uniquePatients}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Unique Patients
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Patient Migration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Single Patient Migration
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            placeholder="Enter Patient ID"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={migrateSingle}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Migrating...' : 'Migrate Single'}
          </button>
        </div>
      </div>

      {/* Batch Migration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Batch Migration
        </h2>
        <div className="flex gap-4">
          <input
            type="number"
            value={batchLimit}
            onChange={(e) => setBatchLimit(e.target.value)}
            placeholder="Limit (default: 10)"
            className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={migrateBatch}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Migrating...' : 'Migrate Batch'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Migration Results
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {results.total}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Total
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900 p-4 rounded">
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {results.successful}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Successful
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900 p-4 rounded">
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                {results.failed}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Failed
              </div>
            </div>
          </div>
          
          {results.results.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Detailed Results
              </h3>
              <div className="max-h-64 overflow-y-auto">
                {results.results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-2 mb-1 rounded ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900'
                        : 'bg-red-50 dark:bg-red-900'
                    }`}
                  >
                    <div className="text-sm">
                      {result.success ? (
                        <span className="text-green-700 dark:text-green-300">
                          ✓ Success: {result.patientId}
                        </span>
                      ) : (
                        <span className="text-red-700 dark:text-red-300">
                          ✗ Failed: {result.patientId} - {result.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mt-4">
          {error}
        </div>
      )}
    </div>
  );
}
