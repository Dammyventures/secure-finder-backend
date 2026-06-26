import { Response } from 'express'
import { Notification } from '../models/Notification.model'
import { User } from '../models/User.model'
import { notificationService } from '../services/notification.service'
import { AppError } from '../middleware/error.middleware'
import { Constants } from '../utils/constants'

export class NotificationController {
  static async getNotifications(req: any, res: Response) {
    const {
      page = 1,
      limit = 20,
      read,
      type
    } = req.query

    const result = await notificationService.getNotifications(
      req.user._id.toString(),
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        read: read === 'true' ? true : read === 'false' ? false : undefined,
        type: type as string
      }
    )

    res.json({
      success: true,
      data: result
    })
  }

  static async getUnreadCount(req: any, res: Response) {
    const count = await notificationService.getUnreadCount(req.user._id.toString())

    res.json({
      success: true,
      data: { unreadCount: count }
    })
  }

  static async markAsRead(req: any, res: Response) {
    const { id } = req.params

    const notification = await notificationService.markAsRead(
      id,
      req.user._id.toString()
    )

    res.json({
      success: true,
      data: notification
    })
  }

  static async markAllAsRead(req: any, res: Response) {
    await notificationService.markAllAsRead(req.user._id.toString())

    res.json({
      success: true,
      message: 'All notifications marked as read'
    })
  }

  static async deleteNotification(req: any, res: Response) {
    const { id } = req.params

    await notificationService.deleteNotification(
      id,
      req.user._id.toString()
    )

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    })
  }

  static async deleteAllNotifications(req: any, res: Response) {
    await Notification.deleteMany({ user: req.user._id })

    res.json({
      success: true,
      message: 'All notifications deleted successfully'
    })
  }

  static async createSystemNotification(req: any, res: Response) {
    if (!req.user.isAdmin) {
      throw new AppError(Constants.ERROR_MESSAGES.FORBIDDEN, 403)
    }

    const { userId, title, message, data } = req.body

    const notification = await notificationService.createNotification({
      userId,
      type: Constants.NOTIFICATION_TYPES.SYSTEM,
      title,
      message,
      data: data || {},
      sendEmail: true,
      sendPush: true
    })

    res.status(201).json({
      success: true,
      data: notification
    })
  }

  static async getNotificationPreferences(req: any, res: Response) {
    const user = await User.findById(req.user._id)
    if (!user) {
      throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
    }

    res.json({
      success: true,
      data: {
        emailNotifications: user.preferences.emailNotifications,
        pushNotifications: user.preferences.pushNotifications,
        smsNotifications: user.preferences.smsNotifications
      }
    })
  }

  static async updateNotificationPreferences(req: any, res: Response) {
    const { emailNotifications, pushNotifications, smsNotifications } = req.body

    const user = await User.findById(req.user._id)
    if (!user) {
      throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
    }

    if (emailNotifications !== undefined) {
      user.preferences.emailNotifications = emailNotifications
    }
    if (pushNotifications !== undefined) {
      user.preferences.pushNotifications = pushNotifications
    }
    if (smsNotifications !== undefined) {
      user.preferences.smsNotifications = smsNotifications
    }

    await user.save()

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: {
        emailNotifications: user.preferences.emailNotifications,
        pushNotifications: user.preferences.pushNotifications,
        smsNotifications: user.preferences.smsNotifications
      }
    })
  }
}