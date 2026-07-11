import { Request, Response } from 'express'
import { OTP } from '../models/OTP.model'
import { User } from '../models/User.model'
import { emailService } from '../services/email.service'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'
import crypto from 'crypto'

export class OTPController {
  // ===================== SEND OTP =====================
  static async sendOTP(req: Request, res: Response) {
    const { email, type = 'verification' } = req.body

    if (!email) {
      throw new AppError('Email is required', 400)
    }

    // Check user exists
    const user = await User.findOne({ email })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // If verification type, ensure not already verified
    if (type === 'verification' && user.isEmailVerified) {
      throw new AppError('Email already verified', 400)
    }

    // Delete old unused OTPs
    await OTP.deleteMany({ email, type, verified: false })

    // Generate new 6-digit code
    const code = crypto.randomInt(100000, 999999).toString()

    // Save OTP
    const otp = new OTP({
      email,
      code,
      type,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    })
    await otp.save()

    // Send email
    try {
      await emailService.sendVerificationOTP(email, code)
      logger.info(`📧 OTP sent to ${email}`)
    } catch (error) {
      logger.error('Failed to send OTP email:', error)
      throw new AppError('Failed to send verification email', 500)
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    })
  }

  // ===================== VERIFY OTP =====================
  static async verifyOTP(req: Request, res: Response) {
    const { email, code, type = 'verification' } = req.body

    if (!email || !code) {
      throw new AppError('Email and code are required', 400)
    }

    // Find valid OTP (not verified, not expired)
    const otpRecord = await OTP.findOne({
      email,
      code,
      type,
      verified: false,
      expiresAt: { $gt: new Date() }
    })

    if (!otpRecord) {
      // Check if expired
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

    // Check attempts (max 5)
    if (otpRecord.attempts >= 5) {
      throw new AppError('Too many attempts. Please request a new code.', 400)
    }

    // Mark as verified
    otpRecord.verified = true
    await otpRecord.save()

    // Update user status
    if (type === 'verification') {
      const user = await User.findOne({ email })
      if (user) {
        user.isEmailVerified = true
        if (user.accountStatus === 'pending_verification') {
          user.accountStatus = 'active'
        }
        user.verificationScore = Math.min(user.verificationScore + 20, 100)
        await user.save()
        logger.info(`✅ Email verified for ${email}`)
      }
    }

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id })

    res.json({
      success: true,
      message: 'Email verified successfully'
    })
  }

  // ===================== RESEND OTP =====================
  static async resendOTP(req: Request, res: Response) {
    const { email, type = 'verification' } = req.body

    if (!email) {
      throw new AppError('Email is required', 400)
    }

    const user = await User.findOne({ email })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    if (type === 'verification' && user.isEmailVerified) {
      throw new AppError('Email already verified', 400)
    }

    // Delete old OTPs
    await OTP.deleteMany({ email, type, verified: false })

    // Generate new code
    const code = crypto.randomInt(100000, 999999).toString()

    const otp = new OTP({
      email,
      code,
      type,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    })
    await otp.save()

    try {
      await emailService.sendVerificationOTP(email, code)
      logger.info(`📧 OTP resent to ${email}`)
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