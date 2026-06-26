import rateLimit from 'express-rate-limit'
import { AppError } from './error.middleware'

export const rateLimiter = {
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: 'Too many authentication attempts, please try again later.',
    handler: () => {
      throw new AppError('Too many authentication attempts, please try again later.', 429)
    }
  }),
  
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many requests, please slow down.',
    handler: () => {
      throw new AppError('Too many requests, please slow down.', 429)
    }
  }),
  
  strict: rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many requests, please try again later.',
    handler: () => {
      throw new AppError('Too many requests, please try again later.', 429)
    }
  })
}