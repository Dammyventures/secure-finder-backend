import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.model'
import { Session } from '../models/Session.model'
import { logger } from '../utils/logger'

export interface AuthRequest extends Request {
  user?: any
  session?: any
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    
    const token = authHeader.split(' ')[1]
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const session = await Session.findOne({
      token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    
    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' })
      return
    }
    
    const user = await User.findById(decoded.userId)
    
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive' })
      return
    }
    
    session.lastActive = new Date()
    await session.save()
    
    req.user = user
    req.session = session
    
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' })
      return
    }
    
    logger.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const requireVerified = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user.identityVerified) {
    res.status(403).json({ 
      error: 'Identity verification required',
      redirect: '/verify'
    })
    return
  }
  next()
}

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}