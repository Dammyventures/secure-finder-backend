import crypto from 'crypto'
import { config } from '../config/config'
import { logger } from '../utils/logger'

export class EncryptionService {
  private algorithm: string = 'aes-256-gcm'
  private key: Buffer
  private ivLength: number = 16
  private tagLength: number = 16

  constructor() {
    this.key = crypto.scryptSync(
      config.security.encryptionKey,
      'salt',
      32
    )
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength)
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
      
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = (cipher as any).getAuthTag() // Cast to any to avoid type issue
      
      const result = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ])
      
      return result.toString('base64')
    } catch (error) {
      logger.error('Encryption error:', error)
      throw new Error('Encryption failed')
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const buffer = Buffer.from(encryptedData, 'base64')
      
      const iv = buffer.subarray(0, this.ivLength)
      const tag = buffer.subarray(this.ivLength, this.ivLength + this.tagLength)
      const encrypted = buffer.subarray(this.ivLength + this.tagLength)
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
      ;(decipher as any).setAuthTag(tag) // Cast to any
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      logger.error('Decryption error:', error)
      throw new Error('Decryption failed')
    }
  }

  hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
  }

  generateSecureToken(length: number = 32): string {
    return crypto
      .randomBytes(length)
      .toString('hex')
  }

  generateOTP(length: number = 6): string {
    const digits = '0123456789'
    let otp = ''
    for (let i = 0; i < length; i++) {
      otp += digits[crypto.randomInt(0, digits.length)]
    }
    return otp
  }

  generateSecureCode(): string {
    return crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
  }

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      codes.push(this.generateSecureCode())
    }
    return codes
  }

  encryptObject(obj: any): string {
    return this.encrypt(JSON.stringify(obj))
  }

  decryptObject(encrypted: string): any {
    return JSON.parse(this.decrypt(encrypted))
  }

  compareHash(data: string, hash: string): boolean {
    const computedHash = this.hash(data)
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(hash)
    )
  }

  generateSecretKey(): string {
    return crypto
      .randomBytes(32)
      .toString('base64')
  }

  generateQRCodeData(secret: string, account: string, issuer: string): string {
    return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`
  }
}

export const encryptionService = new EncryptionService()