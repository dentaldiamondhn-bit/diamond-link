'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { 
  TicketWithRelations, 
  TicketStatus, 
  TicketPriority,
  ActivityType,
  UserRole
} from '@/types/ticket';
import { 
  getTicketAction, 
  updateTicketAction, 
  addCommentAction,
  getUsersAction 
} from '@/lib/tickets';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Edit,
  Trash2,
  Send
} from 'lucide-react';
import TicketTimeline from '@/components/tickets/TicketTimeline';

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();
  const userId = user?.id || '';
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    priority: '',
    assignee_id: ''
  });

  const ticketId = params.id as string;

  useEffect(() => {
    if (ticketId) {
      loadTicket();
      loadUsers();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const result = await getTicketAction(ticketId);
      if (result.success && result.data) {
        setTicket(result.data);
        setEditForm({
          status: result.data.status,
          priority: result.data.priority,
          assignee_id: result.data.assignee_id || ''
        });
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await getUsersAction();
      if (result.success && result.data) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket || !userId) return;

    try {
      const result = await updateTicketAction({
        ticketId: ticket.id,
        userId,
        updates: { status: newStatus },
        activityLog: {
          type: ActivityType.STATUS_CHANGE,
          content: `Status changed from ${ticket.status} to ${newStatus}`,
          metadata: { old_status: ticket.status, new_status: newStatus }
        }
      });

      if (result.success && result.data) {
        setTicket(result.data);
        setEditForm(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!ticket || !userId) return;

    try {
      const result = await updateTicketAction({
        ticketId: ticket.id,
        userId,
        updates: { priority: newPriority },
        activityLog: {
          type: ActivityType.EDIT,
          content: `Priority changed from ${ticket.priority} to ${newPriority}`,
          metadata: { old_priority: ticket.priority, new_priority: newPriority }
        }
      });

      if (result.success && result.data) {
        setTicket(result.data);
        setEditForm(prev => ({ ...prev, priority: newPriority }));
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!ticket || !userId) return;

    try {
      const result = await updateTicketAction({
        ticketId: ticket.id,
        userId,
        updates: { assignee_id: newAssigneeId || null },
        activityLog: {
          type: ActivityType.ASSIGNMENT,
          content: newAssigneeId 
            ? `Ticket assigned to ${users.find(u => u.id === newAssigneeId)?.name || newAssigneeId}`
            : 'Ticket unassigned',
          metadata: { old_assignee: ticket.assignee_id, new_assignee: newAssigneeId }
        }
      });

      if (result.success && result.data) {
        setTicket(result.data);
        setEditForm(prev => ({ ...prev, assignee_id: newAssigneeId || '' }));
      }
    } catch (error) {
      console.error('Failed to update assignee:', error);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !ticket || !userId) return;

    try {
      const result = await addCommentAction(ticket.id, userId, comment);
      if (result.success) {
        setComment('');
        loadTicket(); // Reload to get new activity
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
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

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.STATUS_CHANGE: return <CheckCircle className="w-4 h-4" />;
      case ActivityType.COMMENT: return <MessageSquare className="w-4 h-4" />;
      case ActivityType.ASSIGNMENT: return <User className="w-4 h-4" />;
      case ActivityType.EDIT: return <Edit className="w-4 h-4" />;
      case ActivityType.CREATION: return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const canEditTicket = () => {
    if (!ticket || !userId) return false;
    return (
      userRole === 'ADMIN' || 
      userRole === 'TECH_SUPPORT' ||
      ticket.creator_id === userId ||
      ticket.assignee_id === userId
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ticket Not Found</h2>
          <Button onClick={() => router.push('/tickets')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/tickets')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
              <Badge variant="outline">
                {ticket.type.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
        {canEditTicket() && (
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {ticket.description || 'No description provided'}
                  </p>
                </div>

                {ticket.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Due: {new Date(ticket.due_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {ticket.system_impact && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">System Impact</h3>
                    <p className="text-gray-700">{ticket.system_impact}</p>
                  </div>
                )}

                {ticket.module_affected && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Module Affected</h3>
                    <p className="text-gray-700">{ticket.module_affected}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Comment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Add Comment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Type your comment here..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleAddComment}
                  disabled={!comment.trim()}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Post Comment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <TicketTimeline 
            activities={ticket.activities || []}
            currentUserId={userId!}
            currentUserRole={userRole as UserRole}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {isEditing && canEditTicket() && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Change */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => handleStatusChange(value as TicketStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Change */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <Select
                    value={editForm.priority}
                    onValueChange={(value) => handlePriorityChange(value as TicketPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee Change */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To
                  </label>
                  <Select
                    value={editForm.assignee_id}
                    onValueChange={handleAssigneeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="text-sm text-gray-600">
                  {new Date(ticket.created_at).toLocaleDateString()} at{' '}
                  {new Date(ticket.created_at).toLocaleTimeString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                <p className="text-sm text-gray-600">
                  {new Date(ticket.updated_at).toLocaleDateString()} at{' '}
                  {new Date(ticket.updated_at).toLocaleTimeString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Creator</label>
                <p className="text-sm text-gray-600">
                  {ticket.creator?.name || ticket.creator?.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Assignee</label>
                <p className="text-sm text-gray-600">
                  {ticket.assignee?.name || ticket.assignee?.email || 'Unassigned'}
                </p>
              </div>

              {ticket.department && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="text-sm text-gray-600">{ticket.department}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
