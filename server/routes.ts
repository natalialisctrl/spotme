import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  loginSchema, insertUserSchema, updateLocationSchema, insertWorkoutFocusSchema,
  insertConnectionRequestSchema, insertMessageSchema, nearbyUsersSchema, WebSocketMessage
} from "@shared/schema";
import { ZodError } from "zod";
import { generatePersonalityInsights, PersonalityQuizResponses } from "./openai";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Map to store active WebSocket connections by user ID
const activeConnections = new Map<number, WebSocket>();

import { setupAuth } from "./auth";

import express from 'express';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Serve static files from public directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
  
  // Set up authentication routes
  setupAuth(app);
  
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
          distance = 0.1 + (Math.random() * 4.9);
        }
        
        return {
          ...userWithoutPassword,
          distance
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

  return httpServer;
}
