import nodemailer from 'nodemailer'
import { logger } from '../utils/logger'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  async sendEmail(options: EmailOptions) {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@securefinder.com',
        ...options
      })
      logger.info(`✅ Email sent to ${options.to}`)
      return result
    } catch (error) {
      logger.error('❌ Email sending failed:', error)
      throw error
    }
  }

  // ===================== VERIFICATION OTP =====================
  async sendVerificationOTP(email: string, code: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
          .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; padding: 48px 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
          .header { text-align: center; margin-bottom: 32px; }
          .logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
          .logo-icon { width: 40px; height: 40px; background: #1C448E; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold; }
          .logo-text { font-size: 22px; font-weight: 700; color: #1C448E; }
          .logo-text span { color: #938BA1; }
          h1 { color: #1C448E; font-size: 24px; font-weight: 600; margin: 24px 0 12px; }
          .subtitle { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
          .code-container { background: #f8f9fc; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
          .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1C448E; font-family: 'Courier New', monospace; }
          .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          .footer { color: #9ca3af; font-size: 13px; text-align: center; line-height: 1.6; }
          .footer a { color: #1C448E; text-decoration: none; }
          .badge { display: inline-block; background: #e5e7eb; color: #6b7280; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="#" class="logo">
              <div class="logo-icon">🔒</div>
              <div class="logo-text">Secure<span>Finder</span></div>
            </a>
          </div>
          <h1>Verify Your Email Address</h1>
          <p class="subtitle">
            Thanks for signing up! Please use the verification code below to confirm your email address.
            This code expires in <strong>15 minutes</strong>.
          </p>
          <div class="code-container">
            <div class="code">${code}</div>
            <div class="badge">6-digit verification code</div>
          </div>
          <hr class="divider">
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 16px 0;">
            Didn't request this? You can safely ignore this email.
          </p>
          <div class="footer">
            <p>
              Secure Finder &bull; Lost & Found Platform<br>
              <a href="${process.env.FRONTEND_URL || 'https://secure-finder.vercel.app'}">securefinder.com</a>
            </p>
            <p style="margin-top: 8px; font-size: 12px; color: #d1d5db;">
              © ${new Date().getFullYear()} Secure Finder. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Secure Finder',
      html
    })
  }

  // ===================== PASSWORD RESET OTP =====================
  async sendPasswordResetOTP(email: string, code: string, resetLink?: string) {
    const getFrontendUrl = () => {
      const environment = process.env.NODE_ENV || 'development'
      if (environment === 'production') {
        return process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL || 'https://secure-finder.vercel.app'
      }
      return process.env.FRONTEND_URL_DEV || 'http://localhost:5173'
    }

    const frontendUrl = getFrontendUrl()
    const link = resetLink || `${frontendUrl}/reset-password?token=${code}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
          .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; padding: 48px 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
          .header { text-align: center; margin-bottom: 32px; }
          .logo-text { font-size: 22px; font-weight: 700; color: #1C448E; }
          .logo-text span { color: #938BA1; }
          h1 { color: #1C448E; font-size: 24px; font-weight: 600; margin: 24px 0 12px; }
          .subtitle { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: center; }
          .button-container { text-align: center; margin: 32px 0; }
          .button { display: inline-block; background: #1C448E; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background 0.3s ease; }
          .button:hover { background: #15366e; }
          .code-container { background: #f8f9fc; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
          .code { font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #1C448E; font-family: 'Courier New', monospace; word-break: break-all; }
          .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          .footer { color: #9ca3af; font-size: 13px; text-align: center; line-height: 1.6; }
          .footer a { color: #1C448E; text-decoration: none; }
          .note { color: #6b7280; font-size: 14px; text-align: center; margin: 16px 0; }
          .expiry { color: #ef4444; font-weight: 600; }
          .badge { display: inline-block; background: #e5e7eb; color: #6b7280; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-text">Secure<span>Finder</span></div>
          </div>
          <h1>Reset Your Password</h1>
          <p class="subtitle">
            We received a request to reset your password for your Secure Finder account.
            Click the button below to create a new password.
          </p>
          <div class="button-container">
            <a href="${link}" class="button">Reset Password</a>
          </div>
          <p class="note">
            Or copy this link into your browser:<br>
            <span style="color: #1C448E; word-break: break-all; font-size: 12px;">${link}</span>
          </p>
          <div class="code-container">
            <div class="code">${code}</div>
            <div class="badge">Reset token</div>
          </div>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            This link expires in <span class="expiry">15 minutes</span>.
          </p>
          <hr class="divider">
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            If you didn't request a password reset, please ignore this email.
          </p>
          <div class="footer">
            <p>
              Secure Finder &bull; Lost & Found Platform<br>
              <a href="${process.env.FRONTEND_URL || 'https://secure-finder.vercel.app'}">securefinder.com</a>
            </p>
            <p style="margin-top: 8px; font-size: 12px; color: #d1d5db;">
              © ${new Date().getFullYear()} Secure Finder. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    logger.info(`📧 Sending password reset email to ${email}`)
    logger.info(`🔗 Reset link: ${link}`)

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Secure Finder',
      html
    })
  }

  // ===================== PASSWORD RESET LINK (without OTP) =====================
  async sendPasswordResetLink(email: string, resetLink: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
          .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; padding: 48px 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
          .header { text-align: center; margin-bottom: 32px; }
          .logo-text { font-size: 22px; font-weight: 700; color: #1C448E; }
          .logo-text span { color: #938BA1; }
          h1 { color: #1C448E; font-size: 24px; font-weight: 600; margin: 24px 0 12px; }
          .subtitle { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: center; }
          .button-container { text-align: center; margin: 32px 0; }
          .button { display: inline-block; background: #1C448E; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
          .button:hover { background: #15366e; }
          .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          .footer { color: #9ca3af; font-size: 13px; text-align: center; line-height: 1.6; }
          .footer a { color: #1C448E; text-decoration: none; }
          .note { color: #6b7280; font-size: 14px; text-align: center; margin: 16px 0; }
          .expiry { color: #ef4444; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-text">Secure<span>Finder</span></div>
          </div>
          <h1>Reset Your Password</h1>
          <p class="subtitle">
            We received a request to reset your password for your Secure Finder account.
            Click the button below to create a new password.
          </p>
          <div class="button-container">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p class="note">
            Or copy this link into your browser:<br>
            <span style="color: #1C448E; word-break: break-all; font-size: 12px;">${resetLink}</span>
          </p>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            This link expires in <span class="expiry">1 hour</span>.
          </p>
          <hr class="divider">
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            If you didn't request a password reset, please ignore this email.
          </p>
          <div class="footer">
            <p>
              Secure Finder &bull; Lost & Found Platform<br>
              <a href="${process.env.FRONTEND_URL || 'https://secure-finder.vercel.app'}">securefinder.com</a>
            </p>
            <p style="margin-top: 8px; font-size: 12px; color: #d1d5db;">
              © ${new Date().getFullYear()} Secure Finder. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    logger.info(`📧 Sending password reset link to ${email}`)
    logger.info(`🔗 Reset link: ${resetLink}`)

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Secure Finder',
      html
    })
  }
}

// Create and export a singleton instance
const emailServiceInstance = new EmailService()
export { emailServiceInstance as emailService }