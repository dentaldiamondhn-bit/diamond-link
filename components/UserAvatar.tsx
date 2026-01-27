'use client';

import React from 'react';

interface UserAvatarProps {
  userId?: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  profileImageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showEmail?: boolean;
  className?: string;
}

export function UserAvatar({
  userId,
  firstName,
  lastName,
  emailAddress,
  profileImageUrl,
  size = 'md',
  showName = true,
  showEmail = false,
  className = ''
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm'
  };

  if (!userId) {
    // Unassigned user state
    return (
      <div className={`flex items-center ${className}`}>
        <div className="flex-shrink-0 mr-2">
          <div className={`${sizeClasses[size]} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
            <i className="fas fa-user-slash text-gray-500 dark:text-gray-400 text-xs"></i>
          </div>
        </div>
        {(showName || showEmail) && (
          <div>
            {showName && <div className={`${textSizeClasses[size]} font-medium text-gray-400 dark:text-gray-500`}>Sin asignar</div>}
            {showEmail && <div className="text-xs text-gray-500 dark:text-gray-400">No hay usuario vinculado</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex-shrink-0 mr-2">
        {profileImageUrl ? (
          <img
            className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm`}
            src={profileImageUrl}
            alt={`${firstName} ${lastName}`}
            onError={(e) => {
              // If image fails to load, replace with initials
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium shadow-sm`}
          style={{ display: profileImageUrl ? 'none' : 'flex' }}
        >
          <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {firstName?.charAt(0) || ''}{lastName?.charAt(0) || ''}
          </span>
        </div>
      </div>
      {(showName || showEmail) && (
        <div>
          {showName && (
            <div className={`${textSizeClasses[size]} font-medium text-gray-900 dark:text-white`}>
              {firstName} {lastName}
            </div>
          )}
          {showEmail && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {emailAddress}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
