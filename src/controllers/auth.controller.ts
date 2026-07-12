import { Request, Response } from 'express'
import { User } from '../models/User.model'
import { Session } from '../models/Session.model'
import { OTP } from '../models/OTP.model'
import { JWTService } from '../services/jwt.service'
import { emailService } from '../services/email.service'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'
import crypto from 'crypto'

// ============================================
// 🔧 Helper: Promise timeout
// ============================================
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    )
  ])
}

export class AuthController {
  // ============================================
  // 📝 REGISTER - with OTP and timeout protection
  // ============================================
  static async register(req: Request, res: Response) {
    console.log('📝 ===== REGISTER REQUEST =====')
    console.log('📝 Request body:', req.body)

    const { fullName, email, phone, password } = req.body

    // ✅ Validate required fields
    const missingFields: string[] = []
    if (!fullName) missingFields.push('fullName')
    if (!email) missingFields.push('email')
    if (!phone) missingFields.push('phone')
    if (!password) missingFields.push('password')

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields)
      throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400)
    }

    // ✅ Check if user exists
    try {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        console.warn('⚠️ User already exists:', email)
        throw new AppError('User with this email already exists. Please login instead.', 409)
      }
    } catch (error: any) {
      if (error instanceof AppError) throw error
      console.error('❌ Database error checking user:', error)
      throw new AppError('Database error. Please try again.', 500)
    }

    // ✅ Create user
    let user
    try {
      user = new User({
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password: password,
        accountStatus: 'pending_verification',
        isEmailVerified: false,
        isPhoneVerified: false,
        verificationScore: 0,
        identityVerified: false
      })

      await user.save()
      console.log(`✅ User saved successfully: ${user.email} (ID: ${user._id})`)
      logger.info(`✅ User registered: ${user.email} (ID: ${user._id})`)
    } catch (error: any) {
      console.error('❌ Error saving user:', error)
      if (error.code === 11000) {
        throw new AppError('Email already registered. Please login.', 409)
      }
      throw new AppError('Failed to create account. Please try again.', 500)
    }

    // ✅ Generate tokens
    let accessToken: string, refreshToken: string
    try {
      const tokens = JWTService.generateTokens(user._id.toString())
      accessToken = tokens.accessToken
      refreshToken = tokens.refreshToken
      console.log('✅ Tokens generated successfully')
    } catch (error) {
      console.error('❌ Error generating tokens:', error)
      throw new AppError('Failed to generate authentication tokens', 500)
    }

    // ✅ Create session
    try {
      const session = new Session({
        user: user._id,
        token: accessToken,
        refreshToken: refreshToken,
        device: {
          type: req.headers['user-agent'] || 'Unknown',
          os: 'Unknown',
          browser: 'Unknown'
        },
        ipAddress: req.ip || req.socket.remoteAddress || 'Unknown',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
      await session.save()
      console.log('✅ Session created successfully')
    } catch (error) {
      console.error('❌ Error creating session:', error)
      // Continue – session is not critical for immediate login
    }

    // ============================================
    // 📧 SEND OTP WITH TIMEOUT PROTECTION
    // ============================================
    let otpSent = false
    try {
      const otpCode = crypto.randomInt(100000, 999999).toString()
      console.log(`📧 Generated OTP: ${otpCode} for ${user.email}`)

      const otp = new OTP({
        email: user.email,
        code: otpCode,
        type: 'verification',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      })
      await otp.save()
      console.log('✅ OTP saved to database')

      // 🔥 Try to send email, but timeout after 5 seconds
      await withTimeout(
        emailService.sendVerificationOTP(user.email, otpCode),
        5000
      )
      console.log(`📧 OTP email sent to ${user.email}`)
      logger.info(`📧 OTP sent to ${user.email}`)
      otpSent = true
    } catch (error) {
      console.error('❌ Failed to send OTP (registration continues):', error)
      logger.error('Failed to send OTP:', error)
      // ⚠️ We do NOT throw – registration still succeeds.
      // The user can request a new OTP via the /api/otp/resend endpoint.
    }

    // ✅ Success response (always returns quickly)
    console.log('✅ Registration complete for:', user.email)

    res.status(201).json({
      success: true,
      message: otpSent
        ? 'Account created successfully. Please verify your email.'
        : 'Account created. However, we could not send the OTP email. Please request a new OTP from the verification page.',
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
        refreshToken,
        otpSent
      }
    })
  }

  // ============================================
  // 🔐 LOGIN
  // ============================================
  static async login(req: Request, res: Response) {
    console.log('🔐 ===== LOGIN REQUEST =====')
    console.log('🔐 Login for:', req.body.email)

    const { email, password } = req.body

    if (!email || !password) {
      console.error('❌ Missing email or password')
      throw new AppError('Email and password are required', 400)
    }

    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
      if (!user) {
        console.warn('⚠️ User not found:', email)
        throw new AppError('Invalid credentials', 401)
      }

      console.log('✅ User found:', user.email)

      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        console.warn('⚠️ Invalid password for:', email)
        throw new AppError('Invalid credentials', 401)
      }

      console.log('✅ Password valid')

      if (!user.isActive) {
        console.warn('⚠️ Account inactive:', email)
        throw new AppError('Account is inactive. Please contact support.', 403)
      }

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      // Generate tokens
      const { accessToken, refreshToken } = JWTService.generateTokens(user._id.toString())
      console.log('✅ Tokens generated')

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
      console.log('✅ Session created')

      console.log('✅ Login complete for:', user.email)

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
    } catch (error: any) {
      console.error('❌ Login error:', error)
      if (error instanceof AppError) throw error
      throw new AppError('Login failed. Please try again.', 500)
    }
  }

  // ============================================
  // 🚪 LOGOUT
  // ============================================
  static async logout(req: any, res: Response) {
    console.log('🚪 Logout request')
    try {
      const { session } = req
      if (session) {
        session.isActive = false
        await session.save()
        console.log('✅ Session deactivated')
      }
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  }

  // ============================================
  // 🔄 REFRESH TOKEN
  // ============================================
  static async refreshToken(req: Request, res: Response) {
    console.log('🔄 Refresh token request')
    const { refreshToken } = req.body

    if (!refreshToken) {
      console.error('❌ No refresh token provided')
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
        console.warn('⚠️ Invalid refresh token')
        throw new AppError('Invalid refresh token', 401)
      }

      const user = await User.findById(decoded.userId)
      if (!user || !user.isActive) {
        console.warn('⚠️ User not found or inactive')
        throw new AppError('User not found', 401)
      }

      const { accessToken, refreshToken: newRefreshToken } = JWTService.generateTokens(
        user._id.toString()
      )

      session.token = accessToken
      session.refreshToken = newRefreshToken
      await session.save()

      console.log('✅ Token refreshed for:', user.email)

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken
        }
      })
    } catch (error: any) {
      console.error('❌ Refresh token error:', error)
      throw new AppError('Invalid refresh token', 401)
    }
  }

  // ============================================
  // 👤 GET PROFILE
  // ============================================
  static async getProfile(req: any, res: Response) {
    console.log('👤 Get profile request')
    try {
      const user = await User.findById(req.user._id)
      if (!user) {
        console.warn('⚠️ User not found:', req.user._id)
        throw new AppError('User not found', 404)
      }
      console.log('✅ Profile retrieved for:', user.email)
      res.json({
        success: true,
        data: user
      })
    } catch (error: any) {
      console.error('❌ Get profile error:', error)
      if (error instanceof AppError) throw error
      throw new AppError('Failed to get profile', 500)
    }
  }

  // ============================================
  // 📝 UPDATE PROFILE
  // ============================================
  static async updateProfile(req: any, res: Response) {
    console.log('📝 Update profile request')
    const updates = req.body
    try {
      const user = await User.findById(req.user._id)
      if (!user) {
        console.warn('⚠️ User not found:', req.user._id)
        throw new AppError('User not found', 404)
      }

      const allowedFields = ['fullName', 'phone', 'bio', 'preferences', 'privacy', 'profileImage']
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          (user as any)[field] = updates[field]
        }
      })

      await user.save()
      console.log('✅ Profile updated for:', user.email)

      res.json({
        success: true,
        data: user
      })
    } catch (error: any) {
      console.error('❌ Update profile error:', error)
      if (error instanceof AppError) throw error
      throw new AppError('Failed to update profile', 500)
    }
  }

  // ============================================
  // 🔑 CHANGE PASSWORD
  // ============================================
  static async changePassword(req: any, res: Response) {
    console.log('🔑 Change password request')
    const { currentPassword, newPassword } = req.body

    try {
      const user = await User.findById(req.user._id).select('+password')
      if (!user) {
        console.warn('⚠️ User not found:', req.user._id)
        throw new AppError('User not found', 404)
      }

      const isPasswordValid = await user.comparePassword(currentPassword)
      if (!isPasswordValid) {
        console.warn('⚠️ Invalid current password')
        throw new AppError('Current password is incorrect', 401)
      }

      user.password = newPassword
      await user.save()
      console.log('✅ Password changed for:', user.email)

      res.json({
        success: true,
        message: 'Password changed successfully'
      })
    } catch (error: any) {
      console.error('❌ Change password error:', error)
      if (error instanceof AppError) throw error
      throw new AppError('Failed to change password', 500)
    }
  }

  // ============================================
  // 📧 FORGOT PASSWORD
  // ============================================
  static async forgotPassword(req: Request, res: Response) {
    console.log('📧 Forgot password request for:', req.body.email)
    const { email } = req.body

    if (!email) {
      throw new AppError('Email is required', 400)
    }

    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() })

      // Always return success message for security (don't reveal if user exists)
      if (!user) {
        console.warn('⚠️ User not found:', email)
        return res.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent'
        })
      }

      // User exists - generate reset token and send email
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetLink = `${process.env.FRONTEND_URL || 'https://secure-finder.vercel.app'}/reset-password?token=${resetToken}`

      // Save reset token to user (you may want to add this to your User model)
      // user.resetPasswordToken = resetToken;
      // user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      // await user.save();

      // Send email with reset link – with timeout protection
      try {
        await withTimeout(
          emailService.sendPasswordResetLink(email, resetLink),
          5000
        )
        console.log('✅ Password reset email sent to:', email)
      } catch (emailError) {
        console.error('❌ Failed to send password reset email:', emailError)
        // Still return success to avoid email enumeration
      }

      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      })
    } catch (error) {
      console.error('❌ Forgot password error:', error)
      // Still return success for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      })
    }
  }
}

export const authController = AuthController