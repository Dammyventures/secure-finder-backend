export const Constants = {
  // User Roles
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator'
  },

  // Item Status
  ITEM_STATUS: {
    OPEN: 'open',
    CLAIMED: 'claimed',
    MATCHED: 'matched',
    RESOLVED: 'resolved',
    CLOSED: 'closed'
  },

  // Item Types
  ITEM_TYPES: {
    LOST: 'lost',
    FOUND: 'found'
  },

  // Claim Status
  CLAIM_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    COMPLETED: 'completed'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    ITEM_MATCHED: 'item_matched',
    CLAIM_UPDATED: 'claim_updated',
    MESSAGE: 'message',
    SYSTEM: 'system',
    ALERT: 'alert'
  },

  // Categories
  CATEGORIES: [
    'electronics',
    'jewelry',
    'clothing',
    'documents',
    'keys',
    'bags',
    'phones',
    'laptops',
    'other'
  ],

  // Verification Methods
  VERIFICATION_METHODS: {
    EMAIL: 'email',
    SMS: 'sms',
    AUTHENTICATOR: 'authenticator'
  },

  // Profile Visibility
  PROFILE_VISIBILITY: {
    PUBLIC: 'public',
    CONTACTS: 'contacts',
    PRIVATE: 'private'
  },

  // Themes
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
  },

  // Measurement Systems
  MEASUREMENT_SYSTEMS: {
    METRIC: 'metric',
    IMPERIAL: 'imperial'
  },

  // Date Formats
  DATE_FORMATS: {
    MM_DD_YYYY: 'MM/DD/YYYY',
    DD_MM_YYYY: 'DD/MM/YYYY',
    YYYY_MM_DD: 'YYYY-MM-DD'
  },

  // Currencies
  CURRENCIES: {
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    JPY: 'JPY',
    CAD: 'CAD',
    AUD: 'AUD'
  },

  // Languages
  LANGUAGES: {
    EN: 'en',
    ES: 'es',
    FR: 'fr',
    DE: 'de',
    ZH: 'zh',
    JA: 'ja'
  },

  // Timezones
  TIMEZONES: [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo'
  ],

  // Error Messages
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    INTERNAL_ERROR: 'Internal server error',
    DUPLICATE_ENTRY: 'Duplicate entry',
    INVALID_CREDENTIALS: 'Invalid credentials',
    SESSION_EXPIRED: 'Session expired',
    TOKEN_INVALID: 'Invalid token',
    TOKEN_EXPIRED: 'Token expired',
    USER_NOT_FOUND: 'User not found',
    ITEM_NOT_FOUND: 'Item not found',
    CLAIM_NOT_FOUND: 'Claim not found',
    ALREADY_CLAIMED: 'Item already claimed',
    NOT_OWNER: 'You are not the owner',
    VERIFICATION_REQUIRED: 'Identity verification required',
    ADMIN_REQUIRED: 'Admin access required'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    LOGIN_SUCCESS: 'Login successful',
    REGISTER_SUCCESS: 'Registration successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
    ITEM_CREATED: 'Item created successfully',
    ITEM_UPDATED: 'Item updated successfully',
    ITEM_DELETED: 'Item deleted successfully',
    CLAIM_CREATED: 'Claim submitted successfully',
    CLAIM_UPDATED: 'Claim updated successfully',
    NOTIFICATION_SENT: 'Notification sent successfully'
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // File Upload
  UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    MAX_FILES: 10
  },

  // Cache
  CACHE: {
    TTL: 3600, // 1 hour
    ITEMS_KEY: 'items',
    USER_KEY: 'user',
    SESSION_KEY: 'session'
  },

  // Rate Limiting
  RATE_LIMIT: {
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX: 10
    },
    API: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX: 60
    },
    STRICT: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX: 5
    }
  },

  // JWT
  JWT: {
    ACCESS_EXPIRES: '7d',
    REFRESH_EXPIRES: '30d'
  },

  // Security
  SECURITY: {
    BCRYPT_ROUNDS: 12,
    ENCRYPTION_ALGORITHM: 'aes-256-gcm',
    BACKUP_CODES_COUNT: 10
  },

  // Email
  EMAIL: {
    FROM: 'noreply@securefinder.com',
    VERIFICATION_EXPIRES: 15 * 60 * 1000, // 15 minutes
    RESET_EXPIRES: 60 * 60 * 1000 // 1 hour
  },

  // Socket Events
  SOCKET_EVENTS: {
    CONNECT: 'connection',
    DISCONNECT: 'disconnect',
    AUTHENTICATE: 'authenticate',
    NOTIFICATION: 'notification',
    ITEM_UPDATE: 'item_update',
    CLAIM_UPDATE: 'claim_update',
    MATCH_FOUND: 'match_found',
    TYPING: 'typing',
    MESSAGE: 'message'
  },

  // Regular Expressions
  REGEX: {
    EMAIL: /^\S+@\S+\.\S+$/,
    PHONE: /^\+?[\d\s-]{10,}$/,
    PASSWORD: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
    URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    SECURE_CODE: /^[A-Z0-9]{6}$/,
    OBJECT_ID: /^[0-9a-fA-F]{24}$/
  },

  // Default Values
  DEFAULTS: {
    LANGUAGE: 'en',
    TIMEZONE: 'UTC',
    DATE_FORMAT: 'MM/DD/YYYY',
    CURRENCY: 'USD',
    MEASUREMENT_SYSTEM: 'metric',
    THEME: 'auto',
    PROFILE_VISIBILITY: 'contacts'
  }
} as const

export type Category = typeof Constants.CATEGORIES[number]
export type ItemStatus = typeof Constants.ITEM_STATUS[keyof typeof Constants.ITEM_STATUS]
export type ItemType = typeof Constants.ITEM_TYPES[keyof typeof Constants.ITEM_TYPES]
export type ClaimStatus = typeof Constants.CLAIM_STATUS[keyof typeof Constants.CLAIM_STATUS]
export type NotificationType = typeof Constants.NOTIFICATION_TYPES[keyof typeof Constants.NOTIFICATION_TYPES]
export type ProfileVisibility = typeof Constants.PROFILE_VISIBILITY[keyof typeof Constants.PROFILE_VISIBILITY]
export type Theme = typeof Constants.THEMES[keyof typeof Constants.THEMES]