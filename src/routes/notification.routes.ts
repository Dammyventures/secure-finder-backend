import { Router } from 'express'
import { NotificationController } from '../controllers/notification.controller'
import { authenticate, requireAdmin } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import { body } from 'express-validator'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get notifications
router.get('/', NotificationController.getNotifications)

// Get unread count
router.get('/unread/count', NotificationController.getUnreadCount)

// Mark as read
router.patch('/:id/read', NotificationController.markAsRead)

// Mark all as read
router.patch('/read-all', NotificationController.markAllAsRead)

// Delete notification
router.delete('/:id', NotificationController.deleteNotification)

// Delete all notifications
router.delete('/', NotificationController.deleteAllNotifications)

// Get notification preferences
router.get('/preferences', NotificationController.getNotificationPreferences)

// Update notification preferences
router.patch('/preferences',
  validate([
    body('emailNotifications').optional().isBoolean(),
    body('pushNotifications').optional().isBoolean(),
    body('smsNotifications').optional().isBoolean()
  ]),
  NotificationController.updateNotificationPreferences
)

// Admin routes
router.post('/system',
  requireAdmin,
  validate([
    body('userId').isMongoId(),
    body('title').isString().notEmpty(),
    body('message').isString().notEmpty(),
    body('data').optional().isObject()
  ]),
  NotificationController.createSystemNotification
)

export default router