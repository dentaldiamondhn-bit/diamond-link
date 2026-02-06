'use client';

import { createPortal } from 'react-dom';
import { CreateRoomModal } from './CreateRoomModal';

interface ChatPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
}

export const ChatPortal: React.FC<ChatPortalProps> = ({
  isOpen,
  onClose,
  onRoomCreated
}) => {
  if (!isOpen) return null;
  
  return createPortal(
    <CreateRoomModal
      isOpen={isOpen}
      onClose={onClose}
      onRoomCreated={onRoomCreated}
    />,
    document.body
  );
};
