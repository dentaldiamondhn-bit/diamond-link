'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clerkClient } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';
import LoadingAnimation from '../../../../components/LoadingAnimation';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

export default function TechSupportUsersPage() {
  const { userRole, hasPermission } = useRoleBasedAccess();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'lastSignIn'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    let aValue: string, bValue: string;
    
    switch (sortBy) {
      case 'name':
        aValue = `${a.firstName} ${a.lastName}`;
        bValue = `${b.firstName} ${b.lastName}`;
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'role':
        aValue = a.role || '';
        bValue = b.role || '';
        break;
      case 'lastSignIn':
        aValue = a.lastSignInAt || '';
        bValue = b.lastSignInAt || '';
        break;
      default:
        aValue = `${a.firstName} ${a.lastName}`;
        bValue = `${b.firstName} ${b.lastName}`;
    }
    
    if (sortOrder === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  // Pagination calculations
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search term, records per page, sort by, or sort order changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, recordsPerPage, sortBy, sortOrder]);

  // Pagination helper functions
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
  };

  const getPaginationNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const handleRoleUpdate = async (user: any, role: string) => {
    try {
      setIsUpdating(true);
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateRole',
          targetUserId: user.id,
          newRole: role
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, role } : u
        ));
        setShowRoleModal(false);
        setSelectedUser(null);
        setNewRole('');
      } else {
        throw new Error(result.message || 'Error al actualizar rol');
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      alert('Error al actualizar rol: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBanUser = async (user: any) => {
    if (!confirm(`¿Estás seguro de que quieres ${user.banned ? 'desbloquear' : 'bloquear'} a ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: user.banned ? 'unban' : 'ban',
          targetUserId: user.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, banned: !user.banned } : u
        ));
      } else {
        throw new Error(result.message || 'Error al actualizar estado de usuario');
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Error al actualizar estado: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  const handleLockUser = async (user: any) => {
    if (!confirm(`¿Estás seguro de que quieres ${user.locked ? 'desbloquear' : 'bloquear'} a ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: user.locked ? 'unlock' : 'lock',
          targetUserId: user.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, locked: !user.locked } : u
        ));
      } else {
        throw new Error(result.message || 'Error al actualizar estado de usuario');
      }
    } catch (err) {
      console.error('Error updating user lock status:', err);
      alert('Error al actualizar estado: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!confirm(`¿Estás seguro de que quieres enviar un correo de restablecimiento de contraseña a ${user.email}?`)) {
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
          targetUserId: user.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        alert('Correo de restablecimiento enviado exitosamente');
      } else {
        throw new Error(result.message || 'Error al enviar correo de restablecimiento');
      }
    } catch (err) {
      console.error('Error sending password reset:', err);
      alert('Error al enviar correo: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
      case 'doctor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'staff':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'tech_support':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusBadgeColor = (user: any) => {
    if (user.banned) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
    if (user.locked) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-700';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'doctor': return 'Doctor';
      case 'staff': return 'Personal';
      case 'tech_support': return 'Soporte Técnico';
      default: return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <LoadingAnimation 
        message="Cargando Usuarios"
        subMessage="Obteniendo lista de usuarios del sistema"
        customMessages={[
          "• Cargando usuarios...",
          "• Obteniendo información de usuarios...",
          "• Procesando lista de usuarios..."
        ]}
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
          <button
            onClick={loadUsers}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!userRole || userRole !== 'tech_support') {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permisos para acceder a la gestión de usuarios."
        explanation="Esta área es exclusiva para personal de soporte técnico que puede administrar usuarios del sistema."
        contactInfo="Si necesitas acceso, contacta a un administrador del sistema."
        onGoBack={() => router.back()}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Usuarios
        </h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Volver
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Field */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'email' | 'role' | 'lastSignIn')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="name">Nombre</option>
              <option value="email">Email</option>
              <option value="role">Rol</option>
              <option value="lastSignIn">Último Acceso</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              title={`Orden ${sortOrder === 'asc' ? 'ascendente' : 'descendente'}`}
            >
              <i className={`fas fa-sort-amount-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
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

      {/* Users Display - Table or Grid */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        {viewMode === 'list' ? (
          /* List View */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
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
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={user.profileImageUrl}
                          alt={`${user.firstName} ${user.lastName}`}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                        <i className={`fas ${
                          user.role === 'admin' ? 'fa-crown' :
                            user.role === 'doctor' ? 'fa-user-md' : 'fa-user-tie'
                        } mr-1`}></i>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {user.banned && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(user)}`}>
                            <i className="fas fa-ban mr-1"></i>
                            Bloqueado
                          </span>
                        )}
                        {user.locked && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(user)}`}>
                            <i className="fas fa-lock mr-1"></i>
                            Bloqueado
                          </span>
                        )}
                        {!user.banned && !user.locked && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(user)}`}>
                            <i className="fas fa-check-circle mr-1"></i>
                            Activo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.lastSignInAt 
                        ? new Date(user.lastSignInAt).toLocaleDateString('es-ES')
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                            setShowRoleModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Cambiar rol"
                        >
                          <i className="fas fa-user-edit"></i>
                        </button>
                        <button
                          onClick={() => handleBanUser(user)}
                          className="text-red-600 hover:text-red-900"
                          title={user.banned ? 'Desbloquear usuario' : 'Bloquear usuario'}
                        >
                          <i className={`fas fa-${user.banned ? 'unlock' : 'ban'}`}></i>
                        </button>
                        <button
                          onClick={() => handleLockUser(user)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title={user.locked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                        >
                          <i className={`fas fa-${user.locked ? 'unlock' : 'lock'}`}></i>
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="text-green-600 hover:text-green-900"
                          title="Enviar correo de restablecimiento"
                        >
                          <i className="fas fa-key"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {currentUsers.map((user) => (
              <div key={user.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="p-4">
                  {/* User Header */}
                  <div className="flex items-center mb-4">
                    <img
                      className="h-12 w-12 rounded-full mr-3"
                      src={user.profileImageUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                    />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                      <i className={`fas ${
                        user.role === 'admin' ? 'fa-crown' :
                          user.role === 'doctor' ? 'fa-user-md' : 'fa-user-tie'
                      } mr-1`}></i>
                      {getRoleText(user.role)}
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div className="mb-3">
                    <div className="flex space-x-2">
                      {user.banned && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(user)}`}>
                          <i className="fas fa-ban mr-1"></i>
                          Bloqueado
                        </span>
                      )}
                      {user.locked && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(user)}`}>
                          <i className="fas fa-lock mr-1"></i>
                          Bloqueado
                        </span>
                      )}
                      {!user.banned && !user.locked && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(user)}`}>
                          <i className="fas fa-check-circle mr-1"></i>
                          Activo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last Sign In */}
                  <div className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    <i className="fas fa-clock mr-1"></i>
                    Último acceso: {user.lastSignInAt 
                      ? new Date(user.lastSignInAt).toLocaleDateString('es-ES')
                      : 'Nunca'
                    }
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setNewRole(user.role);
                        setShowRoleModal(true);
                      }}
                      className="flex-1 min-w-0 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
                      title="Cambiar rol"
                    >
                      <i className="fas fa-user-edit"></i>
                    </button>
                    <button
                      onClick={() => handleBanUser(user)}
                      className={`flex-1 min-w-0 px-2 py-1 text-xs text-white rounded transition-colors duration-200 ${
                        user.banned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                      }`}
                      title={user.banned ? 'Desbloquear usuario' : 'Bloquear usuario'}
                    >
                      <i className={`fas fa-${user.banned ? 'unlock' : 'ban'}`}></i>
                    </button>
                    <button
                      onClick={() => handleLockUser(user)}
                      className={`flex-1 min-w-0 px-2 py-1 text-xs text-white rounded transition-colors duration-200 ${
                        user.locked ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                      title={user.locked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                    >
                      <i className={`fas fa-${user.locked ? 'unlock' : 'lock'}`}></i>
                    </button>
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="flex-1 min-w-0 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200"
                      title="Enviar correo de restablecimiento"
                    >
                      <i className="fas fa-key"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination and Records Counter */}
      {totalUsers > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            {/* Records Counter */}
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Total Usuarios: {totalUsers}</span>
              <span className="mx-2">|</span>
              <span>Mostrando: {startIndex + 1}-{Math.min(endIndex, totalUsers)} de {totalUsers}</span>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>

                {/* Page Numbers */}
                {getPaginationNumbers().map((page, index) => (
                  <span key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page as number)}
                        className={`px-3 py-1 text-sm border rounded-md transition-colors duration-200 ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    )}
                  </span>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Update Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Cambiar Rol de Usuario
                    </h3>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">
                        Usuario: <span className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Email: <span className="font-medium">{selectedUser.email}</span>
                      </p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nuevo Rol
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="staff">Personal</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">Administrador</option>
                        <option value="tech_support">Soporte Técnico</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleRoleUpdate(selectedUser, newRole)}
                  disabled={isUpdating}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isUpdating ? 'Actualizando...' : 'Actualizar Rol'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                    setNewRole('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
