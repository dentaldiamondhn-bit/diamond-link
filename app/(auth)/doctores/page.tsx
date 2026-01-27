'use client';

import React, { useState, useEffect } from 'react';
import { Doctor, getSpecialtyOptions, DEFAULT_DOCTORS } from '../../../config/doctors';
import { SupabaseDoctorService } from '../../../services/supabaseDoctorService';
import { useRoleBasedAccess } from '../../../hooks/useRoleBasedAccess';
import { useClerkUsers, ClerkUser } from '../../../hooks/useClerkUsers';
import { UserAvatar } from '@/components/UserAvatar';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    specialty: '',
    userId: '',
    userEmail: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { users: clerkUsers, loading: usersLoading } = useClerkUsers();

  // Debug: Log user data to verify structure
  useEffect(() => {
    if (clerkUsers.length > 0) {
      console.log('Clerk users data:', clerkUsers);
      console.log('First user structure:', clerkUsers[0]);
    }
  }, [clerkUsers]);

  // Load doctors from service on component mount and when window gains focus
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const doctorsData = await SupabaseDoctorService.getDoctors();
        setDoctors(doctorsData);
      } catch (error) {
        console.error('Error loading doctors:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDoctors();

    // Refresh doctors when window gains focus (in case user modifies in another tab)
    const handleFocus = () => {
      loadDoctors();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Check if user has admin access
  const { userRole, permissions } = useRoleBasedAccess();

  // Check if user can manage doctors
  const canManageDoctores = permissions?.canManageDoctores || false;

  // Debug logging
  console.log('Doctores Page Debug:', {
    userRole,
    canManageDoctores,
    allPermissions: permissions
  });

  // Filter doctors based on search and specialty
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = !selectedSpecialty || doctor.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  // Get unique specialties from current doctors
  const uniqueSpecialties = [...new Set(doctors.map(doctor => doctor.specialty))];

  const handleAddDoctor = () => {
    setIsEditing(true);
    setEditingDoctor(null);
    setFormData({ id: '', name: '', specialty: '', userId: '', userEmail: '' });
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setIsEditing(true);
    setEditingDoctor(doctor);
    setFormData({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      userId: doctor.user_id || '',
      userEmail: doctor.user_email || ''
    });
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este doctor?')) {
      try {
        await SupabaseDoctorService.deleteDoctor(doctorId);
        // Force refresh by reloading from database
        const updatedDoctors = await SupabaseDoctorService.getDoctors();
        setDoctors(updatedDoctors);
      } catch (error) {
        console.error('Error deleting doctor:', error);
        alert('Error al eliminar el doctor');
      }
    }
  };

  const handleSaveDoctor = async () => {
    try {
      if (editingDoctor) {
        // Update existing doctor
        const updatedDoctor = await SupabaseDoctorService.updateDoctor(editingDoctor.id, {
          name: formData.name,
          specialty: formData.specialty,
          user_id: formData.userId || undefined,
          user_email: formData.userEmail || undefined
        });
        
        setDoctors(doctors.map(d => d.id === editingDoctor.id ? updatedDoctor : d));
        alert('Doctor actualizado exitosamente');
      } else {
        // Add new doctor
        const newDoctor = await SupabaseDoctorService.createDoctor({
          name: formData.name,
          specialty: formData.specialty,
          user_id: formData.userId || undefined,
          user_email: formData.userEmail || undefined
        });
        
        setDoctors([...doctors, newDoctor]);
        alert('Doctor agregado exitosamente');
      }
      setEditingDoctor(null);
      setFormData({ id: '', name: '', specialty: '', userId: '', userEmail: '' });
    } catch (error) {
      console.error('Error saving doctor:', error);
      alert('Error al guardar el doctor');
    }
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('¿Está seguro de que desea restablecer los doctores a los valores por defecto? Esto eliminará todos los doctores personalizados.')) {
      try {
        // Add default doctors to Supabase
        for (const defaultDoctor of DEFAULT_DOCTORS) {
          await SupabaseDoctorService.createDoctor({
            name: defaultDoctor.name,
            specialty: defaultDoctor.specialty
          });
        }
        setDoctors(DEFAULT_DOCTORS);
        alert('Doctores restablecidos a los valores por defecto');
      } catch (error) {
        console.error('Error resetting doctors:', error);
        alert('Error al restablecer los doctores');
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingDoctor(null);
    setFormData({ id: '', name: '', specialty: '', userId: '', userEmail: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!canManageDoctores) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tiene permisos para acceder a esta página.</p>
          <p className="text-sm text-gray-500 mt-2">Rol: {userRole}</p>
          <p className="text-sm text-gray-500 mt-2">Permisos: {JSON.stringify(permissions)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            <i className="fas fa-user-md mr-3 text-blue-600"></i>
            Gestión de Doctores
          </h1>
          
          {/* View Toggle Button */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
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
          </div>
        </div>
        
        <button
          onClick={handleAddDoctor}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="fas fa-plus mr-2"></i>
          Agregar Doctor
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar por nombre o especialidad:
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar doctores..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por especialidad:
            </label>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las especialidades</option>
              {uniqueSpecialties.map(specialty => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <strong>Total:</strong> {filteredDoctors.length} doctores
            </div>
          </div>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingDoctor ? 'Editar Doctor' : 'Agregar Nuevo Doctor'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Doctor:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Dra. María González"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Especialidad:
                </label>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Seleccionar especialidad</option>
                  {getSpecialtyOptions().slice(1).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Usuario Asignado (opcional):
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => {
                    const selectedUser = clerkUsers.find(u => u.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      userId: e.target.value,
                      userEmail: selectedUser?.emailAddress || ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={usersLoading}
                >
                  <option value="">
                    {usersLoading ? 'Cargando usuarios...' : 'Seleccionar usuario'}
                  </option>
                  {clerkUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} - {user.emailAddress}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {usersLoading 
                    ? 'Cargando usuarios de Clerk...'
                    : clerkUsers.length === 0 
                      ? 'No se encontraron usuarios con rol de doctor'
                      : 'Seleccione un usuario de Clerk para asignar a este doctor'
                  }
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDoctor}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
              >
                {editingDoctor ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctors Display */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => {
            const assignedUser = clerkUsers.find(u => u.id === doctor.user_id);
            return (
              <div key={doctor.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group">
                {/* Doctor Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">{doctor.name}</h3>
                      <p className="text-blue-100 text-sm">{doctor.specialty}</p>
                    </div>
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                      {doctor.id}
                    </span>
                  </div>
                </div>
                
                {/* Doctor Content */}
                <div className="p-4">
                  {/* User Assignment */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Usuario Asignado</span>
                      {doctor.user_id ? (
                        <UserAvatar
                          userId={assignedUser?.id}
                          firstName={assignedUser?.firstName}
                          lastName={assignedUser?.lastName}
                          emailAddress={assignedUser?.emailAddress}
                          profileImageUrl={assignedUser?.profileImageUrl}
                          size="sm"
                          showName={true}
                          showEmail={true}
                        />
                      ) : (
                        <UserAvatar
                          size="sm"
                          showName={true}
                          showEmail={false}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEditDoctor(doctor)}
                      className="px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm font-medium"
                    >
                      <i className="fas fa-edit mr-1"></i>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteDoctor(doctor.id)}
                      className="px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                    >
                      <i className="fas fa-trash mr-1"></i>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usuario Asignado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDoctors.map((doctor) => {
            const assignedUser = clerkUsers.find(u => u.id === doctor.user_id);
            return (
                  <tr key={doctor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {doctor.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {doctor.specialty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {doctor.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {doctor.user_id ? (
                        <UserAvatar
                          userId={assignedUser?.id}
                          firstName={assignedUser?.firstName}
                          lastName={assignedUser?.lastName}
                          emailAddress={assignedUser?.emailAddress}
                          profileImageUrl={assignedUser?.profileImageUrl}
                          size="md"
                          showName={true}
                          showEmail={true}
                        />
                      ) : (
                        <UserAvatar
                          size="md"
                          showName={true}
                          showEmail={true}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditDoctor(doctor)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Doctores</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{doctors.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Especialidades</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{uniqueSpecialties.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Especialidades Activas</div>
          <div className="text-sm text-gray-900 dark:text-white">
            {uniqueSpecialties.join(', ')}
          </div>
        </div>
      </div>
    </div>
  );
}
