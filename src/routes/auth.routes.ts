// routes/auth.routes.ts
import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import { rateLimiter } from '../middleware/rateLimit.middleware'
import { registerValidation, loginValidation, changePasswordValidation } from '../utils/validators'

const router = Router()

router.get('/test', (req, res) => {
  res.json({ message: 'Auth router is working!' })
})

// ✅ DEBUG: Bypass all middleware
router.post('/register-debug', authController.register)

router.post('/register', rateLimiter.auth, validate(registerValidation), authController.register)
router.post('/login', rateLimiter.auth, validate(loginValidation), authController.login)
router.post('/logout', authenticate, authController.logout)
router.post('/refresh-token', authController.refreshToken)
router.get('/profile', authenticate, authController.getProfile)
router.put('/profile', authenticate, authController.updateProfile)
router.post('/change-password', authenticate, validate(changePasswordValidation), authController.changePassword)
router.post('/forgot-password', authController.forgotPassword)

export default router