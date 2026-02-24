'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  TicketWithRelations, 
  TicketStatus, 
  TicketType, 
  TicketPriority,
  DashboardStats,
  UserRole,
  TicketFilters,
  ActivityType
} from '@/types/ticket';
import { 
  getTicketsAction, 
  getDashboardStatsAction, 
  getUsersAction,
  updateTicketAction 
} from '@/lib/tickets';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Filter, 
  Search, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react';
import CreateTicketModal from '@/components/tickets/CreateTicketModal';
import TicketCard from '@/components/tickets/TicketCard';
import DashboardStatsComponent from '@/components/tickets/DashboardStats';

export default function TicketsPage() {
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();
  const userId = user?.id || '';
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filters, setFilters] = useState<TicketFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  const ticketsPerPage = 20;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters, searchTerm, currentPage]);

  const loadInitialData = async () => {
    try {
      const [statsResult, usersResult] = await Promise.all([
        getDashboardStatsAction(userId, userRole as UserRole),
        getUsersAction()
      ]);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const filtersWithSearch = {
        ...filters,
        search: searchTerm || undefined
      };

      const result = await getTicketsAction(
        filtersWithSearch,
        currentPage,
        ticketsPerPage
      );

      if (result.success && result.data) {
        setTickets(result.data.tickets);
        setTotalTickets(result.data.total);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketUpdate = async (ticketId: string, updates: any) => {
    try {
      const result = await updateTicketAction({
        ticketId,
        userId: userId!,
        updates,
        activityLog: {
          type: ActivityType.STATUS_CHANGE,
          content: `Status updated to ${updates.status}`,
          metadata: { new_status: updates.status }
        }
      });

      if (result.success) {
        loadTickets();
        loadInitialData(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT: return 'bg-red-100 text-red-800 border-red-200';
      case TicketPriority.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
      case TicketPriority.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TicketPriority.LOW: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return 'bg-blue-100 text-blue-800 border-blue-200';
      case TicketStatus.IN_PROGRESS: return 'bg-purple-100 text-purple-800 border-purple-200';
      case TicketStatus.PENDING_REVIEW: return 'bg-orange-100 text-orange-800 border-orange-200';
      case TicketStatus.RESOLVED: return 'bg-green-100 text-green-800 border-green-200';
      case TicketStatus.CLOSED: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case TicketType.SYSTEM_ISSUE: return <AlertTriangle className="w-4 h-4" />;
      case TicketType.IMPLEMENTATION: return <TrendingUp className="w-4 h-4" />;
      case TicketType.TASK: return <CheckCircle className="w-4 h-4" />;
      case TicketType.REMINDER: return <Calendar className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const renderKanbanView = () => {
    const columns: { status: TicketStatus; title: string }[] = [
      { status: TicketStatus.OPEN, title: 'Open' },
      { status: TicketStatus.IN_PROGRESS, title: 'In Progress' },
      { status: TicketStatus.PENDING_REVIEW, title: 'Pending Review' },
      { status: TicketStatus.RESOLVED, title: 'Resolved' },
      { status: TicketStatus.CLOSED, title: 'Closed' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {columns.map(column => (
          <div key={column.status} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{column.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {tickets.filter(t => t.status === column.status).length}
              </Badge>
            </div>
            <div className="space-y-2">
              {tickets
                .filter(ticket => ticket.status === column.status)
                .map(ticket => (
                  <TicketCard 
                    key={ticket.id}
                    ticket={ticket}
                    currentUserId={userId!}
                    currentUserRole={userRole as UserRole}
                    onUpdate={handleTicketUpdate}
                    compact={viewMode === 'kanban'}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-4">
      {tickets.map(ticket => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          currentUserId={userId!}
          currentUserRole={userRole as UserRole}
          onUpdate={handleTicketUpdate}
        />
      ))}
    </div>
  );

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600 mt-1">
            Manage tasks, system issues, and reminders
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Ticket
        </Button>
      </div>

      {/* Dashboard Stats */}
      {stats && <DashboardStatsComponent stats={stats} />}

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status?.[0] || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({
                  ...prev,
                  status: value === 'all' ? undefined : [value as TicketStatus]
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={TicketStatus.PENDING_REVIEW}>Pending Review</SelectItem>
                <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={filters.type?.[0] || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({
                  ...prev,
                  type: value === 'all' ? undefined : [value as TicketType]
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value={TicketType.SYSTEM_ISSUE}>System Issue</SelectItem>
                <SelectItem value={TicketType.IMPLEMENTATION}>Implementation</SelectItem>
                <SelectItem value={TicketType.TASK}>Task</SelectItem>
                <SelectItem value={TicketType.REMINDER}>Reminder</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select
              value={filters.priority?.[0] || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({
                  ...prev,
                  priority: value === 'all' ? undefined : [value as TicketPriority]
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
                <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                >
                  Kanban
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List/Kanban */}
      <Card>
        <CardContent className="p-6">
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tickets found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || Object.keys(filters).length > 0
                  ? 'Try adjusting your filters or search terms'
                  : 'Get started by creating your first ticket'}
              </p>
              {!searchTerm && Object.keys(filters).length === 0 && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Ticket
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'list' ? renderListView() : renderKanbanView()}
              
              {/* Pagination */}
              {totalTickets > ticketsPerPage && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * ticketsPerPage) + 1} to{' '}
                    {Math.min(currentPage * ticketsPerPage, totalTickets)} of{' '}
                    {totalTickets} tickets
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {currentPage} of {Math.ceil(totalTickets / ticketsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= Math.ceil(totalTickets / ticketsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTicket={async (data) => {
          // Handle ticket creation
          setIsCreateModalOpen(false);
          loadTickets();
          loadInitialData();
        }}
        currentUserRole={userRole as UserRole}
        users={users}
      />
    </div>
  );
}
