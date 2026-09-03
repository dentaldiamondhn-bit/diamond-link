'use client';

import React, { useState } from 'react';
import { exportFinancialsToExcel } from '@/lib/utils/exportFinancialsToExcel';
import { FinancialExportPayload } from '@/types/financial';

interface FinancialExportButtonProps {
  getExportData: () => Promise<FinancialExportPayload> | FinancialExportPayload;
}

export function FinancialExportButton({ getExportData }: FinancialExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const data = await getExportData();
      await exportFinancialsToExcel(data);
    } catch (error) {
      console.error('Failed to export financial report:', error);
      alert('An error occurred while generating the Excel report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
    >
      <svg
        className="h-4 w-4 fill-current"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1.8 18H14v-2h1.8v2zm0-4H14v-2h1.8v2zm0-4H14v-2h1.8v2zm-3.8 8H10v-2h2v2zm0-4H10v-2h2v2zm0-4H10v-2h2v2zm-4 8H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6v-2h2v2zM13 9V3.5L18.5 9H13z" />
      </svg>
      {isExporting ? 'Generating Excel...' : 'Export Financials (.xlsx)'}
    </button>
  );
}
