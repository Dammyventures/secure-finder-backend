import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import { rateLimiter } from '../middleware/rateLimit.middleware'
import { 
  registerValidation, 
  loginValidation,
  changePasswordValidation 
} from '../utils/validators'

const router = Router()

router.post('/register', rateLimiter.auth, validate(registerValidation), AuthController.register)
router.post('/login', rateLimiter.auth, validate(loginValidation), AuthController.login)
router.post('/logout', authenticate, AuthController.logout)
router.post('/refresh-token', AuthController.refreshToken)
router.get('/profile', authenticate, AuthController.getProfile)
router.put('/profile', authenticate, AuthController.updateProfile)
router.post('/change-password', authenticate, validate(changePasswordValidation), AuthController.changePassword)
router.post('/forgot-password', AuthController.forgotPassword)

export default router