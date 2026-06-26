import { Request, Response } from 'express'
import { User } from '../models/User.model'
import { Session } from '../models/Session.model'
import { JWTService } from '../services/jwt.service'
import { emailService } from '../services/email.service'
import { AppError } from '../middleware/error.middleware'

import crypto from 'crypto'

export class AuthController {
  static async register(req: Request, res: Response) {
    const { fullName, email, phone, password } = req.body
    
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new AppError('User already exists', 409)
    }
    
    const user = new User({
      fullName,
      email,
      phone,
      password
    })
    
    await user.save()
    console.log('✅ User saved:', user._id, user.email);
    
    const { accessToken, refreshToken } = JWTService.generateTokens(user._id.toString())
    
    const session = new Session({
      user: user._id,
      token: accessToken,
      refreshToken,
      device: {
        type: req.headers['user-agent'] || 'Unknown',
        os: 'Unknown',
        browser: 'Unknown'
      },
      ipAddress: req.ip || req.socket.remoteAddress || 'Unknown',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
    
    await session.save()
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          identityVerified: user.identityVerified
        },
        accessToken,
        refreshToken
      }
    })
  }
  
  static async login(req: Request, res: Response) {
    const { email, password } = req.body
    
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      throw new AppError('Invalid credentials', 401)
    }
    
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401)
    }
    
    if (!user.isActive) {
      throw new AppError('Account is inactive', 403)
    }
    
    user.lastLogin = new Date()
    await user.save()
    
    const { accessToken, refreshToken } = JWTService.generateTokens(user._id.toString())
    
    const session = new Session({
      user: user._id,
      token: accessToken,
      refreshToken,
      device: {
        type: req.headers['user-agent'] || 'Unknown',
        os: 'Unknown',
        browser: 'Unknown'
      },
      ipAddress: req.ip || req.socket.remoteAddress || 'Unknown',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
    
    await session.save()
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          identityVerified: user.identityVerified,
          preferences: user.preferences,
          privacy: user.privacy,
          twoFactorEnabled: user.twoFactorEnabled
        },
        accessToken,
        refreshToken
      }
    })
  }
  
  static async logout(req: any, res: Response) {
    const { session } = req
    
    if (session) {
      session.isActive = false
      await session.save()
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  }
  
  static async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      throw new AppError('Refresh token required', 400)
    }
    
    try {
      const decoded = JWTService.verifyToken(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as any
      
      const session = await Session.findOne({
        refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
      })
      
      if (!session) {
        throw new AppError('Invalid refresh token', 401)
      }
      
      const user = await User.findById(decoded.userId)
      if (!user || !user.isActive) {
        throw new AppError('User not found', 401)
      }
      
      const { accessToken, refreshToken: newRefreshToken } = JWTService.generateTokens(
        user._id.toString()
      )
      
      session.token = accessToken
      session.refreshToken = newRefreshToken
      await session.save()
      
      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken
        }
      })
    } catch (error) {
      throw new AppError('Invalid refresh token', 401)
    }
  }
  
  static async getProfile(req: any, res: Response) {
    const user = await User.findById(req.user._id)
    
    res.json({
      success: true,
      data: user
    })
  }
  
  static async updateProfile(req: any, res: Response) {
    const updates = req.body
    const user = await User.findById(req.user._id)
    
    if (!user) {
      throw new AppError('User not found', 404)
    }
    
    const allowedFields = ['fullName', 'phone', 'bio', 'preferences', 'privacy']
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (user as any)[field] = updates[field]
      }
    })
    
    await user.save()
    
    res.json({
      success: true,
      data: user
    })
  }
  
  static async changePassword(req: any, res: Response) {
    const { currentPassword, newPassword } = req.body
    
    const user = await User.findById(req.user._id).select('+password')
    if (!user) {
      throw new AppError('User not found', 404)
    }
    
    const isPasswordValid = await user.comparePassword(currentPassword)
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401)
    }
    
    user.password = newPassword
    await user.save()
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  }
  
  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body
    
    const user = await User.findOne({ email })
    if (!user) {
      throw new AppError('User not found', 404)
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    
   await emailService.sendPasswordResetOTP(email, resetToken)
    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    })
  }
}