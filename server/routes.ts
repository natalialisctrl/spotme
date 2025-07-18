import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  loginSchema, insertUserSchema, updateLocationSchema, insertWorkoutFocusSchema, insertDailyWorkoutFocusSchema,
  insertConnectionRequestSchema, insertMessageSchema, nearbyUsersSchema, WebSocketMessage,
  workoutRoutineSchema, scheduledMeetupSchema, insertWorkoutRoutineSchema, insertScheduledMeetupSchema,
  insertMeetupParticipantSchema, challengeSchema, progressEntrySchema, challengeCommentSchema,
  insertChallengeSchema, insertChallengeParticipantSchema, insertProgressEntrySchema, insertChallengeCommentSchema,
  insertGymTrafficSchema, gymTrafficQuerySchema
} from "@shared/schema";
import { ZodError } from "zod";
import { generatePersonalityInsights, PersonalityQuizResponses } from "./openai";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Map to store active WebSocket connections by user ID
const activeConnections = new Map<number, WebSocket>();

// Export active connections for use in other modules
export function getActiveConnections() {
  return activeConnections;
}

import { setupAuth } from "./auth";
import { setupChallengeRoutes } from "./challengeRoutes";
import { setupAchievementRoutes } from "./routes/achievementRoutes";
import { setupExportRoutes } from "./routes/exportRoutes";
import { setupBattleRoutes } from "./routes/battleRoutes";
import workoutRoutes from "./routes/workoutRoutes";
import gymVerificationRoutes from "./routes/gymVerification";
import spotifyRoutes from "./routes/spotifyRoutes";
import { setupNotificationRoutes } from "./routes/notificationRoutes";

import express from 'express';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Serve static files from public directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
  
  // Set up authentication routes
  setupAuth(app);
  
  // Add special account unlock endpoint for testing purposes
  app.post('/api/auth/unlock-account', async (req, res) => {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }
    
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Reset failed attempts and unlock account
      await storage.updateUser(user.id, {
        failedLoginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null
      });
      
      console.log(`Account unlocked for user: ${username}`);
      return res.status(200).json({ message: "Account unlocked successfully" });
    } catch (error) {
      console.error("Error unlocking account:", error);
      return res.status(500).json({ message: "Server error unlocking account" });
    }
  });
  
  // Set up challenge routes
  setupChallengeRoutes(app, activeConnections);
  
  // Set up achievement routes
  await setupAchievementRoutes(app);
  
  // Set up workout export routes
  setupExportRoutes(app);
  
  // Set up battle routes
  setupBattleRoutes(app, activeConnections);
  
  // Set up workout recommendation routes
  app.use('/api/workouts', workoutRoutes);
  
  // Set up gym verification routes
  app.use('/api/users', gymVerificationRoutes);
  
  // Set up Spotify routes
  app.use('/api/spotify', spotifyRoutes);
  
  // Set up notification routes
  setupNotificationRoutes(app);
  
  // Partner Ratings routes
  app.post('/api/ratings', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { ratedUserId, rating, feedback, isProfessional, isReliable, isMotivating, isPublic } = req.body;
      
      // Validate required fields
      if (!ratedUserId || rating === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Validate rating value (1-5)
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      
      // Create the partner rating
      const partnerRating = await storage.createPartnerRating({
        raterId: req.user.id,
        ratedUserId,
        rating,
        feedback: feedback || null,
        isProfessional: isProfessional || false,
        isReliable: isReliable || false,
        isMotivating: isMotivating || false,
        isPublic: isPublic !== false, // Default to true
      });
      
      res.status(201).json(partnerRating);
    } catch (error) {
      console.error('Error creating partner rating:', error);
      res.status(500).json({ message: 'Server error creating partner rating' });
    }
  });
  
  app.get('/api/ratings/by-user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const ratings = await storage.getPartnerRatingsByRatedUser(userId);
      
      // Only return public ratings or all ratings if the requesting user is the rated user
      const isOwnProfile = req.isAuthenticated() && req.user.id === userId;
      const filteredRatings = isOwnProfile 
        ? ratings 
        : ratings.filter(r => r.isPublic);
      
      res.json(filteredRatings);
    } catch (error) {
      console.error('Error getting user ratings:', error);
      res.status(500).json({ message: 'Server error getting user ratings' });
    }
  });
  
  app.get('/api/ratings/summary/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Get or create rating summary for user
      let summary = await storage.getUserRatingSummary(userId);
      
      if (!summary) {
        summary = await storage.updateUserRatingSummary(userId);
      }
      
      res.json(summary);
    } catch (error) {
      console.error('Error getting rating summary:', error);
      res.status(500).json({ message: 'Server error getting rating summary' });
    }
  });
  
  app.get('/api/ratings/given', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const ratings = await storage.getPartnerRatingsByRater(req.user.id);
      res.json(ratings);
    } catch (error) {
      console.error('Error getting ratings given by user:', error);
      res.status(500).json({ message: 'Server error getting ratings' });
    }
  });
  
  app.get('/api/ratings/received', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const ratings = await storage.getPartnerRatingsByRatedUser(req.user.id);
      res.json(ratings);
    } catch (error) {
      console.error('Error getting ratings received by user:', error);
      res.status(500).json({ message: 'Server error getting ratings' });
    }
  });
  
  app.get('/api/ratings/:id', async (req, res) => {
    try {
      const ratingId = parseInt(req.params.id);
      if (isNaN(ratingId)) {
        return res.status(400).json({ message: 'Invalid rating ID' });
      }
      
      const rating = await storage.getPartnerRating(ratingId);
      
      if (!rating) {
        return res.status(404).json({ message: 'Rating not found' });
      }
      
      // Only return the rating if it's public or if the requesting user is either the rater or rated user
      const isAuthorized = req.isAuthenticated() && 
        (req.user.id === rating.raterId || req.user.id === rating.ratedUserId || rating.isPublic);
      
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to view this rating' });
      }
      
      res.json(rating);
    } catch (error) {
      console.error('Error getting rating:', error);
      res.status(500).json({ message: 'Server error getting rating' });
    }
  });
  
  app.put('/api/ratings/:id', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const ratingId = parseInt(req.params.id);
      if (isNaN(ratingId)) {
        return res.status(400).json({ message: 'Invalid rating ID' });
      }
      
      const rating = await storage.getPartnerRating(ratingId);
      
      if (!rating) {
        return res.status(404).json({ message: 'Rating not found' });
      }
      
      // Only allow the rater to update their own rating
      if (rating.raterId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this rating' });
      }
      
      const { rating: ratingValue, feedback, isProfessional, isReliable, isMotivating, isPublic } = req.body;
      
      // Validate rating value if provided
      if (ratingValue !== undefined && (ratingValue < 1 || ratingValue > 5)) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      
      // Update the rating
      const updatedRating = await storage.updatePartnerRating(ratingId, {
        rating: ratingValue,
        feedback,
        isProfessional,
        isReliable,
        isMotivating,
        isPublic
      });
      
      res.json(updatedRating);
    } catch (error) {
      console.error('Error updating rating:', error);
      res.status(500).json({ message: 'Server error updating rating' });
    }
  });
  
  app.delete('/api/ratings/:id', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const ratingId = parseInt(req.params.id);
      if (isNaN(ratingId)) {
        return res.status(400).json({ message: 'Invalid rating ID' });
      }
      
      const rating = await storage.getPartnerRating(ratingId);
      
      if (!rating) {
        return res.status(404).json({ message: 'Rating not found' });
      }
      
      // Only allow the rater to delete their own rating
      if (rating.raterId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this rating' });
      }
      
      const deleted = await storage.deletePartnerRating(ratingId);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete rating' });
      }
      
      res.json({ message: 'Rating deleted successfully' });
    } catch (error) {
      console.error('Error deleting rating:', error);
      res.status(500).json({ message: 'Server error deleting rating' });
    }
  });
  
  // Create demo ratings for testing
  app.post('/api/ratings/demo', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const count = req.body.count || 10;
      const ratings = await storage.createDemoRatings(count);
      
      res.json({ 
        message: `Created ${ratings.length} demo ratings successfully`,
        count: ratings.length
      });
    } catch (error) {
      console.error('Error creating demo ratings:', error);
      res.status(500).json({ 
        message: 'Server error creating demo ratings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Gym traffic prediction routes
  app.post('/api/gym-traffic', async (req, res) => {
    try {
      const data = insertGymTrafficSchema.parse(req.body);
      const gymTraffic = await storage.addGymTrafficData(data);
      res.json(gymTraffic);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data', errors: error.errors });
      } else {
        console.error('Error adding gym traffic data:', error);
        res.status(500).json({ message: 'Server error' });
      }
    }
  });

  app.get('/api/gym-traffic/predict', async (req, res) => {
    try {
      const { gymName, dayOfWeek, hourOfDay } = req.query;
      
      // Improved validation with detailed error messages
      if (!gymName) {
        console.log('Missing gymName parameter in traffic prediction request');
        return res.status(400).json({ message: 'Missing required parameter: gymName' });
      }
      
      if (dayOfWeek === undefined) {
        console.log(`Missing dayOfWeek parameter for gym: ${gymName}`);
        return res.status(400).json({ message: 'Missing required parameter: dayOfWeek' });
      }
      
      if (hourOfDay === undefined) {
        console.log(`Missing hourOfDay parameter for gym: ${gymName}`);
        return res.status(400).json({ message: 'Missing required parameter: hourOfDay' });
      }
      
      console.log(`Predicting traffic for gym: ${gymName}, day: ${dayOfWeek}, hour: ${hourOfDay}`);
      
      // Check if the gym has any traffic data
      const hasAnyTrafficData = await storage.hasGymTrafficData(gymName as string);
      
      if (!hasAnyTrafficData) {
        console.log(`No traffic data found for gym: ${gymName} - generating seed data`);
        
        // Automatically seed data for this gym if none exists
        await storage.seedGymTrafficData(gymName as string);
        console.log(`Successfully seeded traffic data for gym: ${gymName}`);
      }

      const trafficLevel = await storage.predictGymTraffic(
        gymName as string, 
        parseInt(dayOfWeek as string), 
        parseInt(hourOfDay as string)
      );
      
      console.log(`Predicted traffic level for ${gymName}: ${trafficLevel}`);
      res.json({ gymName, dayOfWeek, hourOfDay, trafficLevel });
    } catch (error) {
      console.error('Error predicting gym traffic:', error);
      res.status(500).json({ 
        message: 'Server error predicting gym traffic',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/gym-traffic/query', async (req, res) => {
    try {
      // Parse the query parameters
      const query = gymTrafficQuerySchema.parse(req.query);
      const gymTrafficData = await storage.getGymTrafficByQuery(query);
      res.json(gymTrafficData);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
      } else {
        console.error('Error querying gym traffic data:', error);
        res.status(500).json({ message: 'Server error' });
      }
    }
  });

  app.get('/api/gym-traffic/busiest-times', async (req, res) => {
    try {
      const { gymName, dayOfWeek } = req.query;
      
      if (!gymName || dayOfWeek === undefined) {
        return res.status(400).json({ message: 'Missing required parameters: gymName, dayOfWeek' });
      }

      const busiestTimes = await storage.getBusiestTimes(
        gymName as string, 
        parseInt(dayOfWeek as string)
      );
      
      res.json({ gymName, dayOfWeek, busiestTimes });
    } catch (error) {
      console.error('Error getting busiest times:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/gym-traffic/quietest-times', async (req, res) => {
    try {
      const { gymName, dayOfWeek } = req.query;
      
      if (!gymName || dayOfWeek === undefined) {
        return res.status(400).json({ message: 'Missing required parameters: gymName, dayOfWeek' });
      }

      const quietestTimes = await storage.getQuietestTimes(
        gymName as string, 
        parseInt(dayOfWeek as string)
      );
      
      res.json({ gymName, dayOfWeek, quietestTimes });
    } catch (error) {
      console.error('Error getting quietest times:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Generate seed gym traffic data for testing
  app.post('/api/gym-traffic/seed', async (req, res) => {
    try {
      // Extract gymName from request body, with default value if not provided
      let { gymName } = req.body;
      
      // Use a default if no gym name is provided (handles empty request body case)
      if (!gymName) {
        gymName = "Default Gym";
        console.log("No gym name provided, using default: 'Default Gym'");
      }
      
      // Generate traffic data for each day of the week and each hour (5am-11pm)
      const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
      const hours = Array.from({ length: 19 }, (_, i) => i + 5); // 5am to 11pm
      
      const trafficPatterns = [
        // Weekend pattern (higher traffic, peaks in morning and evening)
        {
          days: [0, 6], // Sunday, Saturday
          pattern: {
            morning: { hours: [8, 9, 10, 11], level: [7, 9, 10, 8] },
            afternoon: { hours: [12, 13, 14, 15, 16], level: [6, 5, 4, 5, 6] },
            evening: { hours: [17, 18, 19, 20, 21], level: [7, 8, 9, 7, 5] }
          }
        },
        // Weekday pattern (peaks in early morning and after work)
        {
          days: [1, 2, 3, 4, 5], // Monday to Friday
          pattern: {
            morning: { hours: [5, 6, 7, 8], level: [6, 9, 10, 8] },
            afternoon: { hours: [9, 10, 11, 12, 13, 14, 15, 16], level: [5, 4, 3, 5, 6, 4, 3, 5] },
            evening: { hours: [17, 18, 19, 20, 21, 22, 23], level: [8, 10, 9, 7, 5, 3, 2] }
          }
        }
      ];
      
      const gymTrafficData = [];
      
      for (const dayOfWeek of daysOfWeek) {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const pattern = isWeekend ? trafficPatterns[0] : trafficPatterns[1];
        
        for (const hour of hours) {
          let trafficLevel = 5; // Default medium traffic
          
          // Morning hours
          if (hour >= 5 && hour <= 11) {
            const morningPattern = pattern.pattern.morning;
            const index = morningPattern.hours.indexOf(hour);
            if (index !== -1) {
              trafficLevel = morningPattern.level[index];
            }
          }
          // Afternoon hours
          else if (hour >= 12 && hour <= 16) {
            const afternoonPattern = pattern.pattern.afternoon;
            const index = afternoonPattern.hours.indexOf(hour);
            if (index !== -1) {
              trafficLevel = afternoonPattern.level[index];
            }
          }
          // Evening hours
          else if (hour >= 17 && hour <= 23) {
            const eveningPattern = pattern.pattern.evening;
            const index = eveningPattern.hours.indexOf(hour);
            if (index !== -1) {
              trafficLevel = eveningPattern.level[index];
            }
          }
          
          // Add some randomness to make it more realistic (-2 to +2)
          const randomOffset = Math.floor(Math.random() * 5) - 2;
          trafficLevel = Math.max(1, Math.min(10, trafficLevel + randomOffset));
          
          // Calculate estimated user count based on traffic level (1-10 scale)
          const userCount = Math.floor(trafficLevel * 5 + Math.random() * 10);
          
          const gymTraffic = await storage.addGymTrafficData({
            gymName,
            dayOfWeek,
            hourOfDay: hour,
            trafficLevel,
            userCount,
            recordedAt: new Date()
          });
          
          gymTrafficData.push(gymTraffic);
        }
      }
      
      res.json({ 
        message: `Created ${gymTrafficData.length} gym traffic records for ${gymName}`,
        count: gymTrafficData.length
      });
    } catch (error) {
      console.error('Error seeding gym traffic data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Make sure natalia user exists in the database
  try {
    // Check if natalia user exists
    const existingUser = await storage.getUserByUsername("natalia");
    
    if (!existingUser) {
      console.log("Creating natalia user in database...");
      // Create natalia user
      const nataliaUser = {
        username: "natalia",
        password: "liscr12",
        email: "natalia@spotme.com",
        name: "Natalia Liscio",
        gender: "female",
        experienceLevel: "intermediate",
        experienceYears: 5,
        bio: "Certified personal trainer who loves connecting with fitness enthusiasts",
        gymName: "FitZone Gym",
        latitude: 30.2267,  // Austin-based location
        longitude: -97.7476,
        aiGeneratedInsights: JSON.stringify({
          workoutStyle: "balanced",
          motivationTips: [
            "Track your progress with a fitness journal",
            "Set specific, achievable weekly goals",
            "Join group classes to stay motivated"
          ],
          recommendedGoals: [
            "Increase strength by 15% in three months",
            "Improve cardiovascular endurance",
            "Maintain consistent workout schedule"
          ],
          partnerPreferences: "Looking for dedicated partners who want to improve their form and technique"
        })
      };
      
      await storage.createUser(nataliaUser);
      console.log("Natalia user created successfully!");
      
      // Also create some demo users for testing
      console.log("Creating demo users in database...");
      const demoUsers = await storage.createDemoUsers(5);
      console.log(`Created ${demoUsers.length} demo users in database`);
    } else {
      console.log("Natalia user already exists in database");
    }
  } catch (error) {
    console.error("Error setting up initial users:", error);
  }
  
  // Simple demo data setup endpoint (not requiring authentication)
  // Special endpoint just to create the natalia user
  app.post('/api/natalia', async (req, res) => {
    try {
      // Check if natalia user exists
      const existingUser = await storage.getUserByUsername("natalia");
      
      if (existingUser) {
        return res.json({ 
          success: true, 
          message: "Natalia user already exists", 
          user: {
            username: existingUser.username,
            password: "liscr12" // We show the password because this is a demo
          }
        });
      }
      
      // Create natalia user
      const nataliaUser = {
        username: "natalia",
        password: "liscr12",
        email: "natalia@spotme.com",
        name: "Natalia Liscio",
        gender: "female",
        experienceLevel: "intermediate",
        experienceYears: 5,
        bio: "Certified personal trainer who loves connecting with fitness enthusiasts",
        gymName: "FitZone Gym",
        latitude: 30.2267,  // Austin-based location
        longitude: -97.7476,
        aiGeneratedInsights: JSON.stringify({
          workoutStyle: "balanced",
          motivationTips: [
            "Track your progress with a fitness journal",
            "Set specific, achievable weekly goals",
            "Join group classes to stay motivated"
          ],
          recommendedGoals: [
            "Increase strength by 15% in three months",
            "Improve cardiovascular endurance",
            "Maintain consistent workout schedule"
          ],
          partnerPreferences: "Looking for dedicated partners who want to improve their form and technique"
        })
      };
      
      const user = await storage.createUser(nataliaUser);
      
      return res.json({
        success: true,
        message: "Natalia user created successfully",
        user: {
          username: user.username,
          password: "liscr12" // We show the password because this is a demo
        }
      });
    } catch (error) {
      console.error("Error creating natalia user:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Initialize demo data endpoint
  app.post('/api/demo/initialize', async (req, res) => {
    try {
      console.log("Initializing demo data...");
      
      // Create demo users
      const demoUsers = await storage.createDemoUsers(5);
      console.log(`Created ${demoUsers.length} demo users`);
      
      if (demoUsers.length === 0) {
        return res.status(500).json({ success: false, error: 'Failed to create demo users' });
      }
      
      // Create connections between users
      const mainUser = demoUsers[0];
      const friendIds = [];
      
      for (let i = 1; i < demoUsers.length; i++) {
        const friend = demoUsers[i];
        await storage.createConnection({
          user1Id: mainUser.id,
          user2Id: friend.id,
          createdAt: new Date()
        });
        friendIds.push(friend.id);
      }
      console.log(`Created ${friendIds.length} connections`);
      
      // Create challenges
      const challenges = await storage.createDemoChallenges(3, mainUser.id, friendIds);
      console.log(`Created ${challenges.length} challenges`);
      
      // Add participants and progress
      let participantsCount = 0;
      for (const challenge of challenges) {
        // Main user joins and completes challenges to ensure leaderboard data
        const mainParticipant = await storage.joinChallenge(mainUser.id, challenge.id);
        // Complete the challenge for leaderboard data
        const fullProgress = challenge.goalValue + Math.floor(Math.random() * 5); // Add a bit extra for good measure
        await storage.updateChallengeProgress(mainParticipant.id, fullProgress);
        await storage.completeChallenge(mainParticipant.id);
        participantsCount++;
        
        // Add friends with various progress - some completed, some in progress
        for (const friendId of friendIds) {
          const participant = await storage.joinChallenge(friendId, challenge.id);
          participantsCount++;
          
          // Determine if this friend will complete the challenge (higher probability now)
          const willComplete = Math.random() > 0.4; // 60% chance to complete
          
          if (willComplete) {
            // Complete the challenge with some random extra points
            const friendProgress = challenge.goalValue + Math.floor(Math.random() * 10);
            await storage.updateChallengeProgress(participant.id, friendProgress);
            await storage.completeChallenge(participant.id);
          } else {
            // Random partial progress
            const progress = Math.floor(Math.random() * (challenge.goalValue * 0.8));
            await storage.updateChallengeProgress(participant.id, progress);
          }
        }
      }
      
      console.log(`Added ${participantsCount} challenge participants`);
      
      return res.json({
        success: true,
        data: {
          users: demoUsers.length,
          connections: friendIds.length,
          challenges: challenges.length,
          participants: participantsCount,
          loginCredentials: {
            username: mainUser.username,
            password: "liscr12"
          }
        }
      });
    } catch (error) {
      console.error("Error initializing demo data:", error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Auto-login demo endpoint for testing
  app.post('/api/demo/auto-login', async (req, res) => {
    try {
      console.log("Auto-login demo user requested");
      
      // Find a demo user
      const allUsers = await storage.getAllUsers();
      const demoUsers = allUsers.filter(u => u.username.startsWith('demouser'));
      
      if (demoUsers.length === 0) {
        console.log("No demo users found, creating demo data first...");
        // Create demo data if no demo users exist
        const demoUsers = await storage.createDemoUsers(5);
        
        if (demoUsers.length === 0) {
          return res.status(500).json({ 
            success: false, 
            error: "Failed to create demo user for auto-login" 
          });
        }
        
        const demoUser = demoUsers[0];
        
        // Log the user in using both session.userId and Passport login
        req.session.userId = demoUser.id;
        // Use Passport's login method to set up req.isAuthenticated() properly
        await new Promise<void>((resolve, reject) => {
          req.login(demoUser, (err) => {
            if (err) {
              console.error("Passport login error:", err);
              reject(err);
            }
            resolve();
          });
        });
        
        // Don't return sensitive fields
        const { password, ...userWithoutPassword } = demoUser;
        
        return res.json({
          success: true,
          message: "Auto-logged in with newly created demo user",
          user: userWithoutPassword
        });
      }
      
      // Use the first demo user
      const demoUser = demoUsers[0];
      
      // Log the user in using both session.userId and Passport login
      req.session.userId = demoUser.id;
      // Use Passport's login method to set up req.isAuthenticated() properly
      await new Promise<void>((resolve, reject) => {
        req.login(demoUser, (err) => {
          if (err) {
            console.error("Passport login error:", err);
            reject(err);
          }
          resolve();
        });
      });
      
      // Don't return sensitive fields
      const { password, ...userWithoutPassword } = demoUser;
      
      return res.json({
        success: true,
        message: "Auto-logged in with existing demo user",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error with auto-login:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to auto-login" 
      });
    }
  });
  
  // Force regenerate demo users with proper workout focus distribution
  app.post('/api/demo/force-regenerate', async (req, res) => {
    try {
      console.log("Force regenerating demo users with proper workout focus distribution...");
      
      // Clear all existing demo users first
      const allUsers = await storage.getAllUsers();
      const demoUsers = allUsers.filter(u => u.username.startsWith('demouser'));
      
      // Remove existing demo users
      for (const demoUser of demoUsers) {
        await storage.deleteUser(demoUser.id);
      }
      
      // Create 25 new demo users (5 for each workout type)
      const newDemoUsers = await storage.createDemoUsers(25);
      if (newDemoUsers.length === 0) {
        return res.status(500).json({ success: false, error: 'Failed to create demo users' });
      }
      
      // Assign workout focuses ensuring each type has exactly 5 users
      const workoutTypes = ["upper_body", "lower_body", "cardio", "core", "full_body"];
      
      for (let i = 0; i < newDemoUsers.length; i++) {
        const demoUser = newDemoUsers[i];
        const workoutType = workoutTypes[i % workoutTypes.length];
        
        try {
          await storage.setWorkoutFocus(demoUser.id, workoutType);
          console.log(`Set ${workoutType} workout focus for demo user ${demoUser.id}`);
        } catch (error) {
          console.error(`Failed to set workout focus for user ${demoUser.id}:`, error);
        }
      }
      
      return res.json({
        success: true,
        message: `Created ${newDemoUsers.length} demo users with proper workout focus distribution`,
        data: {
          users: newDemoUsers.length,
          workoutTypes: workoutTypes.length,
          usersPerWorkoutType: Math.ceil(newDemoUsers.length / workoutTypes.length)
        }
      });
      
    } catch (error) {
      console.error("Error force regenerating demo users:", error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Enhanced demo data initialization with ratings, chats, and connections
  app.post('/api/demo/initialize-enhanced', async (req, res) => {
    try {
      console.log("Creating enhanced demo data set...");
      
      // Check if we have existing demo users
      const existingUsers = await storage.getAllUsers();
      const demoUserCount = existingUsers.filter(u => u.username.startsWith('demouser')).length;
      
      let demoUsers;
      if (demoUserCount < 15) {
        // Create 15 demo users with diverse profiles
        demoUsers = await storage.createDemoUsers(15);
      } else {
        demoUsers = existingUsers.filter(u => u.username.startsWith('demouser')).slice(0, 15);
      }
      
      if (demoUsers.length === 0) {
        return res.status(500).json({ success: false, error: 'Failed to create demo users' });
      }
      
      // Create varied workout focuses for demo users
      const workoutTypes = ['upper_body', 'lower_body', 'cardio', 'core', 'full_body'];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const user of demoUsers) {
        const randomWorkout = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
        await storage.setWorkoutFocus(user.id, randomWorkout);
        console.log(`Set ${randomWorkout} workout focus for demo user ${user.id}`);
      }
      
      // Create connections between demo users
      const connectionCount = Math.floor(demoUsers.length * 0.6); // 60% connection rate
      const createdConnections = [];
      
      for (let i = 0; i < connectionCount; i++) {
        const user1 = demoUsers[Math.floor(Math.random() * demoUsers.length)];
        const user2 = demoUsers[Math.floor(Math.random() * demoUsers.length)];
        
        if (user1.id !== user2.id) {
          try {
            const connection = await storage.createConnection(user1.id, user2.id);
            if (connection) {
              createdConnections.push(connection);
            }
          } catch (error) {
            // Connection might already exist, continue
          }
        }
      }
      
      // Create partner ratings
      const ratingsCount = Math.floor(demoUsers.length * 0.8); // 80% have ratings
      const createdRatings = [];
      
      for (let i = 0; i < ratingsCount; i++) {
        const rater = demoUsers[Math.floor(Math.random() * demoUsers.length)];
        const rated = demoUsers[Math.floor(Math.random() * demoUsers.length)];
        
        if (rater.id !== rated.id) {
          try {
            const rating = await storage.createPartnerRating({
              raterId: rater.id,
              ratedUserId: rated.id,
              rating: Math.floor(Math.random() * 5) + 1, // 1-5 stars
              feedback: `Great workout partner! ${['Very motivating', 'Reliable and punctual', 'Excellent form', 'Helpful spotter', 'Fun to train with'][Math.floor(Math.random() * 5)]}`,
              isProfessional: Math.random() > 0.5,
              isReliable: Math.random() > 0.3,
              isMotivating: Math.random() > 0.4,
              isPublic: Math.random() > 0.2
            });
            
            if (rating) {
              createdRatings.push(rating);
            }
          } catch (error) {
            // Rating might already exist, continue
          }
        }
      }
      
      // Create demo messages between connected users
      const messagesCount = Math.floor(createdConnections.length * 1.5); // 1.5 messages per connection
      const createdMessages = [];
      
      const sampleMessages = [
        "Hey! Want to hit the gym together today?",
        "Great workout session yesterday! 💪",
        "I'm planning a leg day tomorrow, want to join?",
        "Thanks for spotting me on that bench press!",
        "What time works best for you this week?",
        "I found a great new protein shake recipe!",
        "Ready for our cardio session?",
        "Let's try that new workout routine we discussed",
        "How did your workout go today?",
        "Want to grab a smoothie after our workout?"
      ];
      
      for (let i = 0; i < messagesCount; i++) {
        const connection = createdConnections[Math.floor(Math.random() * createdConnections.length)];
        if (connection) {
          const sender = Math.random() > 0.5 ? connection.userId : connection.friendId;
          const receiver = sender === connection.userId ? connection.friendId : connection.userId;
          
          try {
            const message = await storage.createMessage({
              senderId: sender,
              receiverId: receiver,
              content: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
              messageType: 'text'
            });
            
            if (message) {
              createdMessages.push(message);
            }
          } catch (error) {
            // Continue if message creation fails
          }
        }
      }
      
      // Create demo challenges
      const challengesCount = 5;
      const createdChallenges = [];
      
      const challengeTypes = [
        { name: "30-Day Push-Up Challenge", type: "push_ups", goal: 1000, description: "Complete 1000 push-ups in 30 days" },
        { name: "Weekly Cardio Challenge", type: "cardio_minutes", goal: 300, description: "Complete 300 minutes of cardio this week" },
        { name: "Strength Training Streak", type: "workout_days", goal: 21, description: "Complete 21 consecutive strength training days" },
        { name: "Flexibility Focus", type: "stretching_minutes", goal: 150, description: "Complete 150 minutes of stretching this month" },
        { name: "Distance Running Goal", type: "running_miles", goal: 50, description: "Run 50 miles this month" }
      ];
      
      for (let i = 0; i < challengesCount; i++) {
        const challenge = challengeTypes[i];
        const creator = demoUsers[Math.floor(Math.random() * demoUsers.length)];
        
        try {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 10)); // Started 0-10 days ago
          
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 30); // 30 day challenge
          
          const createdChallenge = await storage.createChallenge({
            creatorId: creator.id,
            title: challenge.name,
            description: challenge.description,
            challengeType: challenge.type,
            goalValue: challenge.goal,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isPublic: true
          });
          
          if (createdChallenge) {
            createdChallenges.push(createdChallenge);
            
            // Add random participants to each challenge
            const participantCount = Math.floor(Math.random() * 5) + 3; // 3-7 participants
            for (let j = 0; j < participantCount; j++) {
              const participant = demoUsers[Math.floor(Math.random() * demoUsers.length)];
              if (participant.id !== creator.id) {
                try {
                  await storage.joinChallenge(createdChallenge.id, participant.id);
                  
                  // Add some random progress
                  const progressValue = Math.floor(Math.random() * (challenge.goal * 0.8));
                  if (progressValue > 0) {
                    await storage.updateChallengeProgress(participant.id, progressValue);
                  }
                } catch (error) {
                  // Continue if participant join fails
                }
              }
            }
          }
        } catch (error) {
          console.error("Error creating challenge:", error);
        }
      }
      
      return res.json({
        success: true,
        data: {
          users: demoUsers.length,
          connections: createdConnections.length,
          ratings: createdRatings.length,
          messages: createdMessages.length,
          challenges: createdChallenges.length,
          loginCredentials: {
            username: "natalia",
            password: "liscr12"
          }
        }
      });
      
    } catch (error) {
      console.error("Error creating enhanced demo data:", error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Reset demo users endpoint to generate new locations
  app.post('/api/demo/reset-users', async (req, res) => {
    try {
      // Get all users to find demo users
      const allUsers = await storage.getAllUsers();
      const demoUsers = allUsers.filter(u => u.username.startsWith('demouser'));
      
      if (demoUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No demo users found to reset"
        });
      }
      
      // Store the tracking array for demo users - DON'T clear it
      const MemStorage = storage.constructor;
      // We'll keep the IDs of demo users in the persistentDemoUserIds array
      // because we want to track them for proper gender filtering
      if (typeof MemStorage.persistentDemoUserIds === 'undefined') {
        MemStorage.persistentDemoUserIds = [];
      }
      
      // Make sure all demo user IDs are in the tracking array
      for (const demoUser of demoUsers) {
        if (!MemStorage.persistentDemoUserIds.includes(demoUser.id)) {
          MemStorage.persistentDemoUserIds.push(demoUser.id);
        }
      }
      
      // Update existing demo users with new locations
      const currentUser = await storage.getUser(req.session.userId);
      const baseLatitude = currentUser?.latitude || 30.2267;
      const baseLongitude = currentUser?.longitude || -97.7476;
      
      // Update each demo user with a new location
      const updatedDemoUsers = [];
      for (const demoUser of demoUsers) {
        // Generate a new location within 0.5-5 miles
        const minDistance = 0.5;
        const maxDistance = 5.0;
        const location = storage.generateLocationWithinRadius(
          baseLatitude,
          baseLongitude,
          minDistance,
          maxDistance
        );
        
        // Update the user's location
        const updatedUser = await storage.updateUserLocation(demoUser.id, location);
        if (updatedUser) {
          updatedDemoUsers.push(updatedUser);
          console.log(`Updated demo user ${demoUser.id} with new location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
        }
      }
      
      // Make sure we have enough demo users
      let newDemoUsers = updatedDemoUsers;
      if (updatedDemoUsers.length < demoUsers.length) {
        // Create additional demo users if needed
        const additionalUsers = await storage.createDemoUsers(demoUsers.length - updatedDemoUsers.length);
        newDemoUsers = [...updatedDemoUsers, ...additionalUsers];
      }
      
      return res.json({
        success: true,
        message: `Reset ${newDemoUsers.length} demo users with new locations`,
        users: newDemoUsers.map(u => {
          const { password, ...userWithoutPassword } = u;
          return {
            ...userWithoutPassword,
            distance: 0 // Will be calculated on client
          };
        })
      });
    } catch (error) {
      console.error("Error resetting demo users:", error);
      return res.status(500).json({
        success: false,
        message: "Error resetting demo users",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Social account linking endpoint
  app.post('/api/auth/social-link', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const { provider, firebaseUid } = req.body;
      
      if (!provider || !firebaseUid) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Check if this Firebase UID is already linked to another account
      const existingLinkedUser = await storage.getUserByFirebaseUid(firebaseUid);
      if (existingLinkedUser && existingLinkedUser.id !== req.session.userId) {
        return res.status(409).json({ message: 'This social account is already linked to another user' });
      }
      
      // Link the social account to the current user
      const updatedUser = await storage.linkSocialAccount(req.session.userId, provider, firebaseUid);
      
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to link social account' });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = updatedUser;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error linking social account:", error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Authentication routes are now handled by setupAuth()

  // User routes
  // Route for updating user location with proper debugging - IMPORTANT: Specific routes must come BEFORE parameterized routes
  app.patch('/api/users/location', async (req, res) => {
    // Log session details for debugging
    console.log("Location update - Session info:", {
      hasSession: !!req.session,
      userId: req.session?.userId,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user
    });
    
    // First try to use req.user if user is authenticated
    let userId = req.user?.id;
    
    // Then fallback to session.userId
    if (!userId && req.session?.userId) {
      userId = req.session.userId;
    }
    
    // If both checks fail, user is not authenticated
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const locationData = updateLocationSchema.parse(req.body);
      
      // Log the data we're updating with
      console.log(`Updating location for user ${userId}:`, locationData);
      
      // Get current user to verify they exist before updating
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Direct update without additional authorization checks
      const user = await storage.updateUserLocation(userId, locationData);
      
      // Don't return password in response
      if (user) {
        const { password, ...userWithoutPassword } = user;
        
        // Log successful update
        console.log(`Successfully updated location for user ${userId}`);
        return res.json(userWithoutPassword);
      } else {
        return res.status(500).json({ message: 'Failed to update location: User data missing after update' });
      }
    } catch (error: any) {
      console.error("Error updating location:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: `Failed to update location: ${error.message || 'Unknown error'}` });
    }
  });
  
  // Generic user update endpoint (AFTER specific routes)
  app.patch('/api/users/:id', async (req, res) => {
    // Log session details for debugging
    console.log("User update - Session info:", {
      hasSession: !!req.session,
      userId: req.session?.userId,
      paramId: req.params.id,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user
    });

    // First try to use req.user if user is authenticated
    let authenticatedUserId = req.user?.id;
    
    // Then fallback to session.userId
    if (!authenticatedUserId && req.session?.userId) {
      authenticatedUserId = req.session.userId;
    }
    
    // If both checks fail, user is not authenticated
    if (!authenticatedUserId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const targetUserId = parseInt(req.params.id);
    
    // Check if the target user ID is valid
    if (isNaN(targetUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Check if this contains location data, allow self updates
    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      console.log(`Location update detected for user ${targetUserId}`);
      
      // If updating location, use the location update endpoint logic
      try {
        const locationData = {
          latitude: req.body.latitude,
          longitude: req.body.longitude
        };
        
        // Just require authentication, but allow updating any user's location for now
        const user = await storage.updateUserLocation(targetUserId, locationData);
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Don't return password in response
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      } catch (error: any) {
        console.error("Error updating location:", error);
        return res.status(500).json({ message: `Failed to update location: ${error.message}` });
      }
    }
    
    // For regular profile updates, ensure user can only update their own profile
    if (targetUserId !== authenticatedUserId) {
      console.log(`Authorization failed: User ${authenticatedUserId} tried to update user ${targetUserId}`);
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    
    try {
      const userData = req.body;
      const user = await storage.updateUser(targetUserId, userData);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to update user' });
    }
  });
  
  // Profile picture upload endpoint
  app.post('/api/users/:id/profile-picture', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = parseInt(req.params.id);
    
    // Ensure user can only update their own profile picture
    if (userId !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    
    try {
      const { imageData, fileName } = req.body;
      
      if (!imageData || !fileName) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Decode base64 data
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const fileExt = path.extname(fileName);
      const uniqueFilename = `${userId}_${crypto.randomBytes(8).toString('hex')}${fileExt}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      // Write file
      fs.writeFileSync(filePath, buffer);
      
      // Generate public URL
      const imageUrl = `/uploads/${uniqueFilename}`;
      
      // Update user's profile picture URL in database
      const user = await storage.updateUser(userId, { profilePictureUrl: imageUrl });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return the image URL
      return res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      return res.status(500).json({ message: 'Failed to upload profile picture' });
    }
  });

  // Workout focus routes
  app.post('/api/workout-focus', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const workoutFocusData = insertDailyWorkoutFocusSchema.parse({
        ...req.body,
        userId: req.session.userId,
        date: new Date()
      });
      
      const workoutFocus = await storage.setWorkoutFocusFromObject(workoutFocusData);
      return res.status(201).json(workoutFocus);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to set workout focus' });
    }
  });

  app.get('/api/workout-focus', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const workoutFocus = await storage.getWorkoutFocus(req.session.userId);
    if (!workoutFocus) {
      return res.status(404).json({ message: 'No workout focus set for today' });
    }
    
    return res.json(workoutFocus);
  });

  // Nearby users routes
  app.get('/api/users/nearby', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Make sure we have demo users for testing
      // Check if we already have enough demo users
      const existingUsers = await storage.getAllUsers();
      const demoUsers = existingUsers.filter(u => u.username.startsWith('demouser'));
      
      // Only create new demo users if we don't have enough or we're resetting
      if (demoUsers.length < 10 || req.query.reset === 'true') {
        console.log("Creating fresh demo users for testing...");
        // Create new demo users - specifically within 5 miles
        await storage.createDemoUsers(10, 5, user.gymName); // Create 10 users within 5 miles, some with matching gym
        console.log(`Created demo users with gym name: ${user.gymName || 'None'}`);
      } else {
        console.log(`Using existing ${demoUsers.length} demo users`);
      }
      
      // Assign workout focuses to demo users
      const newDemoUsers = (await storage.getAllUsers()).filter(u => u.username.startsWith('demouser'));
      const workoutTypes = ["upper_body", "lower_body", "cardio", "core", "full_body"];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
        
      // Force regenerate workout focuses for ALL demo users to ensure proper distribution
      for (let i = 0; i < newDemoUsers.length; i++) {
        const demoUser = newDemoUsers[i];
        // Ensure each workout type has at least 2 users
        const workoutType = workoutTypes[i % workoutTypes.length];
        
        try {
          await storage.setWorkoutFocus(demoUser.id, workoutType);
          console.log(`Set ${workoutType} workout focus for demo user ${demoUser.id}`);
        } catch (error) {
          console.error(`Failed to set workout focus for user ${demoUser.id}:`, error);
        }
      }
      
      // For testing purposes, we'll generate demo data even if location isn't available
      let nearbyUsers;
      
      if (user.latitude && user.longitude) {
        // If we have location, use the real implementation
        try {
          // Log the request parameters for debugging
          console.log("Nearby users request params:", {
            ...req.query,
            sameGymOnly: req.query.sameGymOnly,
            sameGymOnlyType: typeof req.query.sameGymOnly,
            parsedSameGymOnly: req.query.sameGymOnly === 'true'
          });
          
          const params = nearbyUsersSchema.parse({
            ...req.query,
            latitude: user.latitude,
            longitude: user.longitude,
            currentUserId: req.session.userId // Add the current user ID for gym filtering
          });
          
          // Log the parsed parameters 
          console.log("Parsed params:", {
            sameGymOnly: params.sameGymOnly,
            sameGymOnlyType: typeof params.sameGymOnly
          });
          
          nearbyUsers = await storage.findNearbyUsers(params);
        } catch (parseError) {
          // If schema validation fails, fall back to demo data
          console.log("Schema validation failed, using demo data", parseError);
          nearbyUsers = await storage.getAllUsers();
        }
      } else {
        // For demo or testing - fetch all users
        console.log("User location not available, showing demo users instead");
        nearbyUsers = await storage.getAllUsers();
      }
      
      // Filter out the current user
      const filteredUsers = nearbyUsers.filter(u => u.id !== req.session!.userId);
      
      // Ensure demo users have valid locations - update any demo users with null locations
      // This ensures they always appear in results
      for (const u of filteredUsers) {
        if (u.username.startsWith('demouser') && (!u.latitude || !u.longitude)) {
          // Generate a new location within 0.5-5 miles of the user
          const baseLatitude = user.latitude || 30.2267;
          const baseLongitude = user.longitude || -97.7476;
          const minDistance = 0.5;
          const maxDistance = 5.0;
          
          const location = storage.generateLocationWithinRadius(
            baseLatitude,
            baseLongitude,
            minDistance,
            maxDistance
          );
          
          // Update the user's location
          await storage.updateUserLocation(u.id, location);
          console.log(`Updated demo user ${u.id} (${u.name}) with new location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
          
          // Update the user in our local array too
          u.latitude = location.latitude;
          u.longitude = location.longitude;
        }
      }
      
      // Log the number of demo users included in results
      const demoUsersIncluded = filteredUsers.filter(u => u.username.startsWith('demouser'));
      console.log(`Including ${demoUsersIncluded.length} demo users in results`);
      
      // Don't return passwords in response
      const usersWithoutPasswords = filteredUsers.map(u => {
        const { password, ...userWithoutPassword } = u;
        
        // Calculate distance if we have coordinates, otherwise use random distances
        let distance = 0;
        const isDemoUser = u.username.startsWith('demouser');
        
        if (user.latitude && user.longitude && u.latitude && u.longitude) {
          distance = storage.calculateDistance(
            user.latitude, user.longitude,
            u.latitude, u.longitude
          );
          
          if (isDemoUser) {
            console.log(`Demo user ${u.id} (${u.name}) is ${distance.toFixed(2)} miles away with gender ${u.gender}`);
          }
        } else {
          // For demo purposes, assign random distances 
          if (isDemoUser) {
            distance = 0.5 + (Math.random() * 4.5); // Demo users should be between 0.5 and 5 miles
            console.log(`Including demo user ${u.id} (${u.name}) in nearby users with random distance ${distance.toFixed(2)}`);
          } else {
            distance = 0.5 + (Math.random() * 9.5); // Regular users can be up to 10 miles away
          }
        }
        
        return {
          ...userWithoutPassword,
          distance: Math.round(distance * 100) / 100 // Round to 2 decimal places for cleaner display
        };
      });
      
      return res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching nearby users:", error);
      return res.status(500).json({ message: 'Failed to find nearby users' });
    }
  });

  // Connection request routes
  app.post('/api/connection-requests', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const requestData = insertConnectionRequestSchema.parse({
        ...req.body,
        senderId: req.session.userId,
        status: 'pending',
        createdAt: new Date()
      });
      
      // Check if request already exists
      const existingRequests = await storage.getConnectionRequestsBySender(req.session.userId);
      const alreadyRequested = existingRequests.some(
        r => r.receiverId === requestData.receiverId && r.status === 'pending'
      );
      
      if (alreadyRequested) {
        return res.status(400).json({ message: 'Connection request already sent' });
      }
      
      // Check if users are already connected
      const existingConnection = await storage.getConnectionBetweenUsers(
        req.session.userId,
        requestData.receiverId
      );
      
      if (existingConnection) {
        return res.status(400).json({ message: 'Users are already connected' });
      }
      
      const request = await storage.createConnectionRequest(requestData);
      
      // Notify receiver through WebSocket if connected
      const receiverWs = activeConnections.get(requestData.receiverId);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        const sender = await storage.getUser(req.session.userId);
        if (sender) {
          const { password, ...senderData } = sender;
          const message: WebSocketMessage = {
            type: 'connection_request',
            senderId: req.session.userId,
            receiverId: requestData.receiverId,
            data: {
              request,
              sender: senderData
            }
          };
          receiverWs.send(JSON.stringify(message));
        }
      }
      
      return res.status(201).json(request);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to create connection request' });
    }
  });

  app.get('/api/connection-requests/received', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const requests = await storage.getConnectionRequestsByReceiver(req.session.userId);
    
    // Get sender details for each request
    const requestsWithSenders = await Promise.all(
      requests.map(async (request) => {
        const sender = await storage.getUser(request.senderId);
        if (sender) {
          const { password, ...senderData } = sender;
          return {
            ...request,
            sender: senderData
          };
        }
        return request;
      })
    );
    
    return res.json(requestsWithSenders);
  });

  app.get('/api/connection-requests/sent', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const requests = await storage.getConnectionRequestsBySender(req.session.userId);
    
    // Get receiver details for each request
    const requestsWithReceivers = await Promise.all(
      requests.map(async (request) => {
        const receiver = await storage.getUser(request.receiverId);
        if (receiver) {
          const { password, ...receiverData } = receiver;
          return {
            ...request,
            receiver: receiverData
          };
        }
        return request;
      })
    );
    
    return res.json(requestsWithReceivers);
  });

  app.patch('/api/connection-requests/:id/status', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const requestId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const request = await storage.getConnectionRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Connection request not found' });
    }
    
    // Ensure the current user is the receiver of the request
    if (request.receiverId !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized to update this request' });
    }
    
    const updatedRequest = await storage.updateConnectionRequestStatus(requestId, status);
    
    // If accepted, create a connection
    if (status === 'accepted') {
      const connection = await storage.createConnection({
        user1Id: request.senderId,
        user2Id: request.receiverId,
        createdAt: new Date()
      });
      
      // Notify sender through WebSocket if connected
      const senderWs = activeConnections.get(request.senderId);
      if (senderWs && senderWs.readyState === WebSocket.OPEN) {
        const receiver = await storage.getUser(req.session.userId);
        if (receiver) {
          const { password, ...receiverData } = receiver;
          const message: WebSocketMessage = {
            type: 'connection_accepted',
            senderId: req.session.userId,
            receiverId: request.senderId,
            data: {
              connection,
              receiver: receiverData
            }
          };
          senderWs.send(JSON.stringify(message));
        }
      }
    }
    
    return res.json(updatedRequest);
  });

  // Connections routes
  app.get('/api/connections', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const connections = await storage.getConnectionsByUserId(req.session.userId);
    
    // Get details of connected users
    const connectionsWithUsers = await Promise.all(
      connections.map(async (connection) => {
        const otherUserId = connection.user1Id === req.session!.userId
          ? connection.user2Id
          : connection.user1Id;
        
        const otherUser = await storage.getUser(otherUserId);
        if (otherUser) {
          const { password, ...otherUserData } = otherUser;
          return {
            ...connection,
            otherUser: otherUserData
          };
        }
        return connection;
      })
    );
    
    return res.json(connectionsWithUsers);
  });

  // Messages routes
  app.post('/api/messages', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.session.userId,
        timestamp: new Date(),
        read: false
      });
      
      const connection = await storage.getConnection(messageData.connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      // Ensure the current user is part of the connection
      if (connection.user1Id !== req.session.userId && connection.user2Id !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to send message in this connection' });
      }
      
      const message = await storage.createMessage(messageData);
      
      // Determine the recipient
      const recipientId = connection.user1Id === req.session.userId
        ? connection.user2Id
        : connection.user1Id;
      
      // Send message through WebSocket if recipient is connected
      const recipientWs = activeConnections.get(recipientId);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        const sender = await storage.getUser(req.session.userId);
        if (sender) {
          const { password, ...senderData } = sender;
          const wsMessage: WebSocketMessage = {
            type: 'message',
            senderId: req.session.userId,
            receiverId: recipientId,
            data: {
              message,
              sender: senderData
            }
          };
          recipientWs.send(JSON.stringify(wsMessage));
        }
      }
      
      return res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.get('/api/connections/:connectionId/messages', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const connectionId = parseInt(req.params.connectionId);
    
    const connection = await storage.getConnection(connectionId);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    
    // Ensure the current user is part of the connection
    if (connection.user1Id !== req.session.userId && connection.user2Id !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized to view messages in this connection' });
    }
    
    const messages = await storage.getMessagesByConnectionId(connectionId);
    
    // Mark messages as read
    await storage.markMessagesAsRead(connectionId, req.session.userId);
    
    return res.json(messages);
  });

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');
    
    // Parse URL to get userId parameter
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get('userId') || '0');
    
    if (!userId) {
      console.log('WebSocket connection rejected: No user ID provided');
      ws.close(1008, 'User ID required');
      return;
    }
    
    console.log(`WebSocket connected for user ${userId}`);
    
    // Store the connection
    activeConnections.set(userId, ws);
    
    // Handle messages
    ws.on('message', async (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString()) as WebSocketMessage;
        console.log('Received WebSocket message:', parsedMessage.type);
        
        // Validate message sender
        if (parsedMessage.senderId !== userId) {
          console.log('Sender ID mismatch');
          return;
        }
        
        // Handle user location updates
        if (parsedMessage.type === 'user_location' && parsedMessage.data) {
          const { latitude, longitude } = parsedMessage.data;
          await storage.updateUserLocation(userId, { latitude, longitude });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket disconnected for user ${userId}`);
      activeConnections.delete(userId);
    });
  });

  // Personality insights route
  app.post('/api/personality-insights', async (req, res) => {
    try {
      // Authentication is not strictly required for this endpoint
      // but can be added if needed to prevent abuse
      const quizResponses = req.body as PersonalityQuizResponses;
      
      // Validate that all required fields are present
      if (!quizResponses.fitnessLevel || 
          !quizResponses.fitnessGoals || 
          !quizResponses.preferredActivities || 
          !quizResponses.schedule || 
          !quizResponses.motivationFactors) {
        return res.status(400).json({ message: 'Missing required quiz responses' });
      }
      
      try {
        // First try to generate insights using OpenAI
        const insights = await generatePersonalityInsights(quizResponses);
        return res.json(insights);
      } catch (openaiError) {
        console.error("OpenAI API error, using fallback:", openaiError);
        
        // Fallback to generated insights based on the quiz responses
        const fallbackInsights = {
          workoutStyle: `${quizResponses.fitnessLevel} focused on ${quizResponses.preferredActivities}`,
          motivationTips: [
            `Schedule workouts at ${quizResponses.schedule} when you have the most energy`,
            `Find activities that match your preferred style: ${quizResponses.preferredActivities}`,
            `Set goals aligned with your aspirations: ${quizResponses.fitnessGoals}`
          ],
          recommendedGoals: [
            `Improve in ${quizResponses.preferredActivities} consistently`,
            `Build a sustainable ${quizResponses.schedule} routine`,
            `Focus on ${quizResponses.fitnessGoals} with measurable milestones`
          ],
          partnerPreferences: `Someone who also enjoys ${quizResponses.preferredActivities} and is motivated by ${quizResponses.motivationFactors}`
        };
        
        return res.json(fallbackInsights);
      }
    } catch (error) {
      console.error('Error generating personality insights:', error);
      return res.status(500).json({ message: 'Failed to generate personality insights' });
    }
  });
  
  // Special endpoint for saving AI insights to profile
  app.post('/api/save-personality-insights', async (req, res) => {
    // Check authentication
    console.log("Saving insights session info:", {
      hasSession: !!req.session,
      userId: req.session?.userId,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user
    });
    
    if (!req.session || !req.session.userId) {
      if (req.isAuthenticated() && req.user) {
        // Fallback to user ID from authenticated request
        req.session.userId = req.user.id;
        console.log("Set session userId from authenticated user:", req.session.userId);
      } else {
        return res.status(401).json({ message: 'Not authenticated' });
      }
    }
    
    try {
      const { insights } = req.body;
      
      if (!insights) {
        return res.status(400).json({ message: 'Missing insights data' });
      }
      
      // Prepare update data
      const updateData = {
        aiGeneratedInsights: typeof insights === 'string' ? insights : JSON.stringify(insights)
      };
      
      console.log(`Saving insights for user ${req.session.userId}`, {
        insightsType: typeof insights,
        stringified: typeof insights === 'string',
        dataLength: typeof insights === 'string' ? insights.length : JSON.stringify(insights).length
      });
      
      // Get user before update for comparison
      const beforeUser = await storage.getUser(req.session.userId);
      console.log("User before update:", {
        id: beforeUser?.id,
        name: beforeUser?.name,
        hasInsights: !!beforeUser?.aiGeneratedInsights,
        insightsLength: beforeUser?.aiGeneratedInsights ? beforeUser.aiGeneratedInsights.length : 0
      });
      
      // Update user with AI insights
      const user = await storage.updateUser(req.session.userId, updateData);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Log the updated user
      console.log("User after update:", {
        id: user.id,
        name: user.name,
        hasInsights: !!user.aiGeneratedInsights,
        insightsLength: user.aiGeneratedInsights ? user.aiGeneratedInsights.length : 0,
        updateSuccess: beforeUser?.aiGeneratedInsights !== user.aiGeneratedInsights,
        dataMatches: updateData.aiGeneratedInsights === user.aiGeneratedInsights
      });
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      // Add a cache-busting header
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error saving personality insights:', error);
      return res.status(500).json({ message: 'Failed to save personality insights' });
    }
  });

  // Workout Routine Routes
  app.post('/api/workout-routines', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const now = new Date();
      const routineData = insertWorkoutRoutineSchema.parse({
        ...req.body,
        userId: req.session.userId,
        createdAt: now,
        updatedAt: now
      });
      
      const routine = await storage.createWorkoutRoutine(routineData);
      return res.status(201).json(routine);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to create workout routine' });
    }
  });

  app.get('/api/workout-routines', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const routines = await storage.getWorkoutRoutinesByUserId(req.session.userId);
      return res.json(routines);
    } catch (error) {
      console.error('Error fetching workout routines:', error);
      return res.status(500).json({ message: 'Failed to fetch workout routines' });
    }
  });

  app.get('/api/workout-routines/public', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const routines = await storage.getPublicWorkoutRoutines();
      return res.json(routines);
    } catch (error) {
      console.error('Error fetching public workout routines:', error);
      return res.status(500).json({ message: 'Failed to fetch public workout routines' });
    }
  });

  app.get('/api/workout-routines/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const routineId = parseInt(req.params.id);
      if (isNaN(routineId)) {
        return res.status(400).json({ message: 'Invalid routine ID' });
      }
      
      const routine = await storage.getWorkoutRoutine(routineId);
      if (!routine) {
        return res.status(404).json({ message: 'Workout routine not found' });
      }
      
      // Only allow access to public routines or own routines
      if (routine.userId !== req.session.userId && !routine.isPublic) {
        return res.status(403).json({ message: 'Not authorized to view this routine' });
      }
      
      return res.json(routine);
    } catch (error) {
      console.error('Error fetching workout routine:', error);
      return res.status(500).json({ message: 'Failed to fetch workout routine' });
    }
  });

  app.patch('/api/workout-routines/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const routineId = parseInt(req.params.id);
      if (isNaN(routineId)) {
        return res.status(400).json({ message: 'Invalid routine ID' });
      }
      
      const routine = await storage.getWorkoutRoutine(routineId);
      if (!routine) {
        return res.status(404).json({ message: 'Workout routine not found' });
      }
      
      // Only allow updating own routines
      if (routine.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to update this routine' });
      }
      
      const updateData = req.body;
      const updatedRoutine = await storage.updateWorkoutRoutine(routineId, updateData);
      
      return res.json(updatedRoutine);
    } catch (error) {
      console.error('Error updating workout routine:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to update workout routine' });
    }
  });

  app.delete('/api/workout-routines/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const routineId = parseInt(req.params.id);
      if (isNaN(routineId)) {
        return res.status(400).json({ message: 'Invalid routine ID' });
      }
      
      const routine = await storage.getWorkoutRoutine(routineId);
      if (!routine) {
        return res.status(404).json({ message: 'Workout routine not found' });
      }
      
      // Only allow deleting own routines
      if (routine.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this routine' });
      }
      
      const success = await storage.deleteWorkoutRoutine(routineId);
      if (success) {
        return res.status(204).end();
      } else {
        return res.status(500).json({ message: 'Failed to delete workout routine' });
      }
    } catch (error) {
      console.error('Error deleting workout routine:', error);
      return res.status(500).json({ message: 'Failed to delete workout routine' });
    }
  });

  // Scheduled Meetup Routes
  app.post('/api/meetups', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const now = new Date();
      
      const meetupData = insertScheduledMeetupSchema.parse({
        ...req.body,
        creatorId: req.session.userId,
        createdAt: now,
        updatedAt: now,
        status: 'active'
      });
      
      const meetup = await storage.createScheduledMeetup(meetupData);
      
      // Automatically add creator as a participant
      const joinedAt = new Date();
      await storage.addMeetupParticipant({
        meetupId: meetup.id,
        userId: req.session.userId,
        status: 'confirmed',
        joinedAt
      });
      
      return res.status(201).json(meetup);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error('Error creating meetup:', error);
      return res.status(500).json({ message: 'Failed to create scheduled meetup' });
    }
  });

  app.get('/api/meetups', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const meetups = await storage.getScheduledMeetupsByUser(req.session.userId);
      return res.json(meetups);
    } catch (error) {
      console.error('Error fetching meetups:', error);
      return res.status(500).json({ message: 'Failed to fetch scheduled meetups' });
    }
  });

  app.get('/api/meetups/upcoming', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const meetups = await storage.getUpcomingMeetups(req.session.userId);
      return res.json(meetups);
    } catch (error) {
      console.error('Error fetching upcoming meetups:', error);
      return res.status(500).json({ message: 'Failed to fetch upcoming meetups' });
    }
  });

  app.get('/api/meetups/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const meetupId = parseInt(req.params.id);
      if (isNaN(meetupId)) {
        return res.status(400).json({ message: 'Invalid meetup ID' });
      }
      
      const meetup = await storage.getScheduledMeetup(meetupId);
      if (!meetup) {
        return res.status(404).json({ message: 'Scheduled meetup not found' });
      }
      
      // Get participants
      const participants = await storage.getMeetupParticipants(meetupId);
      
      // Check if user is part of this meetup
      const isParticipant = participants.some(p => p.userId === req.session!.userId);
      const isCreator = meetup.creatorId === req.session!.userId;
      
      if (!isParticipant && !isCreator) {
        return res.status(403).json({ message: 'Not authorized to view this meetup' });
      }
      
      // Get user details for each participant
      const participantsWithDetails = await Promise.all(
        participants.map(async (p) => {
          const user = await storage.getUser(p.userId);
          if (user) {
            const { password, ...userData } = user;
            return {
              ...p,
              user: userData
            };
          }
          return p;
        })
      );
      
      const result = {
        ...meetup,
        participants: participantsWithDetails
      };
      
      return res.json(result);
    } catch (error) {
      console.error('Error fetching meetup details:', error);
      return res.status(500).json({ message: 'Failed to fetch meetup details' });
    }
  });

  app.patch('/api/meetups/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const meetupId = parseInt(req.params.id);
      if (isNaN(meetupId)) {
        return res.status(400).json({ message: 'Invalid meetup ID' });
      }
      
      const meetup = await storage.getScheduledMeetup(meetupId);
      if (!meetup) {
        return res.status(404).json({ message: 'Scheduled meetup not found' });
      }
      
      // Only allow creator to update meetup details
      if (meetup.creatorId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to update this meetup' });
      }
      
      const updateData = req.body;
      const updatedMeetup = await storage.updateScheduledMeetup(meetupId, updateData);
      
      // Notify participants of the update
      const participants = await storage.getMeetupParticipants(meetupId);
      participants.forEach(participant => {
        if (participant.userId !== req.session!.userId) { // Don't notify the updater
          const participantWs = activeConnections.get(participant.userId);
          if (participantWs && participantWs.readyState === WebSocket.OPEN) {
            const wsMessage: WebSocketMessage = {
              type: 'meetup_updated',
              senderId: req.session!.userId || 0,
              receiverId: participant.userId,
              data: {
                meetup: updatedMeetup
              }
            };
            participantWs.send(JSON.stringify(wsMessage));
          }
        }
      });
      
      return res.json(updatedMeetup);
    } catch (error) {
      console.error('Error updating meetup:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to update scheduled meetup' });
    }
  });

  app.post('/api/meetups/:id/cancel', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const meetupId = parseInt(req.params.id);
      if (isNaN(meetupId)) {
        return res.status(400).json({ message: 'Invalid meetup ID' });
      }
      
      const meetup = await storage.getScheduledMeetup(meetupId);
      if (!meetup) {
        return res.status(404).json({ message: 'Scheduled meetup not found' });
      }
      
      // Only allow creator to cancel meetup
      if (meetup.creatorId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to cancel this meetup' });
      }
      
      const success = await storage.cancelScheduledMeetup(meetupId);
      if (!success) {
        return res.status(500).json({ message: 'Failed to cancel meetup' });
      }
      
      // Get updated meetup data
      const updatedMeetup = await storage.getScheduledMeetup(meetupId);
      
      // Notify participants of the cancellation
      const participants = await storage.getMeetupParticipants(meetupId);
      participants.forEach(participant => {
        if (participant.userId !== req.session!.userId) { // Don't notify the canceller
          const participantWs = activeConnections.get(participant.userId);
          if (participantWs && participantWs.readyState === WebSocket.OPEN) {
            const wsMessage: WebSocketMessage = {
              type: 'meetup_cancelled',
              senderId: req.session!.userId || 0,
              receiverId: participant.userId,
              data: {
                meetup: updatedMeetup
              }
            };
            participantWs.send(JSON.stringify(wsMessage));
          }
        }
      });
      
      return res.json(updatedMeetup);
    } catch (error) {
      console.error('Error cancelling meetup:', error);
      return res.status(500).json({ message: 'Failed to cancel scheduled meetup' });
    }
  });

  // Meetup Participant Routes
  app.post('/api/meetups/:id/join', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const meetupId = parseInt(req.params.id);
      if (isNaN(meetupId)) {
        return res.status(400).json({ message: 'Invalid meetup ID' });
      }
      
      const meetup = await storage.getScheduledMeetup(meetupId);
      if (!meetup) {
        return res.status(404).json({ message: 'Scheduled meetup not found' });
      }
      
      // Check if the meetup is cancelled
      if (meetup.status === 'cancelled') {
        return res.status(400).json({ message: 'Cannot join a cancelled meetup' });
      }
      
      // Check if user is already a participant
      const participants = await storage.getMeetupParticipants(meetupId);
      const existingParticipant = participants.find(p => p.userId === req.session!.userId);
      
      if (existingParticipant) {
        return res.status(400).json({ message: 'Already joined this meetup' });
      }
      
      // Check if the meetup has reached its maximum number of participants
      if (meetup.maxParticipants && participants.length >= meetup.maxParticipants) {
        return res.status(400).json({ message: 'Meetup is already full' });
      }
      
      // Add user as participant
      const joinedAt = new Date();
      const participant = await storage.addMeetupParticipant({
        meetupId,
        userId: req.session.userId,
        status: req.body.status || 'confirmed',
        joinedAt
      });
      
      // Notify meetup creator
      const creatorWs = activeConnections.get(meetup.creatorId);
      if (creatorWs && creatorWs.readyState === WebSocket.OPEN) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          const { password, ...userData } = user;
          const wsMessage: WebSocketMessage = {
            type: 'meetup_joined',
            senderId: req.session.userId,
            receiverId: meetup.creatorId,
            data: {
              meetupId,
              participant,
              user: userData
            }
          };
          creatorWs.send(JSON.stringify(wsMessage));
        }
      }
      
      return res.status(201).json(participant);
    } catch (error) {
      console.error('Error joining meetup:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to join meetup' });
    }
  });

  app.post('/api/meetups/:id/leave', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const meetupId = parseInt(req.params.id);
      if (isNaN(meetupId)) {
        return res.status(400).json({ message: 'Invalid meetup ID' });
      }
      
      const meetup = await storage.getScheduledMeetup(meetupId);
      if (!meetup) {
        return res.status(404).json({ message: 'Scheduled meetup not found' });
      }
      
      // Check if user is a participant
      const participants = await storage.getMeetupParticipants(meetupId);
      const existingParticipant = participants.find(p => p.userId === req.session!.userId);
      
      if (!existingParticipant) {
        return res.status(400).json({ message: 'Not a participant in this meetup' });
      }
      
      // Don't allow creator to leave their own meetup
      if (meetup.creatorId === req.session.userId) {
        return res.status(400).json({ message: 'Creator cannot leave their own meetup, cancel it instead' });
      }
      
      // Remove user from participants
      const success = await storage.removeMeetupParticipant(meetupId, req.session.userId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to leave meetup' });
      }
      
      // Notify meetup creator
      const creatorWs = activeConnections.get(meetup.creatorId);
      if (creatorWs && creatorWs.readyState === WebSocket.OPEN) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          const { password, ...userData } = user;
          const wsMessage: WebSocketMessage = {
            type: 'meetup_participant_left',
            senderId: req.session.userId,
            receiverId: meetup.creatorId,
            data: {
              meetupId,
              userId: req.session.userId,
              user: userData
            }
          };
          creatorWs.send(JSON.stringify(wsMessage));
        }
      }
      
      return res.status(204).end();
    } catch (error) {
      console.error('Error leaving meetup:', error);
      return res.status(500).json({ message: 'Failed to leave meetup' });
    }
  });

  // Define a reset endpoint for testing purposes
  app.post('/api/reset-demo-users', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log("Resetting demo users on user request...");
      await storage.createDemoUsers(10, 5, user.gymName);
      console.log(`Created demo users with gym name: ${user.gymName || 'None'}`);
      
      return res.json({ 
        message: 'Demo users reset successfully',
        gymName: user.gymName
      });
    } catch (error) {
      console.error("Failed to reset demo users:", error);
      return res.status(500).json({ message: 'Failed to reset demo users' });
    }
  });

  // Setup challenge routes
  setupChallengeRoutes(app, activeConnections);

  return httpServer;
}
