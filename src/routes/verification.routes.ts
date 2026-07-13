import { Router } from 'express'
import { VerificationController } from '../controllers/verification.controller'
import { authenticate } from '../middleware/auth.middleware'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only images are allowed') as any, false)
    }
  }
})

const router = Router()

router.use(authenticate)

router.post('/start', VerificationController.startVerification)

router.post(
  '/:id/upload',
  upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ]),
  VerificationController.uploadDocuments
)

router.get('/:id', VerificationController.getVerificationStatus)

// ✅ NEW: Complete verification
router.post('/:id/complete', VerificationController.completeVerification)

export default router