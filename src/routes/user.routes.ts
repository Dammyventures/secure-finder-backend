import { Router } from 'express'
import { UserController } from '../controllers/user.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import { body } from 'express-validator'
import multer from 'multer'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  // FIXED: _req instead of req
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only images allowed') as any, false)
  }
})

router.use(authenticate)

router.get('/profile', UserController.getProfile)
router.patch('/profile',
  validate([
    body('fullName').optional().isString().isLength({ min: 2, max: 100 }),
    body('phone').optional().isString(),
    body('bio').optional().isString().isLength({ max: 500 }),
    body('preferences').optional().isObject(),
    body('privacy').optional().isObject()
  ]),
  UserController.updateProfile
)

router.post('/profile/image', upload.single('image'), UserController.uploadProfileImage)

router.get('/stats', UserController.getUserStats)
router.get('/items', UserController.getUserItems)
router.get('/sessions', UserController.getSessions)
router.delete('/sessions/:sessionId', UserController.revokeSession)
router.delete('/sessions', UserController.revokeAllSessions)
router.get('/security/events', UserController.getSecurityEvents)
router.get('/notifications', UserController.getUserNotifications)

router.delete('/account',
  validate([body('confirmation').isString().equals('confirm-delete')]),
  UserController.deleteAccount
)

router.get('/public/:userId', UserController.getPublicProfile)

export default router