import mongoose from 'mongoose'
import { logger } from '../utils/logger'

export const connectDatabase = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-finder'
    await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    logger.info('✅ MongoDB connected successfully')
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error)
    })
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error)
    process.exit(1)
  }
}