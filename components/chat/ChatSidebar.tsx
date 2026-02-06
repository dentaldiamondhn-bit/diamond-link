'use client';

import React, { useState, useEffect } from 'react';
import { ChatService } from '../../services/chatService';
import { useUser } from '@clerk/nextjs';

interface ChatRoom {
  id: string;
  name?: string;
  type: 'direct' | 'group' | 'patient_case';
  created_by_clerk_id?: string;
  created_at: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  participant_ids?: string[];
}

interface ChatSidebarProps {
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string, roomName?: string, roomType?: string) => void;
  onNewRoom: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  selectedRoomId,
  onRoomSelect,
  onNewRoom,
  collapsed = false,
  onToggleCollapse
}) => {
  const { user } = useUser();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'group' | 'patient'>('all');
  const [roomUsers, setRoomUsers] = useState<{[key: string]: any}>({});

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      
      // Load real rooms from database
      const rooms = await ChatService.getUserRooms(user.id);
      setRooms(rooms);
      
      // Load user information for direct message rooms
      const userPromises = rooms
        .filter(room => room.type === 'direct')
        .map(async (room) => {
          try {
            // Get room members to find the other user
            const members = await ChatService.getRoomMembers(room.id);
            const otherUser = members.find(member => member.clerk_user_id !== user.id);
            
            if (otherUser) {
              // Get user info from Clerk API
              const response = await fetch(`/api/chat/users`);
              const data = await response.json();
              const userInfo = data.users.find((u: any) => u.id === otherUser.clerk_user_id);
              
              if (userInfo) {
                const displayName = userInfo.firstName && userInfo.lastName 
                  ? `${userInfo.firstName} ${userInfo.lastName}`
                  : userInfo.emailAddress;
                
                return { 
                  roomId: room.id, 
                  displayName,
                  user: userInfo // Store full user object for avatar
                };
              }
            }
          } catch (error) {
            console.error('Failed to load user for room:', room.id);
          }
          return { roomId: room.id, displayName: 'Unknown User', user: null };
        });
      
      const userResults = await Promise.all(userPromises);
      const userMap = userResults.reduce((acc, result) => {
        acc[result.roomId] = result.user || { displayName: result.displayName };
        return acc;
      }, {} as {[key: string]: any});
      
      setRoomUsers(userMap);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      // Fallback to mock data if database fails
      const mockRooms: ChatRoom[] = [
        {
          id: '1',
          name: 'Team Chat',
          type: 'group',
          created_at: new Date().toISOString(),
          created_by_clerk_id: user?.id || '',
          unread_count: 2
        }
      ];
      setRooms(mockRooms);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchQuery || 
      room.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (room.type === 'direct' && 'direct message'.includes(searchQuery.toLowerCase()));
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'direct' && room.type === 'direct') ||
      (activeTab === 'group' && room.type === 'group') ||
      (activeTab === 'patient' && room.type === 'patient_case');
    
    return matchesSearch && matchesTab;
  });

  // Debug: Log filtering results
  console.log('ChatSidebar - Total rooms:', rooms.length);
  console.log('ChatSidebar - Filtered rooms:', filteredRooms.length);
  console.log('ChatSidebar - Active tab:', activeTab);
  console.log('ChatSidebar - Search query:', searchQuery);

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return 'fa-user';
      case 'group':
        return 'fa-users';
      case 'patient_case':
        return 'fa-user-injured';
      default:
        return 'fa-comments';
    }
  };

  const getRoomColor = (type: string) => {
    switch (type) {
      case 'direct':
        return 'bg-blue-500';
      case 'group':
        return 'bg-teal-500';
      case 'patient_case':
        return 'bg-purple-500';
      default:
        return 'bg-slate-500';
    }
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (collapsed) {
    return (
      <div className="flex flex-col h-full">
        {/* Collapsed Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        {/* Collapsed New Room Button */}
        <div className="p-2">
          <button
            onClick={onNewRoom}
            className="w-full p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>

        {/* Collapsed Room List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredRooms.map(room => (
            <button
              key={room.id}
              onClick={() => onRoomSelect(room.id)}
              className={`w-full p-2 rounded-lg transition-colors ${
                selectedRoomId === room.id
                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <i className={`fas ${getRoomIcon(room.type)}`}></i>
              {room.unread_count && room.unread_count > 0 && (
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-comments text-white text-sm"></i>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chat</h2>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleCollapse}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              onClick={onNewRoom}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full px-3 py-2 pl-9 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm"
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm"></i>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex space-x-1">
          {[
            { id: 'all', label: 'All', icon: 'fa-inbox' },
            { id: 'direct', label: 'Direct', icon: 'fa-user' },
            { id: 'group', label: 'Groups', icon: 'fa-users' },
            { id: 'patient', label: 'Patients', icon: 'fa-user-injured' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <i className={`fas ${tab.icon} mr-1`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-4 text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-comments text-slate-400"></i>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewRoom}
                className="mt-2 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium"
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredRooms.map(room => (
              <button
                key={room.id}
                onClick={() => onRoomSelect(
                  room.id, 
                  room.name || roomUsers[room.id]?.displayName || 'Unknown Room',
                  room.type
                )}
                className={`w-full p-3 rounded-lg transition-colors ${
                  selectedRoomId === room.id
                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Show user avatar for direct messages, icon for other rooms */}
                  {room.type === 'direct' && roomUsers[room.id] ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {roomUsers[room.id].imageUrl ? (
                        <img 
                          src={roomUsers[room.id].imageUrl} 
                          alt={roomUsers[room.id].displayName || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {roomUsers[room.id].displayName?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`w-10 h-10 ${getRoomColor(room.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <i className={`fas ${getRoomIcon(room.type)} text-white`}></i>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">
                        {room.name || 
                         (roomUsers[room.id]?.displayName) || 
                         (room.type === 'direct' ? 'Direct Message' : 'Unnamed Room')}
                      </h3>
                      {room.last_message_time && (
                        <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                          {formatLastMessageTime(room.last_message_time)}
                        </span>
                      )}
                    </div>
                    
                    {/* Debug: Show room ID */}
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {roomUsers[room.id]?.displayName || `ID: ${room.id.slice(0, 8)}...`}
                    </div>
                    
                    {room.last_message && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {room.last_message}
                      </p>
                    )}
                  </div>
                  
                  {room.unread_count && room.unread_count > 0 && (
                    <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                      {room.unread_count > 9 ? '9+' : room.unread_count}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
