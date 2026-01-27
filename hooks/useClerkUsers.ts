'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export interface ClerkUser {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  profileImageUrl?: string;
  role?: string;
}

export function useClerkUsers() {
  const { user } = useUser();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Check if current user is admin
        if (!user?.id || user?.publicMetadata?.role !== 'admin') {
          console.log('User is not admin, skipping user fetch');
          setLoading(false);
          return;
        }

        console.log('Fetching doctor users from API...');
        
        // Use the real API endpoint
        const response = await fetch('/api/admin/doctor-users');
        
        if (response.status === 401) {
          console.log('Authentication failed, user may need to sign in again');
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to load doctor users`);
        }
        
        const data = await response.json();
        console.log('Doctor users loaded successfully:', data.users?.length || 0);
        setUsers(data.users || []);
      } catch (error) {
        console.error('Error fetching doctor users:', error);
        // Only show alert for network errors, not auth errors
        if (!error.message.includes('401')) {
          console.error('Network error loading users:', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  return { users, loading };
}
