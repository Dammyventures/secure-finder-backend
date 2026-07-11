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

dotenv.config()

const app = express()
const server = createServer(app)

const io = initSocket(server)

connectDatabase()
connectRedis()

// CORS Configuration - Allow both localhost and production domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://secure-finder.vercel.app',
  'https://secure-finder.vercel.app/',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD
].filter(Boolean) // Remove any undefined values

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true)
    } else {
      logger.warn(`❌ CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}))

app.use('/api/auth/verification', verificationRoutes)
// CORS middleware
app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'unknown'}`)
  next()
})

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL || 'https://secure-finder.vercel.app'
  })
})

// Root endpoint
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
      admin: '/api/admin'
    }
  })
})

// Routes with rate limiting
app.use('/api/auth', rateLimiter.auth)
app.use('/api/items', rateLimiter.api)
app.use('/api/otp', otpRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/claims', claimRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`)
  
  socket.on('authenticate', (token) => {
    // Authentication handled elsewhere
    logger.info(`Socket authenticated: ${socket.id}`)
  })
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`)
  })
})

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  })
})

// Error handling middleware
app.use(errorHandler)

const PORT = process.env.PORT || 5000
const serverInstance = server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'https://secure-finder.vercel.app'}`)
  logger.info(`🔗 Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`)
  logger.info(`✅ CORS enabled for origins:`, allowedOrigins)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server')
  serverInstance.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })
})

export default app