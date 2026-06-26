import { Request, Response } from 'express'
import { User } from '../models/User.model'
import { Item } from '../models/Item.model'
import { Claim } from '../models/Claim.model'
import { Session } from '../models/Session.model'
import { Notification } from '../models/Notification.model'
import { AppError } from '../middleware/error.middleware'
import { Constants } from '../utils/constants'

export class UserController {
  static async getProfile(req: any, res: Response) {
    const user = await User.findById(req.user._id)
      .select('-password -refreshTokens -twoFactorSecret -backupCodes')

    if (!user) {
      throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
    }

    res.json({
      success: true,
      data: user
    })
  }

  static async updateProfile(req: any, res: Response) {
    const updates = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
    }

    const allowedFields = [
      'fullName',
      'phone',
      'bio',
      'preferences',
      'privacy',
      'profileImage'
    ]

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (user as any)[field] = updates[field]
      }
    })

    await user.save()

    res.json({
      success: true,
      message: Constants.SUCCESS_MESSAGES.PROFILE_UPDATED,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        profileImage: user.profileImage,
        preferences: user.preferences,
        privacy: user.privacy,
        identityVerified: user.identityVerified
      }
    })
  }

  static async getUserStats(req: any, res: Response) {
    const userId = req.user._id

    const [itemsPosted, itemsFound, claimsMade, claimsApproved] = await Promise.all([
      Item.countDocuments({ reportedBy: userId }),
      Item.countDocuments({ reportedBy: userId, itemType: Constants.ITEM_TYPES.FOUND }),
      Claim.countDocuments({ claimant: userId }),
      Claim.countDocuments({ claimant: userId, status: Constants.CLAIM_STATUS.APPROVED })
    ])

    res.json({
      success: true,
      data: {
        itemsPosted,
        itemsFound,
        claimsMade,
        claimsApproved,
        successRate: claimsMade > 0 ? Math.round((claimsApproved / claimsMade) * 100) : 0
      }
    })
  }

  static async getUserItems(req: any, res: Response) {
    const {
      status,
      itemType,
      page = 1,
      limit = 20
    } = req.query

    const query: any = { reportedBy: req.user._id }
    if (status) query.status = status
    if (itemType) query.itemType = itemType

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [items, total] = await Promise.all([
      Item.find(query)
        .populate('claimedBy', 'fullName email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Item.countDocuments(query)
    ])

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    })
  }

  static async getSessions(req: any, res: Response) {
    const sessions = await Session.find({
      user: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActive: -1 })

    const currentSession = req.session
    const formattedSessions = sessions.map((session: any) => ({
      id: session._id,
      device: session.device,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      current: session._id.toString() === currentSession?._id?.toString()
    }))

    res.json({
      success: true,
      data: formattedSessions
    })
  }

  static async revokeSession(req: any, res: Response) {
    const { sessionId } = req.params

    const session = await Session.findOne({
      _id: sessionId,
      user: req.user._id
    })

    if (!session) {
      throw new AppError('Session not found', 404)
    }

    if (session._id.toString() === req.session._id.toString()) {
      throw new AppError('Cannot revoke current session', 400)
    }

    session.isActive = false
    await session.save()

    res.json({
      success: true,
      message: 'Session revoked successfully'
    })
  }

  static async revokeAllSessions(req: any, res: Response) {
    await Session.updateMany(
      {
        user: req.user._id,
        _id: { $ne: req.session._id },
        isActive: true
      },
      { isActive: false }
    )

    res.json({
      success: true,
      message: 'All other sessions revoked successfully'
    })
  }

  static async getSecurityEvents( res: Response) {
    const mockEvents = [
      {
        id: '1',
        action: 'Login',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        ipAddress: '192.168.1.1',
        location: { city: 'New York', country: 'USA' }
      },
      {
        id: '2',
        action: 'Password Change',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        ipAddress: '192.168.1.2',
        location: { city: 'Los Angeles', country: 'USA' }
      },
      {
        id: '3',
        action: 'Profile Update',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
        ipAddress: '192.168.1.3',
        location: { city: 'Chicago', country: 'USA' }
      }
    ]

    res.json({
      success: true,
      data: mockEvents
    })
  }

  static async uploadProfileImage(req: any, res: Response) {
    if (!req.file) {
      throw new AppError('No image uploaded', 400)
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
    }

    user.profileImage = req.file.path || 'https://via.placeholder.com/150'
    await user.save()

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { profileImage: user.profileImage }
    })
  }

  static async deleteAccount(req: any, res: Response) {
    const { confirmation } = req.body

    if (confirmation !== 'confirm-delete') {
      throw new AppError('Please type "confirm-delete" to confirm', 400)
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
    }

    user.isActive = false
    await user.save()

    await Session.updateMany(
      { user: user._id },
      { isActive: false }
    )

    res.json({
      success: true,
      message: 'Account deleted successfully'
    })
  }

  static async getUserNotifications(req: any, res: Response) {
    const {
      page = 1,
      limit = 20,
      read
    } = req.query

    const query: any = { user: req.user._id }
    if (read !== undefined) {
      query.read = read === 'true'
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Notification.countDocuments(query)
    ])

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    })
  }

  static async getPublicProfile(req: Request, res: Response) {
    const { userId } = req.params

    const user = await User.findById(userId)
      .select('fullName profileImage bio identityVerified createdAt')

    if (!user) {
      throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
    }

    const privacy = user.privacy || { profileVisibility: 'public' }
    if (privacy.profileVisibility === 'private') {
      throw new AppError('This profile is private', 403)
    }

    const items = await Item.find({
      reportedBy: userId,
      status: Constants.ITEM_STATUS.OPEN
    })
      .select('title category itemType location createdAt')
      .limit(10)

    res.json({
      success: true,
      data: {
        user: {
          fullName: user.fullName,
          profileImage: user.profileImage,
          bio: user.bio,
          identityVerified: user.identityVerified,
          memberSince: user.createdAt
        },
        items
      }
    })
  }
}