import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  loginSchema, insertUserSchema, updateLocationSchema, insertWorkoutFocusSchema,
  insertConnectionRequestSchema, insertMessageSchema, nearbyUsersSchema, WebSocketMessage,
  workoutRoutineSchema, scheduledMeetupSchema, insertWorkoutRoutineSchema, insertScheduledMeetupSchema,
  insertMeetupParticipantSchema, challengeSchema, progressEntrySchema, challengeCommentSchema,
  insertChallengeSchema, insertChallengeParticipantSchema, insertProgressEntrySchema, insertChallengeCommentSchema
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
      const workoutFocusData = insertWorkoutFocusSchema.parse({
        ...req.body,
        userId: req.session.userId,
        date: new Date()
      });
      
      const workoutFocus = await storage.setWorkoutFocus(workoutFocusData);
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
      const existingUsers = await storage.getAllUsers();
      const demoUserCount = existingUsers.filter(u => u.username.startsWith('demouser')).length;
      
      // Create demo users if we don't have any yet - specifically within 5 miles
      if (demoUserCount < 5) {
        console.log("Creating demo users for testing...");
        await storage.createDemoUsers(5, 5); // Create 5 users within 5 miles
        
        // Assign workout focuses to demo users
        const demoUsers = (await storage.getAllUsers()).filter(u => u.username.startsWith('demouser'));
        const workoutTypes = ["chest", "arms", "legs", "back", "shoulders", "core", "cardio", "full_body"];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (const demoUser of demoUsers) {
          // Check if user already has a workout focus for today
          const existingFocus = await storage.getWorkoutFocus(demoUser.id);
          const existingFocusIsToday = existingFocus && 
            new Date(existingFocus.date).toDateString() === today.toDateString();
          
          if (!existingFocus || !existingFocusIsToday) {
            // Assign a random workout type from the list
            const randomWorkoutType = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
            
            try {
              await storage.setWorkoutFocus({
                userId: demoUser.id,
                workoutType: randomWorkoutType,
                date: today
              });
              console.log(`Set ${randomWorkoutType} workout focus for demo user ${demoUser.id}`);
            } catch (error) {
              console.error(`Failed to set workout focus for user ${demoUser.id}:`, error);
            }
          }
        }
      }
      
      // For testing purposes, we'll generate demo data even if location isn't available
      let nearbyUsers;
      
      if (user.latitude && user.longitude) {
        // If we have location, use the real implementation
        try {
          const params = nearbyUsersSchema.parse({
            ...req.query,
            latitude: user.latitude,
            longitude: user.longitude
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
      
      // Log the number of demo users included in results
      const demoUsersIncluded = filteredUsers.filter(u => u.username.startsWith('demouser'));
      
      // Don't return passwords in response
      const usersWithoutPasswords = filteredUsers.map(u => {
        const { password, ...userWithoutPassword } = u;
        
        // Calculate distance if we have coordinates, otherwise use random distances
        let distance = 0;
        if (user.latitude && user.longitude && u.latitude && u.longitude) {
          distance = storage.calculateDistance(
            user.latitude, user.longitude,
            u.latitude, u.longitude
          );
        } else {
          // For demo purposes, assign random distances between 0.1 and 5 miles
          // For demo users, ensure they stay within 5 miles
          if (u.username.startsWith('demouser')) {
            distance = 0.1 + (Math.random() * 4.9); // Between 0.1 and 5 miles
            console.log(`Including demo user ${u.id} (${u.name}) in nearby users`);
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

  // Setup challenge routes
  setupChallengeRoutes(app, activeConnections);

  return httpServer;
}
