import { Ticket, TicketActivity, CreateTicketData, UpdateTicketData, CreateActivityData, TicketFilters, TicketStatus, ActivityType, TicketPriority } from '@/types/ticket';
import { supabase } from '@/lib/supabase';
import { checkPermission, requirePermission, Permission } from '@/lib/rbac';
import CapacitorNotificationService from './capacitorNotificationService';

// Helper function to fetch user data
const fetchUserById = async (userId: string) => {
  try {
    const response = await fetch('/api/users');
    if (!response.ok) return null;
    const users = await response.json();
    return users.find((user: any) => user.id === userId) || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

// Helper function to generate ticket number
const generateTicketNumber = async (): Promise<string> => {
  try {
    // Try the database function first
    const { data: result, error } = await supabase
      .rpc('get_next_ticket_number');
    
    if (!error && result) {
      return result;
    }
    
    // Fallback: Get the highest existing ticket number and increment
    const { data: existingTickets, error: fetchError } = await supabase
      .from('tickets')
      .select('ticket_number')
      .not('ticket_number', 'is', null)
      .order('ticket_number', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching existing tickets:', fetchError);
      // Last resort: use timestamp
      const timestamp = Date.now();
      return `REQ-${timestamp.toString().slice(-6)}`;
    }
    
    let nextNumber = 1;
    if (existingTickets && existingTickets.length > 0) {
      // Find the actual highest ticket number from all results
      const highestTicket = existingTickets.reduce((highest, current) => {
        const currentNum = parseInt(current.ticket_number.replace('REQ-', ''), 10);
        const highestNum = parseInt(highest.ticket_number.replace('REQ-', ''), 10);
        return (!isNaN(currentNum) && currentNum > highestNum) ? current : highest;
      });
      
      const numericPart = highestTicket.ticket_number.replace('REQ-', '');
      const currentNumber = parseInt(numericPart, 10);
      
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }
    
    return `REQ-${nextNumber.toString().padStart(5, '0')}`;
    
  } catch (error) {
    console.error('Error in generateTicketNumber:', error);
    // Last resort: use timestamp
    return `REQ-${Date.now().toString().slice(-6)}`;
  }
};

// Helper function to enrich tickets with user data
const enrichTicketWithUsers = async (ticket: any) => {
  // Fetch creator data
  if (ticket.creator_id) {
    ticket.creator = await fetchUserById(ticket.creator_id);
  }
  
  // Fetch assignee data
  if (ticket.assignees && ticket.assignees.length > 0) {
    for (const assignee of ticket.assignees) {
      if (assignee.user_id) {
        assignee.user = await fetchUserById(assignee.user_id);
      }
    }
  }
  
  return ticket;
};

export class TicketService {
  // Get tickets with filters
  static async getTickets(filters: TicketFilters = {}): Promise<{ data: Ticket[] | null; error: any }> {
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          assignees:ticket_assignees(
            id,
            user_id,
            assigned_at,
            assigned_by
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
            created_at
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
        // Enrich tickets with user data
        const enrichedTickets = await Promise.all(
          data.map(ticket => enrichTicketWithUsers(ticket))
        );
        
        enrichedTickets.forEach(ticket => {
          if (ticket.activities) {
            ticket.activities.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }
        });
        
        return { data: enrichedTickets, error };
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
          assignees:ticket_assignees(
            id,
            user_id,
            assigned_at,
            assigned_by
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
            created_at
          )
        `)
        .eq('id', ticketId)
        .single();

      // Sort activities by created_at and enrich with user data
      if (data) {
        const enrichedTicket = await enrichTicketWithUsers(data);
        if (enrichedTicket?.activities) {
          enrichedTicket.activities.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
        return { data: enrichedTicket, error };
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
      
      // Generate ticket number
      const ticket_number = await generateTicketNumber();
      
      // Create ticket - patient_id is handled in attachments, not tickets table
      const insertData = {
        ...ticketFields,
        creator_id: creatorId,
        ticket_number: ticket_number,
        is_reminder: ticketData.is_reminder || false
      };
      
      console.log('DEBUG: Inserting ticket data:', JSON.stringify(insertData, null, 2)); // DEBUG LOG
      console.log('DEBUG: ticketFields.type:', JSON.stringify(ticketFields.type, null, 2)); // DEBUG LOG
      console.log('DEBUG: ticketFields.type typeof:', typeof ticketFields.type); // DEBUG LOG
      console.log('DEBUG: ticketFields.type length:', ticketFields.type ? ticketFields.type.length : 'null'); // DEBUG LOG
      
      // Create new ticket - try direct Supabase client approach for maintenance tickets
      const { data: ticket, error: ticketError } = await client
        .from('tickets')
        .insert(insertData)
        .select()
        .single();

      if (ticketError || !ticket) {
        console.log('DEBUG: Ticket creation error:', ticketError); // DEBUG LOG
        
        // If this is a maintenance ticket with enum error, try direct RPC
        if (ticketError?.message?.includes('invalid input value for enum') && ticketFields.type === 'MAINTENANCE') {
          console.log('DEBUG: Trying direct SQL approach for maintenance ticket'); // DEBUG LOG
          
          try {
            const { data: directTicket, error: directError } = await client
              .rpc('create_maintenance_ticket_with_number', {
                p_title: ticketFields.title,
                p_description: ticketFields.description,
                p_type: 'MAINTENANCE',
                p_priority: ticketFields.priority,
                p_creator_id: creatorId,
                p_maintenance_start: ticketFields.maintenance_start,
                p_maintenance_end: ticketFields.maintenance_end,
                p_is_reminder: ticketFields.is_reminder || false,
                p_ticket_number: ticket_number
              });
            
            if (directError) {
              console.log('DEBUG: Direct SQL approach also failed:', directError); // DEBUG LOG
              return { data: null, error: directError };
            }
            
            console.log('DEBUG: Direct SQL approach succeeded:', directTicket); // DEBUG LOG
            return { data: directTicket, error: null };
            
          } catch (directErr) {
            console.log('DEBUG: Direct SQL approach exception:', directErr); // DEBUG LOG
            return { data: null, error: ticketError };
          }
        }
        
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

        console.log('DEBUG: Attachment data to insert:', attachmentData); // DEBUG LOG

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
      }, creatorId);

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
          }, userId);
        }

        // Create activity for assignment change
        if (updates.assignee_id && updates.assignee_id !== currentTicket.assignee_id) {
          await this.createActivity({
            ticket_id: ticketId,
            activity_type: ActivityType.ASSIGNMENT,
            content: `Assigned to user ${updates.assignee_id}`,
            metadata: { old_assignee: currentTicket.assignee_id, new_assignee: updates.assignee_id }
          }, userId);
        }

        // Create activity for priority change
        if (updates.priority && updates.priority !== currentTicket.priority) {
          await this.createActivity({
            ticket_id: ticketId,
            activity_type: ActivityType.EDIT,
            content: `Priority changed from ${currentTicket.priority} to ${updates.priority}`,
            metadata: { old_priority: currentTicket.priority, new_priority: updates.priority }
          }, userId);
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
      const queries = [];

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

  // Send mobile notification for ticket status changes
  static async sendTicketNotification(ticket: Ticket, action: 'created' | 'updated' | 'assigned' | 'resolved' | 'closed', assignedTo?: string): Promise<void> {
    try {
      const notificationService = CapacitorNotificationService.getInstance();
      
      const actionMessages = {
        created: 'Nuevo ticket creado',
        updated: 'Ticket actualizado',
        assigned: 'Ticket asignado',
        resolved: 'Ticket resuelto',
        closed: 'Ticket cerrado'
      };
      
      const priorityEmojis = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        urgent: '🔴'
      };
      
      const notification = {
        id: `ticket-${ticket.id}-${action}-${Date.now()}`,
        title: `${priorityEmojis[ticket.priority]} ${actionMessages[action]} - Diamond Link`,
        body: `${ticket.title}${assignedTo ? ` - Asignado a: ${assignedTo}` : ''}`,
        icon: '/Logo.svg',
        tag: `ticket-${ticket.id}`,
        data: {
          ticketId: ticket.id,
          action,
          priority: ticket.priority,
          url: `/tickets?id=${ticket.id}`
        }
      };

      // Send immediate notification
      await notificationService.sendLocalNotification(notification);
      
      console.log(`🎫 Ticket ${action} notification sent:`, ticket.title);
    } catch (error) {
      console.error('❌ Failed to send ticket notification:', error);
    }
  }

  // Schedule reminder for high-priority tickets
  static async scheduleTicketReminder(ticket: Ticket, reminderMinutes: number = 30): Promise<boolean> {
    try {
      const notificationService = CapacitorNotificationService.getInstance();
      
      // Only schedule reminders for high/urgent priority tickets
      if (ticket.priority !== TicketPriority.HIGH && ticket.priority !== TicketPriority.URGENT) {
        console.log('⚠️ Ticket priority too low for reminder scheduling');
        return false;
      }
      
      // Calculate reminder time (if ticket has due_date)
      if (!ticket.due_date) {
        console.log('⚠️ Ticket has no due date for reminder scheduling');
        return false;
      }
      
      const dueDate = new Date(ticket.due_date);
      const reminderDate = new Date(dueDate.getTime() - reminderMinutes * 60 * 1000);
      
      // Only schedule if reminder date is in the future
      if (reminderDate > new Date()) {
        const ticketNotification = {
          id: `ticket-reminder-${ticket.id}`,
          title: `🔴 Recordatorio de Ticket - Diamond Link`,
          body: `Ticket "${ticket.title}" vence en ${reminderMinutes} minutos`,
          scheduledDate: reminderDate,
          appointmentId: `ticket-${ticket.id}`
        };

        const scheduled = await notificationService.scheduleAppointmentReminder(ticketNotification);
        
        if (scheduled) {
          console.log('✅ Ticket reminder scheduled:', ticket.title);
        }
        
        return scheduled;
      } else {
        console.log('⚠️ Ticket due date is too soon to schedule reminder');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to schedule ticket reminder:', error);
      return false;
    }
  }

  // Cancel ticket reminder
  static async cancelTicketReminder(ticketId: string): Promise<boolean> {
    try {
      const notificationService = CapacitorNotificationService.getInstance();
      const cancelled = await notificationService.cancelNotification(`ticket-reminder-${ticketId}`);
      
      if (cancelled) {
        console.log('✅ Ticket reminder cancelled:', ticketId);
      }
      
      return cancelled;
    } catch (error) {
      console.error('❌ Failed to cancel ticket reminder:', error);
      return false;
    }
  }

  // Send bulk notifications for ticket assignments
  static async sendBulkTicketNotifications(tickets: Ticket[], action: 'assigned' | 'updated'): Promise<void> {
    try {
      const notificationService = CapacitorNotificationService.getInstance();
      
      const actionMessages = {
        assigned: 'Tickets asignados',
        updated: 'Tickets actualizados'
      };
      
      const notification = {
        id: `bulk-tickets-${action}-${Date.now()}`,
        title: `${tickets.length} ${actionMessages[action]} - Diamond Link`,
        body: `Se han ${action === 'assigned' ? 'asignado' : 'actualizado'} ${tickets.length} tickets`,
        icon: '/Logo.svg',
        tag: `bulk-tickets-${action}`,
        data: {
          ticketIds: tickets.map(t => t.id),
          action,
          url: '/tickets'
        }
      };

      // Send bulk notification
      await notificationService.sendLocalNotification(notification);
      
      console.log(`📫 Bulk ticket ${action} notification sent for ${tickets.length} tickets`);
    } catch (error) {
      console.error('❌ Failed to send bulk ticket notification:', error);
    }
  }
}
