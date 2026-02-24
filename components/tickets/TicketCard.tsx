'use client';

import React, { useState } from 'react';
import { 
  TicketWithRelations, 
  TicketStatus, 
  TicketPriority,
  TicketType,
  TicketCardProps
} from '@/types/ticket';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  MessageSquare, 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TicketCard({ 
  ticket, 
  currentUserId, 
  currentUserRole, 
  onUpdate,
  compact = false
}: TicketCardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!onUpdate) return;
    
    setIsUpdating(true);
    try {
      await onUpdate(ticket.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PENDING_REVIEW': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case 'SYSTEM_ISSUE': return <AlertTriangle className="w-4 h-4" />;
      case 'IMPLEMENTATION': return <TrendingUp className="w-4 h-4" />;
      case 'TASK': return <CheckCircle className="w-4 h-4" />;
      case 'REMINDER': return <Calendar className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdue = () => {
    if (!ticket.due_date) return false;
    return new Date(ticket.due_date) < new Date() && ticket.status !== 'CLOSED';
  };

  const canUpdateStatus = () => {
    return (
      currentUserRole === 'ADMIN' || 
      currentUserRole === 'TECH_SUPPORT' ||
      ticket.creator_id === currentUserId ||
      ticket.assignee_id === currentUserId
    );
  };

  const getStatusOptions = () => {
    const options = [
      { value: 'OPEN', label: 'Open' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'PENDING_REVIEW', label: 'Pending Review' },
      { value: 'RESOLVED', label: 'Resolved' },
      { value: 'CLOSED', label: 'Closed' }
    ];

    // Staff can only move to certain statuses
    if (currentUserRole === 'STAFF') {
      return options.filter(option => 
        ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(option.value)
      );
    }

    return options;
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getTypeIcon(ticket.type)}
              <h3 
                className="font-medium text-gray-900 truncate hover:text-blue-600"
                onClick={() => router.push(`/tickets/${ticket.id}`)}
              >
                {ticket.title}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3" />
              {ticket.assignee?.name || ticket.creator?.name}
            </div>
            {ticket._count?.activities > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {ticket._count.activities}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getTypeIcon(ticket.type)}
            <h3 
              className="font-semibold text-gray-900 truncate hover:text-blue-600 cursor-pointer"
              onClick={() => router.push(`/tickets/${ticket.id}`)}
            >
              {ticket.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isOverdue() && (
              <Badge variant="destructive" className="text-xs">
                Overdue
              </Badge>
            )}
            <Badge className={getPriorityColor(ticket.priority)}>
              {ticket.priority}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(ticket.status)}>
            {ticket.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {ticket.type.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Description */}
        {ticket.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {ticket.description}
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <User className="w-4 h-4" />
              <span>Created by {ticket.creator?.name || ticket.creator?.email}</span>
            </div>
            <span className="text-gray-500">{timeAgo(ticket.created_at)}</span>
          </div>

          {ticket.assignee && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="w-4 h-4" />
              <span>Assigned to {ticket.assignee.name || ticket.assignee.email}</span>
            </div>
          )}

          {ticket.due_date && (
            <div className={`flex items-center gap-2 text-sm ${isOverdue() ? 'text-red-600' : 'text-gray-500'}`}>
              <Calendar className="w-4 h-4" />
              <span>
                Due: {new Date(ticket.due_date).toLocaleDateString()}
                {isOverdue() && ' (Overdue)'}
              </span>
            </div>
          )}

          {ticket.department && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Department: {ticket.department}</span>
            </div>
          )}
        </div>

        {/* Activity Count */}
        {ticket._count?.activities > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <MessageSquare className="w-4 h-4" />
            <span>{ticket._count.activities} activities</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/tickets/${ticket.id}`)}
            className="flex items-center gap-2"
          >
            View Details
            <ArrowRight className="w-3 h-3" />
          </Button>

          {canUpdateStatus() && onUpdate && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Quick Status:</span>
              <Select
                value={ticket.status}
                onValueChange={(value) => handleStatusChange(value as TicketStatus)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getStatusOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
