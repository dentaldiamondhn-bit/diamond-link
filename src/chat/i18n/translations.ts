/**
 * Lightweight chat i18n (Option A from the plan).
 *
 * Keep the dictionary shape typed: adding a `TranslationKey` requires both
 * locales to provide it, so missing strings fail at compile time.
 *
 * Sealed interface: components should only ever call `useTranslations()` from
 * `./useTranslations`. If we later adopt Lingui app-wide, only this file and the
 * hook need to change.
 */

export type ChatLocale = 'en' | 'es';

const en = {
  sidebarTitle: 'Chats',
  searchPlaceholder: 'Search conversations...',
  emptyConversations: 'No conversations yet',
  startNewChat: 'Start a conversation',
  newChat: 'New Chat',
  newChatDirect: 'Direct',
  newChatGroup: 'Group',
  groupName: 'Group name',
  groupNamePlaceholder: 'Group name...',
  selectUser: 'Select a user',
  addParticipants: 'Add participants',
  createConversation: 'Create conversation',
  noUsersAvailable: 'No users available to start a chat',
  loading: 'Loading...',
  emptyMessages: 'No messages yet',
  sendFirstMessage: 'Send the first message',
  selectConversation: 'Tap a chat to start messaging.',
  selectConversationHint: 'Pick from your existing conversations, or start a new one',
  typeMessage: 'Type a message...',
  addCaption: 'Add a caption...',
  send: 'Send',
  online: 'Online',
  offline: 'Offline',
  typing: 'is typing...',
  typingMulti: 'are typing...',
  typingAndMore: 'and {n} more',
  members: '{n} members',
  participants: 'Participants',
  type: 'Type',
  created: 'Created',
  pin: 'Pin conversation',
  unpin: 'Unpin conversation',
  archive: 'Archive conversation',
  unarchive: 'Unarchive conversation',
  deleteConversation: 'Delete conversation',
  deleteConversationConfirm: 'Are you sure you want to delete this conversation?',
  edited: 'edited',
  reply: 'Reply',
  replyingTo: 'Replying to',
  editMessage: 'Edit message',
  deleteMessage: 'Delete message',
  deleteMessageConfirm: 'Are you sure you want to delete this message?',
  save: 'Save',
  cancel: 'Cancel',
  addReaction: 'Add reaction',
  moreActions: 'More actions',
  patientCase: 'Patient Case',
  imageMessage: 'Image',
  fileMessage: 'File',
  systemMessage: 'System',
  noMessages: 'No messages',
  voiceMessage: 'Voice message',
  groupPeople: 'Smileys & People',
  groupNature: 'Animals & Nature',
  groupFoods: 'Food & Drink',
  groupActivity: 'Activity',
  groupPlaces: 'Travel & Places',
  groupObjects: 'Objects',
  groupSymbols: 'Symbols',
  groupFlags: 'Flags',
} as const;

const es: Record<keyof typeof en, string> = {
  sidebarTitle: 'Chats',
  searchPlaceholder: 'Buscar conversaciones...',
  emptyConversations: 'No hay conversaciones',
  startNewChat: 'Iniciar conversación',
  newChat: 'Nueva Conversación',
  newChatDirect: 'Directo',
  newChatGroup: 'Grupo',
  groupName: 'Nombre del grupo',
  groupNamePlaceholder: 'Nombre del grupo...',
  selectUser: 'Seleccionar usuario',
  addParticipants: 'Agregar participantes',
  createConversation: 'Crear Conversación',
  noUsersAvailable: 'No hay usuarios disponibles para iniciar un chat',
  loading: 'Cargando...',
  emptyMessages: 'Sin mensajes aún',
  sendFirstMessage: 'Envía el primer mensaje',
  selectConversation: 'Selecciona un chat para comenzar a enviar mensajes.',
  selectConversationHint: 'Elige una de tus conversaciones existentes o inicia una nueva',
  typeMessage: 'Escribe un mensaje...',
  addCaption: 'Añade un texto...',
  send: 'Enviar',
  online: 'En línea',
  offline: 'Desconectado',
  typing: 'está escribiendo...',
  typingMulti: 'están escribiendo...',
  typingAndMore: 'y {n} más',
  members: '{n} participantes',
  participants: 'Participantes',
  type: 'Tipo',
  created: 'Creado',
  pin: 'Fijar conversación',
  unpin: 'Desfijar conversación',
  archive: 'Archivar conversación',
  unarchive: 'Desarchivar conversación',
  deleteConversation: 'Eliminar conversación',
  deleteConversationConfirm: '¿Estás seguro de eliminar esta conversación?',
  edited: 'editado',
  reply: 'Responder',
  replyingTo: 'Respondiendo a',
  editMessage: 'Editar mensaje',
  deleteMessage: 'Eliminar mensaje',
  deleteMessageConfirm: '¿Estás seguro de eliminar este mensaje?',
  save: 'Guardar',
  cancel: 'Cancelar',
  addReaction: 'Añadir reacción',
  moreActions: 'Más opciones',
  patientCase: 'Caso de Paciente',
  imageMessage: 'Imagen',
  fileMessage: 'Archivo',
  systemMessage: 'Sistema',
  noMessages: 'Sin mensajes',
  voiceMessage: 'Nota de voz',
  groupPeople: 'Emoticonos y Personas',
  groupNature: 'Animales y Naturaleza',
  groupFoods: 'Comida y Bebida',
  groupActivity: 'Actividades',
  groupPlaces: 'Viajes y Destinos',
  groupObjects: 'Objetos',
  groupSymbols: 'Símbolos',
  groupFlags: 'Banderas',
};

export type TranslationKey = keyof typeof en;

export const translations: Record<ChatLocale, Record<TranslationKey, string>> = { en, es };

export function getChatLocale(value: string | null | undefined): ChatLocale {
  return value === 'en' ? 'en' : 'es';
}

/** Interpolate simple `{key}` params into a template string. */
export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}