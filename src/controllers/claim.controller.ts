import { Response } from 'express'
import { Claim } from '../models/Claim.model'
import { Item } from '../models/Item.model'
import { notificationService } from '../services/notification.service'
import { AppError } from '../middleware/error.middleware'
import { Constants } from '../utils/constants'

export class ClaimController {
  static async createClaim(req: any, res: Response) {
    const { itemId } = req.params
    const { proofOfOwnership, additionalInfo } = req.body

    const item = await Item.findById(itemId)
    if (!item) {
      throw new AppError(Constants.ERROR_MESSAGES.ITEM_NOT_FOUND, 404)
    }

    if (item.status !== Constants.ITEM_STATUS.OPEN) {
      throw new AppError('This item is no longer available for claims', 400)
    }

    if (item.itemType === Constants.ITEM_TYPES.LOST) {
      throw new AppError('Lost items cannot be claimed', 400)
    }

    if (item.reportedBy.toString() === req.user._id.toString()) {
      throw new AppError('You cannot claim your own item', 400)
    }

    if (!req.user.identityVerified) {
      throw new AppError(Constants.ERROR_MESSAGES.VERIFICATION_REQUIRED, 403)
    }

    const existingClaim = await Claim.findOne({
      item: itemId,
      status: { $in: [Constants.CLAIM_STATUS.PENDING, Constants.CLAIM_STATUS.APPROVED] }
    })

    if (existingClaim) {
      throw new AppError('A claim already exists for this item', 400)
    }

    const claim = new Claim({
      item: itemId,
      claimant: req.user._id,
      proofOfOwnership: proofOfOwnership || [],
      additionalInfo: additionalInfo || '',
      status: Constants.CLAIM_STATUS.PENDING
    })

    await claim.save()

    item.status = Constants.ITEM_STATUS.CLAIMED
    item.claimedBy = req.user._id
    await item.save()

    await notificationService.createNotification({
      userId: item.reportedBy,
      type: Constants.NOTIFICATION_TYPES.CLAIM_UPDATED,
      title: '📋 New Claim Submitted',
      message: `${req.user.fullName} has claimed your item "${item.title}"`,
      data: {
        claimId: claim._id,
        itemId: item._id,
        claimant: req.user._id,
        link: `${process.env.FRONTEND_URL}/claims/${claim._id}`
      },
      sendEmail: true,
      sendPush: true
    })

    res.status(201).json({
      success: true,
      message: Constants.SUCCESS_MESSAGES.CLAIM_CREATED,
      data: claim
    })
  }

  static async getClaims(req: any, res: Response) {
    const {
      status,
      page = 1,
      limit = 20
    } = req.query

    const query: any = {}

    if (status) query.status = status

    if (!req.user.isAdmin) {
      query.claimant = req.user._id
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate('item', 'title category itemType location status')
        .populate('claimant', 'fullName email phone profileImage')
        .populate('reviewedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Claim.countDocuments(query)
    ])

    res.json({
      success: true,
      data: {
        claims,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    })
  }

  static async getClaimById(req: any, res: Response) {
    const { id } = req.params

    const claim = await Claim.findById(id)
      .populate('item', 'title description category itemType location status images reportedBy')
      .populate('claimant', 'fullName email phone profileImage identityVerified')
      .populate('reviewedBy', 'fullName email')

    if (!claim) {
      throw new AppError(Constants.ERROR_MESSAGES.CLAIM_NOT_FOUND, 404)
    }

    const isOwner = claim.claimant.toString() === req.user._id.toString()
    const isItemOwner = (claim.item as any).reportedBy.toString() === req.user._id.toString()
    const isAdmin = req.user.isAdmin

    if (!isOwner && !isItemOwner && !isAdmin) {
      throw new AppError(Constants.ERROR_MESSAGES.FORBIDDEN, 403)
    }

    res.json({
      success: true,
      data: claim
    })
  }

  static async updateClaimStatus(req: any, res: Response) {
    const { id } = req.params
    const { status, adminNotes } = req.body

    const claim = await Claim.findById(id).populate('item')
    if (!claim) {
      throw new AppError(Constants.ERROR_MESSAGES.CLAIM_NOT_FOUND, 404)
    }

    const isItemOwner = (claim.item as any).reportedBy.toString() === req.user._id.toString()
    const isAdmin = req.user.isAdmin

    if (!isItemOwner && !isAdmin) {
      throw new AppError(Constants.ERROR_MESSAGES.FORBIDDEN, 403)
    }

    const validTransitions: Record<string, string[]> = {
      [Constants.CLAIM_STATUS.PENDING]: [Constants.CLAIM_STATUS.APPROVED, Constants.CLAIM_STATUS.REJECTED],
      [Constants.CLAIM_STATUS.APPROVED]: [Constants.CLAIM_STATUS.COMPLETED, Constants.CLAIM_STATUS.REJECTED],
      [Constants.CLAIM_STATUS.REJECTED]: [],
      [Constants.CLAIM_STATUS.COMPLETED]: []
    }

    if (!validTransitions[claim.status]?.includes(status)) {
      throw new AppError(`Invalid status transition from ${claim.status} to ${status}`, 400)
    }

    claim.status = status
    claim.reviewedBy = req.user._id
    claim.reviewedAt = new Date()
    if (adminNotes) claim.adminNotes = adminNotes
    if (status === Constants.CLAIM_STATUS.COMPLETED) {
      claim.completedAt = new Date()
    }

    await claim.save()

    if (status === Constants.CLAIM_STATUS.APPROVED || status === Constants.CLAIM_STATUS.COMPLETED) {
      const item = await Item.findById((claim.item as any)._id)
      if (item) {
        item.status = Constants.ITEM_STATUS.RESOLVED
        await item.save()
      }
    }

    await notificationService.createNotification({
      userId: claim.claimant,
      type: Constants.NOTIFICATION_TYPES.CLAIM_UPDATED,
      title: '📋 Claim Status Updated',
      message: `Your claim for "${(claim.item as any).title}" has been ${status}`,
      data: {
        claimId: claim._id,
        itemId: (claim.item as any)._id,
        status,
        link: `${process.env.FRONTEND_URL}/claims/${claim._id}`
      },
      sendEmail: true,
      sendPush: true
    })

    res.json({
      success: true,
      message: Constants.SUCCESS_MESSAGES.CLAIM_UPDATED,
      data: claim
    })
  }

  static async getMyClaims(req: any, res: Response) {
    const { status, page = 1, limit = 20 } = req.query

    const query: any = { claimant: req.user._id }
    if (status) query.status = status

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate('item', 'title description category itemType location status images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Claim.countDocuments(query)
    ])

    res.json({
      success: true,
      data: {
        claims,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    })
  }

  static async getItemClaims(req: any, res: Response) {
    const { itemId } = req.params

    const item = await Item.findById(itemId)
    if (!item) {
      throw new AppError(Constants.ERROR_MESSAGES.ITEM_NOT_FOUND, 404)
    }

    const isItemOwner = item.reportedBy.toString() === req.user._id.toString()
    const isAdmin = req.user.isAdmin

    if (!isItemOwner && !isAdmin) {
      throw new AppError(Constants.ERROR_MESSAGES.FORBIDDEN, 403)
    }

    const claims = await Claim.find({ item: itemId })
      .populate('claimant', 'fullName email phone profileImage identityVerified')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: claims
    })
  }

  static async cancelClaim(req: any, res: Response) {
    const { id } = req.params

    const claim = await Claim.findById(id)
    if (!claim) {
      throw new AppError(Constants.ERROR_MESSAGES.CLAIM_NOT_FOUND, 404)
    }

    if (claim.claimant.toString() !== req.user._id.toString()) {
      throw new AppError(Constants.ERROR_MESSAGES.FORBIDDEN, 403)
    }

    if (claim.status !== Constants.CLAIM_STATUS.PENDING) {
      throw new AppError('Only pending claims can be cancelled', 400)
    }

    claim.status = Constants.CLAIM_STATUS.REJECTED
    claim.adminNotes = 'Cancelled by claimant'
    await claim.save()

    const item = await Item.findById(claim.item)
    if (item && item.status === Constants.ITEM_STATUS.CLAIMED) {
      item.status = Constants.ITEM_STATUS.OPEN
      item.claimedBy = undefined
      await item.save()
    }

    res.json({
      success: true,
      message: 'Claim cancelled successfully'
    })
  }
}