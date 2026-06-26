import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  details?: any

  constructor(message: string, statusCode: number, isOperational = true, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,        // renamed to _req
  res: Response,
  _next: NextFunction   // renamed to _next
): any => {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { statusCode: err.statusCode })
    return res.status(err.statusCode).json({
      error: err.message,
      status: 'error',
      details: err.details
    })
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: (err as any).errors
    })
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      field: Object.keys((err as any).keyPattern)[0]
    })
  }

  logger.error('Unhandled error:', err)
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
}