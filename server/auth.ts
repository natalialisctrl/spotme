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
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMfaEnabledEmail,
  sendSecurityAlertEmail
} from "./email";

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

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'gymbuddy-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Set userId in session
        if (req.session) {
          req.session.userId = user.id;
          console.log("Session userId set during registration:", req.session.userId);
        }
        
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Set userId in session
    if (req.session) {
      req.session.userId = req.user!.id;
      console.log("Session userId set during login:", req.session.userId);
    }
    
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
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
    
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    
    // Ensure userId is set in session
    if (req.session && !req.session.userId) {
      req.session.userId = userWithoutPassword.id;
    }
    
    res.json(userWithoutPassword);
  });
}