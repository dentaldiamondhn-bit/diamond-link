'use server';

import { createClient } from '@supabase/supabase-js';
import { 
  Ticket, 
  TicketActivity, 
  CreateTicketData, 
  UpdateTicketData, 
  CreateActivityData,
  TicketStatus,
  ActivityType,
  ApiResponse,
  TicketWithRelations,
  TicketFilters,
  DashboardStats,
  UserRole
} from '@/types/ticket';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to create activity log
async function createActivityLog(
  ticketId: string,
  userId: string,
  type: ActivityType,
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  await supabase
    .from('ticket_activities')
    .insert({
      ticket_id: ticketId,
      user_id: userId,
      type,
      content,
      metadata: metadata || {}
    });
}

// Server Action: Create Ticket
export async function createTicketAction(
  data: CreateTicketData,
  creatorId: string
): Promise<ApiResponse<TicketWithRelations>> {
  try {
    // Create the ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        ...data,
        creator_id: creatorId
      })
      .select(`
        *,
        creator:users(id, name, email, role, department),
        assignee:users(id, name, email, role, department)
      `)
      .single();

    if (error) throw error;

    // Create creation activity log
    await createActivityLog(
      ticket.id,
      creatorId,
      ActivityType.CREATION,
      `Ticket created: ${ticket.title}`,
      { initial_data: data }
    );

    // If assigned to someone, create assignment activity
    if (data.assignee_id) {
      await createActivityLog(
        ticket.id,
        creatorId,
        ActivityType.ASSIGNMENT,
        `Ticket assigned to user ${data.assignee_id}`,
        { assignee_id: data.assignee_id }
      );
    }

    revalidatePath('/tickets');
    revalidatePath(`/tickets/${ticket.id}`);

    return { success: true, data: ticket };
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return { success: false, error: 'Failed to create ticket' };
  }
}

// Server Action: Update Ticket
export async function updateTicketAction({
  ticketId,
  userId,
  updates,
  activityLog
}: {
  ticketId: string;
  userId: string;
  updates: UpdateTicketData;
  activityLog: {
    type: ActivityType;
    content: string;
    metadata?: Record<string, any>;
  };
}): Promise<ApiResponse<TicketWithRelations>> {
  try {
    // Get current ticket for comparison
    const { data: currentTicket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!currentTicket) {
      return { success: false, error: 'Ticket not found' };
    }

    // Update the ticket
    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select(`
        *,
        creator:users(id, name, email, role, department),
        assignee:users(id, name, email, role, department)
      `)
      .single();

    if (error) throw error;

    // Create activity log with metadata about what changed
    const metadata = {
      ...activityLog.metadata,
      old_values: {
        status: currentTicket.status,
        assignee_id: currentTicket.assignee_id,
        priority: currentTicket.priority
      },
      new_values: {
        status: updates.status,
        assignee_id: updates.assignee_id,
        priority: updates.priority
      }
    };

    await createActivityLog(
      ticketId,
      userId,
      activityLog.type,
      activityLog.content,
      metadata
    );

    revalidatePath('/tickets');
    revalidatePath(`/tickets/${ticketId}`);

    return { success: true, data: updatedTicket };
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return { success: false, error: 'Failed to update ticket' };
  }
}

// Server Action: Add Comment
export async function addCommentAction(
  ticketId: string,
  userId: string,
  comment: string
): Promise<ApiResponse<TicketActivity>> {
  try {
    const { data: activity, error } = await supabase
      .from('ticket_activities')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        type: ActivityType.COMMENT,
        content: comment
      })
      .select(`
        *,
        user:users(id, name, email, role, department)
      `)
      .single();

    if (error) throw error;

    revalidatePath(`/tickets/${ticketId}`);

    return { success: true, data: activity };
  } catch (error) {
    console.error('Failed to add comment:', error);
    return { success: false, error: 'Failed to add comment' };
  }
}

// Server Action: Get Ticket with Relations
export async function getTicketAction(
  ticketId: string
): Promise<ApiResponse<TicketWithRelations>> {
  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:users(id, name, email, role, department),
        assignee:users(id, name, email, role, department),
        activities:ticket_activities(
          *,
          user:users(id, name, email, role, department)
        )
      `)
      .eq('id', ticketId)
      .single();

    if (error) throw error;

    // Sort activities by created_at
    if (ticket.activities) {
      ticket.activities.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return { success: true, data: ticket };
  } catch (error) {
    console.error('Failed to get ticket:', error);
    return { success: false, error: 'Failed to get ticket' };
  }
}

// Server Action: Get Tickets with Filters
export async function getTicketsAction(
  filters: TicketFilters = {},
  page = 1,
  limit = 20
): Promise<ApiResponse<{ tickets: TicketWithRelations[], total: number }>> {
  try {
    let query = supabase
      .from('tickets')
      .select(`
        *,
        creator:users(id, name, email, role, department),
        assignee:users(id, name, email, role, department),
        activities:ticket_activities(id)
      `, { count: 'exact' });

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.type && filters.type.length > 0) {
      query = query.in('type', filters.type);
    }

    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters.assignee_id) {
      query = query.eq('assignee_id', filters.assignee_id);
    }

    if (filters.creator_id) {
      query = query.eq('creator_id', filters.creator_id);
    }

    if (filters.department) {
      query = query.eq('department', filters.department);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.due_date_from) {
      query = query.gte('due_date', filters.due_date_from);
    }

    if (filters.due_date_to) {
      query = query.lte('due_date', filters.due_date_to);
    }

    // Apply pagination and ordering
    const { data: tickets, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    // Get activity counts for each ticket
    const ticketsWithCounts = tickets.map(ticket => ({
      ...ticket,
      _count: {
        activities: ticket.activities?.length || 0
      }
    }));

    return { 
      success: true, 
      data: { 
        tickets: ticketsWithCounts, 
        total: count || 0 
      } 
    };
  } catch (error) {
    console.error('Failed to get tickets:', error);
    return { success: false, error: 'Failed to get tickets' };
  }
}

// Server Action: Get Dashboard Stats
export async function getDashboardStatsAction(
  userId?: string,
  userRole?: UserRole
): Promise<ApiResponse<DashboardStats>> {
  try {
    let baseQuery = supabase.from('tickets').select('*');

    // If user is not admin or tech support, only show their assigned tickets
    if (userId && userRole && !['ADMIN', 'TECH_SUPPORT'].includes(userRole)) {
      baseQuery = baseQuery.or(`creator_id.eq.${userId},assignee_id.eq.${userId}`);
    }

    const { data: allTickets, error } = await baseQuery;

    if (error) throw error;

    const now = new Date();
    const stats: DashboardStats = {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'OPEN').length,
      in_progress: allTickets.filter(t => t.status === 'IN_PROGRESS').length,
      resolved: allTickets.filter(t => t.status === 'RESOLVED').length,
      overdue: allTickets.filter(t => 
        t.due_date && new Date(t.due_date) < now && t.status !== 'CLOSED'
      ).length,
      by_type: {
        SYSTEM_ISSUE: allTickets.filter(t => t.type === 'SYSTEM_ISSUE').length,
        IMPLEMENTATION: allTickets.filter(t => t.type === 'IMPLEMENTATION').length,
        TASK: allTickets.filter(t => t.type === 'TASK').length,
        REMINDER: allTickets.filter(t => t.type === 'REMINDER').length
      },
      by_priority: {
        LOW: allTickets.filter(t => t.priority === 'LOW').length,
        MEDIUM: allTickets.filter(t => t.priority === 'MEDIUM').length,
        HIGH: allTickets.filter(t => t.priority === 'HIGH').length,
        URGENT: allTickets.filter(t => t.priority === 'URGENT').length
      },
      by_status: {
        OPEN: allTickets.filter(t => t.status === 'OPEN').length,
        IN_PROGRESS: allTickets.filter(t => t.status === 'IN_PROGRESS').length,
        PENDING_REVIEW: allTickets.filter(t => t.status === 'PENDING_REVIEW').length,
        RESOLVED: allTickets.filter(t => t.status === 'RESOLVED').length,
        CLOSED: allTickets.filter(t => t.status === 'CLOSED').length
      }
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return { success: false, error: 'Failed to get dashboard stats' };
  }
}

// Server Action: Get Users for Assignment
export async function getUsersAction(): Promise<ApiResponse<any[]>> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, department')
      .order('name');

    if (error) throw error;

    return { success: true, data: users };
  } catch (error) {
    console.error('Failed to get users:', error);
    return { success: false, error: 'Failed to get users' };
  }
}

// Server Action: Delete Ticket (Admin/Tech Support only)
export async function deleteTicketAction(
  ticketId: string,
  userId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId);

    if (error) throw error;

    revalidatePath('/tickets');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    return { success: false, error: 'Failed to delete ticket' };
  }
}
