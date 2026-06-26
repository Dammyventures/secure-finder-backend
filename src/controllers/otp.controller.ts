import { Request, Response } from 'express'
import { OTP } from '../models/OTP.model'
import { User } from '../models/User.model'
import { emailService } from '../services/email.service'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'
import crypto from 'crypto'

export class OTPController {
  // Generate and send OTP
  static async sendOTP(req: Request, res: Response) {
    const { email, type = 'verification' } = req.body

    if (!email) {
      throw new AppError('Email is required', 400)
    }

    // Check if user exists for verification type
    if (type === 'verification') {
      const user = await User.findOne({ email })
      if (user && user.isEmailVerified) {
        throw new AppError('Email already verified', 400)
      }
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString()

    // Save OTP to database
    await OTP.create({
      email,
      code,
      type,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    })

    // Send email
    try {
      await emailService.sendVerificationOTP(email, code)
      logger.info(`OTP sent to ${email}`)
    } catch (error) {
      logger.error('Failed to send OTP email:', error)
      throw new AppError('Failed to send verification email', 500)
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    })
  }

  // Verify OTP
  static async verifyOTP(req: Request, res: Response) {
    const { email, code, type = 'verification' } = req.body

    if (!email || !code) {
      throw new AppError('Email and code are required', 400)
    }

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      email,
      code,
      type,
      verified: false,
      expiresAt: { $gt: new Date() }
    })

    if (!otpRecord) {
      // Check if OTP exists but expired
      const expiredOTP = await OTP.findOne({
        email,
        code,
        type,
        verified: false,
        expiresAt: { $lte: new Date() }
      })

      if (expiredOTP) {
        throw new AppError('Verification code has expired. Please request a new one.', 400)
      }

      throw new AppError('Invalid verification code', 400)
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      throw new AppError('Too many attempts. Please request a new code.', 400)
    }

    // Mark as verified
    otpRecord.verified = true
    await otpRecord.save()

    // Update user verification status
    if (type === 'verification') {
      const user = await User.findOne({ email })
      if (user) {
        user.isEmailVerified = true
        user.identityVerified = true
        user.accountStatus = 'active'
        user.verificationScore = 50
        await user.save()
      }
    }

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id })

    res.json({
      success: true,
      message: 'Email verified successfully'
    })
  }

  // Resend OTP
  static async resendOTP(req: Request, res: Response) {
    const { email, type = 'verification' } = req.body

    if (!email) {
      throw new AppError('Email is required', 400)
    }

    // Check if user exists
    const user = await User.findOne({ email })
    if (type === 'verification' && user && user.isEmailVerified) {
      throw new AppError('Email already verified', 400)
    }

    // Delete old OTPs
    await OTP.deleteMany({
      email,
      type,
      verified: false
    })

    // Generate new OTP
    const code = crypto.randomInt(100000, 999999).toString()

    await OTP.create({
      email,
      code,
      type,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    })

    // Send email
    try {
      await emailService.sendVerificationOTP(email, code)
      logger.info(`OTP resent to ${email}`)
    } catch (error) {
      logger.error('Failed to resend OTP:', error)
      throw new AppError('Failed to send verification email', 500)
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email'
    })
  }
}