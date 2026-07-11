import { Router } from 'express'
import { OTPController } from '../controllers/otp.controller'
import { validate } from '../middleware/validation.middleware'
import { body } from 'express-validator'
import { rateLimiter } from '../middleware/rateLimit.middleware'

const router = Router()

// Send OTP
router.post(
  '/send',
  rateLimiter.auth,
  validate([
    body('email').isEmail().withMessage('Valid email required'),
    body('type').optional().isIn(['verification', 'password_reset', 'two_factor'])
  ]),
  OTPController.sendOTP
)

// Verify OTP
router.post(
  '/verify',
  rateLimiter.strict,
  validate([
    body('email').isEmail().withMessage('Valid email required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
    body('type').optional().isIn(['verification', 'password_reset', 'two_factor'])
  ]),
  OTPController.verifyOTP
)

// Resend OTP
router.post(
  '/resend',
  rateLimiter.auth,
  validate([
    body('email').isEmail().withMessage('Valid email required'),
    body('type').optional().isIn(['verification', 'password_reset', 'two_factor'])
  ]),
  OTPController.resendOTP
)

export default router