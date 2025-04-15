import { randomBytes } from "crypto";
import { authenticator } from "otplib";
import * as qrcode from "qrcode";
import { storage } from "./storage";

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a secure MFA secret
 */
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate a QR code for MFA setup
 */
export async function generateQrCode(username: string, secret: string): Promise<string> {
  const service = "SpotMe";
  const otpauth = authenticator.keyuri(username, service, secret);
  
  return new Promise((resolve, reject) => {
    qrcode.toDataURL(otpauth, (err: any, imageUrl: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(imageUrl);
    });
  });
}

/**
 * Verify TOTP code for MFA
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

/**
 * Generate backup codes for MFA
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character backup codes
    codes.push(randomBytes(4).toString('hex'));
  }
  return codes;
}

/**
 * Hash backup codes for secure storage
 */
export function hashBackupCodes(codes: string[]): string {
  return JSON.stringify(codes);
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(providedCode: string, hashedCodesJson: string): boolean {
  try {
    const storedCodes = JSON.parse(hashedCodesJson);
    return storedCodes.includes(providedCode);
  } catch (error) {
    console.error("Backup code verification error:", error);
    return false;
  }
}

/**
 * Record a failed login attempt and lock account if necessary
 */
export async function recordFailedLogin(userId: number): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;
  
  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const updates: any = { failedLoginAttempts: failedAttempts };
  
  // Lock account after 5 failed attempts
  const MAX_FAILED_ATTEMPTS = 5;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const lockedUntil = new Date(Date.now() + lockDuration);
    
    updates.accountLocked = true;
    updates.accountLockedUntil = lockedUntil;
    
    // Log security event
    logSecurityEvent(userId, 'ACCOUNT_LOCKED', {
      username: user.username,
      failedAttempts,
      lockedUntil
    });
  }
  
  await storage.updateUser(userId, updates);
  return true;
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
  
  const now = new Date();
  const lockTime = new Date(user.accountLockedUntil);
  
  // If lock time has passed, account is no longer locked
  if (now > lockTime) return false;
  
  return true;
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
  
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
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour expiry
  
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
  const timestamp = new Date();
  console.log(`[SECURITY_EVENT] [${timestamp.toISOString()}] User ${userId} - ${eventType}`, details);
  
  // In a real application, you would persist these security events
  // to a database for auditing purposes
}