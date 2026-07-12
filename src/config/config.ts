import dotenv from 'dotenv'
import { Constants } from '../utils/constants'

dotenv.config()

export const config = {
  // Server
  server: {
    port: parseInt(process.env.PORT || '5000'),
    env: process.env.NODE_ENV || 'development',
    apiUrl: process.env.API_URL || 'https://secure-finder-backend.onrender.com/api',
    frontendUrl: process.env.FRONTEND_URL || 'https://secure-finder.vercel.app/'
  },

  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-finder',
    options: {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: Constants.CACHE.TTL
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-this',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-this',
    accessExpires: process.env.JWT_EXPIRES_IN || Constants.JWT.ACCESS_EXPIRES,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN || Constants.JWT.REFRESH_EXPIRES
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || Constants.EMAIL.FROM
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  },

  // Security
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || String(Constants.SECURITY.BCRYPT_ROUNDS)),
    backupCodesCount: Constants.SECURITY.BACKUP_CODES_COUNT
  },

  // Rate Limiting
  rateLimit: {
    auth: Constants.RATE_LIMIT.AUTH,
    api: Constants.RATE_LIMIT.API,
    strict: Constants.RATE_LIMIT.STRICT
  },

  // Upload
  upload: {
    maxSize: Constants.UPLOAD.MAX_SIZE,
    allowedTypes: Constants.UPLOAD.ALLOWED_TYPES,
    maxFiles: Constants.UPLOAD.MAX_FILES
  },

  // AI
  ai: {
    apiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY || ''
  },

  // Pagination
  pagination: {
    defaultPage: Constants.PAGINATION.DEFAULT_PAGE,
    defaultLimit: Constants.PAGINATION.DEFAULT_LIMIT,
    maxLimit: Constants.PAGINATION.MAX_LIMIT
  },

  // Defaults
  defaults: Constants.DEFAULTS,

  // Features
  features: {
    enableAI: process.env.ENABLE_AI === 'true',
    enableTwoFactor: process.env.ENABLE_TWO_FACTOR !== 'false',
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION !== 'false',
    enableSMS: process.env.ENABLE_SMS === 'true'
  }
} as const

export type Config = typeof config