export interface DailyFinancialData {
  date: string;
  patientName: string;
  procedure: string;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Seguro' | 'Transferencia';
  amount: number;
}

export interface MonthlyFinancialData {
  month: string;
  totalPatients: number;
  grossRevenue: number;
  expenses: number;
  netIncome: number;
}

export interface YearlyFinancialData {
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  taxDeductions: number;
}

export interface FinancialExportPayload {
  daily: DailyFinancialData[];
  monthly: MonthlyFinancialData[];
  yearly: YearlyFinancialData[];
  clinicName?: string;
  dateRange?: { startDate: string; endDate: string };
}
