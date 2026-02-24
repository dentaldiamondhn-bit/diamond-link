'use client';

import React from 'react';
import { DashboardStats } from '@/types/ticket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface DashboardStatsProps {
  stats: DashboardStats;
}

export default function DashboardStatsComponent({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: 'Total Tickets',
      value: stats.total,
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'Open',
      value: stats.open,
      icon: <Clock className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'In Progress',
      value: stats.in_progress,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-red-600 bg-red-100'
    }
  ];

  const typeData = [
    { name: 'System Issues', value: stats.by_type.SYSTEM_ISSUE, color: 'bg-red-500' },
    { name: 'Implementation', value: stats.by_type.IMPLEMENTATION, color: 'bg-blue-500' },
    { name: 'Tasks', value: stats.by_type.TASK, color: 'bg-green-500' },
    { name: 'Reminders', value: stats.by_type.REMINDER, color: 'bg-yellow-500' }
  ];

  const priorityData = [
    { name: 'Urgent', value: stats.by_priority.URGENT, color: 'bg-red-500' },
    { name: 'High', value: stats.by_priority.HIGH, color: 'bg-orange-500' },
    { name: 'Medium', value: stats.by_priority.MEDIUM, color: 'bg-yellow-500' },
    { name: 'Low', value: stats.by_priority.LOW, color: 'bg-green-500' }
  ];

  const statusData = [
    { name: 'Open', value: stats.by_status.OPEN, color: 'bg-blue-500' },
    { name: 'In Progress', value: stats.by_status.IN_PROGRESS, color: 'bg-purple-500' },
    { name: 'Pending Review', value: stats.by_status.PENDING_REVIEW, color: 'bg-orange-500' },
    { name: 'Resolved', value: stats.by_status.RESOLVED, color: 'bg-green-500' },
    { name: 'Closed', value: stats.by_status.CLOSED, color: 'bg-gray-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tickets by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tickets by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priorityData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tickets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
