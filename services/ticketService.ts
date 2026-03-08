import { Ticket, TicketActivity, CreateTicketData, UpdateTicketData, CreateActivityData, TicketFilters, TicketStatus, ActivityType, TicketPriority } from '@/types/ticket';
import { supabase } from '@/lib/supabase';
import { checkPermission, requirePermission, Permission } from '@/lib/rbac';

export class TicketService {
  // Get tickets with filters
  static async getTickets(filters: TicketFilters = {}): Promise<{ data: Ticket[] | null; error: any }> {
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          creator:creator_id(id, name, email, role, department),
          assignee:assignee_id(id, name, email, role, department),
          assignees:ticket_assignees(
            id,
            user_id,
            assigned_at,
            assigned_by,
            user:user_id(id, name, email, role, department)
          ),
          attachments:ticket_attachments(
            id,
            attachment_type,
            attachment_id,
            attachment_title,
            attachment_description,
            metadata,
            created_at
          ),
          activities:ticket_activities(
            id,
            user_id,
            activity_type,
            content,
            metadata,
            created_at,
            user:user_id(id, name, email, role, department)
          )
        `);

      // Apply filters only if provided - tech support gets all tickets when no filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      if (filters.creator_id) {
        query = query.eq('creator_id', filters.creator_id);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      // Sort activities by created_at for each ticket
      if (data) {
        data.forEach(ticket => {
          if (ticket.activities) {
            ticket.activities.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }
        });
      }

      return { data, error };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return { data: null, error };
    }
  }

  // Get single ticket by ID
  static async getTicketById(ticketId: string): Promise<{ data: Ticket | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          creator:creator_id(id, name, email, role, department),
          assignee:assignee_id(id, name, email, role, department),
          assignees:ticket_assignees(
            id,
            user_id,
            assigned_at,
            assigned_by,
            user:user_id(id, name, email, role, department)
          ),
          attachments:ticket_attachments(
            id,
            attachment_type,
            attachment_id,
            attachment_title,
            attachment_description,
            metadata,
            created_at
          ),
          activities:ticket_activities(
            id,
            user_id,
            activity_type,
            content,
            metadata,
            created_at,
            user:user_id(id, name, email, role, department)
          )
        `)
        .eq('id', ticketId)
        .single();

      // Sort activities by created_at
      if (data?.activities) {
        data.activities.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      return { data, error };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return { data: null, error };
    }
  }

  // Create new ticket
  static async createTicket(ticketData: CreateTicketData, creatorId: string, supabaseClient?: any): Promise<{ data: Ticket | null; error: any }> {
    try {
      const { assignee_ids, attachments, patient_id, ...ticketFields } = ticketData;
      
      // Use provided client or default client
      const client = supabaseClient || supabase;
      
      // Create ticket - exclude patient_id as it's not in tickets table
      const { data: ticket, error: ticketError } = await client
        .from('tickets')
        .insert({
          ...ticketFields,
          creator_id: creatorId,
          due_date: ticketData.due_date ? new Date(ticketData.due_date).toISOString() : null,
          is_reminder: ticketData.is_reminder || false
        })
        .select()
        .single();

      if (ticketError || !ticket) {
        return { data: null, error: ticketError };
      }

      // Create assignees if provided
      if (assignee_ids && assignee_ids.length > 0) {
        const assigneeData = assignee_ids.map(userId => ({
          ticket_id: ticket.id,
          user_id: userId,
          assigned_by: creatorId
        }));

        const { error: assigneeError } = await client
          .from('ticket_assignees')
          .insert(assigneeData);

        if (assigneeError) {
          console.error('Error creating assignees:', assigneeError);
        }
      }

      // Create attachments if provided
      if (attachments && attachments.length > 0) {
        const attachmentData = attachments.map(attachment => ({
          ticket_id: ticket.id,
          patient_id: patient_id || null,
          attachment_type: attachment.attachment_type,
          attachment_id: attachment.attachment_id,
          attachment_title: attachment.attachment_title,
          attachment_description: attachment.attachment_description,
          metadata: attachment.metadata
        }));

        const { error: attachmentError } = await client
          .from('ticket_attachments')
          .insert(attachmentData);

        if (attachmentError) {
          console.error('Error creating attachments:', attachmentError);
        }
      }

      // Create initial activity for ticket creation
      await this.createActivity({
        ticket_id: ticket.id,
        activity_type: ActivityType.STATUS_CHANGE,
        content: `Ticket created with status: ${TicketStatus.OPEN}`,
        metadata: { old_status: null, new_status: TicketStatus.OPEN }
      });

      return { data: ticket, error: null };
    } catch (error) {
      console.error('Error creating ticket:', error);
      return { data: null, error };
    }
  }

  // Update ticket
  static async updateTicket(ticketId: string, updates: UpdateTicketData, userId: string): Promise<{ data: Ticket | null; error: any }> {
    try {
      const { data: currentTicket } = await this.getTicketById(ticketId);
      if (!currentTicket) {
        return { data: null, error: 'Ticket not found' };
      }

      const { data, error } = await supabase
        .from('tickets')
        .update({
          ...updates,
          due_date: updates.due_date ? new Date(updates.due_date).toISOString() : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (data && !error) {
        // Create activity for status change
        if (updates.status && updates.status !== currentTicket.status) {
          await this.createActivity({
            ticket_id: ticketId,
            activity_type: ActivityType.STATUS_CHANGE,
            content: `Status changed from ${currentTicket.status} to ${updates.status}`,
            metadata: { old_status: currentTicket.status, new_status: updates.status }
          });
        }

        // Create activity for assignment change
        if (updates.assignee_id && updates.assignee_id !== currentTicket.assignee_id) {
          await this.createActivity({
            ticket_id: ticketId,
            activity_type: ActivityType.ASSIGNMENT,
            content: `Assigned to user ${updates.assignee_id}`,
            metadata: { old_assignee: currentTicket.assignee_id, new_assignee: updates.assignee_id }
          });
        }

        // Create activity for priority change
        if (updates.priority && updates.priority !== currentTicket.priority) {
          await this.createActivity({
            ticket_id: ticketId,
            activity_type: ActivityType.EDIT,
            content: `Priority changed from ${currentTicket.priority} to ${updates.priority}`,
            metadata: { old_priority: currentTicket.priority, new_priority: updates.priority }
          });
        }
      }

      return { data, error };
    } catch (error) {
      console.error('Error updating ticket:', error);
      return { data: null, error };
    }
  }

  // Create activity
  static async createActivity(activityData: CreateActivityData, userId?: string): Promise<{ data: TicketActivity | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('ticket_activities')
        .insert({
          ...activityData,
          created_at: new Date().toISOString(),
          user_id: userId
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error creating activity:', error);
      return { data: null, error };
    }
  }

  // Add comment to ticket
  static async addComment(ticketId: string, userId: string, content: string): Promise<{ data: TicketActivity | null; error: any }> {
    try {
      return await this.createActivity({
        ticket_id: ticketId,
        activity_type: ActivityType.COMMENT,
        content,
        metadata: { is_comment: true }
      }, userId);
    } catch (error) {
      console.error('Error adding comment:', error);
      return { data: null, error };
    }
  }

  // Get tickets due soon (for reminders)
  static async getTicketsDueSoon(hours: number = 24): Promise<{ data: Ticket[] | null; error: any }> {
    try {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + hours);

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          creator:creator_id(id, name, email, role, department),
          assignee:assignee_id(id, name, email, role, department)
        `)
        .eq('is_reminder', true)
        .eq('status', TicketStatus.OPEN)
        .lte('due_date', dueDate.toISOString())
        .order('due_date', { ascending: true });

      return { data, error };
    } catch (error) {
      console.error('Error fetching due tickets:', error);
      return { data: null, error };
    }
  }

  // Get dashboard data based on user role
  static async getDashboardData(userId: string, userRole: string): Promise<{ data: any; error: any }> {
    try {
      let queries = [];

      // My assigned tickets
      const { data: assignedTickets } = await this.getTickets({ assignee_id: userId });
      queries.push({ key: 'assignedTickets', data: assignedTickets || [] });

      // Tickets I created
      const { data: createdTickets } = await this.getTickets({ creator_id: userId });
      queries.push({ key: 'createdTickets', data: createdTickets || [] });

      // Department tickets (for doctors/admins)
      if (userRole === 'DOCTOR' || userRole === 'ADMIN') {
        const { data: departmentTickets } = await this.getTickets({});
        queries.push({ key: 'departmentTickets', data: departmentTickets || [] });
      }

      // All tickets (for tech support/admins)
      if (userRole === 'TECH_SUPPORT' || userRole === 'ADMIN') {
        const { data: allTickets } = await this.getTickets({});
        queries.push({ key: 'allTickets', data: allTickets || [] });
      }

      // Due soon reminders
      const { data: dueSoonTickets } = await this.getTicketsDueSoon();
      queries.push({ key: 'dueSoonTickets', data: dueSoonTickets || [] });

      const result = queries.reduce((acc, { key, data }) => {
        acc[key] = data;
        return acc;
      }, {});

      return { data: result, error: null };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return { data: null, error };
    }
  }

  // Delete ticket (admin/tech support only)
  static async deleteTicket(ticketId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      return { error };
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return { error };
    }
  }
}
