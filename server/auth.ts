import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import {
  generateMfaSecret,
  generateQrCode,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  isAccountLocked,
  recordFailedLogin,
  resetFailedAttempts,
  createPasswordResetToken,
  createEmailVerificationToken,
  logSecurityEvent
} from "./security";
// Import from emailFallback instead of email to use the console-based system
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMfaEnabledEmail,
  sendSecurityAlertEmail
} from "./emailFallback";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Add userId to session type
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Handle non-hashed passwords in demo accounts
  if (!stored.includes('.')) {
    return supplied === stored;
  }

  // Handle properly hashed passwords
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'gymbuddy-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    // Set secure cookie settings
    cookie: { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Enhanced LocalStrategy with account lockout
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Check if account is locked
        if (isAccountLocked(user)) {
          const lockTime = new Date(user.accountLockedUntil!);
          const minutesRemaining = Math.ceil((lockTime.getTime() - Date.now()) / (60 * 1000));
          return done(null, false, { 
            message: `Account is temporarily locked. Please try again after ${minutesRemaining} minutes.` 
          });
        }
        
        // Verify password
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          // Record failed login attempt
          await recordFailedLogin(user.id);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Check if MFA is enabled and verification is required
        if (user.mfaEnabled) {
          // Return partial success, client needs to complete MFA verification
          return done(null, user, { mfaRequired: true });
        }
        
        // Successful login - reset failed attempts counter
        await resetFailedAttempts(user.id);
        
        // Log the successful login
        logSecurityEvent(user.id, 'LOGIN_SUCCESS', {
          username: user.username,
          ip: 'client_ip_would_go_here'
        });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Register with enhanced security features
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Create the user with enhanced fields
      const hashedPassword = await hashPassword(req.body.password);
      const now = new Date();
      
      // Generate email verification token
      const verificationToken = randomBytes(32).toString('hex');
      const tokenExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: tokenExpires,
        passwordLastChanged: now,
        failedLoginAttempts: 0,
        accountLocked: false
      });

      // Send verification email
      await sendVerificationEmail(user.id, user.email, user.name, verificationToken);

      // Log the registration
      logSecurityEvent(user.id, 'USER_REGISTERED', {
        username: user.username,
        email: user.email,
        emailVerificationSent: true
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Set userId in session
        if (req.session) {
          req.session.userId = user.id;
        }
        
        // Don't send password and sensitive data back to client
        const { 
          password, emailVerificationToken, resetPasswordToken, 
          mfaSecret, backupCodes, ...userToReturn 
        } = user;
        
        res.status(201).json({
          ...userToReturn,
          verificationEmailSent: true
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  // Updated login to handle MFA
  app.post("/api/login", (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      
      // Check if MFA verification is required
      if (info && info.mfaRequired) {
        // Send partial login response indicating MFA is required
        return res.status(200).json({ 
          requiresMfa: true,
          userId: user.id,
          username: user.username,
          message: "Please enter your MFA code to complete login."
        });
      }
      
      // Normal login flow
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Set userId in session
        if (req.session) {
          req.session.userId = user.id;
        }
        
        // Don't send sensitive data back to client
        const { 
          password, emailVerificationToken, resetPasswordToken, 
          mfaSecret, backupCodes, ...userToReturn 
        } = user;
        
        res.status(200).json(userToReturn);
      });
    })(req, res, next);
  });

  // MFA verification endpoint
  app.post("/api/mfa/verify", async (req, res) => {
    try {
      const { userId, mfaCode } = req.body;
      
      if (!userId || !mfaCode) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({ message: "MFA is not enabled for this user" });
      }
      
      // Verify the MFA code
      let isValid = verifyTOTP(mfaCode, user.mfaSecret);
      
      // If TOTP verification fails, check backup codes
      if (!isValid && user.backupCodes) {
        isValid = verifyBackupCode(mfaCode, user.backupCodes);
        
        // If backup code was used, remove it from the list
        if (isValid) {
          // TODO: Remove used backup code
          logSecurityEvent(user.id, 'BACKUP_CODE_USED', {
            username: user.username
          });
        }
      }
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid MFA code" });
      }
      
      // Reset failed login attempts on successful MFA
      await resetFailedAttempts(user.id);
      
      // Complete the login process
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Set userId in session
        if (req.session) {
          req.session.userId = user.id;
        }
        
        // Log the successful MFA verification
        logSecurityEvent(user.id, 'MFA_LOGIN_SUCCESS', {
          username: user.username
        });
        
        // Don't send sensitive data back to client
        const { 
          password, emailVerificationToken, resetPasswordToken, 
          mfaSecret, backupCodes, ...userToReturn 
        } = user;
        
        res.status(200).json(userToReturn);
      });
    } catch (error) {
      console.error("MFA verification error:", error);
      res.status(500).json({ message: "Verification failed. Please try again." });
    }
  });

  // MFA setup endpoint
  app.post("/api/mfa/setup", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as SelectUser;
      
      // Generate a new MFA secret
      const secret = generateMfaSecret();
      
      // Generate QR code for the secret
      const qrCode = await generateQrCode(user.username, secret);
      
      // Generate backup codes
      const backupCodes = generateBackupCodes();
      
      // Store the secret and hashed backup codes (will be saved when MFA is enabled)
      req.session!.mfaSetupSecret = secret;
      req.session!.mfaSetupBackupCodes = backupCodes;
      
      res.json({
        qrCode,
        backupCodes,
        secret
      });
    } catch (error) {
      console.error("MFA setup error:", error);
      res.status(500).json({ message: "Failed to set up MFA. Please try again." });
    }
  });

  // MFA enable endpoint
  app.post("/api/mfa/enable", isAuthenticated, async (req, res) => {
    try {
      const { mfaCode } = req.body;
      const user = req.user as SelectUser;
      
      // Get the secret from session
      const secret = req.session!.mfaSetupSecret;
      const backupCodes = req.session!.mfaSetupBackupCodes;
      
      if (!secret || !backupCodes) {
        return res.status(400).json({ message: "MFA setup not initiated" });
      }
      
      // Verify the code
      const isValid = verifyTOTP(mfaCode, secret);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid MFA code" });
      }
      
      // Hash backup codes for storage
      const hashedBackupCodes = hashBackupCodes(backupCodes);
      
      // Enable MFA for the user
      await storage.updateUser(user.id, {
        mfaEnabled: true,
        mfaSecret: secret,
        backupCodes: hashedBackupCodes
      });
      
      // Clear the setup data from session
      delete req.session!.mfaSetupSecret;
      delete req.session!.mfaSetupBackupCodes;
      
      // Send MFA enabled email notification
      await sendMfaEnabledEmail(user.id, user.email, user.name);
      
      // Log the event
      logSecurityEvent(user.id, 'MFA_ENABLED', {
        username: user.username
      });
      
      res.json({
        success: true,
        message: "MFA has been enabled successfully."
      });
    } catch (error) {
      console.error("MFA enable error:", error);
      res.status(500).json({ message: "Failed to enable MFA. Please try again." });
    }
  });

  // MFA disable endpoint
  app.post("/api/mfa/disable", isAuthenticated, async (req, res) => {
    try {
      const { password } = req.body;
      const user = req.user as SelectUser;
      
      // Verify password
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Disable MFA for the user
      await storage.updateUser(user.id, {
        mfaEnabled: false,
        mfaSecret: null,
        backupCodes: null
      });
      
      // Log the event
      logSecurityEvent(user.id, 'MFA_DISABLED', {
        username: user.username
      });
      
      res.json({
        success: true,
        message: "MFA has been disabled successfully."
      });
    } catch (error) {
      console.error("MFA disable error:", error);
      res.status(500).json({ message: "Failed to disable MFA. Please try again." });
    }
  });

  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }
      
      // Find user with this verification token
      const users = await storage.getAllUsers();
      const user = users.find(u => u.emailVerificationToken === token);
      
      if (!user) {
        return res.status(404).json({ message: "Invalid verification token" });
      }
      
      // Check if token has expired
      const now = new Date();
      const tokenExpiry = new Date(user.emailVerificationExpires!);
      
      if (now > tokenExpiry) {
        return res.status(400).json({ message: "Verification token has expired" });
      }
      
      // Mark email as verified
      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });
      
      // Log the event
      logSecurityEvent(user.id, 'EMAIL_VERIFIED', {
        username: user.username,
        email: user.email
      });
      
      // Redirect to a verification success page
      res.redirect('/email-verified');
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Verification failed. Please try again." });
    }
  });

  // Resend verification email endpoint
  app.post("/api/resend-verification", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as SelectUser;
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }
      
      // Generate new verification token
      const verificationToken = randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update user with new token
      await storage.updateUser(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: tokenExpires
      });
      
      // Send verification email
      await sendVerificationEmail(user.id, user.email, user.name, verificationToken);
      
      res.json({ 
        success: true,
        message: "Verification email has been sent."
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email. Please try again." });
    }
  });

  // Request password reset endpoint
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      // Always respond with success even if user not found for security
      if (!user) {
        return res.json({ 
          success: true,
          message: "If the email exists in our system, a password reset link will be sent."
        });
      }
      
      // Generate password reset token
      const resetToken = await createPasswordResetToken(user.id);
      
      // Send password reset email
      await sendPasswordResetEmail(user.id, user.email, user.name, resetToken);
      
      // Log the event
      logSecurityEvent(user.id, 'PASSWORD_RESET_REQUESTED', {
        username: user.username,
        email: user.email
      });
      
      res.json({ 
        success: true,
        message: "If the email exists in our system, a password reset link will be sent."
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to request password reset. Please try again." });
    }
  });

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      // Find user with this reset token
      const users = await storage.getAllUsers();
      const user = users.find(u => u.resetPasswordToken === token);
      
      if (!user) {
        return res.status(404).json({ message: "Invalid reset token" });
      }
      
      // Check if token has expired
      const now = new Date();
      const tokenExpiry = new Date(user.resetPasswordExpires!);
      
      if (now > tokenExpiry) {
        return res.status(400).json({ message: "Reset token has expired" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user with new password
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        passwordLastChanged: now,
        failedLoginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null
      });
      
      // Log the event
      logSecurityEvent(user.id, 'PASSWORD_RESET_COMPLETED', {
        username: user.username
      });
      
      res.json({ 
        success: true,
        message: "Password has been reset successfully. You can now login with your new password."
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password. Please try again." });
    }
  });

  // Change password endpoint
  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user as SelectUser;
      
      // Verify current password
      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user with new password
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordLastChanged: new Date()
      });
      
      // Log the event
      logSecurityEvent(user.id, 'PASSWORD_CHANGED', {
        username: user.username
      });
      
      res.json({ 
        success: true,
        message: "Password has been changed successfully."
      });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password. Please try again." });
    }
  });
  
  app.post("/api/logout", (req, res, next) => {
    if (req.user) {
      const userId = (req.user as SelectUser).id;
      logSecurityEvent(userId, 'USER_LOGOUT', {});
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    // Debug session info
    console.log("Session info:", {
      hasSession: !!req.session,
      userId: req.session?.userId,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user
    });
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Don't send sensitive data back to client
    const { 
      password, emailVerificationToken, resetPasswordToken, 
      mfaSecret, backupCodes, ...userToReturn 
    } = req.user as SelectUser;
    
    // Ensure userId is set in session
    if (req.session && !req.session.userId) {
      req.session.userId = userToReturn.id;
    }
    
    res.json(userToReturn);
  });
}