import { Router } from 'express'
import { OTPController } from '../controllers/otp.controller'
import { validate } from '../middleware/validation.middleware'
import { body } from 'express-validator'
import { rateLimiter } from '../middleware/rateLimit.middleware'
import { emailService } from '../services/email.service'

const router = Router()

// ✅ Test endpoint – to debug email service independently
router.get('/test-email', async (req, res) => {
  try {
    await emailService.sendVerificationOTP('your-test-email@gmail.com', '123456')
    res.json({ success: true, message: 'Test email sent successfully' })
  } catch (error: any) {
    console.error('Test email error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      response: error.response?.data || error.response?.message
    })
  }
})

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