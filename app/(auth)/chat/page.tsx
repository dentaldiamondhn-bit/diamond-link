'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import { supabase } from '@/lib/supabase';
import { ChatService } from '@/services/chatService';
import { showBrowserNotification, requestNotificationPermission } from '@/lib/browserNotification';

const UserButton = dynamic(() => import('@clerk/nextjs').then(m => m.UserButton), { ssr: false });
import {
  ChatConversation,
  ChatMessage,
  ChatUser,
  ChatConversationType,
  ChatMessageType,
  PatientCaseLinkType,
  CreateMessageData,
  CreateConversationData
} from '@/types/chat';
import {
  MessageSquare,
  Plus,
  Search,
  Paperclip,
  Send,
  MoreVertical,
  Phone,
  Video,
  Info,
  X,
  File,
  Image,
  Users,
  Pin,
  Archive,
  Trash2,
  Smile,
  CornerDownRight,
  UserPlus,
  ChevronLeft,
  FileText,
  Stethoscope,
  Calendar,
  CreditCard,
  User,
  Upload,
  Check,
  Loader2,
  SmilePlus,
  Bell,
  BellOff,
  Mic,
  MicOff,
  PhoneOff,
  Volume2
} from 'lucide-react';

export default function ChatPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPatientCaseModal, setShowPatientCaseModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [showCallModal, setShowCallModal] = useState<'audio' | 'video' | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [callMuted, setCallMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [pendingFiles, setPendingFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [fileCaption, setFileCaption] = useState('');
  const permissionRequested = useRef(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const emojiCategories = [
    {
      name: 'Caras',
      emojis: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾']
    },
    {
      name: 'Gestos',
      emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄']
    },
    {
      name: 'Corazones',
      emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶']
    },
    {
      name: 'Objetos',
      emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🗑️','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🧰','🔧','🔨','⚒️','🛠️','⛏️','🔩','⚙️','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','💊','💉','🩸','🩹','🩺','🩻','🌡️','🪞','🪟','🪠','🪤','🪣','🪥','🪦','🪧','🪪']
    },
    {
      name: 'Animales',
      emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌎','🌍','🌏','🪐','💫','⭐','🌟','✨','⚡','☄️','💥','🔥','🌪️','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','💧','💦','🫧','☔','☂️','🌊','🌫️']
    },
    {
      name: 'Comida',
      emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🫘','🥐','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🫓','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🫖','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🫗','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🥄','🔪','🫙','🏺']
    }
  ];

  useEffect(() => {
    if (user?.id) {
      getDbUserId();
    }
  }, [user?.id]);

  useEffect(() => {
    if (dbUserId) {
      loadAllUsers().then(() => loadConversations());
    }
  }, [dbUserId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    (async () => {
      const ids = new Set<string>();
      for (const conv of conversations) {
        for (const p of conv.participants || []) {
          if (p.user_id !== dbUserId) ids.add(p.user_id);
        }
      }
      const newAvatars: Record<string, string> = {};
      for (const uid of ids) {
        if (userAvatars[uid]) { newAvatars[uid] = userAvatars[uid]; continue; }
        const fromAll = allUsers.find(u => u.id === uid);
        if (fromAll?.profile_image_url) { newAvatars[uid] = fromAll.profile_image_url; continue; }
        try {
          const res = await fetch(`/api/users?id=${uid}`);
          const u = await res.json();
          if (u?.profileImageUrl) {
            newAvatars[uid] = u.profileImageUrl;
            setAllUsers(prev => {
              if (prev.find(x => x.id === u.id)) return prev;
              return [...prev, {
                id: u.id, email: u.email || '',
                first_name: u.first_name || u.firstName || '',
                last_name: u.last_name || u.lastName || '',
                profile_image_url: u.profileImageUrl,
                role: u.role || 'staff'
              }];
            });
          }
        } catch {}
      }
      if (Object.keys(newAvatars).length > 0) {
        setUserAvatars(prev => ({ ...prev, ...newAvatars }));
      }
    })();
  }, [conversations, dbUserId]);

  useEffect(() => {
    handlePermissionRequest();
  }, []);

  // Realtime: messages in the currently selected conversation
  useEffect(() => {
    if (!selectedConversation || !dbUserId) return;
    const channel = supabase
      .channel(`chat-msg-${selectedConversation.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedConversation.id}` },
        () => loadMessages(selectedConversation.id)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id, dbUserId]);

  // Realtime: all new messages anywhere (notifications + sidebar update)
  useEffect(() => {
    if (!dbUserId) return;
    const channel = supabase
      .channel('chat-global')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as any;
          if (!msg || msg.sender_id === dbUserId) return;
          const isSelected = selectedConvRef.current?.id === msg.conversation_id;
          loadConversations(true);
          if (!isSelected) {
            const users = allUsersRef.current;
            const sender = users.find(u => u.id === msg.sender_id);
            const senderName = sender ? `${sender.first_name} ${sender.last_name}`.trim() || 'Usuario' : msg.sender_id.slice(-8);
            showChatNotification(senderName, msg.content?.substring(0, 120) || 'Nuevo mensaje', msg.conversation_id);
            addNotification({ type: 'info', message: `${senderName}: ${msg.content?.substring(0, 80) || 'Nuevo mensaje'}` });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dbUserId]);

  // Realtime: conversation changes (new, update, delete)
  useEffect(() => {
    if (!dbUserId) return;
    const channel = supabase
      .channel('chat-convs')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => loadConversations(true)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dbUserId]);

  // Realtime: new participant added (user added to a conversation)
  useEffect(() => {
    if (!dbUserId) return;
    const channel = supabase
      .channel('chat-parts')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${dbUserId}` },
        () => loadConversations(true)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dbUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(e.target as Node)) {
        setShowDropdownMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (callActive) {
      callTimerRef.current = setInterval(() => {
        setCallSeconds(s => s + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallSeconds(0);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [callActive]);

  const getDbUserId = async () => {
    // Use Clerk ID directly as the user ID in chat system
    if (user?.id) {
      setDbUserId(user.id);
    }
  };

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await ChatService.getConversations(dbUserId!);
      setConversations(result.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        console.error('Failed to load users:', response.status);
        setAllUsers([]);
        return;
      }
      const data = await response.json();
      const users = Array.isArray(data) ? data : (data?.data || []);
      setAllUsers(users.map((u: any) => {
        let firstName = u.first_name || u.firstName || '';
        let lastName = u.last_name || u.lastName || '';
        if (!firstName && !lastName && u.name) {
          const parts = u.name.trim().split(/\s+/);
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
        return {
          id: u.id,
          email: u.email || '',
          first_name: firstName,
          last_name: lastName,
          profile_image_url: u.profileImageUrl || u.profile_image_url || null,
          role: u.role || 'staff'
        };
      }));
    } catch (error) {
      console.error('Error loading users:', error);
      setAllUsers([]);
    }
  };

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const selectedConvRef = useRef(selectedConversation);
  selectedConvRef.current = selectedConversation;
  const allUsersRef = useRef(allUsers);
  allUsersRef.current = allUsers;

  const handlePermissionRequest = async () => {
    if (!('Notification' in window) || permissionRequested.current) return;
    permissionRequested.current = true;
    if (Notification.permission === 'default') {
      const result = await requestNotificationPermission();
      if (result !== 'unsupported') setPermission(result);
    }
  };

  // Request notification permission on first user click
  useEffect(() => {
    const handler = () => { handlePermissionRequest(); document.removeEventListener('click', handler); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const showChatNotification = (title: string, body: string, convId?: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    showBrowserNotification({
      title,
      body,
      icon: '/favicon-192.png',
      tag: convId || 'chat',
      data: convId ? { conversationId: convId } : {},
      onClickUrl: convId ? `/chat?conv=${convId}` : undefined,
    });
  };

  const getUserName = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) return `${user.first_name} ${user.last_name}`.trim() || 'Usuario';
    return userId.slice(-8);
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const result = await ChatService.getMessages(conversationId, dbUserId!);
      const msgs = result.data || [];
      msgs.reverse();
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !dbUserId) return;

    try {
      const messageData: CreateMessageData = {
        conversation_id: selectedConversation.id,
        content: messageInput.trim(),
        message_type: ChatMessageType.TEXT
      };

      await ChatService.sendMessage(dbUserId, messageData);
      setMessageInput('');
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleCreateConversation = async (participantIds: string[], type: ChatConversationType, name?: string) => {
    if (!dbUserId) return;

    try {
      const convData: CreateConversationData = {
        type,
        participant_ids: participantIds,
        name
      };
      
      const result = await ChatService.createConversation(dbUserId, convData);
      if (result.data) {
        setSelectedConversation(result.data);
        loadConversations();
      }
      setShowNewChatModal(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedConversation || !dbUserId) return;
    const newFiles: { file: File; previewUrl: string }[] = [];
    for (const file of Array.from(files)) {
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
      newFiles.push({ file, previewUrl });
    }
    setPendingFiles(prev => [...prev, ...newFiles]);
    if (e.target) e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const file = prev[index];
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const sendPendingFiles = async () => {
    if (!pendingFiles.length || !selectedConversation || !dbUserId) return;
    setIsUploading(true);
    const caption = fileCaption.trim();
    try {
      for (const { file } of pendingFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', selectedConversation.id);
        const response = await fetch('/api/chat/upload', { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) {
          addNotification({ type: 'error', message: result.error || 'Error al subir archivo' });
          continue;
        }
        if (result.uploadedUrl) {
          const fileType = file.type.startsWith('image/') ? 'image' : 'file';
          await ChatService.sendMessage(dbUserId, {
            conversation_id: selectedConversation.id,
            content: caption || file.name,
            message_type: fileType as ChatMessageType,
            attachments: [{ file_name: file.name, file_type: file.type, file_size: file.size, file_url: result.uploadedUrl }]
          });
        }
      }
      loadMessages(selectedConversation.id);
      setPendingFiles([]);
      setFileCaption('');
    } catch (error) {
      console.error('Error uploading files:', error);
      addNotification({ type: 'error', message: 'Error al subir archivo' });
    } finally {
      setIsUploading(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleCall = (type: 'audio' | 'video') => {
    setShowCallModal(type);
  };

  const startCall = () => {
    setShowCallModal(null);
    setCallActive(true);
  };

  const endCall = () => {
    setCallActive(false);
    setShowCallModal(null);
    setCallMuted(false);
  };

  const toggleMute = () => {
    setCallMuted(!callMuted);
  };

  const formatCallTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePinConversation = async () => {
    if (!selectedConversation || !dbUserId) return;
    try {
      await ChatService.updateConversation(selectedConversation.id, dbUserId, {
        is_pinned: !selectedConversation.is_pinned
      });
      setSelectedConversation({ ...selectedConversation, is_pinned: !selectedConversation.is_pinned });
      loadConversations();
    } catch (error) {
      console.error('Error pinning conversation:', error);
    }
    setShowDropdownMenu(false);
  };

  const handleArchiveConversation = async () => {
    if (!selectedConversation || !dbUserId) return;
    try {
      await ChatService.updateConversation(selectedConversation.id, dbUserId, {
        is_archived: true
      });
      setSelectedConversation(null);
      loadConversations();
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
    setShowDropdownMenu(false);
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation || !dbUserId) return;
    if (!window.confirm('¿Estás seguro de eliminar esta conversación?')) return;
    try {
      await ChatService.deleteConversation(selectedConversation.id, dbUserId);
      setSelectedConversation(null);
      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
    setShowDropdownMenu(false);
  };

  const handlePatientCaseLink = async (data: {
    patient_id: string;
    link_type: PatientCaseLinkType;
    linked_id: string;
    title: string;
    description?: string;
  }) => {
    if (!selectedConversation || !dbUserId) return;

    try {
      const messageData: CreateMessageData = {
        conversation_id: selectedConversation.id,
        content: data.title,
        message_type: ChatMessageType.PATIENT_CASE,
        patient_case_link: data
      };

      await ChatService.sendMessage(dbUserId, messageData);
      loadMessages(selectedConversation.id);
      setShowPatientCaseModal(false);
    } catch (error) {
      console.error('Error linking patient case:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOtherParticipant = (conv: ChatConversation) => {
    if (!dbUserId || !conv.participants?.length) return null;
    const otherParticipant = conv.participants.find(p => p.user_id !== dbUserId);
    if (!otherParticipant) return null;
    const user = allUsers.find(u => u.id === otherParticipant.user_id);
    return user || null;
  };

  const getUserAvatarUrl = (conv: ChatConversation): string | null => {
    if (conv.avatar_url) return conv.avatar_url;
    if (!dbUserId) return null;
    const otherPart = conv.participants?.find(p => p.user_id !== dbUserId);
    if (!otherPart) return null;
    if (userAvatars[otherPart.user_id]) return userAvatars[otherPart.user_id];
    const user = allUsers.find(u => u.id === otherPart.user_id);
    if (user?.profile_image_url) return user.profile_image_url;
    return null;
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() || '?';
  };

  const avatarColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
  const getAvatarColor = (name: string) => avatarColors[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];

  const getConversationDisplayName = (conv: ChatConversation) => {
    if (conv.name && conv.name !== 'Chat') return conv.name;
    const otherUser = getOtherParticipant(conv);
    if (otherUser) return `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 'Usuario';
    const participant = conv.participants?.find(p => p.user_id !== dbUserId);
    if (participant) return participant.user_id.slice(-8);
    return 'Chat';
  };

  const renderAvatar = (conv: ChatConversation, size: 'sm' | 'md' = 'md') => {
    const avatarUrl = getUserAvatarUrl(conv);
    const dim = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    if (avatarUrl) {
      return <img src={avatarUrl} alt="" className={`${dim} rounded-full object-cover`} />;
    }
    const name = getConversationDisplayName(conv);
    const initials = getInitials(name);
    return (
      <div className={`${dim} rounded-full ${getAvatarColor(name)} flex items-center justify-center text-white ${textSize} font-semibold`}>
        {initials}
      </div>
    );
  };

  return (
    <div data-rr-block className="flex h-full">
        {/* Conversations Sidebar */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-800 dark:text-white">Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <UserButton />
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No hay conversaciones</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-3 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:underline"
                >
                  Iniciar conversación
                </button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                      selectedConversation?.id === conv.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {renderAvatar(conv, 'md')}
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {getConversationDisplayName(conv)}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {conv.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {(() => {
                              const date = conv.last_message?.created_at || conv.last_message_at;
                              if (!date) return '';
                              const d = new Date(date);
                              const now = new Date();
                              const isToday = d.toDateString() === now.toDateString();
                              const yesterday = new Date(now);
                              yesterday.setDate(yesterday.getDate() - 1);
                              const isYesterday = d.toDateString() === yesterday.toDateString();
                              if (isToday) return d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
                              if (isYesterday) return 'Ayer';
                              return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit' });
                            })()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {conv.last_message
                          ? conv.last_message.message_type === ChatMessageType.IMAGE
                            ? '📷 Imagen'
                            : conv.last_message.message_type === ChatMessageType.FILE
                            ? '📎 Archivo'
                            : conv.last_message.message_type === ChatMessageType.PATIENT_CASE
                            ? '📋 Caso de paciente'
                            : conv.last_message.message_type === ChatMessageType.SYSTEM
                            ? '⚙️ Sistema'
                            : conv.last_message.content || 'Sin contenido'
                          : 'Sin mensajes'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="flex flex-1">
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 min-w-0">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="relative flex-shrink-0">
                  {renderAvatar(selectedConversation, 'sm')}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-white">
                    {getConversationDisplayName(selectedConversation)}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedConversation.participants?.length || 0} participantes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                <button
                  onClick={() => handleCall('audio')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                  title="Llamada de voz"
                >
                  <Phone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={() => handleCall('video')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                  title="Videollamada"
                >
                  <Video className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button 
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`p-2 rounded-xl ${showInfoPanel ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  title="Información"
                >
                  <Info className={`w-5 h-5 ${showInfoPanel ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}`} />
                </button>
                <div className="relative" ref={dropdownMenuRef}>
                  <button
                    onClick={() => setShowDropdownMenu(!showDropdownMenu)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                    title="Más opciones"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  {showDropdownMenu && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                      <button
                        onClick={handlePinConversation}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <Pin className="w-4 h-4" />
                        {selectedConversation?.is_pinned ? 'Desfijar conversación' : 'Fijar conversación'}
                      </button>
                      <button
                        onClick={handleArchiveConversation}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <Archive className="w-4 h-4" />
                        Archivar conversación
                      </button>
                      <hr className="border-slate-200 dark:border-slate-700 my-1" />
                      <button
                        onClick={handleDeleteConversation}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar conversación
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={messagesAreaRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 relative"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(false);
                const files = e.dataTransfer.files;
                if (!files.length || !selectedConversation || !dbUserId) return;
                const newFiles: { file: File; previewUrl: string }[] = [];
                for (const file of Array.from(files)) {
                  const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
                  newFiles.push({ file, previewUrl });
                }
                setPendingFiles(prev => [...prev, ...newFiles]);
              }}
            >
              {dragOver && (
                <div className="absolute inset-0 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-2xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <p className="text-emerald-600 font-medium">Suelta los archivos aquí</p>
                  </div>
                </div>
              )}
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Sin mensajes aún</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Envía el primer mensaje</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.sender_id === dbUserId;
                  const showAvatar = !isOwn && (!messages[index - 1] || messages[index - 1].sender_id !== msg.sender_id);
                  const isReply = msg.reply_to_id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                    >
                      {showAvatar && !isOwn ? (
                        (() => {
                          const senderUser = allUsers.find(u => u.id === msg.sender_id);
                          if (senderUser?.profile_image_url) {
                            return <img src={senderUser.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />;
                          }
                          const name = senderUser ? `${senderUser.first_name} ${senderUser.last_name}` : '?';
                          const initials = getInitials(name);
                          const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
                          const colorIndex = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
                          return (
                            <div className={`w-8 h-8 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white text-xs font-semibold`}>
                              {initials}
                            </div>
                          );
                        })()
                      ) : !isOwn ? (
                        <div className="w-8" />
                      ) : null}
                      
                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {isReply && (
                          <div className="mb-1 ml-2 flex items-center gap-1 text-xs text-slate-500">
                            <CornerDownRight className="w-3 h-3" />
                            <span>{msg.reply_to?.content?.substring(0, 30)}...</span>
                          </div>
                        )}
                        
                        <div className={`rounded-2xl px-4 py-2 ${
                          isOwn 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'
                        }`}>
                          {msg.message_type === ChatMessageType.PATIENT_CASE && msg.patient_case_link ? (
                            <div className={`rounded-lg p-2 ${isOwn ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Stethoscope className="w-4 h-4" />
                                <span className="font-medium text-sm">Caso de Paciente</span>
                              </div>
                              <p className="text-sm">{msg.patient_case_link.title}</p>
                              {msg.patient_case_link.patient && (
                                <p className="text-xs opacity-75">{msg.patient_case_link.patient.nombre_completo}</p>
                              )}
                            </div>
                          ) : msg.message_type === ChatMessageType.IMAGE && msg.attachments?.[0] ? (
                            <img 
                              src={msg.attachments[0].file_url} 
                              alt="" 
                              className="rounded-lg max-w-[250px] max-h-[250px] object-cover"
                            />
                          ) : msg.message_type === ChatMessageType.FILE && msg.attachments?.[0] ? (
                            <a 
                              href={msg.attachments[0].file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline"
                            >
                              <File className="w-4 h-4" />
                              <span className="text-sm">{msg.attachments[0].file_name}</span>
                            </a>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </div>
                        
                        <div className={`flex items-center gap-2 mt-1 text-xs text-slate-400 ${isOwn ? 'justify-end' : ''}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.is_edited && <span>(editado)</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File Preview Bar */}
            {pendingFiles.length > 0 && (
              <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 flex flex-wrap gap-2">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex-shrink-0">
                        {f.previewUrl ? (
                          <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <File className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        <button
                          onClick={() => removePendingFile(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate text-center">
                          {f.file.name}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setPendingFiles([]); setFileCaption(''); }}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={fileCaption}
                    onChange={(e) => setFileCaption(e.target.value)}
                    placeholder="Añade un texto..."
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPendingFiles(); } }}
                  />
                  <button
                    onClick={sendPendingFiles}
                    disabled={isUploading}
                    className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                  disabled={isUploading}
                >
                  <Paperclip className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={() => setShowPatientCaseModal(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  <Stethoscope className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                
                <div className="flex-1 relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={1}
                  />
                  {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-80 max-h-80 overflow-hidden z-50">
                      <div className="overflow-y-auto max-h-80 p-2 space-y-2">
                        {emojiCategories.map((cat, ci) => (
                          <div key={cat.name}>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-1 mb-1">{cat.name}</p>
                            <div className="flex flex-wrap gap-0.5">
                              {cat.emojis.map((emoji, ei) => (
                                <button
                                  key={`${ci}-${ei}`}
                                  onClick={() => insertEmoji(emoji)}
                                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-xl ${showEmojiPicker ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  title="Emoji"
                >
                  <SmilePlus className={`w-5 h-5 ${showEmojiPicker ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}`} />
                </button>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
            </div>
            </div>

            {showInfoPanel && (
              <div className="w-72 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto flex-shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-800 dark:text-white">Información</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Participantes</p>
                    <div className="space-y-2">
                      {selectedConversation.participants?.map((p) => {
                        const userInfo = allUsers.find(u => u.id === p.user_id);
                        return (
                          <div key={p.id} className="flex items-center gap-3">
                            {userInfo?.profile_image_url ? (
                              <img src={userInfo.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                {userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : p.user_id.slice(-8)}
                              </p>
                              <p className="text-xs text-slate-400 capitalize">{p.role}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Tipo</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 capitalize">{selectedConversation.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Creado</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {new Date(selectedConversation.created_at).toLocaleDateString('es-HN', { dateStyle: 'long' })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                Selecciona una conversación
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Elige una conversación del panel lateral o inicia una nueva
              </p>
            </div>
          </div>
        )}

      {/* Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {getConversationDisplayName(selectedConversation!)}
              </h2>
              <p className="text-slate-400 text-sm">
                {showCallModal === 'video' ? 'Videollamada' : 'Llamada de voz'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all ${callMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                title={callMuted ? 'Activar micrófono' : 'Silenciar'}
              >
                {callMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={endCall}
                className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
                title="Colgar"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              {showCallModal === 'video' && (
                <button
                  className="p-4 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                  title="Alternar cámara"
                >
                  <Video className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call Active Banner */}
      {callActive && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse" />
            <span className="font-medium">{showCallModal === 'video' ? 'Videollamada' : 'Llamada de voz'} activa</span>
            <span className="text-emerald-200 text-sm">{formatCallTime(callSeconds)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg ${callMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'} transition-all`}
            >
              {callMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={endCall}
              className="p-2 rounded-lg bg-red-500 hover:bg-red-600 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          allUsers={allUsers}
          currentUserId={dbUserId!}
          onClose={() => setShowNewChatModal(false)}
          onCreateConversation={handleCreateConversation}
        />
      )}

      {/* Patient Case Modal */}
      {showPatientCaseModal && selectedConversation && (
        <PatientCaseModal
          onClose={() => setShowPatientCaseModal(false)}
          onLink={handlePatientCaseLink}
        />
      )}
    </div>
  );
}

// New Chat Modal Component
function NewChatModal({
  allUsers,
  currentUserId,
  onClose,
  onCreateConversation
}: {
  allUsers: ChatUser[];
  currentUserId: string;
  onClose: () => void;
  onCreateConversation: (participantIds: string[], type: ChatConversationType, name?: string) => void;
}) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatName, setChatName] = useState('');
  const [chatType, setChatType] = useState<ChatConversationType>(ChatConversationType.DIRECT);

  const handleSubmit = () => {
    if (selectedUsers.length === 0) return;
    onCreateConversation(selectedUsers, chatType, chatName || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Nueva Conversación</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setChatType(ChatConversationType.DIRECT)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  chatType === ChatConversationType.DIRECT
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-2 border-transparent'
                }`}
              >
                Directo
              </button>
              <button
                onClick={() => setChatType(ChatConversationType.GROUP)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  chatType === ChatConversationType.GROUP
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-2 border-transparent'
                }`}
              >
                Grupo
              </button>
            </div>
          </div>

          {chatType === ChatConversationType.GROUP && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nombre del grupo</label>
              <input
                type="text"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Nombre del grupo..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {chatType === ChatConversationType.DIRECT ? 'Seleccionar usuario' : 'Agregar participantes'}
            </label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {allUsers.filter(u => u.id !== currentUserId).map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUsers(prev => 
                      prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                    );
                  }}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                    selectedUsers.includes(u.id)
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-emerald-300'
                  }`}
                >
                  <div className="relative">
                    {u.profile_image_url ? (
                      <img src={u.profile_image_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {selectedUsers.includes(u.id) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-800 dark:text-white">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || (chatType === ChatConversationType.GROUP && !chatName)}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Crear Conversación
          </button>
        </div>
      </div>
    </div>
  );
}

// Patient Case Modal Component
function PatientCaseModal({
  onClose,
  onLink
}: {
  onClose: () => void;
  onLink: (data: { patient_id: string; link_type: PatientCaseLinkType; linked_id: string; title: string; description?: string }) => void;
}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [linkType, setLinkType] = useState<PatientCaseLinkType>(PatientCaseLinkType.GENERAL);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    const candidates = ['patients', 'pacientes', 'users'];
    for (const table of candidates) {
      try {
        const { data: sample, error } = await supabase.from(table).select('*').limit(1);
        if (error) continue;
        const cols = sample?.[0] ? Object.keys(sample[0]) : [];
        const idCol = cols.find(c => /id|ID|paciente/.test(c)) || cols[0];
        const nameCol = cols.find(c => /name|nombre/.test(c)) || cols[1];
        if (!idCol || !nameCol) continue;
        const { data: rows } = await supabase.from(table).select(`${idCol},${nameCol}`).limit(100);
        if (rows) {
          setPatients(rows.map((r: any) => ({
            paciente_id: r[idCol] ?? '',
            nombre_completo: r[nameCol] ?? 'Sin nombre',
            identificacion: '',
          })));
        }
        setLoading(false);
        return;
      } catch {}
    }
    setPatients([]);
    setLoading(false);
  };

  const loadPatientAttachments = async (patientId: string) => {
    setLoading(true);
    try {
      const attachmentsData: any[] = [];

      const [consents, treatments, events] = await Promise.all([
        fetch(`/api/patients/${patientId}/consents`).then(r => r.ok ? r.json() : []),
        fetch(`/api/tratamientos-completados?paciente_id=${patientId}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/patients/${patientId}/events`).then(r => r.ok ? r.json() : [])
      ]);

      attachmentsData.push(
        ...(consents || []).map((c: any) => ({ type: 'consent', id: c.id, title: c.title || 'Consentimiento', data: c })),
        ...(treatments || []).map((t: any) => ({ type: 'treatment', id: t.id, title: t.nombre_tratamiento, data: t })),
        ...(events || []).map((e: any) => ({ type: 'event', id: e.id, title: e.title, data: e }))
      );

      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedPatient) {
      loadPatientAttachments(selectedPatient.paciente_id);
    }
  }, [selectedPatient]);

  const handleSubmit = (attachment: any) => {
    if (!selectedPatient) return;
    
    onLink({
      patient_id: selectedPatient.paciente_id,
      link_type: attachment.type as PatientCaseLinkType,
      linked_id: attachment.id,
      title: attachment.title,
      description: attachment.data?.description
    });
  };

  const getLinkTypeIcon = (type: string) => {
    switch (type) {
      case 'consent': return <FileText className="w-4 h-4" />;
      case 'treatment': return <Stethoscope className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const filteredPatients = patients.filter(p => 
    p.nombre_completo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Vincular Caso de Paciente</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {!selectedPatient ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <p className="text-center text-slate-500">No se encontraron pacientes</p>
                ) : (
                  filteredPatients.map(p => (
                    <button
                      key={p.paciente_id}
                      onClick={() => setSelectedPatient(p)}
                      className="w-full p-3 rounded-xl flex items-center gap-3 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-slate-800 dark:text-white">{p.nombre_completo}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{p.identificacion}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedPatient(null)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" /> Cambiar paciente
              </button>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Paciente: {selectedPatient.nombre_completo}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No hay documentos disponibles para este paciente
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att, index) => (
                    <button
                      key={index}
                      onClick={() => handleSubmit(att)}
                      className="w-full p-3 rounded-xl flex items-center gap-3 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                        {getLinkTypeIcon(att.type)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-slate-800 dark:text-white">{att.title}</p>
                        <p className="text-xs text-slate-500 capitalize">{att.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
