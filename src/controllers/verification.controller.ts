import { Request, Response } from 'express'
import { Verification } from '../models/Verification.model'
import { User } from '../models/User.model'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

export class VerificationController {
  static async startVerification(req: any, res: Response) {
    try {
      const userId = req.user._id
      const user = await User.findById(userId)
      
      if (!user) {
        throw new AppError('User not found', 404)
      }
      
      if (user.identityVerified) {
        throw new AppError('Already verified', 400)
      }

      const existing = await Verification.findOne({
        userId,
        status: { $in: ['pending', 'processing'] }
      })
      
      if (existing) {
        return res.json({ success: true, data: existing })
      }

      const verification = new Verification({
        userId,
        status: 'pending',
        score: 0,
        documents: [],
        submittedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      
      await verification.save()
      logger.info(`Verification started for user: ${userId}`)
      
      return res.json({ success: true, data: verification })
    } catch (error: any) {
      logger.error('Start verification error:', error)
      throw new AppError(error.message || 'Failed to start verification', 500)
    }
  }

  static async uploadDocuments(req: any, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user._id
      const files = req.files || {}

      const verification = await Verification.findOne({ _id: id, userId })
      
      if (!verification) {
        throw new AppError('Verification not found', 404)
      }
      
      if (verification.status === 'verified') {
        throw new AppError('Already verified', 400)
      }

      const documents: any[] = []
      const fileFields = ['idFront', 'idBack', 'selfie']
      
      fileFields.forEach((field) => {
        if (files[field]) {
          const file = Array.isArray(files[field]) ? files[field][0] : files[field]
          documents.push({
            type: field,
            url: file.path || file.location || `uploads/${file.filename}`,
            uploadedAt: new Date()
          })
        }
      })

      if (documents.length === 0) {
        throw new AppError('No documents uploaded', 400)
      }

      verification.documents = documents
      verification.status = 'processing'
      verification.score = 50
      await verification.save()

      logger.info(`Documents uploaded for verification: ${id}`)
      
      return res.json({ success: true, data: verification })
    } catch (error: any) {
      logger.error('Upload documents error:', error)
      throw new AppError(error.message || 'Failed to upload documents', 500)
    }
  }

  static async getVerificationStatus(req: any, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user._id

      const verification = await Verification.findOne({ _id: id, userId })
      
      if (!verification) {
        throw new AppError('Verification not found', 404)
      }

      const user = await User.findById(userId)
      
      if (user && user.identityVerified) {
        verification.status = 'verified'
        verification.score = 100
        await verification.save()
      }

      return res.json({ success: true, data: verification })
    } catch (error: any) {
      logger.error('Get verification status error:', error)
      throw new AppError(error.message || 'Failed to get verification status', 500)
    }
  }
}