import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertWorkoutFocusSchema = createInsertSchema(workoutFocus).omit({ id: true });
export const insertConnectionRequestSchema = createInsertSchema(connectionRequests).omit({ id: true });
export const insertConnectionSchema = createInsertSchema(connections).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertCompatibilityResponseSchema = createInsertSchema(compatibilityResponses).omit({ id: true });

// Custom schemas for specific operations
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
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

// Types for the schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertWorkoutFocus = z.infer<typeof insertWorkoutFocusSchema>;
export type InsertConnectionRequest = z.infer<typeof insertConnectionRequestSchema>;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertCompatibilityResponse = z.infer<typeof insertCompatibilityResponseSchema>;

export type User = typeof users.$inferSelect;
export type WorkoutFocus = typeof workoutFocus.$inferSelect;
export type ConnectionRequest = typeof connectionRequests.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type CompatibilityResponse = typeof compatibilityResponses.$inferSelect;

export type Login = z.infer<typeof loginSchema>;
export type UpdateLocation = z.infer<typeof updateLocationSchema>;
export type NearbyUsersParams = z.infer<typeof nearbyUsersSchema>;

// Type for WebSocket messages
export type WebSocketMessage = {
  type: 'message' | 'connection_request' | 'connection_accepted' | 'user_location';
  senderId: number;
  receiverId?: number;
  data: any;
};
