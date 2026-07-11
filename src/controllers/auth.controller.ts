import { Request, Response } from 'express'
import { User } from '../models/User.model'
import { Session } from '../models/Session.model'
import { OTP } from '../models/OTP.model'
import { JWTService } from '../services/jwt.service'
import { emailService } from '../services/email.service'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'
import crypto from 'crypto'

export class AuthController {
  // ===================== REGISTER =====================
  static async register(req: Request, res: Response) {
    const { fullName, email, phone, password } = req.body

    // Validate required fields
    if (!fullName || !email || !phone || !password) {
      throw new AppError('All fields are required', 400)
    }

    // Check if user exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new AppError('User already exists', 409)
    }

    // Create user (identity fields are optional)
    const user = new User({
      fullName,
      email,
      phone,
      password,
      accountStatus: 'pending_verification',
      isEmailVerified: false
    })

    await user.save()
    logger.info(`✅ User registered: ${user.email} (ID: ${user._id})`)

    // Generate JWT tokens (optional for registration response)
    const { accessToken, refreshToken } = JWTService.generateTokens(user._id.toString())

    // Create session
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

    // Generate and send OTP for email verification
    try {
      const otpCode = crypto.randomInt(100000, 999999).toString()
      const otp = new OTP({
        email: user.email,
        code: otpCode,
        type: 'verification',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      })
      await otp.save()

      // Send OTP email
      await emailService.sendVerificationOTP(user.email, otpCode)
      logger.info(`📧 OTP sent to ${user.email}`)
    } catch (error) {
      logger.error('Failed to send OTP:', error)
      // Continue registration – user can resend OTP later
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          identityVerified: user.identityVerified,
          isEmailVerified: user.isEmailVerified,
          accountStatus: user.accountStatus
        },
        accessToken,
        refreshToken
      }
    })
  }

  // ===================== LOGIN =====================
  static async login(req: Request, res: Response) {
    const { email, password } = req.body

    if (!email || !password) {
      throw new AppError('Email and password are required', 400)
    }

    // Find user with password field
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      throw new AppError('Invalid credentials', 401)
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401)
    }

    // Check account status
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403)
    }
    if (user.accountStatus === 'suspended') {
      throw new AppError('Account suspended', 403)
    }
    if (user.accountStatus === 'banned') {
      throw new AppError('Account banned', 403)
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate tokens
    const { accessToken, refreshToken } = JWTService.generateTokens(user._id.toString())

    // Create session
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
          isEmailVerified: user.isEmailVerified,
          accountStatus: user.accountStatus,
          preferences: user.preferences,
          privacy: user.privacy,
          twoFactorEnabled: user.twoFactorEnabled
        },
        accessToken,
        refreshToken
      }
    })
  }

  // ===================== LOGOUT =====================
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

  // ===================== REFRESH TOKEN =====================
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

  // ===================== GET PROFILE =====================
  static async getProfile(req: any, res: Response) {
    const user = await User.findById(req.user._id)
    if (!user) {
      throw new AppError('User not found', 404)
    }
    res.json({
      success: true,
      data: user
    })
  }

  // ===================== UPDATE PROFILE =====================
  static async updateProfile(req: any, res: Response) {
    const updates = req.body
    const user = await User.findById(req.user._id)
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Allowed fields (no identity fields)
    const allowedFields = ['fullName', 'phone', 'bio', 'preferences', 'privacy', 'profileImage']
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

  // ===================== CHANGE PASSWORD =====================
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

  // ===================== FORGOT PASSWORD =====================
  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    // Send email with token
    await emailService.sendPasswordResetOTP(email, resetToken)

    // Store token in DB (if you have fields)
    // user.resetPasswordToken = resetToken
    // user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000)
    // await user.save()

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    })
  }
}

export const authController = AuthController