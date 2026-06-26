import { Notification } from '../models/Notification.model'
import { User } from '../models/User.model'
import { emailService } from './email.service'
import { getIo } from '../socket'   // <-- this is correct if socket.ts is in src/
import { logger } from '../utils/logger'
import { Constants } from '../utils/constants'
import { config } from '../config/config'
import { Types } from 'mongoose'

interface NotificationData {
  userId: Types.ObjectId | string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  sendEmail?: boolean
  sendPush?: boolean
}

export class NotificationService {
  async createNotification(data: NotificationData): Promise<any> {
    try {
      const notification = new Notification({
        user: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        read: false
      })

      await notification.save()

      // Send real-time notification via Socket.IO
      this.sendRealtimeNotification(data.userId.toString(), notification)

      // Send email if requested
      if (data.sendEmail) {
        await this.sendEmailNotification(data)
      }

      // Send push notification if requested
      if (data.sendPush) {
        await this.sendPushNotification(data)
      }

      return notification
    } catch (error) {
      logger.error('Failed to create notification:', error)
      throw error
    }
  }

  async getNotifications(userId: string, options: {
    page?: number
    limit?: number
    read?: boolean
    type?: string
  } = {}) {
    const {
      page = 1,
      limit = 20,
      read,
      type
    } = options

    const query: any = { user: userId }
    if (read !== undefined) query.read = read
    if (type) query.type = type

    const skip = (page - 1) * limit

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query)
    ])

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<any> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    notification.read = true
    await notification.save()

    return notification
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    )
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    })
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      user: userId,
      read: false
    })
  }

  private sendRealtimeNotification(userId: string, notification: any): void {
    try {
      const io = getIo()
      const room = `user:${userId}`
      io.to(room).emit(Constants.SOCKET_EVENTS.NOTIFICATION, notification)
    } catch (error) {
      logger.error('Failed to send real-time notification:', error)
    }
  }

  private async sendEmailNotification(data: NotificationData): Promise<void> {
    try {
      const user = await User.findById(data.userId)
      if (!user) return

      await emailService.sendEmail({
        to: user.email,
        subject: data.title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1C448E;">${data.title}</h2>
            <p style="color: #333;">${data.message}</p>
            ${data.data?.link ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.data.link}" style="background: #1C448E; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                  View Details
                </a>
              </div>
            ` : ''}
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              You're receiving this email because you're a member of Secure Finder.
            </p>
          </div>
        `
      })
    } catch (error) {
      logger.error('Failed to send email notification:', error)
    }
  }

  private async sendPushNotification(data: NotificationData): Promise<void> {
    // Implement push notification logic here
    logger.info('Push notification would be sent:', data)
  }

  async notifyItemMatch(itemId: string, userId: string, matchData: any): Promise<void> {
    await this.createNotification({
      userId,
      type: Constants.NOTIFICATION_TYPES.ITEM_MATCHED,
      title: '🎉 Potential Match Found!',
      message: `We found a potential match for your item. Check it out!`,
      data: {
        itemId,
        matchData,
        link: `${config.server.frontendUrl}/items/${itemId}`
      },
      sendEmail: true,
      sendPush: true
    })
  }

  async notifyClaimUpdate(claimId: string, userId: string, status: string): Promise<void> {
    const statusMessages: Record<string, string> = {
      approved: '✅ Your claim has been approved!',
      rejected: '❌ Your claim has been rejected.',
      completed: '🎉 Your claim has been completed!'
    }

    await this.createNotification({
      userId,
      type: Constants.NOTIFICATION_TYPES.CLAIM_UPDATED,
      title: 'Claim Update',
      message: statusMessages[status] || `Your claim status is now: ${status}`,
      data: {
        claimId,
        status,
        link: `${config.server.frontendUrl}/claims/${claimId}`
      },
      sendEmail: true,
      sendPush: true
    })
  }

  async notifyNewMessage(userId: string, messageData: any): Promise<void> {
    await this.createNotification({
      userId,
      type: Constants.NOTIFICATION_TYPES.MESSAGE,
      title: '💬 New Message',
      message: `You have a new message from ${messageData.senderName}`,
      data: {
        messageId: messageData.id,
        senderId: messageData.senderId,
        link: `${config.server.frontendUrl}/messages/${messageData.id}`
      },
      sendEmail: false,
      sendPush: true
    })
  }

  async notifySystemAlert(userId: string, alertData: any): Promise<void> {
    await this.createNotification({
      userId,
      type: Constants.NOTIFICATION_TYPES.ALERT,
      title: '⚠️ System Alert',
      message: alertData.message,
      data: alertData,
      sendEmail: true,
      sendPush: true
    })
  }
}

export const notificationService = new NotificationService()