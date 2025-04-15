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

// Map to store active WebSocket connections by user ID
const activeConnections = new Map<number, WebSocket>();

import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
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
  app.patch('/api/users/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = parseInt(req.params.id);
    
    // Ensure user can only update their own profile
    if (userId !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    
    try {
      const userData = req.body;
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to update user' });
    }
  });
  
  app.patch('/api/users/location', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const locationData = updateLocationSchema.parse(req.body);
      const user = await storage.updateUserLocation(req.session.userId, locationData);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to update location' });
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
      if (!user || !user.latitude || !user.longitude) {
        return res.status(400).json({ message: 'User location not available' });
      }
      
      const params = nearbyUsersSchema.parse({
        ...req.query,
        latitude: user.latitude,
        longitude: user.longitude
      });
      
      const nearbyUsers = await storage.findNearbyUsers(params);
      
      // Filter out the current user
      const filteredUsers = nearbyUsers.filter(u => u.id !== req.session!.userId);
      
      // Don't return passwords in response
      const usersWithoutPasswords = filteredUsers.map(u => {
        const { password, ...userWithoutPassword } = u;
        return {
          ...userWithoutPassword,
          distance: storage.calculateDistance(
            user.latitude!, user.longitude!,
            u.latitude!, u.longitude!
          )
        };
      });
      
      return res.json(usersWithoutPasswords);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
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
      
      // Generate insights using OpenAI
      const insights = await generatePersonalityInsights(quizResponses);
      return res.json(insights);
    } catch (error) {
      console.error('Error generating personality insights:', error);
      return res.status(500).json({ message: 'Failed to generate personality insights' });
    }
  });

  return httpServer;
}
