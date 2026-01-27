'use client';

import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useUserRole, UserRole } from '../../../../hooks/useUserRole';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  lastSignInAt?: string;
  createdAt: string;
  profileImageUrl?: string;
  banned: boolean;
  locked: boolean;
}

export default function UserAdministration() {
  const { user: currentUser } = useUser();
  const { userRole, isLoaded } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'staff' as UserRole
  });

  // Check if current user is admin
  const isAdmin = userRole === 'admin' && isLoaded;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAdmin) {
      // Redirect or show access denied
      console.log('User is not admin or not loaded, skipping user fetch');
      return;
    }
    console.log('User is admin, loading users...');
    loadUsers();
  }, [isLoaded, isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users from API...');
      const response = await fetch('/api/admin/users');
      
      if (response.status === 401) {
        console.log('Authentication failed, user may need to sign in again');
        // Don't throw error for 401, just log it
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load users`);
      }
      
      const data = await response.json();
      console.log('Users loaded successfully:', data.users?.length || 0);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      // Only show alert for network errors, not auth errors
      if (!error.message.includes('401')) {
        alert('Error loading users: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      console.log('Updating user role:', { userId, newRole, currentUserRole: userRole, isAdmin, currentUserId: currentUser?.id });
      setUpdatingRole(userId);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateRole',
          targetUserId: userId,
          newRole
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API response error:', errorData);
        throw new Error(errorData.error || 'Failed to update role');
      }

      const data = await response.json();
      console.log('API response success:', data);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      // Reload users from server to ensure consistency
      await loadUsers();

      // Show success message
      alert(data.message || 'Role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const updateUserStatus = async (userId: string, action: 'ban' | 'unban' | 'lock' | 'unlock') => {
    try {
      setUpdatingStatus(userId);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          targetUserId: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      const data = await response.json();

      // Update local state
      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          switch (action) {
            case 'ban':
              return { ...user, banned: true };
            case 'unban':
              return { ...user, banned: false };
            case 'lock':
              return { ...user, locked: true };
            case 'unlock':
              return { ...user, locked: false };
          }
        }
        return user;
      }));

      // Show success message
      alert(data.message || 'User status updated successfully');
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const resetUserPassword = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to send a password reset email to ${userEmail}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resetPassword',
          targetUserId: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      const data = await response.json();
      alert(`Password reset email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteUser',
          targetUserId: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      const data = await response.json();
      
      // Remove user from local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      alert(`User "${userName}" has been deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const impersonateUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to impersonate user "${userName}"? This will log you in as this user.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'impersonate',
          targetUserId: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create impersonation token');
      }

      const data = await response.json();
      
      if (data.success) {
        // Open impersonation in new tab
        const impersonationUrl = `${window.location.origin}?__clerk_impersonation=${data.token.token}`;
        window.open(impersonationUrl, '_blank');
        alert(`Impersonation session created for "${userName}". Check the new tab.`);
      } else {
        alert(data.message || 'Impersonation not available');
      }
    } catch (error) {
      console.error('Error creating impersonation:', error);
      alert('Error creating impersonation');
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.firstName || !newUser.lastName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setCreatingUser(true);
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const data = await response.json();
      
      // Reset form
      setNewUser({
        email: '',
        firstName: '',
        lastName: '',
        role: 'staff'
      });
      setShowCreateForm(false);
      
      // Reload users
      await loadUsers();
      
      alert(`Invitation sent to "${data.user.firstName} ${data.user.lastName}" at ${data.user.email}`);
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setCreatingUser(false);
    }
  };

  const bulkUpdateUsers = async (action: string, targetRole?: UserRole) => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    const confirmMessage = action === 'updateRole' 
      ? `Are you sure you want to change the role of ${selectedUsers.length} user(s) to ${targetRole}?`
      : `Are you sure you want to ${action} ${selectedUsers.length} user(s)?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setBulkUpdating(true);
      
      // Process users one by one to avoid overwhelming the API
      for (const userId of selectedUsers) {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            targetUserId: userId,
            ...(targetRole && { newRole: targetRole })
          })
        });

        if (!response.ok) {
          console.error(`Failed to ${action} user ${userId}`);
        }
      }

      // Clear selection and reload
      setSelectedUsers([]);
      await loadUsers();
      
      alert(`Successfully ${action} ${selectedUsers.length} user(s)`);
    } catch (error) {
      console.error('Error in bulk operation:', error);
      alert('Error performing bulk operation');
    } finally {
      setBulkUpdating(false);
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Status', 'Last Sign In', 'Created At'],
      ...filteredUsers.map(user => [
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.role,
        user.banned ? 'Banned' : user.locked ? 'Locked' : 'Active',
        user.lastSignInAt || 'Never',
        user.createdAt
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !user.banned && !user.locked) ||
      (statusFilter === 'inactive' && (user.banned || user.locked));
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
      case 'doctor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'staff':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusBadgeColor = (user: User) => {
    if (user.banned) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
    if (user.locked) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-700';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to access user administration.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                <i className="fas fa-users-cog mr-3 text-teal-600"></i>
                User Administration
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage user roles, permissions, and access status
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center"
            >
              <i className="fas fa-user-plus mr-2"></i>
              Create User
            </button>
            <button
              onClick={exportUsers}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
            >
              <i className="fas fa-download mr-2"></i>
              Export CSV
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <i className="fas fa-check-square text-blue-600 dark:text-blue-400 mr-2"></i>
                <span className="text-blue-800 dark:text-blue-200 font-medium">
                  {selectedUsers.length} user(s) selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      bulkUpdateUsers('updateRole', e.target.value as UserRole);
                      e.target.value = '';
                    }
                  }}
                  disabled={bulkUpdating}
                  className="text-sm border border-blue-300 dark:border-blue-600 rounded px-2 py-1 bg-white dark:bg-blue-800 text-blue-900 dark:text-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Change Role To...</option>
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="staff">Staff</option>
                </select>
                <button
                  onClick={() => bulkUpdateUsers('ban')}
                  disabled={bulkUpdating}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-ban mr-1"></i>
                  Ban
                </button>
                <button
                  onClick={() => bulkUpdateUsers('unban')}
                  disabled={bulkUpdating}
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-unlock mr-1"></i>
                  Unban
                </button>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-user-plus mr-2 text-teal-600"></i>
              Create New User
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <i className="fas fa-info-circle mr-2"></i>
                The new user will receive an invitation email to set up their password and complete registration.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="staff">Staff</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewUser({
                    email: '',
                    firstName: '',
                    lastName: '',
                    role: 'staff'
                  });
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                disabled={creatingUser}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {creatingUser ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-envelope mr-2"></i>
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Users
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(filteredUsers.map(user => user.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Sign In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.id === currentUser?.id ? (
                            <>
                              <UserButton
                                appearance={{
                                  elements: {
                                    avatarBox: "h-10 w-10"
                                  }
                                }}
                              />
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center">
                              <img
                                className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                                src={user.profileImageUrl}
                                alt={`${user.firstName} ${user.lastName}`}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                              <div 
                                className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-medium shadow-sm"
                                style={{ display: user.profileImageUrl ? 'none' : 'flex' }}
                              >
                                <span className="text-sm">
                                  {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          <i className={`fas ${
                            user.role === 'admin' ? 'fa-crown' :
                            user.role === 'doctor' ? 'fa-user-md' : 'fa-user-tie'
                          } mr-1`}></i>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(user)}`}>
                          <i className={`fas ${
                            user.banned ? 'fa-ban' :
                            user.locked ? 'fa-lock' : 'fa-check-circle'
                          } mr-1`}></i>
                          {user.banned ? 'Banned' : user.locked ? 'Locked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.lastSignInAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* Role Change */}
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                            disabled={updatingRole === user.id || user.id === currentUser?.id}
                            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                          >
                            <option value="admin">Admin</option>
                            <option value="doctor">Doctor</option>
                            <option value="staff">Staff</option>
                          </select>

                          {/* Status Actions */}
                          <div className="flex items-center space-x-1">
                            {user.banned ? (
                              <button
                                onClick={() => updateUserStatus(user.id, 'unban')}
                                disabled={updatingStatus === user.id}
                                className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                title="Unban User"
                              >
                                <i className="fas fa-unlock text-xs"></i>
                              </button>
                            ) : (
                              <button
                                onClick={() => updateUserStatus(user.id, 'ban')}
                                disabled={updatingStatus === user.id}
                                className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                title="Ban User"
                              >
                                <i className="fas fa-ban text-xs"></i>
                              </button>
                            )}

                            {user.locked ? (
                              <button
                                onClick={() => updateUserStatus(user.id, 'unlock')}
                                disabled={updatingStatus === user.id}
                                className="p-1 text-orange-600 hover:text-orange-800 disabled:opacity-50"
                                title="Unlock User"
                              >
                                <i className="fas fa-unlock text-xs"></i>
                              </button>
                            ) : (
                              <button
                                onClick={() => updateUserStatus(user.id, 'lock')}
                                disabled={updatingStatus === user.id}
                                className="p-1 text-orange-600 hover:text-orange-800 disabled:opacity-50"
                                title="Lock User"
                              >
                                <i className="fas fa-lock text-xs"></i>
                              </button>
                            )}
                          </div>

                          {/* Additional Actions */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => resetUserPassword(user.id, user.email)}
                              disabled={user.id === currentUser?.id}
                              className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              title="Reset Password"
                            >
                              <i className="fas fa-key text-xs"></i>
                            </button>

                            <button
                              onClick={() => deleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                              disabled={user.id === currentUser?.id}
                              className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Delete User"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>

                            <button
                              onClick={() => impersonateUser(user.id, `${user.firstName} ${user.lastName}`)}
                              disabled={user.id === currentUser?.id}
                              className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                              title="Impersonate User"
                            >
                              <i className="fas fa-user-secret text-xs"></i>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <i className="fas fa-users-slash text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-500 dark:text-gray-400">
                    No users found matching your criteria
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 dark:bg-red-900 rounded-lg p-3">
                <i className="fas fa-crown text-red-600 dark:text-red-400"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Admins</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                <i className="fas fa-user-md text-blue-600 dark:text-blue-400"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Doctors</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === 'doctor').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-lg p-3">
                <i className="fas fa-user-tie text-green-600 dark:text-green-400"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Staff</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === 'staff').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-100 dark:bg-amber-900 rounded-lg p-3">
                <i className="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inactive</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {users.filter(u => u.banned || u.locked).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
