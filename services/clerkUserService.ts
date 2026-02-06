import { useUser } from '@clerk/nextjs';

export interface ClerkUser {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  imageUrl?: string;
  publicMetadata?: any;
}

/**
 * Clerk User Service for chat system integration
 */
export class ClerkUserService {
  /**
   * Get all users in the organization
   */
  static async getAllUsers(): Promise<ClerkUser[]> {
    try {
      console.log('Fetching all users from /api/chat/users');
      const response = await fetch('/api/chat/users');
      if (!response.ok) {
        console.error('Failed to fetch users, status:', response.status);
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Users fetched successfully:', data.users?.length || 0, 'users');
      return data.users || [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  /**
   * Get user by email address
   */
  static async getUserByEmail(email: string): Promise<ClerkUser | null> {
    try {
      const users = await this.getAllUsers();
      return users.find(user => 
        user.emailAddress?.toLowerCase() === email.toLowerCase()
      ) || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: string): Promise<ClerkUser[]> {
    try {
      const users = await this.getAllUsers();
      return users.filter(user => user.publicMetadata?.role === role);
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  /**
   * Search users by name or email
   */
  static async searchUsers(query: string): Promise<ClerkUser[]> {
    try {
      const users = await this.getAllUsers();
      return users.filter(user =>
        user.emailAddress?.toLowerCase().includes(query.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<ClerkUser | null> {
    try {
      console.log('Getting user by ID:', userId);
      const users = await this.getAllUsers();
      const user = users.find(user => user.id === userId);
      console.log('User found for ID', userId, ':', user ? user.firstName || user.emailAddress : 'Not found');
      return user || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Get user display name
   */
  static getUserDisplayName(user: ClerkUser): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.emailAddress || 'Unknown User';
  }
}
