import React from 'react';
import { TicketActivity, User } from '@/types/ticket';
import { CheckCircle2, MessageSquare, UserPlus, Clock, Settings, AlertCircle, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { format } from 'date-fns';

type ActivityWithUser = TicketActivity & { 
  user: User;
};

interface TicketTimelineProps {
  activities: ActivityWithUser[];
  className?: string;
}

export default function TicketTimeline({ activities, className = '' }: TicketTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Clock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p>No hay actividad registrada</p>
      </div>
    );
  }

  return (
    <div className={`flow-root ${className}`}>
      <ul role="list" className="-mb-8">
        {activities.map((activity, idx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {idx !== activities.length - 1 && (
                <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
              )}
              <div className="relative flex items-start space-x-3">
                <div className="relative">
                  <ActivityIcon type={activity.activity_type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {activity.user?.name || 'Usuario desconocido'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {activity.user?.role && ` (${activity.user.role})`}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      <span className="mx-2">•</span>
                      <span>{format(new Date(activity.created_at), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    <p className="whitespace-pre-wrap">{activity.content}</p>
                    
                    {/* Show metadata if exists */}
                    {activity.metadata && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                        <MetadataDisplay metadata={activity.metadata} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const baseClasses = "flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white dark:ring-gray-900";
  
  switch (type) {
    case "STATUS_CHANGE":
      return (
        <div className={`${baseClasses} bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300`}>
          <CheckCircle2 size={18} />
        </div>
      );
    case "ASSIGNMENT":
      return (
        <div className={`${baseClasses} bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300`}>
          <UserPlus size={18} />
        </div>
      );
    case "COMMENT":
      return (
        <div className={`${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`}>
          <MessageSquare size={18} />
        </div>
      );
    case "SYSTEM_UPDATE":
      return (
        <div className={`${baseClasses} bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300`}>
          <Settings size={18} />
        </div>
      );
    case "TICKET_CREATED":
      return (
        <div className={`${baseClasses} bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300`}>
          <FileText size={18} />
        </div>
      );
    case "ATTACHMENT_ADDED":
      return (
        <div className={`${baseClasses} bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300`}>
          <FileText size={18} />
        </div>
      );
    default:
      return (
        <div className={`${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`}>
          <AlertCircle size={18} />
        </div>
      );
  }
}

function MetadataDisplay({ metadata }: { metadata: Record<string, any> }) {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  const entries = Object.entries(metadata).filter(([_, value]) => 
    value !== null && value !== undefined && value !== ''
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between">
          <span className="font-medium capitalize text-gray-600 dark:text-gray-400">
            {formatMetadataKey(key)}:
          </span>
          <span className="text-gray-800 dark:text-gray-200">
            {formatMetadataValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatMetadataKey(key: string): string {
  return key.replace(/_/g, ' ').toLowerCase();
}

function formatMetadataValue(value: any): string {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
