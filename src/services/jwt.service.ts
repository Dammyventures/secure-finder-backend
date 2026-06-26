import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export class JWTService {
  static generateTokens(userId: string) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    )
    
    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' } as jwt.SignOptions
    )
    
    return { accessToken, refreshToken }
  }
  
  static verifyToken(token: string, secret: string) {
    return jwt.verify(token, secret)
  }
  
  static generateSecureCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase()
  }
  
  static generateBackupCodes(count: number = 10) {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }
    return codes
  }
}