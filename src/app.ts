import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import verificationRoutes from './routes/verification.routes'
import { createServer } from 'http'
import { initSocket } from './socket'
import { connectDatabase } from './config/database'
import { connectRedis } from './config/redis'
import { errorHandler } from './middleware/error.middleware'
import { rateLimiter } from './middleware/rateLimit.middleware'
import { logger } from './utils/logger'
import otpRoutes from './routes/otp.routes'

import authRoutes from './routes/auth.routes'
import itemRoutes from './routes/item.routes'
import claimRoutes from './routes/claim.routes'
import notificationRoutes from './routes/notification.routes'
import userRoutes from './routes/user.routes'
import adminRoutes from './routes/admin.routes'
import mongoose from 'mongoose'

dotenv.config()

const app = express()
const server = createServer(app)

const io = initSocket(server)

// ============================================
// DATABASE CONNECTIONS
// ============================================

const connectDB = async () => {
  try {
    await connectDatabase()
    logger.info('✅ MongoDB connected successfully')
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error)
  }
}

const connectRedisClient = async () => {
  try {
    await connectRedis()
  } catch (error) {
    logger.warn('⚠️ Redis connection failed - running without Redis:', error)
  }
}

connectDB()
connectRedisClient()

// ============================================
// CORS CONFIGURATION - FIXED
// ============================================

// ✅ Explicitly list all allowed origins (including production frontend)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://secure-finder.vercel.app',          // <-- Your production frontend
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD
].filter(Boolean) as string[]

// Log the allowed origins for debugging
console.log('✅ Allowed CORS origins:', allowedOrigins)

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true)
    }

    // In development, allow all for easier testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }

    // Check if origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200
}

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}))

// ✅ CORS middleware must come before any routes
app.use(cors(corsOptions))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'unknown'}`)
  next()
})

// ============================================
// HEALTH CHECK - Enhanced
// ============================================

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'https://secure-finder.vercel.app',
    backendUrl: process.env.BACKEND_URL || 'https://secure-finder-backend.onrender.com',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  })
})

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (_req, res) => {
  res.json({
    message: 'Secure Finder Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'https://secure-finder.vercel.app',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      items: '/api/items',
      claims: '/api/claims',
      notifications: '/api/notifications',
      otp: '/api/otp',
      admin: '/api/admin',
      verification: '/api/auth/verification'
    },
    status: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  })
})

// ============================================
// TEST ENDPOINT (for debugging)
// ============================================

app.get('/test', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is reachable',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins: allowedOrigins
    }
  })
})

// ============================================
// ROUTES
// ============================================

app.use('/api/auth/verification', verificationRoutes)
app.use('/api/otp', otpRoutes)

app.use('/api/auth', authRoutes)
app.use('/api/items', rateLimiter.api, itemRoutes)
app.use('/api/claims', rateLimiter.api, claimRoutes)
app.use('/api/notifications', rateLimiter.api, notificationRoutes)
app.use('/api/users', rateLimiter.api, userRoutes)
app.use('/api/admin', rateLimiter.api, adminRoutes)

// ============================================
// SOCKET.IO
// ============================================

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`)
  socket.on('authenticate', (token) => {
    logger.info(`Socket authenticated: ${socket.id}`)
  })
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`)
  })
})

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  })
})

// ============================================
// ERROR HANDLER
// ============================================

app.use(errorHandler)

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000
const serverInstance = server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'https://secure-finder.vercel.app'}`)
  logger.info(`🔗 Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`)
  logger.info(`✅ CORS enabled for origins:`, allowedOrigins)
  logger.info(`📊 Health check: http://localhost:${PORT}/health`)
  logger.info(`🧪 Test endpoint: http://localhost:${PORT}/test`)
})

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server')
  serverInstance.close(() => {
    logger.info('HTTP server closed')
    mongoose.connection.close().then(() => {
      logger.info('MongoDB connection closed')
      process.exit(0)
    }).catch((err) => {
      logger.error('Error closing MongoDB connection:', err)
      process.exit(1)
    })
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server')
  serverInstance.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })
})

// Unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

export default app