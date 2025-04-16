import { Express, Request, Response, NextFunction } from "express";
import { WebSocket } from "ws";
import { storage } from "./storage";
import { 
  challengeSchema, 
  progressEntrySchema, 
  challengeCommentSchema
} from "@shared/schema";
import { z } from "zod";

interface WebSocketMessage {
  type: string;
  data: any;
}

// Middleware to check if a user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function setupChallengeRoutes(app: Express, activeConnections: Map<number, WebSocket>) {
  // Get all challenges
  app.get("/api/challenges", isAuthenticated, async (req, res) => {
    try {
      const { mine, participating, friendsOnly } = req.query;
      const userId = req.user!.id;
      
      // If friendsOnly is set, get only challenges created by friends
      if (friendsOnly === "true") {
        const friendIds = await storage.getFriendIds(userId);
        const challenges = await storage.getChallengesByCreatorIds(friendIds);
        return res.status(200).json(challenges);
      }
      
      // If mine is set, get only challenges created by the user
      if (mine === "true") {
        const challenges = await storage.getChallengesByCreatorId(userId);
        return res.status(200).json(challenges);
      }
      
      // If participating is set, get only challenges the user is participating in
      if (participating === "true") {
        const participations = await storage.getChallengeParticipationsByUserId(userId);
        const challengeIds = participations.map(p => p.challengeId);
        const challenges = await storage.getChallengesByIds(challengeIds);
        return res.status(200).json(challenges);
      }
      
      // Otherwise, get all challenges
      const challenges = await storage.getAllChallenges();
      res.status(200).json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });
  
  // Get a specific challenge by ID
  app.get("/api/challenges/:id", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      res.status(200).json(challenge);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ message: "Failed to fetch challenge" });
    }
  });
  
  // Create a new challenge
  app.post("/api/challenges", isAuthenticated, async (req, res) => {
    try {
      const validationResult = challengeSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid challenge data", 
          errors: validationResult.error.format() 
        });
      }
      
      const userId = req.user!.id;
      const challenge = await storage.createChallenge({
        ...validationResult.data,
        creatorId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
      });
      
      // Add the creator as a participant
      await storage.joinChallenge(userId, challenge.id);
      
      // Notify friends about the new challenge
      const friendIds = await storage.getFriendIds(userId);
      for (const friendId of friendIds) {
        const socket = activeConnections.get(friendId);
        if (socket && socket.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: "new_challenge",
            data: {
              challenge,
              creatorName: req.user!.name,
              creatorUsername: req.user!.username,
            },
          };
          socket.send(JSON.stringify(message));
        }
      }
      
      res.status(201).json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });
  
  // Join a challenge
  app.post("/api/challenges/:id/join", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const userId = req.user!.id;
      
      // Check if the challenge exists
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Check if the user is already participating
      const participation = await storage.getChallengeParticipation(userId, challengeId);
      if (participation) {
        return res.status(400).json({ message: "Already participating in this challenge" });
      }
      
      // Add the user as a participant
      const newParticipation = await storage.joinChallenge(userId, challengeId);
      
      // Notify challenge creator
      const creatorSocket = activeConnections.get(challenge.creatorId);
      if (creatorSocket && creatorSocket.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = {
          type: "challenge_joined",
          data: {
            challengeId,
            challengeName: challenge.name,
            participantId: userId,
            participantName: req.user!.name,
            participantUsername: req.user!.username,
          },
        };
        creatorSocket.send(JSON.stringify(message));
      }
      
      res.status(201).json(newParticipation);
    } catch (error) {
      console.error("Error joining challenge:", error);
      res.status(500).json({ message: "Failed to join challenge" });
    }
  });
  
  // Leave a challenge
  app.delete("/api/challenges/:id/leave", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const userId = req.user!.id;
      
      // Check if the challenge exists
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Check if the user is participating
      const participation = await storage.getChallengeParticipation(userId, challengeId);
      if (!participation) {
        return res.status(400).json({ message: "Not participating in this challenge" });
      }
      
      // Remove the user as a participant
      await storage.leaveChallenge(userId, challengeId);
      
      // Notify challenge creator if it's not the creator leaving
      if (challenge.creatorId !== userId) {
        const creatorSocket = activeConnections.get(challenge.creatorId);
        if (creatorSocket && creatorSocket.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: "challenge_left",
            data: {
              challengeId,
              challengeName: challenge.name,
              participantId: userId,
              participantName: req.user!.name,
              participantUsername: req.user!.username,
            },
          };
          creatorSocket.send(JSON.stringify(message));
        }
      }
      
      res.status(200).json({ message: "Successfully left the challenge" });
    } catch (error) {
      console.error("Error leaving challenge:", error);
      res.status(500).json({ message: "Failed to leave challenge" });
    }
  });
  
  // Get a user's participation in a challenge
  app.get("/api/challenges/:id/participation", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const userId = req.user!.id;
      const participation = await storage.getChallengeParticipation(userId, challengeId);
      
      if (!participation) {
        return res.status(404).json({ message: "Not participating in this challenge" });
      }
      
      res.status(200).json(participation);
    } catch (error) {
      console.error("Error fetching participation:", error);
      res.status(500).json({ message: "Failed to fetch participation" });
    }
  });
  
  // Get all participations for a user
  app.get("/api/challenges/my-participations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const participations = await storage.getChallengeParticipationsByUserId(userId);
      
      res.status(200).json(participations);
    } catch (error) {
      console.error("Error fetching participations:", error);
      res.status(500).json({ message: "Failed to fetch participations" });
    }
  });
  
  // Add progress to a challenge
  app.post("/api/challenges/:id/progress", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const userId = req.user!.id;
      
      // Get the participation
      const participation = await storage.getChallengeParticipation(userId, challengeId);
      if (!participation) {
        return res.status(404).json({ message: "Not participating in this challenge" });
      }
      
      // Validate progress data
      const { value, notes, proofImageUrl } = req.body;
      
      if (typeof value !== "number" || value <= 0) {
        return res.status(400).json({ message: "Invalid progress value" });
      }
      
      // Add the progress entry
      const progressEntry = await storage.addChallengeProgress({
        challengeParticipantId: participation.id,
        value,
        notes: notes || null,
        proofImageUrl: proofImageUrl || null,
        createdAt: new Date(),
      });
      
      // Update the participant's progress
      const newProgress = (participation.currentProgress || 0) + value;
      
      // Check if the challenge is completed with this progress
      const challenge = await storage.getChallenge(challengeId);
      const isCompleted = newProgress >= challenge!.goalValue;
      
      // Update the participation with new progress and completed status if needed
      await storage.updateChallengeParticipation(
        participation.id, 
        newProgress,
        isCompleted,
        isCompleted ? new Date() : null
      );
      
      // Notify challenge creator if it's not the creator adding progress
      if (challenge!.creatorId !== userId) {
        const creatorSocket = activeConnections.get(challenge!.creatorId);
        if (creatorSocket && creatorSocket.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: "challenge_progress",
            data: {
              challengeId,
              challengeName: challenge!.name,
              participantId: userId,
              participantName: req.user!.name,
              value,
              newTotal: newProgress,
              isCompleted,
            },
          };
          creatorSocket.send(JSON.stringify(message));
        }
      }
      
      // Notify friends about progress
      const friendIds = await storage.getFriendIds(userId);
      for (const friendId of friendIds) {
        if (friendId !== challenge!.creatorId) { // Don't notify creator twice
          const socket = activeConnections.get(friendId);
          if (socket && socket.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
              type: "friend_challenge_progress",
              data: {
                challengeId,
                challengeName: challenge!.name,
                friendId: userId,
                friendName: req.user!.name,
                value,
                newTotal: newProgress,
                isCompleted,
              },
            };
            socket.send(JSON.stringify(message));
          }
        }
      }
      
      res.status(201).json(progressEntry);
    } catch (error) {
      console.error("Error adding progress:", error);
      res.status(500).json({ message: "Failed to add progress" });
    }
  });
  
  // Get progress entries for a challenge
  app.get("/api/challenges/:id/progress", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const userId = req.user!.id;
      
      // Get the participation
      const participation = await storage.getChallengeParticipation(userId, challengeId);
      if (!participation) {
        return res.status(404).json({ message: "Not participating in this challenge" });
      }
      
      // Get progress entries for this participation
      const progressEntries = await storage.getChallengeProgressEntries(participation.id);
      
      res.status(200).json(progressEntries);
    } catch (error) {
      console.error("Error fetching progress entries:", error);
      res.status(500).json({ message: "Failed to fetch progress entries" });
    }
  });
  
  // Get leaderboard for a challenge
  app.get("/api/challenges/:id/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const leaderboard = await storage.getChallengeLeaderboard(challengeId, req.user!.id);
      
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  
  // Add a comment to a challenge
  app.post("/api/challenges/:id/comment", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const { content } = req.body;
      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      
      const userId = req.user!.id;
      
      // Check if the challenge exists
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Add the comment
      const comment = await storage.addChallengeComment({
        challengeId,
        userId,
        content,
        createdAt: new Date(),
      });
      
      // Notify challenge creator if it's not the creator commenting
      if (challenge.creatorId !== userId) {
        const creatorSocket = activeConnections.get(challenge.creatorId);
        if (creatorSocket && creatorSocket.readyState === WebSocket.OPEN) {
          const wsMessage: WebSocketMessage = {
            type: "challenge_comment",
            data: {
              challengeId,
              challengeName: challenge.name,
              commentId: comment.id,
              commentContent: content,
              userId,
              userName: req.user!.name,
            },
          };
          creatorSocket.send(JSON.stringify(wsMessage));
        }
      }
      
      // Notify participants about the new comment
      const participants = await storage.getChallengeParticipants(challengeId);
      for (const participant of participants) {
        if (participant.userId !== userId && participant.userId !== challenge.creatorId) {
          const socket = activeConnections.get(participant.userId);
          if (socket && socket.readyState === WebSocket.OPEN) {
            const wsMessage: WebSocketMessage = {
              type: "challenge_comment",
              data: {
                challengeId,
                challengeName: challenge.name,
                commentId: comment.id,
                commentContent: content,
                userId,
                userName: req.user!.name,
              },
            };
            socket.send(JSON.stringify(wsMessage));
          }
        }
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });
  
  // Get comments for a challenge
  app.get("/api/challenges/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const comments = await storage.getChallengeComments(challengeId);
      
      res.status(200).json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  
  // Create demo users for testing
  app.post("/api/demo/create-users", isAuthenticated, async (req, res) => {
    try {
      const { count = 5, withFriendships = true } = req.body;
      const userId = req.user!.id;
      
      // Create demo users
      const demoUsers = await storage.createDemoUsers(count);
      
      // Create friendships between the current user and some demo users if requested
      if (withFriendships && demoUsers.length > 0) {
        // Make about half of the demo users friends with the current user
        const friendCount = Math.ceil(demoUsers.length / 2);
        const friendDemoUsers = demoUsers.slice(0, friendCount);
        
        for (const demoUser of friendDemoUsers) {
          await storage.createConnection({
            user1Id: userId,
            user2Id: demoUser.id,
            createdAt: new Date(),
          });
        }
      }
      
      res.status(201).json({ 
        message: `Created ${demoUsers.length} demo users${withFriendships ? ' with friendships' : ''}`,
        users: demoUsers
      });
    } catch (error) {
      console.error("Error creating demo users:", error);
      res.status(500).json({ message: "Failed to create demo users" });
    }
  });
  
  // Create demo challenges for testing
  app.post("/api/demo/create-challenges", isAuthenticated, async (req, res) => {
    try {
      const { count = 3 } = req.body;
      const userId = req.user!.id;
      
      // Get user's friends for creating some challenges by friends
      const friendIds = await storage.getFriendIds(userId);
      
      // Create demo challenges
      const demoChallenges = await storage.createDemoChallenges(count, userId, friendIds);
      
      res.status(201).json({ 
        message: `Created ${demoChallenges.length} demo challenges`,
        challenges: demoChallenges
      });
    } catch (error) {
      console.error("Error creating demo challenges:", error);
      res.status(500).json({ message: "Failed to create demo challenges" });
    }
  });
  
  // Create complete demo data set including users, connections, and challenges
  app.post("/api/demo/create-all", async (req, res) => {
    console.log("Demo data endpoint called with body:", req.body);
    
    // Set proper content type to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    try {
      console.log("Creating full demo data set...");
      // First create demo users
      const count = req.body.count || 5;
      const demoUsers = await storage.createDemoUsers(count);
      
      if (demoUsers.length === 0) {
        return res.status(500).json({ success: false, error: 'Failed to create demo users' });
      }
      
      // Set up the first user as the "main user"
      const mainUser = demoUsers[0];
      const friendIds: number[] = [];
      
      // Create connections between main user and others
      console.log("Creating connections for demo users...");
      for (let i = 1; i < demoUsers.length; i++) {
        const otherUser = demoUsers[i];
        await storage.createConnection({
          user1Id: mainUser.id,
          user2Id: otherUser.id,
          createdAt: new Date()
        });
        friendIds.push(otherUser.id);
      }
      
      // Create challenges 
      console.log("Creating demo challenges...");
      const challengeCount = req.body.challengeCount || 3;
      const challenges = await storage.createDemoChallenges(challengeCount, mainUser.id, friendIds);
      
      // Have users join and progress on the challenges
      console.log("Setting up challenge participants...");
      for (const challenge of challenges) {
        // Main user joins and makes progress
        const mainParticipant = await storage.joinChallenge(mainUser.id, challenge.id);
        await storage.updateChallengeProgress(mainParticipant.id, challenge.goalValue * 0.75);
        
        // Some friends join and make progress too
        for (let i = 0; i < friendIds.length; i++) {
          const friendId = friendIds[i];
          const participant = await storage.joinChallenge(friendId, challenge.id);
          
          // Randomize progress for each friend
          const progressPercentage = Math.random();
          const progress = Math.floor(challenge.goalValue * progressPercentage);
          await storage.updateChallengeProgress(participant.id, progress);
          
          // Mark some as completed
          if (progressPercentage > 0.9) {
            await storage.completeChallenge(participant.id);
          }
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          users: demoUsers.length,
          connections: friendIds.length,
          challenges: challenges.length,
          loginCredentials: {
            username: mainUser.username,
            password: 'liscr12'
          }
        }
      });
    } catch (error) {
      console.error('Error creating complete demo data set:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}