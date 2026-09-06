'use client';

import dynamic from 'next/dynamic';

const ChatLayout = dynamic(() => import('@/chat/components/ChatLayout'), { ssr: false });
const ChatPageMonolith = dynamic(() => import('@/chat/monolith/ChatPageMonolith'), { ssr: false });

export default function ChatPage() {
  const useNewChat = process.env.NEXT_PUBLIC_USE_NEW_CHAT === 'true';
  if (useNewChat) {
    return <ChatLayout />;
  }
  return <ChatPageMonolith />;
}