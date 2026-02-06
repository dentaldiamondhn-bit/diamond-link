'use client';

import React, { useState, useEffect } from 'react';
import { ChatService } from '../../services/chatService';
import { ClerkUserService, ClerkUser } from '../../services/clerkUserService';
import { useUser } from '@clerk/nextjs';

export const CreateRoomModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
}> = ({ isOpen, onClose, onRoomCreated }) => {
  const { user } = useUser();
  const [roomType, setRoomType] = useState<'direct' | 'group' | 'patient_case'>('group');
  const [roomName, setRoomName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState<ClerkUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<ClerkUser[]>([]);

  useEffect(() => {
    if (isOpen && roomType === 'direct') {
      loadUsers();
    }
  }, [isOpen, roomType]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const users = await ClerkUserService.getAllUsers();
      // Filter out current user
      const otherUsers = users.filter(u => u.id !== user?.id);
      setAvailableUsers(otherUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = (selectedUser: ClerkUser) => {
    if (selectedUsers.find(u => u.id === selectedUser.id)) {
      // User already selected, remove them
      setSelectedUsers(selectedUsers.filter(u => u.id !== selectedUser.id));
    } else {
      // Add user to selection
      setSelectedUsers([...selectedUsers, selectedUser]);
    }
  };

  const handleRemoveUser = (userToRemove: ClerkUser) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userToRemove.id));
  };

  const filteredUsers = availableUsers.filter(u =>
    u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.emailAddress?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setError('');

    try {
      let room;
      
      if (roomType === 'direct') {
        // Use selected users instead of email lookup
        if (selectedUsers.length === 0) {
          setError('Please select a user to create a direct message room.');
          setLoading(false);
          return;
        }
        
        const targetUser = selectedUsers[0]; // Take first selected user for direct message
        
        room = await ChatService.createDirectMessageRoom(
          user.id,
          targetUser.id
        );
      } else if (roomType === 'group') {
        if (selectedUsers.length === 0) {
          setError('Please select at least one user to create a group room.');
          setLoading(false);
          return;
        }
        
        if (!roomName.trim()) {
          setError('Please enter room name');
          setLoading(false);
          return;
        }
        
        room = await ChatService.createRoom(roomName.trim(), 'group', user.id);
        
        // Add selected users to the group room
        for (const selectedUser of selectedUsers) {
          await ChatService.addMemberToRoom(room.id, selectedUser.id, 'member');
        }
      } else if (roomType === 'patient_case') {
        if (!pacienteId.trim()) {
          setError('Please enter patient ID');
          setLoading(false);
          return;
        }
        
        room = await ChatService.createPatientCaseRoom(
          pacienteId,
          user.id,
          [] // Add other participants as needed
        );
      } else {
        if (!roomName.trim()) {
          setError('Please enter room name');
          setLoading(false);
          return;
        }
        room = await ChatService.createRoom(roomName.trim(), 'group', user.id);
      }

      onRoomCreated(room.id);
      onClose();
      setRoomName('');
      setParticipantEmail('');
      setPacienteId('');
      setSelectedUsers([]);
      setUserSearch('');
    } catch (err) {
      setError('Failed to create room');
      console.error('Room creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Room
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Type
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="group">Group Chat</option>
                <option value="direct">Direct Message</option>
                <option value="patient_case">Patient Case</option>
              </select>
            </div>

            {/* User Selection (for direct messages) */}
            {roomType === 'direct' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select User
                </label>
                {loadingUsers ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading users...</p>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users by name or email..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white mb-2"
                    />
                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                      {filteredUsers.length === 0 ? (
                        <div className="p-3 text-gray-500 dark:text-gray-400 text-center">
                          No users found
                        </div>
                      ) : (
                        filteredUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleUserSelect(u)}
                            className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              {u.imageUrl ? (
                                <img 
                                  src={u.imageUrl} 
                                  alt={u.firstName || u.emailAddress}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-medium">
                                    {u.firstName?.[0] || u.emailAddress?.[0] || 'U'}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.emailAddress}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {u.emailAddress}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {selectedUsers.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Selected Users
                        </h4>
                        <div className="space-y-2">
                          {selectedUsers.map(user => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                {user.imageUrl ? (
                                  <img 
                                    src={user.imageUrl} 
                                    alt={user.firstName || user.emailAddress}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">
                                      {(user.firstName || user.emailAddress)?.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {user.firstName && user.lastName 
                                      ? `${user.firstName} ${user.lastName}`
                                      : user.emailAddress}
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {user.emailAddress}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveUser(user)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Room Name (for groups) */}
            {roomType === 'group' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={(e) => {
                  console.log('Button clicked!', e);
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Events prevented');
                  handleSubmit(e as any);
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
