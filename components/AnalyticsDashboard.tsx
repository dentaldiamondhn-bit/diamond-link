'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Activity, TrendingUp, Eye, MousePointer, Clock } from 'lucide-react';

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  totalVisits: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; views: number }>;
  recentActivity: Array<{ timestamp: string; page: string; type: string }>;
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    pageViews: 0,
    uniqueVisitors: 0,
    totalVisits: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    topPages: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    // Simulate fetching analytics data
    // In real implementation, this would fetch from Vercel Analytics API
    const fetchAnalyticsData = async () => {
      setLoading(true);
      
      // Mock data for demonstration
      const mockData: AnalyticsData = {
        pageViews: Math.floor(Math.random() * 1000) + 500,
        uniqueVisitors: Math.floor(Math.random() * 200) + 100,
        totalVisits: Math.floor(Math.random() * 300) + 150,
        bounceRate: Math.random() * 30 + 20,
        avgSessionDuration: Math.random() * 180 + 60,
        topPages: [
          { path: '/dashboard', views: Math.floor(Math.random() * 100) + 50 },
          { path: '/pacientes', views: Math.floor(Math.random() * 80) + 40 },
          { path: '/calendario', views: Math.floor(Math.random() * 60) + 30 },
          { path: '/patient-form', views: Math.floor(Math.random() * 50) + 25 },
          { path: '/tratamientos', views: Math.floor(Math.random() * 40) + 20 }
        ],
        recentActivity: [
          { timestamp: new Date().toISOString(), page: '/dashboard', type: 'page_view' },
          { timestamp: new Date(Date.now() - 300000).toISOString(), page: '/pacientes', type: 'page_view' },
          { timestamp: new Date(Date.now() - 600000).toISOString(), page: '/calendario', type: 'page_view' },
          { timestamp: new Date(Date.now() - 900000).toISOString(), page: '/patient-form', type: 'form_submit' },
          { timestamp: new Date(Date.now() - 1200000).toISOString(), page: '/tratamientos', type: 'page_view' }
        ]
      };

      setTimeout(() => {
        setAnalyticsData(mockData);
        setLoading(false);
      }, 1000);
    };

    fetchAnalyticsData();

    // Set up real-time updates
    const interval = setInterval(() => {
      setAnalyticsData(prev => ({
        ...prev,
        pageViews: prev.pageViews + Math.floor(Math.random() * 5),
        recentActivity: [
          { 
            timestamp: new Date().toISOString(), 
            page: prev.topPages[Math.floor(Math.random() * prev.topPages.length)]?.path || '/dashboard', 
            type: 'page_view' 
          },
          ...prev.recentActivity.slice(0, 9)
        ]
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'page_view': return <Eye className="w-4 h-4" />;
      case 'form_submit': return <MousePointer className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400">Real-time traffic monitoring for Diamond Link</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-gray-700 text-white px-3 py-1 rounded-lg border border-gray-600"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Page Views</p>
              <p className="text-2xl font-bold text-white">{formatNumber(analyticsData.pageViews)}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Unique Visitors</p>
              <p className="text-2xl font-bold text-white">{formatNumber(analyticsData.uniqueVisitors)}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Visits</p>
              <p className="text-2xl font-bold text-white">{formatNumber(analyticsData.totalVisits)}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Session</p>
              <p className="text-2xl font-bold text-white">{formatDuration(analyticsData.avgSessionDuration)}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Top Pages</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.topPages.map((page, index) => (
              <div key={page.path} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 w-6">{index + 1}</span>
                  <span className="text-white">{page.path}</span>
                </div>
                <span className="text-blue-400 font-medium">{formatNumber(page.views)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="text-gray-400">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{activity.page}</p>
                  <p className="text-gray-400 text-xs">{formatTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 text-sm">Bounce Rate</p>
            <p className="text-xl font-bold text-white">{analyticsData.bounceRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Pages per Session</p>
            <p className="text-xl font-bold text-white">{(analyticsData.pageViews / analyticsData.totalVisits).toFixed(1)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">New vs Returning</p>
            <p className="text-xl font-bold text-white">75% / 25%</p>
          </div>
        </div>
      </div>

      {/* Real-time Indicator */}
      <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm">Real-time monitoring active</span>
        </div>
      </div>
    </div>
  );
}
