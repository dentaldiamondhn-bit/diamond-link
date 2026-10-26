# Diamond Link Calendar System Documentation

## Overview

The Diamond Link calendar system is a comprehensive scheduling and task management solution integrated with Clerk authentication, Supabase backend, and multi-platform notification support (mobile browser, Android tray, and PWA).

## Table of Contents

1. [Architecture](#architecture)
2. [Page Structure & Routing](#page-structure--routing)
3. [Clerk Authentication Integration](#clerk-authentication-integration)
4. [Supabase Database Schema](#supabase-database-schema)
5. [Calendar Events](#calendar-events)
6. [Calendar Tasks](#calendar-tasks)
7. [Calendar Reminders](#calendar-reminders)
8. [Calendar Invitees](#calendar-invitees)
9. [Patient Search Integration](#patient-search-integration)
10. [Real-time Updates](#real-time-updates)
11. [Notification System](#notification-system)
12. [User Roles & Permissions](#user-roles--permissions)
13. [Timezone Handling](#timezone-handling)

---

## Architecture

### Component Structure

```
app/(auth)/calendario/
└── page.tsx                    # Main calendar page with auth wrapper

components/calendar/
├── Calendar.tsx               # Main calendar component with views
├── EventModal.tsx             # Event creation/editing modal
├── TaskModal.tsx              # Task creation/editing modal
├── UserSelect.tsx             # User selection dropdown for invitees
├── UserComponents.tsx         # User avatar and role badge components
└── CalendarNotificationCounter.tsx  # Notification counter display

services/
├── calendarService.ts         # Event CRUD and operations
├── calendarTaskService.ts     # Task CRUD and operations
├── calendarReminderService.ts # Reminder management
├── calendarInviteesService.ts # Invitee management
├── calendarRealtimeService.ts # Real-time Supabase subscriptions
└── capacitorNotificationService.ts # Mobile/PWA notifications

types/
├── calendar.ts                # Event and reminder types
├── calendarTasks.ts           # Task types
└── calendarInvitees.ts        # Invitee types
```

### Data Flow

```
User Action → Component → Service → Supabase → Real-time Update → Notification
```

---

## Page Structure & Routing

### Calendar Page (`app/(auth)/calendario/page.tsx`)

**Location:** `/calendario`

**Purpose:** Main calendar interface accessible to authenticated users

**Key Features:**
- Clerk authentication wrapper
- Role-based access control
- Loading states and error handling
- User role detection from Clerk metadata

**Authentication Flow:**
```typescript
const { user, isLoaded } = useUser();
const [userRole, setUserRole] = useState<string>('staff');

useEffect(() => {
  if (isLoaded && user) {
    const role = user.publicMetadata?.role as string || 'staff';
    setUserRole(role);
  }
}, [user, isLoaded]);
```

**Access Control:**
- Requires authenticated user via Clerk
- Role extracted from `user.publicMetadata.role`
- Default role: 'staff'
- Unauthorized users see error message

---

## Clerk Authentication Integration

### User Identification

**User ID Source:** Clerk user ID (`user.id`)

**Role Extraction:**
```typescript
const role = user.publicMetadata?.role as string || 'staff';
```

**Supported Roles:**
- `admin` - Full system access
- `doctor` - Clinical calendar access
- `staff` - Limited calendar access
- `tech_support` - Technical support access

### Authentication Context

The calendar component receives:
- `userId`: Clerk user ID for database operations
- `userRole`: Role-based permissions and UI rendering

### User Data Integration

**User Information Used:**
- `user.id` - Database operations and permissions
- `user.publicMetadata.role` - Role-based access
- `user.firstName`, `user.lastName` - Display names
- `user.emailAddresses[0].emailAddress` - Contact info

---

## Supabase Database Schema

### Tables

#### `calendar_events`
Stores calendar appointments and events.

**Columns:**
- `id` (UUID, primary key)
- `title` (text)
- `description` (text, optional)
- `start_date` (timestamp with time zone)
- `end_date` (timestamp with time zone)
- `all_day` (boolean, default: false)
- `location` (text, optional)
- `event_type` (enum: appointment, consultation, surgery, follow_up, reminder, other)
- `status` (enum: scheduled, confirmed, cancelled, completed)
- `priority` (enum: low, medium, high)
- `patient_id` (UUID, references pacientes.paciente_id)
- `notes` (text, optional)
- `reminder_minutes` (integer, optional)
- `created_by` (text, references Clerk user ID)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

#### `calendar_tasks`
Stores calendar tasks and to-dos.

**Columns:**
- `id` (UUID, primary key)
- `title` (text)
- `description` (text, optional)
- `due_date` (timestamp with time zone, optional)
- `priority` (enum: low, medium, high)
- `status` (enum: pending, in_progress, completed, cancelled)
- `assigned_to` (text, references Clerk user ID, optional)
- `patient_id` (UUID, references pacientes.paciente_id, optional)
- `event_id` (UUID, references calendar_events.id, optional)
- `category` (enum: admin, clinical, follow_up, documentation, other)
- `tags` (array of text, optional)
- `estimated_duration` (integer, minutes, optional)
- `actual_duration` (integer, minutes, optional)
- `completion_notes` (text, optional)
- `created_by` (text, references Clerk user ID)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)
- `completed_at` (timestamp with time zone, optional)

#### `calendar_reminders`
Stores reminder notifications for events and tasks.

**Columns:**
- `id` (UUID, primary key)
- `item_type` (enum: event, task, reminder)
- `item_id` (UUID, references event/task ID)
- `reminder_time` (timestamp with time zone)
- `sent` (boolean, default: false)
- `minutes_before` (integer, optional)
- `created_at` (timestamp with time zone)

#### `calendar_invitees`
Stores event and task invitees.

**Columns:**
- `id` (UUID, primary key)
- `item_type` (enum: event, task, reminder)
- `item_id` (UUID, references event/task ID)
- `user_id` (text, references Clerk user ID)
- `status` (enum: pending, accepted, declined, tentative)
- `invited_at` (timestamp with time zone)
- `responded_at` (timestamp with time zone, optional)
- `created_by` (text, references Clerk user ID)
- `created_at` (timestamp with time zone)

### Database Functions

#### `get_user_events`
Retrieves events for a specific user within a date range.

**Parameters:**
- `user_id_param` (text) - Clerk user ID
- `start_date_param` (timestamp) - Range start
- `end_date_param` (timestamp) - Range end

**Returns:** Events where user is creator OR invitee

#### `get_user_tasks`
Retrieves tasks for a specific user within a date range.

**Parameters:**
- `user_id_param` (text) - Clerk user ID
- `start_date_param` (timestamp) - Range start
- `end_date_param` (timestamp) - Range end

**Returns:** Tasks where user is creator OR assignee OR invitee

---

## Calendar Events

### Event Types

**Supported Event Types:**
- `appointment` - Regular patient appointments
- `consultation` - Consultation sessions
- `surgery` - Surgical procedures
- `follow_up` - Follow-up appointments
- `reminder` - General reminders
- `other` - Miscellaneous events

### Event Status Flow

```
scheduled → confirmed → completed
    ↓
cancelled
```

### Event Priority Levels

- `high` - Urgent events (red indicator)
- `medium` - Normal priority (orange indicator)
- `low` - Low priority (green indicator)

### Event Operations

**Service:** `CalendarService` (`services/calendarService.ts`)

**Key Methods:**

#### Create Event
```typescript
static async createEvent(eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent>
```

**Example:**
```typescript
const event = await CalendarService.createEvent({
  title: 'Patient Consultation',
  description: 'Initial consultation',
  start_date: '2024-01-15T10:00:00Z',
  end_date: '2024-01-15T11:00:00Z',
  all_day: false,
  event_type: 'consultation',
  status: 'scheduled',
  priority: 'medium',
  patient_id: 'patient-uuid',
  created_by: user.id
});
```

#### Get Events by Date Range
```typescript
static async getEventsByDateRange(startDate: string, endDate: string, userId: string): Promise<CalendarEventWithPatient[]>
```

**Features:**
- Includes patient information via join
- Filters by user (creator or invitee)
- Removes duplicates
- Ordered by start date

#### Get Upcoming Events
```typescript
static async getUpcomingEvents(userId?: string): Promise<CalendarEventWithPatient[]>
```

**Features:**
- Returns events in next 14 days
- Includes events where user is creator OR invitee
- Filters out cancelled events
- Merges and deduplicates results

#### Update Event
```typescript
static async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>
```

**Features:**
- Automatically updates `updated_at` timestamp
- Removes deprecated `doctor_id` field
- Returns updated event with patient info

#### Delete Event
```typescript
static async deleteEvent(id: string): Promise<void>
```

**Cascade Deletion Order:**
1. Delete calendar invitees for this event
2. Delete calendar reminders for this event
3. Delete the event itself

#### Get Event Participants
```typescript
static async getEventParticipants(eventId: string): Promise<any[]>
```

**Returns:**
- Event owner (creator)
- Accepted invitees
- Pending invitees
- User information from `/api/users`

---

## Calendar Tasks

### Task Categories

**Supported Categories:**
- `admin` - Administrative tasks
- `clinical` - Clinical tasks
- `follow_up` - Patient follow-up tasks
- `documentation` - Documentation tasks
- `other` - Miscellaneous tasks

### Task Status Flow

```
pending → in_progress → completed
    ↓
cancelled
```

### Task Priority Levels

- `high` - Urgent tasks
- `medium` - Normal priority
- `low` - Low priority

### Task Operations

**Service:** `CalendarTaskService` (`services/calendarTaskService.ts`)

**Key Methods:**

#### Create Task
```typescript
static async createTask(taskData: Omit<CalendarTask, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarTask>
```

**Example:**
```typescript
const task = await CalendarTaskService.createTask({
  title: 'Review patient records',
  description: 'Review upcoming patient records',
  due_date: '2024-01-15T17:00:00Z',
  priority: 'medium',
  status: 'pending',
  category: 'admin',
  assigned_to: 'user-id',
  created_by: user.id
});
```

#### Get Tasks by Date Range
```typescript
static async getTasksByDateRange(startDate: string, endDate: string, userId: string): Promise<CalendarTaskWithPatient[]>
```

**Features:**
- Uses `get_user_tasks` database function
- Includes patient and linked event information
- Filters by user (creator, assignee, or invitee)
- Removes duplicates

#### Get Tasks by Patient
```typescript
static async getTasksByPatientId(patientId: string): Promise<CalendarTaskWithPatient[]>
```

#### Get Tasks by Assigned User
```typescript
static async getTasksByAssignedUser(userId: string): Promise<CalendarTaskWithPatient[]>
```

#### Update Task
```typescript
static async updateTask(id: string, updates: Partial<CalendarTask>): Promise<CalendarTask>
```

**Auto-features:**
- Updates `updated_at` timestamp
- Auto-sets `completed_at` when status changes to 'completed'

#### Delete Task
```typescript
static async deleteTask(id: string): Promise<void>
```

**Cascade Deletion Order:**
1. Delete calendar invitees for this task
2. Delete calendar reminders for this task
3. Delete the task itself

#### Bulk Update Task Status
```typescript
static async bulkUpdateTaskStatus(taskIds: string[], status: CalendarTask['status']): Promise<void>
```

**Features:**
- Updates multiple tasks at once
- Auto-sets `completed_at` for completed status

---

## Calendar Reminders

### Reminder Types

**Supported Item Types:**
- `event` - Event reminders
- `task` - Task reminders
- `reminder` - Generic reminders

### Reminder Operations

**Service:** `CalendarReminderService` (`services/calendarReminderService.ts`)

**Key Methods:**

#### Check and Create Reminders
```typescript
static async checkAndCreateReminders()
```

**Process:**
1. Fetches upcoming events
2. Checks for existing reminders
3. Creates reminder records if none exist
4. Same process for tasks

#### Create Reminder Record
```typescript
static async createReminderRecord(itemType: 'event' | 'task', itemId: string, itemDateTime: string, reminderMinutes: number)
```

**Features:**
- Calculates reminder time (item time - minutes)
- Only creates if reminder time is in future
- Prevents duplicate reminders
- Stores in `calendar_reminders` table

#### Process Pending Reminders
```typescript
static async processPendingReminders()
```

**Process:**
1. Fetches pending reminders (sent = false, reminder_time <= now)
2. Sends notification for each
3. Marks as sent in database

#### Send Reminder Notification
```typescript
static async sendReminderNotification(reminder: any)
```

**Notification Content:**
- Type: `calendar_reminder`
- Title: "Recordatorio: {item.title}"
- Message: Formatted with time and patient info
- Metadata: Item details and patient information

### Event Reminder Scheduling

**Service:** `CalendarService`

#### Schedule Event Notification
```typescript
static async scheduleEventNotification(event: CalendarEventWithPatient, reminderMinutes: number = 60): Promise<boolean>
```

**Process:**
1. Calculates reminder time
2. Schedules Capacitor local notification
3. Creates database reminder record
4. Returns success status

#### Schedule Multiple Notifications
```typescript
static async scheduleMultipleEventNotifications(event: CalendarEventWithPatient, reminderTimes: number[] = [1440, 60, 15]): Promise<boolean[]>
```

**Default Times:**
- 1440 minutes (1 day before)
- 60 minutes (1 hour before)
- 15 minutes (15 minutes before)

#### Cancel Event Notification
```typescript
static async cancelEventNotification(eventId: string): Promise<boolean>
```

**Process:**
1. Cancels Capacitor notification
2. Marks database reminders as sent/cancelled

---

## Calendar Invitees

### Invitee Status Flow

```
pending → accepted
    ↓
declined
    ↓
tentative
```

### Invitee Operations

**Service:** `CalendarInviteesService` (`services/calendarInviteesService.ts`)

**Key Methods:**

#### Create Invitee
```typescript
static async createInvitee(inviteeData: Omit<CalendarInvitee, 'id' | 'invited_at' | 'created_at'>): Promise<CalendarInvitee>
```

**Example:**
```typescript
const invitee = await CalendarInviteesService.createInvitee({
  item_type: 'event',
  item_id: 'event-uuid',
  user_id: 'user-id',
  status: 'pending',
  created_by: user.id
});
```

#### Get Invitees for Item
```typescript
static async getInviteesForItem(itemType: 'event' | 'task' | 'reminder', itemId: string): Promise<CalendarInviteeWithUser[]>
```

**Features:**
- Fetches invitee records
- Fetches user information from `/api/users`
- Maps user data to invitees
- Returns with full user details

#### Update Invitee Status
```typescript
static async updateInviteeStatus(id: string, status: CalendarInvitee['status']): Promise<CalendarInvitee>
```

**Features:**
- Updates status
- Auto-sets `responded_at` timestamp

#### Delete Invitee
```typescript
static async deleteInvitee(id: string): Promise<void>
```

#### Bulk Operations

**Create Multiple Invitees:**
```typescript
static async createMultipleInvitees(inviteesData: Omit<CalendarInvitee, 'id' | 'invited_at' | 'created_at'>[]): Promise<CalendarInvitee[]>
```

**Delete Invitees for Item:**
```typescript
static async deleteInviteesForItem(itemType: 'event' | 'task' | 'reminder', itemId: string): Promise<void>
```

#### Get All Users
```typescript
static async getAllUsers(): Promise<Array<{id, first_name, last_name, email, role, profileImageUrl}>>
```

**Features:**
- Fetches from `/api/users`
- Returns user list for dropdowns
- Includes profile images

---

## Patient Search Integration

### Patient Association

**Events and Tasks can be linked to patients via:**
- `patient_id` field (UUID referencing `pacientes.paciente_id`)

### Patient Information Retrieved

**When fetching events/tasks with patients:**
```typescript
{
  paciente_id: string;
  nombre_completo: string;
  telefono?: string;
  email?: string;
}
```

### Patient-Specific Operations

**Events by Patient:**
```typescript
static async getEventsByPatientId(patientId: string): Promise<CalendarEventWithPatient[]>
```

**Tasks by Patient:**
```typescript
static async getTasksByPatientId(patientId: string): Promise<CalendarTaskWithPatient[]>
```

### Patient Search in User Selection

**UserSelect Component** (`components/calendar/UserSelect.tsx`)

**Features:**
- Search by name, email, or role
- Real-time filtering
- Avatar display
- Role badge display
- Multi-select support

**Search Logic:**
```typescript
const filteredUsers = users.filter(user => {
  const searchLower = searchQuery.toLowerCase();
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
  const email = (user.email || '').toLowerCase();
  const role = (user.role || '').toLowerCase();
  
  return fullName.includes(searchLower) || 
         email.includes(searchLower) || 
         role.includes(searchLower);
});
```

---

## Real-time Updates

### Real-time Service

**Service:** `calendarRealtimeService` (`services/calendarRealtimeService.ts`)

### Subscribed Tables

1. `calendar_events` - Event changes
2. `calendar_tasks` - Task changes
3. `calendar_reminders` - Reminder changes
4. `calendar_invitees` - Invitee changes

### Subscription Process

**Initialization:**
```typescript
private async initializeRealtime() {
  await this.enableRealtimeForTable('calendar_events');
  await this.enableRealtimeForTable('calendar_tasks');
  await this.enableRealtimeForTable('calendar_reminders');
  await this.enableRealtimeForTable('calendar_invitees');
}
```

### Event Handling

**Database Change Handler:**
```typescript
private async handleDatabaseChange(tableName: string, payload: any) {
  // Convert to notification
  const notification = await this.convertToNotification(tableName, payload);
  
  // Special handling for invitees
  if (tableName === 'calendar_invitees' && eventType === 'INSERT') {
    const inviteeNotification = await this.createInviteeNotification(newRecord);
    await this.notifyListeners(inviteeNotification);
  }
  
  // Notify listeners
  if (notification) {
    await this.notifyListeners(notification);
  }
}
```

### Notification Types

**Event Notifications:**
- `event_created` - New event created
- `event_updated` - Event updated
- `event_deleted` - Event deleted

**Task Notifications:**
- `task_created` - New task created
- `task_updated` - Task updated
- `task_deleted` - Task deleted

**Reminder Notifications:**
- `reminder_created` - New reminder created
- `reminder_updated` - Reminder updated
- `reminder_deleted` - Reminder deleted

**Invitee Notifications:**
- `invitee_added` - User invited to event/task

### Relevant User Detection

**For each notification, the service determines relevant users:**
1. Event creator (`created_by`)
2. Task assignee (`assigned_to`)
3. All invitees from database
4. Patient (if applicable)

**Example:**
```typescript
private async getRelevantUsers(record: any): Promise<string[]> {
  const users = new Set<string>();
  
  // Include creator
  if (record.created_by) {
    users.add(record.created_by);
  }
  
  // Include invitees
  const invitees = await CalendarInviteesService.getInviteesForItem('event', record.id);
  invitees.forEach(invitee => {
    if (invitee.user_id) {
      users.add(invitee.user_id);
    }
  });
  
  return Array.from(users);
}
```

### Calendar Component Integration

**Subscription in Calendar Component:**
```typescript
useEffect(() => {
  // Subscribe to notifications
  const unsubscribeNotifications = calendarRealtimeService.onNotification(async (notification) => {
    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/Logo.svg',
        tag: notification.type
      });
    }
    
    // Send Capacitor notification
    await CapacitorNotificationService.getInstance().sendLocalNotification({
      title: notification.title,
      body: notification.message,
      icon: '/Logo.svg'
    });
    
    // Add to bell notifications
    await addBellNotification({
      type: 'calendar_event',
      title: notification.title,
      message: notification.message
    });
    
    // Reload data
    if (notification.type.includes('event')) {
      loadEvents();
    } else if (notification.type.includes('task')) {
      loadTasks();
    }
  });
  
  // Subscribe to event updates
  const unsubscribeEventUpdates = calendarRealtimeService.onEventUpdate((update) => {
    if (update.table === 'calendar_events') {
      loadEvents();
    } else if (update.table === 'calendar_tasks') {
      loadTasks();
    }
  });
  
  return () => {
    unsubscribeNotifications();
    unsubscribeEventUpdates();
  };
}, [userId]);
```

---

## Notification System

### Multi-Platform Support

The calendar system supports notifications across multiple platforms:

1. **Browser Notifications** - Desktop and mobile web
2. **Capacitor Local Notifications** - Native mobile apps
3. **Capacitor Push Notifications** - Android/iOS push
4. **Bell Notifications** - Android tray notifications
5. **PWA Notifications** - Progressive Web App support

### Notification Services

#### 1. Browser Notifications

**Implementation:** Native Web Notifications API

**Permission Request:**
```typescript
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
```

**Notification Creation:**
```typescript
const browserNotification = new Notification(notification.title, {
  body: notification.message,
  icon: '/Logo.svg',
  badge: '/Logo.svg',
  tag: notification.type,
  requireInteraction: true,
  silent: false,
  timestamp: new Date(eventDate).getTime()
});

// Auto-close after 8 seconds
setTimeout(() => {
  browserNotification.close();
}, 8000);
```

#### 2. Capacitor Local Notifications

**Service:** `CapacitorNotificationService` (`services/capacitorNotificationService.ts`)

**Platform Detection:**
```typescript
isNative(): boolean {
  return Capacitor.isNativePlatform();
}
```

**Schedule Appointment Reminder:**
```typescript
async scheduleAppointmentReminder(appointment: AppointmentNotification): Promise<boolean> {
  if (this.isNative()) {
    await LocalNotifications.schedule({
      notifications: [{
        id: parseInt(appointment.id),
        title: appointment.title,
        body: appointment.body,
        schedule: { at: appointment.scheduledDate },
        sound: 'default',
        smallIcon: 'notification_icon',
        largeIcon: 'notification_icon_large',
        iconColor: '#14b8a6',
        extra: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          appointmentId: appointment.appointmentId,
          type: 'appointment_reminder'
        }
      }]
    });
  } else {
    // Web fallback with setTimeout
    const delay = appointment.scheduledDate.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this.webService.showLocalNotification({...});
      }, delay);
    }
  }
}
```

**Cancel Notification:**
```typescript
async cancelNotification(notificationId: string): Promise<boolean> {
  if (this.isNative()) {
    await LocalNotifications.cancel({
      notifications: [{ id: parseInt(notificationId) }]
    });
  }
}
```

#### 3. Capacitor Push Notifications

**Registration:**
```typescript
async registerForPushNotifications(): Promise<string | null> {
  if (this.isNative()) {
    await PushNotifications.register();
    
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success:', token.value);
        resolve(token.value);
        this.sendPushTokenToBackend(token.value);
      });
      
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        resolve(null);
      });
    });
  }
}
```

**Push Handlers:**
```typescript
async setupPushNotificationHandlers(): Promise<void> {
  // Handle received push notifications
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    this.webService.showLocalNotification({
      title: notification.title || 'Diamond Link',
      body: notification.body || 'Tiene una nueva notificación',
      icon: '/Logo.svg',
      data: notification.data
    });
  });

  // Handle push notification clicks
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    const data = notification.notification.data;
    if (data?.patientId) {
      this.openPatientRecord(data.patientId);
    }
  });
}
```

#### 4. Bell Notifications (Android Tray)

**Integration:** Bell notification context system

**Usage in Calendar:**
```typescript
const { addNotification: addBellNotification } = useBellNotifications();

await addBellNotification({
  type: 'calendar_event',
  title: notification.title,
  message: notification.message,
  metadata: {
    userId: notification.userId,
    eventId: notification.data.item_id,
    eventTitle: notification.data.title,
    eventTime: notification.data.start_date ? new Date(notification.data.start_date) : undefined
  }
});
```

#### 5. PWA Notifications

**Service Worker Integration:**
- Uses Workbox for service worker management
- Supports background sync
- Offline notification queueing
- Push notification support

### Notification Flow

**When a calendar change occurs:**

1. **Database Change Detected** (Supabase realtime)
2. **Real-time Service Processes Change**
3. **Notification Created** with event details
4. **Multi-Platform Dispatch:**
   - Browser notification (if permission granted)
   - Capacitor local notification (if native)
   - Bell notification (Android tray)
   - PWA service worker (if installed)
5. **Auto-Refresh** calendar data
6. **Auto-Close** after 8 seconds

### Notification Content

**Event Created:**
```
Title: "Nueva cita: {event.title}"
Body: "Cita agendada para {patientName} el {date}"
```

**Event Updated:**
```
Title: "Cita actualizada: {event.title}"
Body: "Cita modificada para {patientName} el {date}"
```

**Invitee Added:**
```
Title: "Invitación: {event.title}"
Body: "Has sido invitado a: {event.title} - {date} a las {time}"
```

**Reminder:**
```
Title: "Recordatorio: {item.title}"
Body: "Tu cita/tarea "{item.title}" con {patientName} es en {X} minutos ({date})"
```

---

## User Roles & Permissions

### Role-Based Access Control

**Roles (from Clerk metadata):**
- `admin` - Full system access
- `doctor` - Clinical calendar access
- `staff` - Limited calendar access
- `tech_support` - Technical support access

### Role-Based Features

**Admin:**
- Full calendar access
- Create/edit/delete all events
- Create/edit/delete all tasks
- Invite any user
- Manage reminders
- View all patient data

**Doctor:**
- Clinical calendar access
- Create/edit own events
- Create/edit own tasks
- Invite staff members
- Manage patient appointments
- View assigned patient data

**Staff:**
- Limited calendar access
- View assigned events
- Create/edit own tasks
- View assigned tasks
- Limited patient data access

**Tech Support:**
- Technical support access
- View system events
- Create support tasks
- Limited administrative access

### Role Badge Display

**Component:** `RoleBadge` in `UserComponents.tsx`

**Badge Styles:**
```typescript
const getRoleBadgeInfo = (role: string) => {
  switch (role) {
    case 'admin':
      return {
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        textColor: 'text-purple-700 dark:text-purple-300',
        borderColor: 'border-purple-200 dark:border-purple-700',
        icon: 'fas fa-user-shield',
        label: 'Administrador'
      };
    case 'doctor':
      return {
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
        borderColor: 'border-blue-200 dark:border-blue-700',
        icon: 'fas fa-user-md',
        label: 'Doctor'
      };
    case 'staff':
      return {
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-300',
        borderColor: 'border-green-200 dark:border-green-700',
        icon: 'fas fa-user',
        label: 'Staff'
      };
    default:
      return {
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        textColor: 'text-gray-700 dark:text-gray-300',
        borderColor: 'border-gray-200 dark:border-gray-700',
        icon: 'fas fa-question',
        label: 'Desconocido'
      };
  }
};
```

---

## Timezone Handling

### Timezone Service

**Service:** `SimpleTimezoneFix` (`services/simpleTimezoneFix.ts`)

**Purpose:** Handle timezone conversions for Honduras (America/Tegucigalpa)

### Timezone Configuration

**Default Timezone:** `America/Tegucigalpa` (Honduras)

**Usage in Date Formatting:**
```typescript
const formattedDate = eventDate.toLocaleDateString('es-HN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Tegucigalpa'
});
```

### Event Date Formatting

**Calendar Component:**
```typescript
const formatEventDate = (dateString: string): Date => {
  try {
    const utcDate = new Date(dateString);
    // Convert UTC to local time using timezone fix
    return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
  } catch (error) {
    console.error('Error formatting event date:', error);
    return new Date(dateString);
  }
};
```

### Reminder Time Calculation

**Calendar Reminder Service:**
```typescript
const itemDate = new Date(itemDateTime);
const reminderTime = new Date(itemDate.getTime() - reminderMinutes * 60000);
```

### Date Range Filtering

**Upcoming Events:**
```typescript
const nowLocal = new Date();
const startOfTodayLocal = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());
const startOfTodayUTC = startOfTodayLocal.toISOString();

const nextWeekLocal = new Date();
nextWeekLocal.setDate(nextWeekLocal.getDate() + 14);
const nextWeekUTC = nextWeekLocal.toISOString();
```

---

## Calendar Views

### Month View

**Features:**
- 7-column grid (Sunday-Saturday)
- Event dots with color coding
- Task indicators with clock icons
- Priority indicators
- "X more" for overflow
- Today highlighting
- Current month vs other months

### Week View

**Features:**
- 7-day horizontal layout
- Hourly time slots (00:00-23:00)
- Event blocks with duration
- Task blocks with status
- Current day highlighting
- Time-based positioning

### Day View

**Features:**
- Single day focus
- Hourly time slots
- Detailed event information
- Patient information display
- Priority indicators
- Task completion status

### View Navigation

**Navigation Controls:**
- Previous/Next buttons
- Today button
- View switcher (Month/Week/Day)
- Date range display

---

## API Routes

### Calendar Events API

**Location:** `app/api/calendar/events/route.ts`

**Endpoints:**
- `GET /api/calendar/events` - Get events with filters
- `POST /api/calendar/events` - Create event
- `PUT /api/calendar/events/[id]` - Update event
- `DELETE /api/calendar/events/[id]` - Delete event

### Calendar Tasks API

**Location:** `app/api/calendar/tasks/route.ts`

**Endpoints:**
- `GET /api/calendar/tasks` - Get tasks with filters
- `POST /api/calendar/tasks` - Create task
- `PUT /api/calendar/tasks/[id]` - Update task
- `DELETE /api/calendar/tasks/[id]` - Delete task

---

## Database Migrations

### Key Migration Files

**Calendar Tables Creation:**
- `database/migrations/create_calendar_tables.sql`

**Reminder Updates:**
- `database/migrations/update_calendar_reminders_table.sql`
- `supabase/migrations/add_reminder_minutes_to_calendar_events.sql`

**Real-time Enablement:**
- `database/migrations/enable_calendar_realtime.sql`

**RLS Policies:**
- `database/migrations/calendar_reminders_rls_policy.sql`

---

## Error Handling

### Service-Level Error Handling

**Pattern:**
```typescript
try {
  const { data, error } = await supabase.from('table').select('*');
  
  if (error) {
    console.error('Error description:', error);
    throw error;
  }
  
  return data || [];
} catch (error) {
  console.error('Unexpected error:', error);
  throw error;
}
```

### Component-Level Error Handling

**Loading States:**
```typescript
if (loading) {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

**Error States:**
```typescript
if (!user) {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-red-600 text-center">
        <p className="text-lg font-semibold">No autorizado</p>
        <p className="text-sm text-gray-600">Por favor inicia sesión</p>
      </div>
    </div>
  );
}
```

---

## Performance Optimizations

### Data Fetching

**Date Range Filtering:**
- Only fetch data for visible date range
- Month view: Current month only
- Week view: Current week only
- Day view: Current day only

**Duplicate Removal:**
```typescript
const uniqueEvents = events.filter((event, index, self) => 
  index === self.findIndex((e) => e.id === event.id)
);
```

### Real-time Optimization

**Selective Refresh:**
- Only refresh events on event-related changes
- Only refresh tasks on task-related changes
- Debounce rapid updates

### Notification Optimization

**Auto-Close:**
- Browser notifications close after 8 seconds
- Prevents notification buildup

**Permission Caching:**
- Check permission once per session
- Request only if not granted

---

## Security Considerations

### Row-Level Security (RLS)

**Supabase RLS Policies:**
- Users can only see their own events (as creator)
- Users can see events they're invited to
- Users can only edit their own events
- Admin users have full access

### Clerk Authentication

**Protected Routes:**
- All calendar routes require authentication
- User ID validated on each request
- Role-based access control enforced

### Data Validation

**Input Validation:**
- Date/time format validation
- Enum value validation
- Required field validation
- Foreign key validation

---

## Future Enhancements

### Planned Features

1. **Recurring Events** - Daily, weekly, monthly recurrence
2. **Event Templates** - Pre-defined event types
3. **Calendar Sync** - Google Calendar, Outlook integration
4. **Video Conferencing** - Zoom, Teams integration
5. **SMS Reminders** - Text message reminders
6. **Calendar Export** - ICS export functionality
7. **Advanced Filtering** - Complex filter combinations
8. **Calendar Sharing** - Public calendar links
9. **Mobile App** - Native iOS/Android app
10. **Offline Support** - Full offline calendar access

---

## Troubleshooting

### Common Issues

**Notifications Not Showing:**
1. Check browser permission settings
2. Verify Capacitor plugin installation
3. Check notification service initialization
4. Review console for errors

**Real-time Updates Not Working:**
1. Verify Supabase realtime enabled
2. Check table replication settings
3. Review subscription status in console
4. Ensure user has proper permissions

**Timezone Issues:**
1. Verify system timezone settings
2. Check `SimpleTimezoneFix` implementation
3. Review date formatting logic
4. Test with different timezone users

**Invitee Notifications Not Received:**
1. Check invitee user ID is correct
2. Verify realtime subscription to `calendar_invitees`
3. Review notification dispatch logic
4. Check user notification preferences

---

## Support & Maintenance

### Monitoring

**Key Metrics to Monitor:**
- Notification delivery rate
- Real-time connection status
- Database query performance
- User engagement metrics

### Logging

**Console Logging:**
- Service initialization
- Database operations
- Notification dispatch
- Error conditions

**Log Levels:**
- `console.log` - Normal operations
- `console.warn` - Non-critical issues
- `console.error` - Critical errors

### Backup Strategy

**Database Backups:**
- Daily automated backups
- Point-in-time recovery
- Export functionality for critical data

---

## Conclusion

The Diamond Link calendar system provides a comprehensive scheduling solution with multi-platform notifications, real-time updates, and robust integration with Clerk authentication and Supabase backend. The system is designed to scale and support future enhancements while maintaining security and performance.

For questions or issues, refer to the troubleshooting section or contact the development team.
