'use client';
// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { usePagePreferences } from '@/hooks/useUserPreferences';

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

  // Use page preferences for usuarios page
  const { preferences: pagePrefs, updatePreferences: updatePagePrefs, loading: prefsLoading } = usePagePreferences('usuarios');
  
  // Initialize state from preferences or defaults
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(pagePrefs?.viewMode || 'list');
  const [recordsPerPagePref, setRecordsPerPagePref] = useState(pagePrefs?.recordsPerPage || 25);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'status' | 'lastSignIn'>(pagePrefs?.sortBy || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(pagePrefs?.sortOrder || 'asc');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Sync preferences when they load
  useEffect(() => {
    if (pagePrefs && !prefsLoading) {
      if (pagePrefs.viewMode) setViewMode(pagePrefs.viewMode);
      if (pagePrefs.recordsPerPage) setRecordsPerPagePref(pagePrefs.recordsPerPage);
      if (pagePrefs.sortBy) setSortBy(pagePrefs.sortBy);
      if (pagePrefs.sortOrder) setSortOrder(pagePrefs.sortOrder);
    }
  }, [pagePrefs, prefsLoading]);

  // Save viewMode preference with debounce
  useEffect(() => {
    if (!prefsLoading && viewMode !== (pagePrefs?.viewMode || 'list')) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ viewMode });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [viewMode, prefsLoading, pagePrefs?.viewMode, updatePagePrefs]);

  // Save recordsPerPage preference with debounce
  useEffect(() => {
    if (!prefsLoading && recordsPerPagePref !== (pagePrefs?.recordsPerPage || 25)) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ recordsPerPage: recordsPerPagePref });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [recordsPerPagePref, prefsLoading, pagePrefs?.recordsPerPage, updatePagePrefs]);

  // Save sortBy preference with debounce
  useEffect(() => {
    if (!prefsLoading && sortBy !== (pagePrefs?.sortBy || 'name')) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ sortBy });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [sortBy, prefsLoading, pagePrefs?.sortBy, updatePagePrefs]);

  // Save sortOrder preference with debounce
  useEffect(() => {
    if (!prefsLoading && sortOrder !== (pagePrefs?.sortOrder || 'asc')) {
      const timeoutId = setTimeout(() => {
        updatePagePrefs({ sortOrder });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [sortOrder, prefsLoading, pagePrefs?.sortOrder, updatePagePrefs]);

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
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'role':
        comparison = a.role.localeCompare(b.role);
        break;
      case 'status':
        const statusA = (a.banned || a.locked) ? 'inactive' : 'active';
        const statusB = (b.banned || b.locked) ? 'inactive' : 'active';
        comparison = statusA.localeCompare(statusB);
        break;
      case 'lastSignIn':
        const dateA = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
        const dateB = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
        comparison = dateA - dateB;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination calculations
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / recordsPerPagePref);
  const startIndex = (currentPage - 1) * recordsPerPagePref;
  const endIndex = startIndex + recordsPerPagePref;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search term or records per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recordsPerPagePref, roleFilter, statusFilter, sortBy, sortOrder]);

  const getPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPagePref(value);
  };

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

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
                <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
              </div>
              
              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar por:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'email' | 'role' | 'status' | 'lastSignIn')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="name">Nombre</option>
                  <option value="email">Email</option>
                  <option value="role">Rol</option>
                  <option value="status">Estado</option>
                  <option value="lastSignIn">Último Acceso</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  title={`Orden ${sortOrder === 'asc' ? 'ascendente' : 'descendente'}`}
                >
                  <i className={`fas fa-sort-amount-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Toggle Button */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <i className="fas fa-list mr-2"></i>
                Lista
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <i className="fas fa-th-large mr-2"></i>
                Cuadrícula
              </button>
            </div>
          </div>
        </div>

        {/* Users Display */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                /* List View */
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(currentUsers.map(user => user.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                            className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Rol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Último Acceso
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {currentUsers.map((user) => (
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
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {currentUsers.length === 0 && (
                <div className="text-center py-12">
                  <i className="fas fa-users-slash text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-500 dark:text-gray-400">
                    No se encontraron usuarios que coincidan con sus criterios
                  </p>
                </div>
              )}
                </div>
              ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {currentUsers.map((user) => (
                    <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          {user.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-12 h-12 rounded-full mr-3"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-3">
                              <i className="fas fa-user text-gray-600 dark:text-gray-300"></i>
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
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
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Rol:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Estado:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.banned || user.locked 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700'
                          }`}>
                            {user.banned || user.locked ? 'Inactivo' : 'Activo'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {user.lastSignInAt ? `Último acceso: ${new Date(user.lastSignInAt).toLocaleDateString()}` : 'Nunca ha accedido'}
                        </span>
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

                            <button
                              onClick={() => deleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                              disabled={user.id === currentUser?.id}
                              className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Delete User"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {currentUsers.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <i className="fas fa-users-slash text-4xl text-gray-400 mb-4"></i>
                      <p className="text-gray-500 dark:text-gray-400">
                        No se encontraron usuarios que coincidan con sus criterios
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
              <span className="font-medium">{Math.min(endIndex, totalUsers)}</span> de{' '}
              <span className="font-medium">{totalUsers}</span> usuarios
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Registros por página:</label>
                <select
                  value={recordsPerPagePref}
                  onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                
                {getPaginationNumbers().map((page, index) => (
                  <span key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page as number)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === page
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-white'
                        }`}
                      >
                        {page}
                      </button>
                    )}
                  </span>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
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
