import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
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

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', rateLimiter.auth)
app.use('/api/items', rateLimiter.api)
app.use('/api/otp', otpRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/claims', claimRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`)
  socket.on('authenticate', (_token) => {
    // Authentication handled elsewhere
  })
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`)
  })
})

app.use(errorHandler)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📡 Environment: ${process.env.NODE_ENV}`)
})