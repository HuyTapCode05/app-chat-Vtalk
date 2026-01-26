
export const API_TIMEOUT = 10000; 
export const DEFAULT_PAGE_SIZE = 50;

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  REPLY: 'reply',
};

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent', 
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
};

export const CONVERSATION_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group',
};

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const COLORS = {
  PRIMARY: '#00B14F',
  PRIMARY_DARK: '#008037',
  PRIMARY_LIGHT: '#E6F9EE',
  SECONDARY: '#008037',
  DANGER: '#FF3B30',
  WARNING: '#FF9500',
  INFO: '#007AFF',
  SUCCESS: '#34C759',
  TEXT_PRIMARY: '#1F2933',
  TEXT_SECONDARY: '#6B7280',
  TEXT_TERTIARY: '#9CA3AF',
  BACKGROUND: '#F2F4F7',
  CARD_BACKGROUND: '#FFFFFF',
  WHITE: '#FFFFFF',
  BORDER: '#E5E7EB',
  SHADOW: 'rgba(15, 23, 42, 0.08)',
  CLOSE_FRIEND: '#FFD700',
  
  // Theme-aware colors helper (use these with theme context)
  getThemeColors: (theme) => ({
    primary: theme.primary,
    background: theme.background,
    surface: theme.surface,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    messageOwn: theme.messageOwn,
    messageOther: theme.messageOther,
  }),
};

export const RADIUS = {
  XS: 6,
  SM: 10,
  MD: 14,
  LG: 20,
  XL: 28,
};

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 24,
};

export const SHADOWS = {
  CARD: {
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Socket Events
export const SOCKET_EVENTS = {
  // Connection
  JOIN: 'join',
  LEAVE: 'leave',
  
  // Messages
  SEND_MESSAGE: 'send-message',
  NEW_MESSAGE: 'new-message',
  MESSAGE_RECALLED: 'message-recalled',
  MARK_READ: 'mark-read',
  TYPING: 'typing',
  TYPING_STOP: 'typing-stop',
  
  // Conversations
  JOIN_CONVERSATION: 'join-conversation',
  LEAVE_CONVERSATION: 'leave-conversation',
  CONVERSATION_UPDATED: 'conversation-updated',
  
  // Calls
  CALL_REQUEST: 'call-request',
  CALL_ACCEPT: 'call-accept',
  CALL_REJECT: 'call-reject',
  CALL_END: 'call-end',
  INCOMING_CALL: 'incoming-call',
  CALL_ACCEPTED: 'call-accepted',
  CALL_REJECTED: 'call-rejected',
  CALL_ENDED: 'call-ended',
  
  // WebRTC
  WEBRTC_OFFER: 'webrtc-offer',
  WEBRTC_ANSWER: 'webrtc-answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc-ice-candidate',
  
  // User Status
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
  USER_AVATAR_UPDATED: 'user-avatar-updated',
  USER_COVER_UPDATED: 'user-cover-updated',
  
  // Errors
  ERROR: 'error',
};

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};

// Validation
export const VALIDATION = {
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  MIN_PASSWORD_LENGTH: 6,
  MAX_MESSAGE_LENGTH: 500,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

// Date Formats
export const DATE_FORMATS = {
  TIME: 'HH:mm',
  DATE: 'DD/MM/YYYY',
  DATETIME: 'DD/MM/YYYY HH:mm',
};

