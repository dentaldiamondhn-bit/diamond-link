'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  CreateTicketData, 
  TicketType, 
  TicketPriority, 
  UserRole,
  CreateTicketModalProps
} from '@/types/ticket';
import { createTicketAction } from '@/lib/tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';

export default function CreateTicketModal({ 
  isOpen, 
  onClose, 
  onCreateTicket, 
  currentUserRole,
  users = []
}: CreateTicketModalProps) {
  const { user } = useUser();
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    type: TicketType.TASK,
    priority: TicketPriority.MEDIUM,
    due_date: '',
    is_reminder: false,
    system_impact: '',
    module_affected: '',
    assignee_id: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: TicketType.TASK,
      priority: TicketPriority.MEDIUM,
      due_date: '',
      is_reminder: false,
      system_impact: '',
      module_affected: '',
      assignee_id: '',
      department: ''
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.type === TicketType.SYSTEM_ISSUE && !formData.system_impact?.trim()) {
      newErrors.system_impact = 'System impact is required for system issues';
    }

    if (formData.is_reminder && !formData.due_date) {
      newErrors.due_date = 'Due date is required for reminders';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get current user ID from Clerk
      const userId = user?.id || '';
      
      if (!userId) {
        setErrors({ submit: 'User not authenticated' });
        return;
      }
      
      const result = await createTicketAction(formData, userId);
      
      if (result.success) {
        onCreateTicket(formData);
        onClose();
        resetForm();
      } else {
        setErrors({ submit: result.error || 'Failed to create ticket' });
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case 'SYSTEM_ISSUE': return <AlertTriangle className="w-4 h-4" />;
      case 'IMPLEMENTATION': return <CheckCircle className="w-4 h-4" />;
      case 'TASK': return <CheckCircle className="w-4 h-4" />;
      case 'REMINDER': return <Calendar className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 border-red-200';
      case 'HIGH': return 'text-orange-600 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 border-yellow-200';
      case 'LOW': return 'text-green-600 border-green-200';
      default: return 'text-gray-600 border-gray-200';
    }
  };

  const canAssignToOthers = () => {
    return currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.TECH_SUPPORT || currentUserRole === UserRole.DOCTOR;
  };

  const filteredUsers = users.filter(user => {
    if (currentUserRole === UserRole.STAFF) {
      return user.role === UserRole.STAFF;
    }
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create New Ticket
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter ticket title..."
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide detailed description..."
                  rows={4}
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as TicketType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TicketType.TASK}>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(TicketType.TASK)}
                          Task
                        </div>
                      </SelectItem>
                      <SelectItem value={TicketType.SYSTEM_ISSUE}>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(TicketType.SYSTEM_ISSUE)}
                          System Issue
                        </div>
                      </SelectItem>
                      <SelectItem value={TicketType.IMPLEMENTATION}>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(TicketType.IMPLEMENTATION)}
                          Implementation
                        </div>
                      </SelectItem>
                      <SelectItem value={TicketType.REMINDER}>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(TicketType.REMINDER)}
                          Reminder
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as TicketPriority }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TicketPriority.LOW}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-green-500`}></div>
                          Low
                        </div>
                      </SelectItem>
                      <SelectItem value={TicketPriority.MEDIUM}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-yellow-500`}></div>
                          Medium
                        </div>
                      </SelectItem>
                      <SelectItem value={TicketPriority.HIGH}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-orange-500`}></div>
                          High
                        </div>
                      </SelectItem>
                      <SelectItem value={TicketPriority.URGENT}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-red-500`}></div>
                          Urgent
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Type-specific fields */}
          {formData.type === TicketType.SYSTEM_ISSUE && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Issue Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Impact *
                  </label>
                  <Textarea
                    value={formData.system_impact}
                    onChange={(e) => setFormData(prev => ({ ...prev, system_impact: e.target.value }))}
                    placeholder="Describe the impact on the system..."
                    rows={3}
                    className={errors.system_impact ? 'border-red-500' : ''}
                  />
                  {errors.system_impact && (
                    <p className="text-red-500 text-sm mt-1">{errors.system_impact}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module Affected
                  </label>
                  <Input
                    value={formData.module_affected}
                    onChange={(e) => setFormData(prev => ({ ...prev, module_affected: e.target.value }))}
                    placeholder="e.g., Calendar, Patient Management, Billing..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignment and Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment & Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date {formData.is_reminder && '*'}
                </label>
                <Input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className={errors.due_date ? 'border-red-500' : ''}
                />
                {errors.due_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.due_date}</p>
                )}
              </div>

              {/* Is Reminder */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_reminder"
                  checked={formData.is_reminder}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_reminder: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_reminder" className="text-sm font-medium text-gray-700">
                  This is a reminder (will trigger notifications)
                </label>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g., Orthodontics, Front Desk, Administration..."
                />
              </div>

              {/* Assignee */}
              {canAssignToOthers() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To
                  </label>
                  <Select
                    value={formData.assignee_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignee_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Leave unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Leave unassigned</SelectItem>
                      {filteredUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Ticket
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
