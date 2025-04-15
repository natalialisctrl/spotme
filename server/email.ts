import * as sgMail from '@sendgrid/mail';
import { logSecurityEvent } from './security';

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// From email address to use for all emails
const FROM_EMAIL = 'noreply@spotme.com';
const APP_NAME = 'SpotMe';
const APP_URL = process.env.BASE_URL || 'http://localhost:5000';

// Email templates
const emailTemplates = {
  // Account verification
  verifyEmail: {
    subject: `Verify your ${APP_NAME} account`,
    generateHtml: (name: string, token: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568; text-align: center;">Welcome to ${APP_NAME}!</h1>
        <p>Hi ${name},</p>
        <p>Thanks for signing up for ${APP_NAME}. To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/verify-email?token=${token}" style="background-color: #4c51bf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If you didn't create an account on ${APP_NAME}, you can safely ignore this email.</p>
        <p>This verification link will expire in 24 hours.</p>
        <p>Best regards,<br>The ${APP_NAME} Team</p>
      </div>
    `,
    generateText: (name: string, token: string) => `
      Welcome to ${APP_NAME}!
      
      Hi ${name},
      
      Thanks for signing up for ${APP_NAME}. To complete your registration, please verify your email address by clicking the link below:
      
      ${APP_URL}/verify-email?token=${token}
      
      If you didn't create an account on ${APP_NAME}, you can safely ignore this email.
      
      This verification link will expire in 24 hours.
      
      Best regards,
      The ${APP_NAME} Team
    `
  },
  
  // Password reset
  resetPassword: {
    subject: `Reset your ${APP_NAME} password`,
    generateHtml: (name: string, token: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568; text-align: center;">Password Reset Request</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password for your ${APP_NAME} account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/reset-password?token=${token}" style="background-color: #4c51bf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        <p>This password reset link will expire in 1 hour.</p>
        <p>Best regards,<br>The ${APP_NAME} Team</p>
      </div>
    `,
    generateText: (name: string, token: string) => `
      Password Reset Request
      
      Hi ${name},
      
      We received a request to reset your password for your ${APP_NAME} account. Click the link below to set a new password:
      
      ${APP_URL}/reset-password?token=${token}
      
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      
      This password reset link will expire in 1 hour.
      
      Best regards,
      The ${APP_NAME} Team
    `
  },
  
  // MFA enabled notification
  mfaEnabled: {
    subject: `Two-factor authentication enabled on your ${APP_NAME} account`,
    generateHtml: (name: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568; text-align: center;">Two-Factor Authentication Enabled</h1>
        <p>Hi ${name},</p>
        <p>Two-factor authentication has been successfully enabled on your ${APP_NAME} account. Your account is now more secure!</p>
        <p>From now on, you'll need to enter a verification code from your authenticator app when signing in to your account.</p>
        <p>If you did not enable two-factor authentication, please contact our support team immediately as your account may have been compromised.</p>
        <p>Best regards,<br>The ${APP_NAME} Team</p>
      </div>
    `,
    generateText: (name: string) => `
      Two-Factor Authentication Enabled
      
      Hi ${name},
      
      Two-factor authentication has been successfully enabled on your ${APP_NAME} account. Your account is now more secure!
      
      From now on, you'll need to enter a verification code from your authenticator app when signing in to your account.
      
      If you did not enable two-factor authentication, please contact our support team immediately as your account may have been compromised.
      
      Best regards,
      The ${APP_NAME} Team
    `
  },
  
  // Security alert
  securityAlert: {
    subject: `Security alert for your ${APP_NAME} account`,
    generateHtml: (name: string, event: string, details: string, location: string, time: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568; text-align: center;">Security Alert</h1>
        <p>Hi ${name},</p>
        <p>We detected a security event on your ${APP_NAME} account that you should know about:</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #4c51bf; padding: 15px; margin: 20px 0;">
          <p><strong>Event:</strong> ${event}</p>
          <p><strong>Details:</strong> ${details}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
        <p>If this was you, you can ignore this message.</p>
        <p>If you don't recognize this activity, please secure your account by:</p>
        <ol>
          <li>Changing your password immediately</li>
          <li>Enabling two-factor authentication if you haven't already</li>
          <li>Contacting our support team</li>
        </ol>
        <p>Best regards,<br>The ${APP_NAME} Team</p>
      </div>
    `,
    generateText: (name: string, event: string, details: string, location: string, time: string) => `
      Security Alert
      
      Hi ${name},
      
      We detected a security event on your ${APP_NAME} account that you should know about:
      
      Event: ${event}
      Details: ${details}
      Location: ${location}
      Time: ${time}
      
      If this was you, you can ignore this message.
      
      If you don't recognize this activity, please secure your account by:
      1. Changing your password immediately
      2. Enabling two-factor authentication if you haven't already
      3. Contacting our support team
      
      Best regards,
      The ${APP_NAME} Team
    `
  }
};

/**
 * Send an email using SendGrid
 */
async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    text,
    html,
  };
  
  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send an email verification email
 */
export async function sendVerificationEmail(userId: number, email: string, name: string, token: string): Promise<boolean> {
  const template = emailTemplates.verifyEmail;
  const html = template.generateHtml(name, token);
  const text = template.generateText(name, token);
  
  const success = await sendEmail(email, template.subject, html, text);
  
  // Log the security event
  logSecurityEvent(userId, 'EMAIL_VERIFICATION_SENT', {
    email,
    success
  });
  
  return success;
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(userId: number, email: string, name: string, token: string): Promise<boolean> {
  const template = emailTemplates.resetPassword;
  const html = template.generateHtml(name, token);
  const text = template.generateText(name, token);
  
  const success = await sendEmail(email, template.subject, html, text);
  
  // Log the security event
  logSecurityEvent(userId, 'PASSWORD_RESET_EMAIL_SENT', {
    email,
    success
  });
  
  return success;
}

/**
 * Send an MFA enabled notification
 */
export async function sendMfaEnabledEmail(userId: number, email: string, name: string): Promise<boolean> {
  const template = emailTemplates.mfaEnabled;
  const html = template.generateHtml(name);
  const text = template.generateText(name);
  
  const success = await sendEmail(email, template.subject, html, text);
  
  // Log the security event
  logSecurityEvent(userId, 'MFA_ENABLED_EMAIL_SENT', {
    email,
    success
  });
  
  return success;
}

/**
 * Send a security alert email
 */
export async function sendSecurityAlertEmail(
  userId: number,
  email: string,
  name: string,
  event: string,
  details: string,
  location: string,
  time: string
): Promise<boolean> {
  const template = emailTemplates.securityAlert;
  const html = template.generateHtml(name, event, details, location, time);
  const text = template.generateText(name, event, details, location, time);
  
  const success = await sendEmail(email, template.subject, html, text);
  
  // Log the security event
  logSecurityEvent(userId, 'SECURITY_ALERT_EMAIL_SENT', {
    email,
    event,
    success
  });
  
  return success;
}