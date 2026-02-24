// Database Enums
export enum UserRole {
  STAFF = 'STAFF',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
  TECH_SUPPORT = 'TECH_SUPPORT'
}

export enum TicketType {
  SYSTEM_ISSUE = 'SYSTEM_ISSUE',
  IMPLEMENTATION = 'IMPLEMENTATION',
  TASK = 'TASK',
  REMINDER = 'REMINDER'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum ActivityType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  COMMENT = 'COMMENT',
  ASSIGNMENT = 'ASSIGNMENT',
  EDIT = 'EDIT',
  CREATION = 'CREATION'
}

// Database Tables
export interface User {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  department?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  due_date?: string;
  is_reminder: boolean;
  system_impact?: string;
  module_affected?: string;
  creator_id: string;
  assignee_id?: string;
  department?: string;
  created_at: string;
  updated_at: string;
  
  // Relations (populated)
  creator?: User;
  assignee?: User;
  activities?: TicketActivity[];
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  user_id: string;
  type: ActivityType;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
  
  // Relations (populated)
  user?: User;
  ticket?: Ticket;
}

// Extended Types for Frontend
export interface TicketWithRelations extends Ticket {
  creator: User;
  assignee?: User;
  activities: (TicketActivity & { user: User })[];
  _count?: {
    activities: number;
  };
}

export interface CreateTicketData {
  title: string;
  description?: string;
  type: TicketType;
  priority: TicketPriority;
  due_date?: string;
  is_reminder?: boolean;
  system_impact?: string;
  module_affected?: string;
  assignee_id?: string;
  department?: string;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  type?: TicketType;
  priority?: TicketPriority;
  status?: TicketStatus;
  due_date?: string;
  is_reminder?: boolean;
  system_impact?: string;
  module_affected?: string;
  assignee_id?: string;
  department?: string;
}

export interface CreateActivityData {
  type: ActivityType;
  content: string;
  metadata?: Record<string, any>;
}

export interface TicketFilters {
  status?: TicketStatus[];
  type?: TicketType[];
  priority?: TicketPriority[];
  assignee_id?: string;
  creator_id?: string;
  department?: string;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

// UI Component Props
export interface TicketCardProps {
  ticket: TicketWithRelations;
  currentUserId: string;
  currentUserRole: UserRole;
  onUpdate?: (ticketId: string, updates: UpdateTicketData) => void;
  onAddComment?: (ticketId: string, comment: string) => void;
  compact?: boolean;
}

export interface TicketTimelineProps {
  activities: (TicketActivity & { user: User })[];
  currentUserId: string;
  currentUserRole: UserRole;
  onAddComment?: (ticketId: string, comment: string) => void;
}

export interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTicket: (data: CreateTicketData) => void;
  currentUserRole: UserRole;
  users?: User[];
}

// Dashboard Types
export interface DashboardStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  overdue: number;
  by_type: Record<TicketType, number>;
  by_priority: Record<TicketPriority, number>;
  by_status: Record<TicketStatus, number>;
}

export interface KanbanColumn {
  id: TicketStatus;
  title: string;
  tickets: TicketWithRelations[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Notification Types
export interface TicketNotification {
  id: string;
  ticket_id: string;
  user_id: string;
  type: 'ASSIGNED' | 'COMMENT' | 'STATUS_CHANGE' | 'DUE_REMINDER';
  message: string;
  read: boolean;
  created_at: string;
}

// Form Validation Types
export interface TicketFormErrors {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  due_date?: string;
  assignee_id?: string;
}

export interface ActivityMetadata {
  old_status?: TicketStatus;
  new_status?: TicketStatus;
  old_assignee?: string;
  new_assignee?: string;
  old_priority?: TicketPriority;
  new_priority?: TicketPriority;
  fields_changed?: string[];
}

// All types are already exported inline above
