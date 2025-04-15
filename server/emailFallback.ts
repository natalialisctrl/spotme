import { logSecurityEvent } from './security';

// This is a fallback for email sending when no API key is available
// It will log the email details in the console for demonstration purposes

// Email templates similar to the email service but with simpler structure
const emailTemplates = {
  // Account verification
  verifyEmail: {
    subject: `Verify your SpotMe account`,
    generateText: (name: string, token: string) => `
      VERIFICATION EMAIL (Fallback)
      
      Hi ${name},
      
      Thanks for signing up for SpotMe. To complete your registration, please use the following verification code:
      
      Verification Code: ${token}
      
      This verification code will expire in 24 hours.
      
      Best regards,
      The SpotMe Team
    `
  },
  
  // Password reset
  resetPassword: {
    subject: `Reset your SpotMe password`,
    generateText: (name: string, token: string) => `
      PASSWORD RESET REQUEST (Fallback)
      
      Hi ${name},
      
      We received a request to reset your password for your SpotMe account. Use the following reset code:
      
      Reset Code: ${token}
      
      This password reset code will expire in 1 hour.
      
      Best regards,
      The SpotMe Team
    `
  },
  
  // MFA enabled notification
  mfaEnabled: {
    subject: `Two-factor authentication enabled on your SpotMe account`,
    generateText: (name: string) => `
      TWO-FACTOR AUTHENTICATION ENABLED (Fallback)
      
      Hi ${name},
      
      Two-factor authentication has been successfully enabled on your SpotMe account. Your account is now more secure!
      
      From now on, you'll need to enter a verification code from your authenticator app when signing in to your account.
      
      Best regards,
      The SpotMe Team
    `
  },
  
  // Security alert
  securityAlert: {
    subject: `Security alert for your SpotMe account`,
    generateText: (name: string, event: string, details: string, location: string, time: string) => `
      SECURITY ALERT (Fallback)
      
      Hi ${name},
      
      We detected a security event on your SpotMe account that you should know about:
      
      Event: ${event}
      Details: ${details}
      Location: ${location}
      Time: ${time}
      
      If you don't recognize this activity, please secure your account by changing your password immediately.
      
      Best regards,
      The SpotMe Team
    `
  }
};

/**
 * Mock sending an email by logging it to the console
 */
function logEmail(to: string, subject: string, text: string): boolean {
  console.log("\n==========================================================");
  console.log("FALLBACK EMAIL NOTIFICATION (would normally be sent via email)");
  console.log("==========================================================");
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log("----------------------------------------------------------");
  console.log(text);
  console.log("==========================================================\n");
  
  return true;
}

/**
 * Send an email verification message
 */
export async function sendVerificationEmail(userId: number, email: string, name: string, token: string): Promise<boolean> {
  const template = emailTemplates.verifyEmail;
  const text = template.generateText(name, token);
  
  const success = logEmail(email, template.subject, text);
  
  // Log the security event
  logSecurityEvent(userId, 'EMAIL_VERIFICATION_FALLBACK', {
    email
  });
  
  return success;
}

/**
 * Send a password reset message
 */
export async function sendPasswordResetEmail(userId: number, email: string, name: string, token: string): Promise<boolean> {
  const template = emailTemplates.resetPassword;
  const text = template.generateText(name, token);
  
  const success = logEmail(email, template.subject, text);
  
  // Log the security event
  logSecurityEvent(userId, 'PASSWORD_RESET_FALLBACK', {
    email
  });
  
  return success;
}

/**
 * Send an MFA enabled notification
 */
export async function sendMfaEnabledEmail(userId: number, email: string, name: string): Promise<boolean> {
  const template = emailTemplates.mfaEnabled;
  const text = template.generateText(name);
  
  const success = logEmail(email, template.subject, text);
  
  // Log the security event
  logSecurityEvent(userId, 'MFA_ENABLED_FALLBACK', {
    email
  });
  
  return success;
}

/**
 * Send a security alert notification
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
  const text = template.generateText(name, event, details, location, time);
  
  const success = logEmail(email, template.subject, text);
  
  // Log the security event
  logSecurityEvent(userId, 'SECURITY_ALERT_FALLBACK', {
    email,
    event
  });
  
  return success;
}