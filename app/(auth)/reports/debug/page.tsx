'use client';

import React, { useState, useEffect } from 'react';
import { ReportsServiceDebug } from '@/services/reportsServiceDebug';

export default function DebugReportsPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    try {
      // Test with the exact dates you mentioned
      const result = await ReportsServiceDebug.getRevenueStatsWithDebug(
        '2019-01-04T00:00:00.000Z',
        new Date().toISOString()
      );
      setDebugInfo(result);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Reports Page</h1>
      
      <button
        onClick={runDebug}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-6"
      >
        {loading ? 'Running Debug...' : 'Run Debug'}
      </button>

      {debugInfo.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {debugInfo.error}
        </div>
      )}

      {debugInfo.totalTreatments !== undefined && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
          <div className="space-y-2">
            <p><strong>Total Treatments:</strong> {debugInfo.totalTreatments}</p>
            <p><strong>Total Revenue:</strong> ${debugInfo.totalRevenue?.toFixed(2)}</p>
            <p><strong>Average per Treatment:</strong> ${debugInfo.averageRevenuePerTreatment?.toFixed(2)}</p>
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="text-sm">
              <strong>Expected:</strong> 173 treatments<br/>
              <strong>Actual:</strong> {debugInfo.totalTreatments} treatments<br/>
              <strong>Difference:</strong> {173 - debugInfo.totalTreatments} treatments
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Open browser developer console (F12)</li>
          <li>Click "Run Debug" button</li>
          <li>Check console output for detailed debugging information</li>
          <li>Compare the results with expected 173 treatments</li>
        </ol>
      </div>
    </div>
  );
}
