'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { useUserRole } from '@/hooks/useUserRole';
import { usePagePreferences, useUserPreferences } from '@/hooks/useUserPreferences';
import { formatCurrency, formatNumber } from '@/utils/currencyUtils';
import { ReportsService } from '@/services/reportsService';
import { PaymentService } from '@/services/paymentService';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import AccessDenied from '@/components/AccessDenied';
import { 
  FiDollarSign, 
  FiUsers, 
  FiActivity, 
  FiTrendingUp, 
  FiCalendar,
  FiArrowUp,
  FiArrowDown,
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiChevronDown,
  FiPieChart,
  FiBarChart2,
  FiUserCheck,
  FiGift,
  FiShield,
  FiZap,
  FiTarget,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo
} from 'react-icons/fi';

const COLORS = {
  teal: '#14b8a6',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  orange: '#f97316',
  indigo: '#6366f1'
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 100 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring', stiffness: 100 }
  },
  hover: { 
    scale: 1.02,
    transition: { type: 'spring', stiffness: 400 }
  }
};

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient,
  trend,
  delay = 0 
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  trend?: { value: number; positive: boolean };
  delay?: number;
}) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      custom={delay}
      className="relative overflow-hidden rounded-2xl shadow-xl"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full" />
      <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white opacity-10 rounded-full" />
      
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
            <motion.p 
              className="text-3xl font-bold text-gray-900 dark:text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay * 0.1 + 0.2 }}
            >
              {value}
            </motion.p>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center mt-2 text-sm ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
                {trend.positive ? <FiArrowUp className="w-4 h-4 mr-1" /> : <FiArrowDown className="w-4 h-4 mr-1" />}
                <span className="font-medium">{Math.abs(trend.value)}%</span>
                <span className="text-gray-400 ml-1">vs periodo anterior</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedChart({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700 h-32" />
  );
}

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl p-4 border border-gray-100 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {entry.name}:
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function ReportsPage() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const { userRole, isLoaded } = useUserRole();
  const { updatePagePreferences } = useUserPreferences();
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { preferences: pagePrefs, loading: prefsLoading, updatePreferences: updatePagePrefs } = usePagePreferences('reports');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const currentDatesRef = useRef<{ start: string; end: string }>({ start: '', end: '' });

  const getCurrentDateRange = () => {
    const range = tabDateRanges[activeTab];
    if (range?.startDate && range?.endDate) {
      return { startDate: range.startDate, endDate: range.endDate };
    }
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10)
    };
  };

  const [reportData, setReportData] = useState<any[]>([]);
  const [doctorPerformance, setDoctorPerformance] = useState<any[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<any[]>([]);
  const [patientStats, setPatientStats] = useState<any>({});
  const [patientDemographics, setPatientDemographics] = useState<any>({});
  const [revenueStats, setRevenueStats] = useState<any>({});
  const [patientAnalytics, setPatientAnalytics] = useState<any[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'totalSpent' | 'outstandingBalance' | 'lastVisit' | 'treatments'>('totalSpent');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Con Saldo' | 'Al Día' | 'Sin Tratamientos'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentStartDate, setCurrentStartDate] = useState('');
  const [currentEndDate, setCurrentEndDate] = useState('');

  const tabDateRanges = pagePrefs?.tabDateRanges || {};

  const getCurrentTabRange = () => {
    const range = tabDateRanges[activeTab];
    if (range?.startDate && range?.endDate) {
      return { startDate: range.startDate, endDate: range.endDate };
    }
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10)
    };
  };

  const aggregateMonthlyIncome = (transactions: any[]) => {
    const monthlyData: Record<string, {
      month: string;
      totalPagado: number;
      totalNeto: number;
      comision: number;
      paymentMethods: Record<string, { total: number; neto: number; comision: number }>;
    }> = {};

    const spanishMonths = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    transactions.forEach((t: any) => {
      const transactionDate = new Date(t.fecha_pago || t.fecha);
      
      const month = transactionDate.toISOString().slice(0, 7);
      const amount = typeof t.totalPagado === 'number' ? t.totalPagado : Number(t.totalPagado) || 0;
      const neto = t.totalNeto || 0;
      const comision = amount - neto;
      const metodoPago = t.metodoPago || 'Otros';

      if (!monthlyData[month]) {
        const monthNum = transactionDate.getMonth();
        monthlyData[month] = {
          month: `${spanishMonths[monthNum]} ${transactionDate.getFullYear()}`,
          totalPagado: 0,
          totalNeto: 0,
          comision: 0,
          paymentMethods: {}
        };
      }

      monthlyData[month].totalPagado += amount;
      monthlyData[month].totalNeto += neto;
      monthlyData[month].comision += comision;

      if (!monthlyData[month].paymentMethods[metodoPago]) {
        monthlyData[month].paymentMethods[metodoPago] = { total: 0, neto: 0, comision: 0 };
      }
      monthlyData[month].paymentMethods[metodoPago].total += amount;
      monthlyData[month].paymentMethods[metodoPago].neto += neto;
      monthlyData[month].paymentMethods[metodoPago].comision += comision;
    });

    return Object.values(monthlyData);
  };

  useEffect(() => {
    if (!prefsLoading && pagePrefs) {
      if (pagePrefs.timeRange) {
        setTimeRange(pagePrefs.timeRange);
      }
      const currentTabRange = tabDateRanges[activeTab] || {
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10)
      };
      setCurrentStartDate(currentTabRange.startDate);
      setCurrentEndDate(currentTabRange.endDate);
      currentDatesRef.current = { start: currentTabRange.startDate, end: currentTabRange.endDate };
      setAppliedStartDate(currentTabRange.startDate);
      setAppliedEndDate(currentTabRange.endDate);
    }
  }, [prefsLoading, pagePrefs, activeTab, tabDateRanges]);

useEffect(() => {
    if (!prefsLoading && pagePrefs) {
      if (pagePrefs.timeRange) {
        setTimeRange(pagePrefs.timeRange);
      }
      const currentTabRange = tabDateRanges[activeTab] || {
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10)
      };
      setCurrentStartDate(currentTabRange.startDate);
      setCurrentEndDate(currentTabRange.endDate);
      currentDatesRef.current = { start: currentTabRange.startDate, end: currentTabRange.endDate };
      setAppliedStartDate(currentTabRange.startDate);
      setAppliedEndDate(currentTabRange.endDate);
    }
  }, [prefsLoading, pagePrefs, activeTab, tabDateRanges]);

  useEffect(() => {
    if (user?.id) {
      const currentTabRange = tabDateRanges[activeTab];
      if (!currentTabRange) {
        const defaultRange = {
          startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10)
        };
        const updated = {
          ...tabDateRanges,
          [activeTab]: defaultRange
        };
        updatePagePrefs({ tabDateRanges: updated });
        setCurrentStartDate(defaultRange.startDate);
        setCurrentEndDate(defaultRange.endDate);
        currentDatesRef.current = { start: defaultRange.startDate, end: defaultRange.endDate };
      } else {
        setCurrentStartDate(currentTabRange.startDate);
        setCurrentEndDate(currentTabRange.endDate);
        currentDatesRef.current = { start: currentTabRange.startDate, end: currentTabRange.endDate };
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (user && (userRole === 'admin' || userRole === 'doctor' || userRole === 'tech_support')) {
      const start = currentStartDate || appliedStartDate;
      const end = currentEndDate || appliedEndDate;
      
      const loadWithDates = async () => {
        setLoading(true);
        setError(null);
        setIsRefreshing(true);
        
        try {
          const now = new Date();
          let startDate = start;
          let endDate = end;
          
          if (!startDate) {
            const startDateObj = new Date(now);
            switch (timeRange) {
              case 'daily':
                startDateObj.setHours(startDateObj.getHours() - 24);
                break;
              case 'weekly':
                startDateObj.setDate(startDateObj.getDate() - 7);
                break;
              case 'monthly':
                startDateObj.setDate(startDateObj.getDate() - 30);
                break;
              case 'yearly':
                startDateObj.setFullYear(startDateObj.getFullYear() - 1);
                break;
            }
            startDate = startDateObj.toISOString();
          }
          
          if (!endDate) {
            endDate = now.toISOString();
          }

          const [reportDataResult,
            doctorPerformanceResult,
            treatmentTypesResult,
            patientStatsResult,
            patientDemographicsResult,
            revenueStatsResult,
            patientAnalyticsResult,
            financialTransactionsResult,
            allFinancialTransactionsResult
          ] = await Promise.all([
            ReportsService.getReportData(timeRange, startDate, endDate, userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined),
            ReportsService.getDoctorPerformance(startDate, endDate, userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined),
            ReportsService.getTreatmentTypes(startDate, endDate, userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined),
            ReportsService.getPatientStats(startDate, endDate, userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined),
            ReportsService.getPatientDemographics(userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined),
            ReportsService.getRevenueStats(startDate, endDate, userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined),
            ReportsService.getDetailedPatientAnalytics(startDate, endDate, userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined),
            ReportsService.getFinancialTransactions(startDate, endDate, userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined),
            ReportsService.getAllFinancialTransactions(userRole === 'doctor' ? user?.primaryEmailAddress?.emailAddress : undefined)
          ]);

          setReportData(reportDataResult);
          setDoctorPerformance(doctorPerformanceResult);
          setTreatmentTypes(treatmentTypesResult);
          setPatientStats(patientStatsResult);
          setPatientDemographics(patientDemographicsResult);
          setRevenueStats(revenueStatsResult);
          setPatientAnalytics(patientAnalyticsResult);
          setFinancialTransactions(financialTransactionsResult);
          
          const yearStart = `${selectedYear}-01-01T00:00:00Z`;
          const yearEnd = `${selectedYear}-12-31T23:59:59Z`;
          const filteredTransactions = allFinancialTransactionsResult.filter((t: any) => {
            const tDate = new Date(t.fecha_pago || t.fecha);
            return tDate >= new Date(yearStart) && tDate <= new Date(yearEnd);
          });
          const monthlyData = aggregateMonthlyIncome(filteredTransactions);
          setMonthlyIncome(monthlyData);
          
        } catch (err) {
          console.error('Error loading report data:', err);
          setError('Failed to load report data');
        } finally {
          setLoading(false);
          setIsRefreshing(false);
        }
      };
      
      loadWithDates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, timeRange, reloadTrigger, currentStartDate, currentEndDate, selectedYear]);

  const handleRefresh = () => {
    setReloadTrigger(t => t + 1);
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: FiPieChart },
    ...(userRole === 'admin' ? [{ id: 'doctors', label: 'Doctores', icon: FiUserCheck }] : []),
    { id: 'patients', label: 'Pacientes', icon: FiUsers },
    { id: 'patient-data', label: 'Datos Pacientes', icon: FiBarChart2 },
    { id: 'treatments', label: 'Tratamientos', icon: FiActivity },
    { id: 'financial', label: 'Financiero', icon: FiDollarSign },
    { id: 'promotions', label: 'Promociones', icon: FiGift }
  ];

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md"
        >
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadReportData}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Retry
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (userRole !== 'admin' && userRole !== 'doctor' && userRole !== 'tech_support') {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permisos para acceder a esta página."
        explanation="Esta área es exclusiva para administradores, doctores y personal de soporte técnico."
        contactInfo="Si necesitas acceso, contacta a un administrador del sistema."
        onGoBack={() => window.history.back()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/menu-navegacion')}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Reportes
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Análisis completo de tu clínica dental</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all text-gray-600 dark:text-gray-300 disabled:opacity-50"
              >
                <FiRefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Ingresos Totales"
                value={formatCurrency(financialTransactions.reduce((sum: number, t: any) => sum + (typeof t.totalPagado === 'number' ? t.totalPagado : Number(t.totalPagado) || 0), 0))}
                subtitle="Basado en datos reales"
                icon={FiDollarSign}
                gradient="from-teal-500 to-cyan-500"
                trend={{ value: 12.5, positive: true }}
                delay={0}
              />
              <MetricCard
                title="Pacientes Totales"
                value={formatNumber(Math.floor(new Set(financialTransactions.map((t: any) => t.paciente)).size), 0)}
                subtitle="Con transacciones en el período"
                icon={FiUsers}
                gradient="from-blue-500 to-indigo-500"
                trend={{ value: 8.2, positive: true }}
                delay={1}
              />
              <MetricCard
                title="Tratamientos"
                value={formatNumber(Math.floor(revenueStats.totalTreatments || 0), 0)}
                subtitle={revenueStats.averageRevenuePerTreatment > 0 ? `Promedio: ${formatCurrency(revenueStats.averageRevenuePerTreatment)}` : 'Sin datos'}
                icon={FiActivity}
                gradient="from-purple-500 to-pink-500"
                delay={2}
              />
              <MetricCard
                title="Total Neto"
                value={formatCurrency(financialTransactions.reduce((sum: number, t: any) => sum + t.totalNeto, 0))}
                subtitle={`Resta: ${formatCurrency(financialTransactions.reduce((sum: number, t: any) => sum + (t.totalPagado - t.totalNeto), 0))}`}
                icon={FiDollarSign}
                gradient="from-indigo-500 to-purple-500"
                delay={3}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Periodo:</span>
                  </div>
                  <div className="flex gap-2">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((range) => (
                      <motion.button
                        key={range}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setTimeRange(range)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          timeRange === range
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {range === 'daily' ? 'Hoy' : range === 'weekly' ? 'Semana' : range === 'monthly' ? 'Mes' : 'Año'}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Desde:</label>
                    <input
                      type="date"
                      value={currentStartDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setCurrentStartDate(newStart);
                        currentDatesRef.current.start = newStart;
                        if (user?.id) {
                          const updated = {
                            ...tabDateRanges,
                            [activeTab]: { startDate: newStart, endDate: currentDatesRef.current.end || currentEndDate }
                          };
                          updatePagePrefs({ tabDateRanges: updated });
                        }
                      }}
                      onBlur={async () => {
                        if (user?.id) {
                          setAppliedStartDate(currentDatesRef.current.start || currentStartDate);
                          setAppliedEndDate(currentDatesRef.current.end || currentEndDate);
                          setReloadTrigger(t => t + 1);
                        }
                      }}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white text-sm"
                      style={{ colorScheme: resolvedTheme }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hasta:</label>
                    <input
                      type="date"
                      value={currentEndDate}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        setCurrentEndDate(newEnd);
                        currentDatesRef.current.end = newEnd;
                        if (user?.id) {
                          const updated = {
                            ...tabDateRanges,
                            [activeTab]: { startDate: currentDatesRef.current.start || currentStartDate, endDate: newEnd }
                          };
                          updatePagePrefs({ tabDateRanges: updated });
                        }
                      }}
                      onBlur={async () => {
                        if (user?.id) {
                          setAppliedStartDate(currentDatesRef.current.start || currentStartDate);
                          setAppliedEndDate(currentDatesRef.current.end || currentEndDate);
                          setReloadTrigger(t => t + 1);
                        }
                      }}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white text-sm"
                      style={{ colorScheme: resolvedTheme }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-700">
                <nav className="flex overflow-x-auto px-4">
                  {tabs.map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </motion.button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
                            <FiPieChart className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resumen General</h2>
                        </div>
                        
                        <AnimatedChart>
                          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                              Tendencia de Ingresos
                            </h3>
                            <ResponsiveContainer width="100%" height={320}>
                              <AreaChart data={reportData}>
                                <defs>
                                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip content={<CustomTooltip formatter={(v: number) => formatCurrency(v)} />} />
                                <Area 
                                  type="monotone" 
                                  dataKey="revenue" 
                                  stroke={COLORS.teal} 
                                  strokeWidth={3}
                                  fill="url(#revenueGradient)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </AnimatedChart>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <AnimatedChart>
                            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                Tendencia de Pacientes
                              </h3>
                              <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={reportData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                  <YAxis stroke="#9ca3af" fontSize={12} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Line 
                                    type="monotone" 
                                    dataKey="patients" 
                                    stroke={COLORS.blue}
                                    strokeWidth={3}
                                    dot={{ fill: COLORS.blue, strokeWidth: 2, r: 4, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </AnimatedChart>
                          
                          <AnimatedChart>
                            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                                Tratamientos Realizados
                              </h3>
                              <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={reportData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                  <YAxis stroke="#9ca3af" fontSize={12} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Bar 
                                    dataKey="treatments" 
                                    fill={COLORS.purple}
                                    radius={[8, 8, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </AnimatedChart>
                        </div>

                        <AnimatedChart>
                          <div className="mt-8">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                                <FiZap className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Insights Inteligentes</h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <motion.div 
                                whileHover={{ scale: 1.02 }}
                                className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 border border-red-100 dark:border-red-800/30"
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-1.5 bg-red-500/20 rounded-lg">
                                    <FiTarget className="w-4 h-4 text-red-600" />
                                  </div>
                                  <h4 className="font-medium text-red-800 dark:text-red-200">Oportunidad</h4>
                                </div>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                  Las consultas de ortodoncia han aumentado un 25% este {timeRange === 'daily' ? 'día' : timeRange === 'weekly' ? 'semana' : 'mes'}. Considera expandir el equipo.
                                </p>
                              </motion.div>
                              
                              <motion.div 
                                whileHover={{ scale: 1.02 }}
                                className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-100 dark:border-amber-800/30"
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-1.5 bg-amber-500/20 rounded-lg">
                                    <FiClock className="w-4 h-4 text-amber-600" />
                                  </div>
                                  <h4 className="font-medium text-amber-800 dark:text-amber-200">Optimización</h4>
                                </div>
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                  Los lunes y martes tienen menor ocupación. Considera ofrecer promociones estos días.
                                </p>
                              </motion.div>
                              
                              <motion.div 
                                whileHover={{ scale: 1.02 }}
                                className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-100 dark:border-blue-800/30"
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                    <FiInfo className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Información</h4>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                  El costo de materiales ha aumentado 8%. Revisa proveedores alternativos.
                                </p>
                              </motion.div>
                            </div>
                          </div>
                        </AnimatedChart>
                      </div>
                    )}

                    {activeTab === 'doctors' && userRole === 'admin' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                            <FiUserCheck className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Desempeño de Doctores</h2>
                        </div>

                        <AnimatedChart>
                          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Distribución de Tratamientos por Doctor</h3>
                            <ResponsiveContainer width="100%" height={320}>
                              <BarChart data={doctorPerformance.map(doctor => ({
                                doctor: doctor.name?.split(' ')[0] || doctor.name,
                                tratamientos: doctor.treatments,
                                pacientes: doctor.patients
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="doctor" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tratamientos" fill={COLORS.blue} name="Tratamientos" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="pacientes" fill={COLORS.green} name="Pacientes" radius={[6, 6, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </AnimatedChart>

                        <AnimatedChart>
                          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  <tr>
                                    {['Doctor', 'Especialidad', 'Pacientes', 'Tratamientos', 'Ingresos', 'Pagado', 'Pendiente'].map((header) => (
                                      <th key={header} className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {doctorPerformance.map((doctor, index) => (
                                    <motion.tr 
                                      key={index}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: index * 0.05 }}
                                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {doctor.name?.charAt(0) || 'D'}
                                          </div>
                                          <span className="font-medium text-gray-900 dark:text-white">{doctor.name}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{doctor.specialty || 'General'}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{doctor.patients}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{doctor.treatments}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-teal-600 dark:text-teal-400">{formatCurrency(doctor.revenue)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatCurrency(doctor.paidAmount || 0)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 dark:text-amber-400">{formatCurrency(doctor.pendingAmount || 0)}</td>
                                    </motion.tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </AnimatedChart>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <MetricCard
                            title="Doctores Activos"
                            value={String(doctorPerformance.length)}
                            subtitle="En el período seleccionado"
                            icon={FiUsers}
                            gradient="from-blue-500 to-indigo-500"
                            delay={0}
                          />
                          <MetricCard
                            title="Ingresos Totales"
                            value={formatCurrency(doctorPerformance.reduce((sum, d) => sum + d.revenue, 0))}
                            subtitle="Suma de todos los doctores"
                            icon={FiDollarSign}
                            gradient="from-green-500 to-emerald-500"
                            delay={1}
                          />
                          <MetricCard
                            title="Promedio por Doctor"
                            value={formatCurrency(doctorPerformance.length > 0 ? Math.floor(doctorPerformance.reduce((sum, d) => sum + d.revenue, 0) / doctorPerformance.length) : 0)}
                            subtitle="Ingreso promedio"
                            icon={FiTrendingUp}
                            gradient="from-purple-500 to-pink-500"
                            delay={2}
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === 'patients' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                            <FiUsers className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Análisis de Pacientes</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <AnimatedChart>
                            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Distribución de Pacientes</h3>
                              <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Nuevos', value: patientStats.newPatients || 0, fill: COLORS.blue },
                                      { name: 'Recurrentes', value: patientStats.returningPatients || 0, fill: COLORS.green }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {[COLORS.blue, COLORS.green].map((color, index) => (
                                      <Cell key={`cell-${index}`} fill={color} />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<CustomTooltip />} />
                                  <Legend 
                                    verticalAlign="bottom" 
                                    height={36}
                                    formatter={(value) => <span className="text-gray-600 dark:text-gray-400">{value}</span>}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </AnimatedChart>
                          
                          <AnimatedChart>
                            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Demografía</h3>
                              <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Edad Promedio</span>
                                  <span className="text-2xl font-bold text-amber-500">{patientDemographics.averageAge || 0} años</span>
                                </div>
                                
                                <div>
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-3">Distribución de Género</span>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Masculino</span>
                                      <span className="ml-auto font-bold text-gray-900 dark:text-white">
                                        {patientDemographics.genderDistribution?.masculino || 0}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 bg-pink-500 rounded-full" />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Femenino</span>
                                      <span className="ml-auto font-bold text-gray-900 dark:text-white">
                                        {patientDemographics.genderDistribution?.femenino || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-3">Categorías de Edad</span>
                                  <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(patientDemographics.ageCategories || {}).map(([range, count]: [string, any]) => (
                                      <div key={range} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700/50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{range}</span>
                                        <span className="text-sm font-bold text-blue-500">{count}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AnimatedChart>
                        </div>
                      </div>
                    )}

                    {activeTab === 'treatments' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                            <FiActivity className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Análisis de Tratamientos</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <AnimatedChart>
                            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Volumen de Tratamientos</h3>
                              <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={reportData}>
                                  <defs>
                                    <linearGradient id="treatmentGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                  <YAxis stroke="#9ca3af" fontSize={12} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Area 
                                    type="monotone" 
                                    dataKey="treatments" 
                                    stroke={COLORS.purple}
                                    strokeWidth={3}
                                    fill="url(#treatmentGradient)"
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </AnimatedChart>

                          <AnimatedChart>
                            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tratamientos Populares</h3>
                              <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                  <Pie
                                    data={treatmentTypes.slice(0, 5).map((t, i) => ({
                                      name: t.name,
                                      value: t.count,
                                      fill: Object.values(COLORS)[i % Object.values(COLORS).length]
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={true}
                                  >
                                    {treatmentTypes.slice(0, 5).map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </AnimatedChart>
                        </div>

                        <AnimatedChart>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top 5 Tratamientos</h3>
                              <div className="space-y-3">
                                {treatmentTypes.slice(0, 5).map((treatment, index) => (
                                  <motion.div 
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                                        'bg-gradient-to-br from-blue-400 to-indigo-500'
                                      }`}>
                                        {index + 1}
                                      </div>
                                      <span className="font-medium text-gray-900 dark:text-white">{treatment.name}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-lg font-bold text-gray-900 dark:text-white">{treatment.count}</span>
                                      <span className="text-sm text-gray-500 ml-1">({treatment.percentage}%)</span>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ingresos por Tratamiento</h3>
                              <div className="space-y-3">
                                {treatmentTypes.slice(0, 5).map((treatment, index) => (
                                  <motion.div 
                                    key={index}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-medium text-gray-900 dark:text-white">{treatment.name}</span>
                                      <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{formatCurrency(treatment.revenue)}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${treatment.percentage}%` }}
                                        transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                                        className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"
                                      />
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </AnimatedChart>
                      </div>
                    )}

                    {activeTab === 'patient-data' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                            <FiBarChart2 className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Análisis de Pacientes</h2>
                        </div>

                        {/* Filtering and Sorting Controls */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                            <div className="flex gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar por:</span>
                                <select
                                  value={sortBy}
                                  onChange={(e) => setSortBy(e.target.value as any)}
                                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white text-sm"
                                >
                                  <option value="totalSpent">Gasto Total</option>
                                  <option value="outstandingBalance">Saldo Pendiente</option>
                                  <option value="lastVisit">Última Visita</option>
                                  <option value="treatments"># Tratamientos</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar:</span>
                                <select
                                  value={filterStatus}
                                  onChange={(e) => setFilterStatus(e.target.value as any)}
                                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white text-sm"
                                >
                                  <option value="all">Todos</option>
                                  <option value="Con Saldo">Con Saldo</option>
                                  <option value="Al Día">Al Día</option>
                                  <option value="Sin Tratamientos">Sin Tratamientos</option>
                                </select>
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={async () => {
                                const csv = await ReportsService.exportPatientAnalyticsToCSV(patientAnalytics);
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `patient-analytics-${new Date().toISOString().split('T')[0]}.csv`;
                                a.click();
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all"
                            >
                              <FiDownload className="w-4 h-4" />
                              Exportar CSV
                            </motion.button>
                          </div>
                        </div>

                        {/* Patient Data Table */}
                        <AnimatedChart>
                          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 sticky top-0">
                                  <tr>
                                    {['Paciente', 'Identidad', 'Teléfono', 'Tratamientos', 'Gasto Total', 'Pagado', 'Pendiente', '% Pago', 'Última Visita', 'Estado'].map((header) => (
                                      <th key={header} className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {patientAnalytics
                                    .filter(p => filterStatus === 'all' || p.status === filterStatus)
                                    .sort((a: any, b: any) => {
                                      switch (sortBy) {
                                        case 'totalSpent':
                                          return b.totalSpent - a.totalSpent;
                                        case 'outstandingBalance':
                                          return b.outstandingBalance - a.outstandingBalance;
                                        case 'treatments':
                                          return b.totalTreatments - a.totalTreatments;
                                        case 'lastVisit':
                                          return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
                                        default:
                                          return 0;
                                      }
                                    })
                                    .map((patient: any, index: number) => (
                                      <motion.tr 
                                        key={index}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                              {patient.nombre?.charAt(0) || 'P'}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white text-sm">{patient.nombre}</span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{patient.identidad}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{patient.telefono || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{patient.totalTreatments}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-teal-600 dark:text-teal-400">{formatCurrency(patient.totalSpent)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">{formatCurrency(patient.totalPaid)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400">{formatCurrency(patient.outstandingBalance)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{patient.paymentPercentage.toFixed(1)}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{patient.lastVisit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                            patient.status === 'Al Día' 
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                              : patient.status === 'Con Saldo'
                                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                          }`}>
                                            {patient.status}
                                          </span>
                                        </td>
                                      </motion.tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </AnimatedChart>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <MetricCard
                            title="Ingresos Totales de Pacientes"
                            value={formatCurrency(patientAnalytics.reduce((sum: number, p: any) => sum + p.totalSpent, 0))}
                            subtitle={`${patientAnalytics.length} pacientes`}
                            icon={FiDollarSign}
                            gradient="from-teal-500 to-cyan-500"
                            delay={0}
                          />
                          <MetricCard
                            title="Saldo Pendiente"
                            value={formatCurrency(patientAnalytics.reduce((sum: number, p: any) => sum + p.outstandingBalance, 0))}
                            subtitle={`${patientAnalytics.filter((p: any) => p.outstandingBalance > 0).length} con deuda`}
                            icon={FiAlertCircle}
                            gradient="from-orange-500 to-red-500"
                            delay={1}
                          />
                          <MetricCard
                            title="Cobrado"
                            value={formatCurrency(patientAnalytics.reduce((sum: number, p: any) => sum + p.totalPaid, 0))}
                            subtitle={`${((patientAnalytics.reduce((sum: number, p: any) => sum + p.totalPaid, 0) / (patientAnalytics.reduce((sum: number, p: any) => sum + p.totalSpent, 0) || 1)) * 100).toFixed(1)}% de ingresos`}
                            icon={FiCheckCircle}
                            gradient="from-green-500 to-emerald-500"
                            delay={2}
                          />
                          <MetricCard
                            title="Gasto Promedio"
                            value={formatCurrency(patientAnalytics.length > 0 ? patientAnalytics.reduce((sum: number, p: any) => sum + p.totalSpent, 0) / patientAnalytics.length : 0)}
                            subtitle="Por paciente"
                            icon={FiUsers}
                            gradient="from-blue-500 to-indigo-500"
                            delay={3}
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === 'financial' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                            <FiDollarSign className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transacciones Financieras</h2>
                        </div>

                        <AnimatedChart>
                          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 sticky top-0">
                                  <tr>
                                    {['Fecha', 'Paciente', 'Total Pagado', 'Método de Pago', 'Total Neto', 'Tratamiento'].map((header) => (
                                      <th key={header} className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {financialTransactions.length > 0 ? (
                                    financialTransactions.map((transaction: any, index: number) => (
                                      <motion.tr 
                                        key={index}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                          {transaction.fecha ? new Date(transaction.fecha).toLocaleDateString('es-HN') : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                              {transaction.paciente?.charAt(0) || 'P'}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white text-sm">{transaction.paciente}</span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-teal-600 dark:text-teal-400">
                                          {formatCurrency(typeof transaction.totalPagado === 'number' ? transaction.totalPagado : Number(transaction.totalPagado) || 0)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                            transaction.metodoPago === 'Efectivo' || transaction.metodoPago === 'efectivo'
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                              : transaction.metodoPago === 'Tarjeta' || transaction.metodoPago === 'tarjeta_credito' || transaction.metodoPago === 'tarjeta_debito'
                                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                              : transaction.metodoPago === 'Transferencia' || transaction.metodoPago === 'transferencia'
                                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                              : transaction.metodoPago === 'Depósito Bancario' || transaction.metodoPago === 'deposito_bancario' || transaction.metodoPago === 'Extra BAC 6meses' || transaction.metodoPago === 'extra_bac_6meses' || transaction.metodoPago === 'Extra BAC 3meses' || transaction.metodoPago === 'extra_bac_3meses' || transaction.metodoPago === 'Extra BAC 9meses' || transaction.metodoPago === 'extra_bac_9meses'
                                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                          }`}>
                                            {PaymentService.formatPaymentMethod(transaction.metodoPago)}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                          {formatCurrency(transaction.totalNeto)}
                                          {transaction.monedaOriginal && transaction.monedaOriginal !== transaction.moneda && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({transaction.monedaOriginal})</span>
                                          )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                          {transaction.tratamiento}
                                        </td>
                                      </motion.tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No hay transacciones en este período
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </AnimatedChart>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <MetricCard
                            title="Ingresos Totales"
                            value={formatCurrency(financialTransactions.reduce((sum: number, t: any) => sum + t.totalPagado, 0))}
                            subtitle="Este período"
                            icon={FiDollarSign}
                            gradient="from-teal-500 to-cyan-500"
                            delay={0}
                          />
                          <MetricCard
                            title="Transacciones"
                            value={String(financialTransactions.length)}
                            subtitle="Total de pagos"
                            icon={FiCheckCircle}
                            gradient="from-green-500 to-emerald-500"
                            delay={1}
                          />
                          <MetricCard
                            title="Promedio por Pago"
                            value={formatCurrency(financialTransactions.length > 0 ? financialTransactions.reduce((sum: number, t: any) => sum + t.totalPagado, 0) / financialTransactions.length : 0)}
                            subtitle="Por transacción"
                            icon={FiTrendingUp}
                            gradient="from-blue-500 to-cyan-500"
                            delay={2}
                          />
                          <MetricCard
                            title="Pacientes Únicos"
                            value={String(new Set(financialTransactions.map((t: any) => t.paciente)).size)}
                            subtitle="Con pagos en período"
                            icon={FiUsers}
                            gradient="from-purple-500 to-pink-500"
                            delay={3}
                          />
                        </div>

                        <AnimatedChart>
                          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ingresos Mensuales</h3>
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Año:</label>
                                <select
                                  value={selectedYear}
                                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white text-sm"
                                >
                                  {[...Array(11)].map((_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return <option key={year} value={year}>{year}</option>;
                                  })}
                                </select>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  <tr>
                                    {['Mes', 'Total Pagado', 'Método de Pago', 'Total Neto', 'Comision'].map((header) => (
                                      <th key={header} className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {monthlyIncome.length > 0 ? (
                                    monthlyIncome.map((month: any, index: number) => {
                                      const primaryMethod = Object.entries(month.paymentMethods)[0];
                                      return (
                                        <motion.tr 
                                          key={index}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ delay: index * 0.05 }}
                                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {month.month}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-teal-600 dark:text-teal-400">
                                            {formatCurrency(month.totalPagado)}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                              (primaryMethod?.[1] as any)?.total > 0
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                              {primaryMethod?.[0] || 'N/A'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                            {formatCurrency(month.totalNeto)}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                                            {formatCurrency(month.comision)}
                                          </td>
                                        </motion.tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No hay datos mensuales en este período
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </AnimatedChart>
                      </div>
                    )}

                    {activeTab === 'promotions' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                            <FiGift className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Descuentos y Promociones</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <MetricCard
                            title="Promociones Activas"
                            value="5"
                            subtitle="Actualmente vigentes"
                            icon={FiCheckCircle}
                            gradient="from-green-500 to-emerald-500"
                            delay={0}
                          />
                          <MetricCard
                            title="Descuentos Aplicados"
                            value={formatCurrency(8450)}
                            subtitle="Este período"
                            icon={FiShield}
                            gradient="from-blue-500 to-cyan-500"
                            delay={1}
                          />
                          <MetricCard
                            title="Pacientes Beneficiados"
                            value="127"
                            subtitle="Únicos pacientes"
                            icon={FiUsers}
                            gradient="from-purple-500 to-pink-500"
                            delay={2}
                          />
                          <MetricCard
                            title="Ahorro Promedio"
                            value={formatCurrency(66.50)}
                            subtitle="Por paciente"
                            icon={FiTrendingUp}
                            gradient="from-amber-500 to-orange-500"
                            delay={3}
                          />
                        </div>

                        <AnimatedChart>
                          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Rendimiento de Promociones</h3>
                            <ResponsiveContainer width="100%" height={320}>
                              <BarChart data={[
                                { promotion: 'Limpieza 20%', usos: 45, descuento: 2250, ingresos: 9000 },
                                { promotion: 'Estudiante 15%', usos: 32, descuento: 1800, ingresos: 10200 },
                                { promotion: 'Familiar 10%', usos: 28, descuento: 1400, ingresos: 12600 },
                                { promotion: 'Primer Paciente 25%', usos: 22, descuento: 2750, ingresos: 8250 }
                              ]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="promotion" stroke="#9ca3af" fontSize={11} angle={-15} textAnchor="end" />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip content={<CustomTooltip formatter={(v: number) => typeof v === 'number' && v > 100 ? formatCurrency(v) : v} />} />
                                <Bar dataKey="descuento" fill={COLORS.red} name="Descuento" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="ingresos" fill={COLORS.green} name="Ingresos" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </AnimatedChart>

                        <AnimatedChart>
                          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  <tr>
                                    {['Promoción', 'Tipo', 'Descuento', 'Usos', 'Ahorro', 'Estado'].map((header) => (
                                      <th key={header} className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {[
                                    { promocion: 'Limpieza Dental', tipo: 'Porcentaje', descuento: '20%', usos: 45, ahorro: 2250, estado: 'Activa' },
                                    { promocion: 'Descuento Estudiante', tipo: 'Porcentaje', descuento: '15%', usos: 32, ahorro: 1800, estado: 'Activa' },
                                    { promocion: 'Paquete Familiar', tipo: 'Porcentaje', descuento: '10%', usos: 28, ahorro: 1400, estado: 'Activa' },
                                    { promocion: 'Primer Paciente', tipo: 'Porcentaje', descuento: '25%', usos: 22, ahorro: 2750, estado: 'Activa' },
                                    { promocion: 'Blanqueamiento', tipo: 'Fijo', descuento: 'L. 500', usos: 15, ahorro: 7500, estado: 'Pausada' }
                                  ].map((item, index) => (
                                    <motion.tr 
                                      key={index}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: index * 0.05 }}
                                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <FiGift className="w-4 h-4 text-purple-500" />
                                          <span className="font-medium text-gray-900 dark:text-white">{item.promocion}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{item.tipo}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-teal-600 dark:text-teal-400">{item.descuento}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.usos}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatCurrency(item.ahorro)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          item.estado === 'Activa' 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        }`}>
                                          {item.estado}
                                        </span>
                                      </td>
                                    </motion.tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </AnimatedChart>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
