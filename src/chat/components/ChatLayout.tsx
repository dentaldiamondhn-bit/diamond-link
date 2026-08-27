'use client';

import React from 'react';
import Sidebar from './Sidebar';
import ChatPane from './ChatPane';

export const ChatLayout = () => {
  return (
    <div className="chat-layout flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar className="border-r border-gray-200 dark:border-gray-700" />
      <ChatPane className="border-l border-gray-200 dark:border-gray-700" />
    </div>
  );
};

export default ChatLayout;