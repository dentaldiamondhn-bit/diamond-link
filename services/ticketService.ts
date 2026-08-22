import { Ticket, TicketActivity, CreateTicketData, UpdateTicketData, CreateActivityData, TicketFilters, TicketStatus, ActivityType, TicketPriority } from '@/types/ticket';
import { supabase } from '@/lib/supabase';
import { checkPermission, requirePermission, Permission } from '@/lib/rbac';
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_CHANGE_CONTENT, PRIORITY_CHANGE_CONTENT, ASSIGNMENT_CONTENT } from '@/lib/ticketLabels';

// Helper function to batch-fetch users for multiple tickets at once
const enrichTicketsWithUsers = async (tickets: any[]) => {
  const userIds = new Set<string>();
  for (const ticket of tickets) {
    if (ticket.creator_id) userIds.add(ticket.creator_id);
    if (ticket.assignees) {
      for (const a of ticket.assignees) {
        if (a.user_id) userIds.add(a.user_id);
      }
    }
    if (ticket.activities) {
      for (const act of ticket.activities) {
        if (act.user_id) userIds.add(act.user_id);
      }
    }
  }
  if (userIds.size === 0) return tickets;

  const ids = [...userIds];
  let userMap: Record<string, any> = {};
  try {
    const response = await fetch(`/api/users?ids=${ids.join(',')}`);
    if (response.ok) {
      const users = await response.json();
      if (Array.isArray(users)) {
        for (const u of users) userMap[u.id] = u;
      } else if (users && typeof users === 'object') {
        userMap = users;
      }
    }
  } catch (error) {
    console.error('Error batch-fetching users:', error);
  }

  for (const ticket of tickets) {
    if (ticket.creator_id) ticket.creator = userMap[ticket.creator_id] || null;
    if (ticket.assignees) {
      for (const a of ticket.assignees) {
        if (a.user_id) a.user = userMap[a.user_id] || null;
      }
    }
    if (ticket.activities) {
      for (const act of ticket.activities) {
        if (act.user_id) act.user = userMap[act.user_id] || null;
      }
    }
  }
  return tickets;
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
      .order('ticket_number', { ascending: false });
    
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

// Re-export for callers expecting the singular function name
const enrichTicketWithUsers = async (ticket: any) => {
  const result = await enrichTicketsWithUsers([ticket]);
  return result[0];
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
            file_url,
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
        // Enrich tickets with user data (batched — single API call)
        const enrichedTickets = await enrichTicketsWithUsers(data);
        
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
            file_url,
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
          file_url: attachment.file_url,
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
        content: `Ticket creado con estado: ${STATUS_LABELS[TicketStatus.OPEN]}`,
        metadata: { old_status: null, new_status: TicketStatus.OPEN }
      }, creatorId);

      // Notify assignees
      if (assignee_ids && assignee_ids.length > 0) {
        for (const assigneeId of assignee_ids) {
          try {
            await fetch('/api/notifications/send-to-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: assigneeId,
                notification: {
                  type: 'ticket_assigned',
                  title: 'Nuevo ticket asignado',
                  message: `Se te ha asignado el ticket: ${ticketData.title}`,
                  metadata: {
                    ticketId: ticket.id,
                    ticketTitle: ticketData.title,
                    ticketPriority: ticketData.priority,
                    ticketNumber: ticket_number,
                  }
                }
              }),
            });
          } catch (notifErr) {
            console.error('Failed to notify ticket assignee:', notifErr);
          }
        }
      }

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
            content: STATUS_CHANGE_CONTENT(currentTicket.status, updates.status),
            metadata: { old_status: currentTicket.status, new_status: updates.status }
          }, userId);

          // Notify relevant users on status change
          const ticketUsers = await this.getTicketUserIds(ticketId, currentTicket.creator_id, userId);
          const statusLabel = STATUS_LABELS[updates.status] || updates.status;
          for (const uid of ticketUsers) {
            try {
              await fetch('/api/notifications/send-to-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: uid,
                  notification: {
                    type: 'ticket_status_changed',
                    title: 'Estado del ticket actualizado',
                    message: `El ticket "${data.title}" cambió a estado: ${statusLabel}`,
                    metadata: { ticketId, ticketTitle: data.title, newStatus: updates.status }
                  }
                }),
              });
            } catch (notifErr) {
              console.error('Failed to notify user on status change:', notifErr);
            }
          }
        }

        // Create activity for assignment change
        if (updates.assignee_id && updates.assignee_id !== currentTicket.assignee_id) {
          await this.createActivity({
            ticket_id: ticketId,
            activity_type: ActivityType.ASSIGNMENT,
            content: `Asignado a usuario ${updates.assignee_id}`,
            metadata: { old_assignee: currentTicket.assignee_id, new_assignee: updates.assignee_id }
          }, userId);
          // Notify new assignee
          try {
            await fetch('/api/notifications/send-to-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: updates.assignee_id,
                notification: {
                  type: 'ticket_assigned',
                  title: 'Ticket re-asignado',
                  message: `Se te ha asignado el ticket: ${data.title}`,
                  metadata: { ticketId, ticketTitle: data.title }
                }
              }),
            });
          } catch (notifErr) {
            console.error('Failed to notify new ticket assignee:', notifErr);
          }
        }

        // Create activity for priority change
        if (updates.priority && updates.priority !== currentTicket.priority) {
          await this.createActivity({
            ticket_id: ticketId,
            activity_type: ActivityType.EDIT,
            content: PRIORITY_CHANGE_CONTENT(currentTicket.priority, updates.priority),
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
      const result = await this.createActivity({
        ticket_id: ticketId,
        activity_type: ActivityType.COMMENT,
        content,
        metadata: { is_comment: true }
      }, userId);

      // Notify ticket users about the comment
      const { data: ticket } = await supabase.from('tickets').select('title, creator_id').eq('id', ticketId).single();
      if (ticket) {
        const ticketUsers = await this.getTicketUserIds(ticketId, ticket.creator_id, userId);
        for (const uid of ticketUsers) {
          try {
            await fetch('/api/notifications/send-to-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: uid,
                notification: {
                  type: 'ticket_comment',
                  title: 'Nuevo comentario en ticket',
                  message: `Nuevo comentario en el ticket "${ticket.title}"`,
                  metadata: { ticketId, ticketTitle: ticket.title }
                }
              }),
            });
          } catch (notifErr) {
            console.error('Failed to notify user on comment:', notifErr);
          }
        }
      }

      return result;
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

  // Get all user IDs related to a ticket (creator + assignees), excluding the actor
  static async getTicketUserIds(ticketId: string, creatorId: string, actorId: string): Promise<string[]> {
    const userIds = new Set<string>();
    if (creatorId && creatorId !== actorId) userIds.add(creatorId);
    try {
      const { data: assignees } = await supabase
        .from('ticket_assignees')
        .select('user_id')
        .eq('ticket_id', ticketId);
      if (assignees) {
        for (const a of assignees) {
          if (a.user_id && a.user_id !== actorId) userIds.add(a.user_id);
        }
      }
    } catch (e) {
      console.error('Error fetching ticket assignees for notifications:', e);
    }
    return [...userIds];
  }

  // Reassign ticket to new set of users
  static async reassignTicket(ticketId: string, newAssigneeIds: string[], userId: string): Promise<{ data: Ticket | null; error: any }> {
    try {
      // Fetch current assignees
      const { data: currentAssigneeRows } = await supabase
        .from('ticket_assignees')
        .select('user_id')
        .eq('ticket_id', ticketId);
      const oldAssigneeIds = (currentAssigneeRows || []).map((a: any) => a.user_id).sort();
      const sortedNew = [...newAssigneeIds].sort();

      // Only proceed if actually changed
      if (JSON.stringify(oldAssigneeIds) === JSON.stringify(sortedNew)) {
        const { data } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
        return { data, error: null };
      }

      // Remove old assignees
      await supabase.from('ticket_assignees').delete().eq('ticket_id', ticketId);

      // Insert new assignees
      if (newAssigneeIds.length > 0) {
        const assigneeData = newAssigneeIds.map(uid => ({
          ticket_id: ticketId,
          user_id: uid,
          assigned_by: userId
        }));
        await supabase.from('ticket_assignees').insert(assigneeData);
      }

      // Fetch ticket title for activity/notification
      const { data: ticket } = await supabase.from('tickets').select('title').eq('id', ticketId).single();
      const ticketTitle = ticket?.title || 'Ticket';

      // Create activity
      await this.createActivity({
        ticket_id: ticketId,
        activity_type: ActivityType.ASSIGNMENT,
        content: `Ticket re-asignado`,
        metadata: { old_assignees: oldAssigneeIds, new_assignees: newAssigneeIds }
      }, userId);

      // Notify new assignees
      for (const assigneeId of newAssigneeIds) {
        try {
          await fetch('/api/notifications/send-to-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: assigneeId,
              notification: {
                type: 'ticket_assigned',
                title: 'Ticket re-asignado',
                message: `Se te ha asignado el ticket: ${ticketTitle}`,
                metadata: { ticketId, ticketTitle }
              }
            }),
          });
        } catch (notifErr) {
          console.error('Failed to notify new ticket assignee:', notifErr);
        }
      }

      const { data: updatedTicket } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      return { data: updatedTicket, error: null };
    } catch (error) {
      console.error('Error reassigning ticket:', error);
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
