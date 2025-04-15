import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { storage } from './storage';

// Configure TOTP for MFA
otplib.authenticator.options = {
  digits: 6,
  step: 30,
};

// Constants for security settings
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FAILED_ATTEMPTS = 5;
const ACCOUNT_LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a secure MFA secret
 */
export function generateMfaSecret(): string {
  return otplib.authenticator.generateSecret();
}

/**
 * Generate a QR code for MFA setup
 */
export async function generateQrCode(username: string, secret: string): Promise<string> {
  const serviceName = 'SpotMe';
  const otpauth = otplib.authenticator.keyuri(username, serviceName, secret);
  
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(otpauth, (err, imageUrl) => {
      if (err) {
        reject(err);
      } else {
        resolve(imageUrl);
      }
    });
  });
}

/**
 * Verify TOTP code for MFA
 */
export function verifyTOTP(token: string, secret: string): boolean {
  return otplib.authenticator.verify({ token, secret });
}

/**
 * Generate backup codes for MFA
 */
export function generateBackupCodes(count = 10): string[] {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes for secure storage
 */
export function hashBackupCodes(codes: string[]): string {
  // Store as JSON array of hashed codes
  const hashedCodes = codes.map(code => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(code, salt, 10000, 64, 'sha512').toString('hex');
    return `${hash}:${salt}`;
  });
  
  return JSON.stringify(hashedCodes);
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(providedCode: string, hashedCodesJson: string): boolean {
  try {
    const hashedCodes: string[] = JSON.parse(hashedCodesJson);
    
    for (const hashedCode of hashedCodes) {
      const [hash, salt] = hashedCode.split(':');
      const providedHash = crypto.pbkdf2Sync(providedCode, salt, 10000, 64, 'sha512').toString('hex');
      
      if (hash === providedHash) {
        // If we find a match, return true
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
}

/**
 * Record a failed login attempt and lock account if necessary
 */
export async function recordFailedLogin(userId: number): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;
  
  const now = new Date();
  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  
  // Update the user's failed login count
  const updateData: Partial<any> = {
    failedLoginAttempts: failedAttempts,
    lastFailedLogin: now
  };
  
  // If max attempts reached, lock the account
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date(now.getTime() + ACCOUNT_LOCK_DURATION);
    updateData.accountLocked = true;
    updateData.accountLockedUntil = lockUntil;
  }
  
  await storage.updateUser(userId, updateData);
  
  // Return true if account is now locked
  return failedAttempts >= MAX_FAILED_ATTEMPTS;
}

/**
 * Reset failed login attempts
 */
export async function resetFailedAttempts(userId: number): Promise<void> {
  await storage.updateUser(userId, {
    failedLoginAttempts: 0,
    accountLocked: false,
    accountLockedUntil: null
  });
}

/**
 * Check if account is locked
 */
export function isAccountLocked(user: any): boolean {
  if (!user.accountLocked) return false;
  
  // Check if lock duration has expired
  if (user.accountLockedUntil) {
    const now = new Date();
    const lockExpiry = new Date(user.accountLockedUntil);
    
    if (now > lockExpiry) {
      // Lock has expired, account should be unlocked
      return false;
    }
    
    // Account is still locked
    return true;
  }
  
  return false;
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + PASSWORD_RESET_EXPIRY);
  
  await storage.updateUser(userId, {
    resetPasswordToken: token,
    resetPasswordExpires: expires
  });
  
  return token;
}

/**
 * Create an email verification token
 */
export async function createEmailVerificationToken(userId: number): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);
  
  await storage.updateUser(userId, {
    emailVerificationToken: token,
    emailVerificationExpires: expires
  });
  
  return token;
}

/**
 * Log a security event
 */
export function logSecurityEvent(userId: number, eventType: string, details: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    userId,
    eventType,
    details
  };
  
  // Create a directory for security logs if it doesn't exist
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Write to a security log file
  const logFile = path.join(logsDir, 'security.log');
  const logString = JSON.stringify(logEntry) + '\n';
  
  fs.appendFileSync(logFile, logString);
}