import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, time, date, varchar, primaryKey } from "drizzle-orm/pg-core";
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
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Security fields
  isVerified: boolean("is_verified").notNull().default(false),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecret: text("mfa_secret"),
  verificationToken: text("verification_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  accountLocked: boolean("account_locked").notNull().default(false),
  lockExpiry: timestamp("lock_expiry"),
  lastPasswordChange: timestamp("last_password_change"),
  backupCodes: text("backup_codes"),
  // Personality insights
  personalityProfile: jsonb("personality_profile"),
  // Membership tier
  membershipTier: text("membership_tier").notNull().default("free"),
});

// Workout types
export const workoutTypes = [
  "chest", "arms", "legs", "back", "shoulders", "core", "cardio", "full_body"
] as const;

// Table for user workout preferences
export const workoutFocus = pgTable("workout_focus", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  focusAreas: text("focus_areas").array().notNull(), // Array of workout types
  preferredDays: text("preferred_days").array().notNull(), // Array of weekdays
  preferredTimes: jsonb("preferred_times").notNull(), // JSON with morning, afternoon, evening, night boolean flags
  preferredDuration: integer("preferred_duration").notNull(), // in minutes
  experienceLevel: text("experience_level").notNull(),
  goals: text("goals").array().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Connection requests between users
export const connectionRequests = pgTable("connection_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  message: text("message"),
  compatibilityScore: integer("compatibility_score"), // Optional compatibility score
  createdAt: timestamp("created_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => {
  return {
    uniqueConnection: primaryKey({ columns: [table.senderId, table.receiverId] })
  };
});

// Established connections
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"), // active, inactive, blocked
  compatibilityScore: integer("compatibility_score"),
  lastInteraction: timestamp("last_interaction"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    uniqueConnection: primaryKey({ columns: [table.user1Id, table.user2Id] })
  };
});

// Messages between connected users
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User compatibility survey responses
export const compatibilityResponses = pgTable("compatibility_responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  questionId: integer("question_id").notNull(),
  response: text("response").notNull(),
  weight: integer("weight").notNull().default(1), // How important this factor is to the user
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    uniqueResponse: primaryKey({ columns: [table.userId, table.questionId] })
  };
});

// Workout routines
export const workoutRoutines = pgTable("workout_routines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  exercises: jsonb("exercises").notNull(), // Array of exercise objects with name, sets, reps, etc.
  targetMuscleGroups: text("target_muscle_groups").array().notNull(),
  difficulty: text("difficulty").notNull(),
  estimatedDuration: integer("estimated_duration").notNull(), // in minutes
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Scheduled workout meetups
export const scheduledMeetups = pgTable("scheduled_meetups", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  gymLocation: text("gym_location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  workoutRoutineId: integer("workout_routine_id").references(() => workoutRoutines.id),
  maxParticipants: integer("max_participants"),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Meetup participants
export const meetupParticipants = pgTable("meetup_participants", {
  id: serial("id").primaryKey(),
  meetupId: integer("meetup_id").notNull().references(() => scheduledMeetups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("confirmed"), // confirmed, maybe, cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    uniqueParticipant: primaryKey({ columns: [table.meetupId, table.userId] })
  };
});

// Workout challenges for users to join and compete
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  goalType: text("goal_type").notNull(), // reps, weight, distance, duration, frequency
  goalValue: integer("goal_value").notNull(),
  targetExercise: text("target_exercise").notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Challenge participants
export const challengeParticipants = pgTable("challenge_participants", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  userId: integer("user_id").notNull().references(() => users.id),
  currentValue: integer("current_value").notNull().default(0),
  status: text("status").notNull().default("active"), // active, completed, dropped
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => {
  return {
    uniqueParticipant: primaryKey({ columns: [table.challengeId, table.userId] })
  };
});

// Progress entries for challenge participants
export const progressEntries = pgTable("progress_entries", {
  id: serial("id").primaryKey(),
  challengeParticipantId: integer("challenge_participant_id").notNull().references(() => challengeParticipants.id),
  value: integer("value").notNull(),
  notes: text("notes"),
  proofImageUrl: text("proof_image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Comments on challenges
export const challengeComments = pgTable("challenge_comments", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Achievement badges that users can earn
export const achievementBadges = pgTable("achievement_badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(), // workout, social, challenge, streak, milestone
  requirement: text("requirement").notNull(),
  icon: text("icon").notNull(),
  level: integer("level").notNull().default(1), // 1-5 for badge tiers
  points: integer("points").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User achievements
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => achievementBadges.id),
  progress: integer("progress").notNull().default(0), // Progress towards completion (0-100)
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    uniqueAchievement: primaryKey({ columns: [table.userId, table.badgeId] })
  };
});

// User workout check-ins
export const workoutCheckins = pgTable("workout_checkins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  workoutType: text("workout_type").notNull(),
  duration: integer("duration").notNull(), // in minutes
  meetupId: integer("meetup_id").references(() => scheduledMeetups.id),
  notes: text("notes"),
  proofImageUrl: text("proof_image_url"),
  partnerId: integer("partner_id").references(() => users.id),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User workout streaks
export const userStreaks = pgTable("user_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCheckInDate: date("last_check_in_date"),
  totalWorkouts: integer("total_workouts").notNull().default(0),
  level: integer("level").notNull().default(1),
  totalPoints: integer("total_points").notNull().default(0),
  weeklyWorkouts: integer("weekly_workouts").notNull().default(0),
  monthlyWorkouts: integer("monthly_workouts").notNull().default(0),
  weeklyTarget: integer("weekly_target").notNull().default(3),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workout export table
export const workoutExports = pgTable("workout_exports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  workoutIds: text("workout_ids").notNull(), // Comma-separated workout IDs
  platform: text("platform").notNull(), // FitnessPlatform type
  format: text("format").notNull(), // ExportFileFormat type
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  exportUrl: text("export_url"), // URL to download the exported file
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Integration tokens for fitness platforms
export const fitnessIntegrations = pgTable("fitness_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(), // FitnessPlatform type
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  scope: text("scope"),
  connected: boolean("connected").notNull().default(false),
  lastSyncDate: timestamp("last_sync_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userPlatformUnique: primaryKey({ columns: [table.userId, table.platform] })
  };
});

// Workout battle exercise types
export const battleExerciseTypes = [
  "pushups", "squats", "lunges", "burpees", "jumping_jacks", 
  "situps", "plank", "mountain_climbers", "bicep_curls", "shoulder_press"
] as const;

// Battle durations in seconds
export const battleDurations = [30, 60, 120, 180, 300] as const; // 30s, 1min, 2min, 3min, 5min

// Workout battle table - for real-time competitions
export const workoutBattles = pgTable("workout_battles", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  opponentId: integer("opponent_id").references(() => users.id),
  exerciseType: text("exercise_type").notNull(), // Type of exercise for the battle
  repTarget: integer("rep_target"), // Optional target number of reps
  duration: integer("duration").notNull(), // Battle duration in seconds
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  winnerId: integer("winner_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  isQuickChallenge: boolean("is_quick_challenge").notNull().default(false), // For quick 2-minute challenges
});

// Workout battle performance
export const battlePerformance = pgTable("battle_performance", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").notNull().references(() => workoutBattles.id),
  userId: integer("user_id").notNull().references(() => users.id),
  reps: integer("reps").notNull().default(0), // Number of reps completed
  verified: boolean("verified").notNull().default(false), // Whether the performance was verified by video
  submittedAt: timestamp("submitted_at"),
  formQuality: integer("form_quality"), // 1-10 rating of exercise form
  notes: text("notes"),
  videoUrl: text("video_url"), // URL to recorded video snippet
  heartRate: integer("heart_rate"), // Optional heart rate during exercise
  caloriesBurned: integer("calories_burned"), // Estimated calories burned
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
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true });
export const insertChallengeParticipantSchema = createInsertSchema(challengeParticipants).omit({ id: true });
export const insertProgressEntrySchema = createInsertSchema(progressEntries).omit({ id: true });
export const insertChallengeCommentSchema = createInsertSchema(challengeComments).omit({ id: true });
export const insertAchievementBadgeSchema = createInsertSchema(achievementBadges).omit({ id: true });
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true });
export const insertWorkoutCheckinSchema = createInsertSchema(workoutCheckins).omit({ id: true });
export const insertUserStreakSchema = createInsertSchema(userStreaks).omit({ id: true });
export const insertWorkoutBattleSchema = createInsertSchema(workoutBattles).omit({ id: true });
export const insertBattlePerformanceSchema = createInsertSchema(battlePerformance).omit({ id: true });

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
  maxDistance: z.coerce.number().default(5), // in miles - coerce string to number
  sameGymOnly: z.boolean().or(z.string().transform(val => val === 'true')).default(false),
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
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  startTime: z.string({ required_error: "Start time is required" }),
  endTime: z.string().optional(),
  workoutRoutineId: z.number().optional(),
  maxParticipants: z.number().int().min(2).optional(),
});

// Goal types for challenges
export const goalTypes = ["reps", "weight", "distance", "duration", "frequency"] as const;

// Challenge validation
export const challengeSchema = z.object({
  name: z.string().min(3, "Challenge name must be at least 3 characters"),
  description: z.string().min(10, "Description should be at least 10 characters"),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)),
  goalType: z.enum(goalTypes),
  goalValue: z.number().int().min(1, "Goal value must be at least 1"),
  targetExercise: z.string().min(2, "Target exercise name required"),
  isPublic: z.boolean().default(true),
  imageUrl: z.string().optional(),
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

// Progress entry validation
export const progressEntrySchema = z.object({
  challengeParticipantId: z.number(),
  value: z.number().int().min(1, "Progress value must be at least 1"),
  notes: z.string().optional(),
  proofImageUrl: z.string().optional(),
});

// Challenge comment validation
export const challengeCommentSchema = z.object({
  challengeId: z.number(),
  content: z.string().min(1, "Comment cannot be empty"),
});

// Achievement badge categories
export const badgeCategories = ["workout", "social", "challenge", "streak", "milestone"] as const;

// Supported fitness platforms for export
export const fitnessPlatforms = ["strava", "fitbit", "garmin", "apple_health", "google_fit", "generic"] as const;

// Export file format types
export const exportFileFormats = ["tcx", "gpx", "csv", "json", "fit"] as const;

// Achievement badge validation
export const achievementBadgeSchema = z.object({
  name: z.string().min(3, "Badge name must be at least 3 characters"),
  description: z.string().min(10, "Description should be at least 10 characters"),
  category: z.enum(badgeCategories),
  requirement: z.string().min(5, "Requirement description is required"),
  icon: z.string().min(1, "Icon path or name is required"),
  level: z.number().int().min(1).max(5),
  points: z.number().int().min(1, "Points must be at least 1"),
});

// Workout check-in validation
export const workoutCheckinSchema = z.object({
  userId: z.number().int().positive(),
  date: z.string().or(z.date()).transform(val => new Date(val)),
  workoutType: z.enum(workoutTypes),
  duration: z.number().int().min(1, "Duration must be at least 1 minute"),
  partnerId: z.number().int().positive().optional(),
  meetupId: z.number().int().positive().optional(),
  notes: z.string().optional(),
  proofImageUrl: z.string().optional(),
  verified: z.boolean().default(false),
});

// Workout battle validation
export const workoutBattleSchema = z.object({
  creatorId: z.number().int().positive(),
  opponentId: z.number().int().positive().optional(),
  exerciseType: z.enum(battleExerciseTypes),
  repTarget: z.number().int().min(1).optional(),
  duration: z.number().int().refine(value => battleDurations.includes(value as any), {
    message: `Duration must be one of: ${battleDurations.join(', ')} seconds`,
  }),
  isQuickChallenge: z.boolean().default(false),
});

// Battle performance validation
export const battlePerformanceSchema = z.object({
  battleId: z.number().int().positive(),
  userId: z.number().int().positive(),
  reps: z.number().int().min(0),
  verified: z.boolean().default(false),
  formQuality: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
  videoUrl: z.string().optional(),
  heartRate: z.number().int().min(40).max(220).optional(),
  caloriesBurned: z.number().int().min(0).optional(),
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
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type ProgressEntry = typeof progressEntries.$inferSelect;
export type ChallengeComment = typeof challengeComments.$inferSelect;
export type AchievementBadge = typeof achievementBadges.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type WorkoutCheckin = typeof workoutCheckins.$inferSelect;
export type UserStreak = typeof userStreaks.$inferSelect;
export type WorkoutBattle = typeof workoutBattles.$inferSelect;
export type BattlePerformance = typeof battlePerformance.$inferSelect;

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
export type ChallengeData = z.infer<typeof challengeSchema>;
export type ProgressEntryData = z.infer<typeof progressEntrySchema>;
export type ChallengeCommentData = z.infer<typeof challengeCommentSchema>;

export type WorkoutBattleData = z.infer<typeof workoutBattleSchema>;
export type BattlePerformanceData = z.infer<typeof battlePerformanceSchema>;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type InsertChallengeParticipant = z.infer<typeof insertChallengeParticipantSchema>;
export type InsertProgressEntry = z.infer<typeof insertProgressEntrySchema>;
export type InsertChallengeComment = z.infer<typeof insertChallengeCommentSchema>;
export type InsertAchievementBadge = z.infer<typeof insertAchievementBadgeSchema>;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type InsertWorkoutCheckin = z.infer<typeof insertWorkoutCheckinSchema>;
export type InsertUserStreak = z.infer<typeof insertUserStreakSchema>;
export type InsertWorkoutBattle = z.infer<typeof insertWorkoutBattleSchema>;
export type InsertBattlePerformance = z.infer<typeof insertBattlePerformanceSchema>;

// Type for WebSocket messages
export type WebSocketMessage = {
  type: 'message' | 'connection_request' | 'connection_accepted' | 'user_location' | 
        'meetup_invitation' | 'meetup_updated' | 'meetup_cancelled' | 'meetup_joined' | 
        'meetup_participant_left' | 'workout_shared' |
        'challenge_created' | 'challenge_joined' | 'challenge_progress_updated' |
        'challenge_completed' | 'challenge_comment' | 'challenge_leaderboard_changed' |
        'achievement_earned' | 'badge_unlocked' | 'streak_milestone' | 'level_up' | 
        'workout_checkin' | 'partner_workout_completed' |
        'battle_invitation' | 'battle_accepted' | 'battle_declined' | 'battle_started' | 
        'battle_countdown' | 'battle_rep_update' | 'battle_completed' | 'battle_cancelled' |
        'quick_challenge_nearby';
  senderId: number;
  receiverId?: number;
  data: any;
};