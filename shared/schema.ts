import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table with profile information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  gender: text("gender").notNull(),
  experienceLevel: text("experience_level").notNull(),
  experienceYears: integer("experience_years").notNull(),
  bio: text("bio"),
  gymName: text("gym_name"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  lastActive: timestamp("last_active"),
  // Profile picture
  profilePictureUrl: text("profile_picture_url"),
  // AI-generated profile insights
  aiGeneratedInsights: text("ai_generated_insights"),
  // Identity verification fields
  firebaseUid: text("firebase_uid").unique(),
  googleVerified: boolean("google_verified").default(false),
  facebookVerified: boolean("facebook_verified").default(false),
  instagramVerified: boolean("instagram_verified").default(false),
  // Account verification
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  // Multi-factor authentication
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"),
  backupCodes: text("backup_codes"),
  // Security logs
  passwordLastChanged: timestamp("password_last_changed"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lastFailedLogin: timestamp("last_failed_login"),
  accountLocked: boolean("account_locked").default(false),
  accountLockedUntil: timestamp("account_locked_until"),
  // Password reset
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
});

// Workout types enumeration
export const workoutTypes = [
  "chest", "arms", "legs", "back", "shoulders", "core", "cardio", "full_body"
] as const;

// Workout focus for the day
export const workoutFocus = pgTable("workout_focus", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  workoutType: text("workout_type").notNull(),
  date: timestamp("date").notNull(),
});

// Connection requests between users
export const connectionRequests = pgTable("connection_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  status: text("status").notNull(), // pending, accepted, rejected
  createdAt: timestamp("created_at").notNull(),
});

// Connections (matched users)
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull(),
});

// Messages between connected users
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull().references(() => connections.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
});

// Compatibility quiz responses
export const compatibilityResponses = pgTable("compatibility_responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  responses: jsonb("responses").notNull(),
});

// Workout routines
export const workoutRoutines = pgTable("workout_routines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  exercises: jsonb("exercises").notNull(), // Array of exercise objects with name, sets, reps, etc.
  targetMuscleGroups: jsonb("target_muscle_groups").notNull(), // Array of muscle groups
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  estimatedDuration: integer("estimated_duration").notNull(), // in minutes
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Scheduled meetups between users
export const scheduledMeetups = pgTable("scheduled_meetups", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  gymLocation: text("gym_location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  date: timestamp("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  workoutRoutineId: integer("workout_routine_id").references(() => workoutRoutines.id),
  maxParticipants: integer("max_participants"),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Meetup participants
export const meetupParticipants = pgTable("meetup_participants", {
  id: serial("id").primaryKey(),
  meetupId: integer("meetup_id").notNull().references(() => scheduledMeetups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull(), // confirmed, tentative, declined
  joinedAt: timestamp("joined_at").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertWorkoutFocusSchema = createInsertSchema(workoutFocus).omit({ id: true });
export const insertConnectionRequestSchema = createInsertSchema(connectionRequests).omit({ id: true });
export const insertConnectionSchema = createInsertSchema(connections).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertCompatibilityResponseSchema = createInsertSchema(compatibilityResponses).omit({ id: true });
export const insertWorkoutRoutineSchema = createInsertSchema(workoutRoutines).omit({ id: true });
export const insertScheduledMeetupSchema = createInsertSchema(scheduledMeetups).omit({ id: true });
export const insertMeetupParticipantSchema = createInsertSchema(meetupParticipants).omit({ id: true });

// Custom schemas for specific operations
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  mfaCode: z.string().optional(),
});

// Enhanced password schema with strong requirements
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Schema for password change
export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Schema for MFA setup
export const setupMfaSchema = z.object({
  password: z.string(),
  mfaCode: z.string().length(6).regex(/^\d+$/, "MFA code must be 6 digits")
});

// Schema for MFA verification
export const verifyMfaSchema = z.object({
  mfaCode: z.string().length(6).regex(/^\d+$/, "MFA code must be 6 digits")
});

// Schema for email verification
export const verifyEmailSchema = z.object({
  token: z.string()
});

// Schema for password reset request
export const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

// Schema for password reset
export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const nearbyUsersSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  workoutType: z.enum(workoutTypes).optional(),
  gender: z.string().optional(),
  experienceLevel: z.string().optional(),
  maxDistance: z.number().default(5), // in miles
  sameGymOnly: z.boolean().default(false),
});

// Define an exercise schema for workout routines
export const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  sets: z.number().int().min(1, "At least 1 set is required"),
  reps: z.number().int().min(1, "At least 1 rep is required"),
  weight: z.number().optional(),
  duration: z.number().optional(), // in seconds
  notes: z.string().optional(),
});

// Workout routine validation
export const workoutRoutineSchema = z.object({
  name: z.string().min(3, "Routine name must be at least 3 characters"),
  description: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, "Add at least one exercise"),
  targetMuscleGroups: z.array(z.string()).min(1, "Select at least one target muscle group"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedDuration: z.number().int().min(5, "Duration must be at least 5 minutes"),
  isPublic: z.boolean().default(false),
});

// Scheduled meetup validation
export const scheduledMeetupSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  gymLocation: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  date: z.date({ required_error: "Date is required" }),
  startTime: z.string({ required_error: "Start time is required" }),
  endTime: z.string().optional(),
  workoutRoutineId: z.number().optional(),
  maxParticipants: z.number().int().min(2).optional(),
});

// Types for the schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertWorkoutFocus = z.infer<typeof insertWorkoutFocusSchema>;
export type InsertConnectionRequest = z.infer<typeof insertConnectionRequestSchema>;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertCompatibilityResponse = z.infer<typeof insertCompatibilityResponseSchema>;
export type InsertWorkoutRoutine = z.infer<typeof insertWorkoutRoutineSchema>;
export type InsertScheduledMeetup = z.infer<typeof insertScheduledMeetupSchema>;
export type InsertMeetupParticipant = z.infer<typeof insertMeetupParticipantSchema>;

export type User = typeof users.$inferSelect;
export type WorkoutFocus = typeof workoutFocus.$inferSelect;
export type ConnectionRequest = typeof connectionRequests.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type CompatibilityResponse = typeof compatibilityResponses.$inferSelect;
export type WorkoutRoutine = typeof workoutRoutines.$inferSelect;
export type ScheduledMeetup = typeof scheduledMeetups.$inferSelect;
export type MeetupParticipant = typeof meetupParticipants.$inferSelect;

export type Login = z.infer<typeof loginSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type SetupMfa = z.infer<typeof setupMfaSchema>;
export type VerifyMfa = z.infer<typeof verifyMfaSchema>;
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;
export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type UpdateLocation = z.infer<typeof updateLocationSchema>;
export type NearbyUsersParams = z.infer<typeof nearbyUsersSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type WorkoutRoutineData = z.infer<typeof workoutRoutineSchema>;
export type ScheduledMeetupData = z.infer<typeof scheduledMeetupSchema>;

// Type for WebSocket messages
export type WebSocketMessage = {
  type: 'message' | 'connection_request' | 'connection_accepted' | 'user_location' | 
        'meetup_invitation' | 'meetup_updated' | 'meetup_cancelled' | 'meetup_joined' | 
        'meetup_participant_left' | 'workout_shared';
  senderId: number;
  receiverId?: number;
  data: any;
};
