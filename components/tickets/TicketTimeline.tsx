'use client';

import React, { useState } from 'react';
import { 
  TicketActivity, 
  ActivityType,
  TicketTimelineProps
} from '@/types/ticket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  User, 
  CheckCircle, 
  Edit,
  ArrowRight,
  Send,
  Clock,
  AlertTriangle
} from 'lucide-react';

export default function TicketTimeline({ 
  activities, 
  currentUserId, 
  currentUserRole,
  onAddComment
}: TicketTimelineProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddComment = async () => {
    if (!comment.trim() || !onAddComment) return;

    setIsSubmitting(true);
    try {
      await onAddComment(activities[0]?.ticket_id || '', comment);
      setComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'STATUS_CHANGE': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'COMMENT': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'ASSIGNMENT': return <User className="w-4 h-4 text-purple-500" />;
      case 'EDIT': return <Edit className="w-4 h-4 text-orange-500" />;
      case 'CREATION': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'STATUS_CHANGE': return 'border-blue-200 bg-blue-50';
      case 'COMMENT': return 'border-green-200 bg-green-50';
      case 'ASSIGNMENT': return 'border-purple-200 bg-purple-50';
      case 'EDIT': return 'border-orange-200 bg-orange-50';
      case 'CREATION': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {/* Activities */}
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex items-start gap-4">
                  {/* Timeline Dot */}
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-white border-2 border-gray-300 rounded-full">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* Activity Content */}
                  <div className={`flex-1 p-4 rounded-lg border ${getActivityColor(activity.type)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {activity.user?.name || activity.user?.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {activity.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700">
                      {activity.content}
                    </div>
                    
                    {/* Metadata for specific activity types */}
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-gray-600">
                        {activity.type === 'STATUS_CHANGE' && activity.metadata.old_status && (
                          <div>
                            Status changed from <span className="font-medium">{activity.metadata.old_status}</span> to{' '}
                            <span className="font-medium">{activity.metadata.new_status}</span>
                          </div>
                        )}
                        {activity.type === 'ASSIGNMENT' && activity.metadata.new_assignee && (
                          <div>
                            Assigned to user ID: <span className="font-medium">{activity.metadata.new_assignee}</span>
                          </div>
                        )}
                        {activity.type === 'EDIT' && activity.metadata.fields_changed && (
                          <div>
                            Fields changed: <span className="font-medium">{activity.metadata.fields_changed.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Comment */}
          {onAddComment && (
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Add Comment</h4>
              <div className="space-y-4">
                <Textarea
                  placeholder="Type your comment here..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!comment.trim() || isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
