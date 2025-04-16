import { Express } from 'express';
import { WebSocket } from 'ws';
import { storage } from './storage';
import {
  challengeSchema, progressEntrySchema, challengeCommentSchema,
  insertChallengeSchema, insertChallengeParticipantSchema,
  insertProgressEntrySchema, insertChallengeCommentSchema,
  WebSocketMessage
} from '@shared/schema';
import { ZodError } from 'zod';

// Map to store active WebSocket connections by user ID (imported from routes.ts)
export function setupChallengeRoutes(app: Express, activeConnections: Map<number, WebSocket>) {
  // Challenge routes
  app.post('/api/challenges', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const challengeData = challengeSchema.parse({
        ...req.body,
        creatorId: req.session.userId
      });
      
      const insertData = insertChallengeSchema.parse({
        ...challengeData,
        status: "active"
      });
      
      const challenge = await storage.createChallenge(insertData);
      
      // Notify friends/connections about the new challenge
      const connections = await storage.getConnectionsByUserId(req.session.userId);
      for (const connection of connections) {
        const friendId = connection.user1Id === req.session.userId ? connection.user2Id : connection.user1Id;
        const ws = activeConnections.get(friendId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: 'challenge_created',
            senderId: req.session.userId,
            receiverId: friendId,
            data: { challenge }
          };
          ws.send(JSON.stringify(message));
        }
      }
      
      return res.status(201).json(challenge);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to create challenge' });
    }
  });
  
  app.get('/api/challenges', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challenges = await storage.getAllChallenges();
    return res.json(challenges);
  });
  
  app.get('/api/challenges/active', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challenges = await storage.getActiveChallenges();
    return res.json(challenges);
  });
  
  app.get('/api/challenges/user', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challenges = await storage.getChallengesByUser(req.session.userId);
    return res.json(challenges);
  });
  
  app.get('/api/challenges/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const challenge = await storage.getChallenge(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    return res.json(challenge);
  });
  
  app.patch('/api/challenges/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const challenge = await storage.getChallenge(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    // Only the creator can update a challenge
    if (challenge.creatorId !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized to update this challenge' });
    }
    
    try {
      const updatedChallenge = await storage.updateChallenge(challengeId, req.body);
      if (!updatedChallenge) {
        return res.status(500).json({ message: 'Failed to update challenge' });
      }
      
      return res.json(updatedChallenge);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to update challenge' });
    }
  });
  
  app.delete('/api/challenges/:id', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const challenge = await storage.getChallenge(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    // Only the creator can delete a challenge
    if (challenge.creatorId !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this challenge' });
    }
    
    const success = await storage.deleteChallenge(challengeId);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete challenge' });
    }
    
    return res.json({ success: true });
  });
  
  // Challenge participation routes
  app.post('/api/challenges/:id/join', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const challenge = await storage.getChallenge(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    // Check if user is already participating
    const existingParticipant = await storage.getChallengeParticipantByUserAndChallenge(
      req.session.userId,
      challengeId
    );
    
    if (existingParticipant) {
      return res.status(400).json({ message: 'Already participating in this challenge' });
    }
    
    try {
      const participant = await storage.joinChallenge({
        userId: req.session.userId,
        challengeId,
        joinedAt: new Date(),
        currentProgress: 0,
        completed: false
      });
      
      // Notify the challenge creator
      const creatorWs = activeConnections.get(challenge.creatorId);
      if (creatorWs && creatorWs.readyState === WebSocket.OPEN) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          const { password, ...userData } = user;
          const message: WebSocketMessage = {
            type: 'challenge_joined',
            senderId: req.session.userId,
            receiverId: challenge.creatorId,
            data: {
              participant,
              challenge,
              user: userData
            }
          };
          creatorWs.send(JSON.stringify(message));
        }
      }
      
      return res.status(201).json(participant);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to join challenge' });
    }
  });
  
  app.get('/api/challenges/:id/participants', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const participants = await storage.getChallengeParticipants(challengeId);
    return res.json(participants);
  });
  
  app.get('/api/challenges/:id/leaderboard', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const leaderboard = await storage.getChallengeLeaderboard(challengeId);
    return res.json(leaderboard);
  });
  
  app.post('/api/challenges/:id/progress', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    // Get the user's participation in this challenge
    const participant = await storage.getChallengeParticipantByUserAndChallenge(
      req.session.userId,
      challengeId
    );
    
    if (!participant) {
      return res.status(404).json({ message: 'Not participating in this challenge' });
    }
    
    try {
      const progressData = progressEntrySchema.parse({
        ...req.body,
        challengeParticipantId: participant.id
      });
      
      const entry = await storage.addProgressEntry({
        ...progressData,
        createdAt: new Date()
      });
      
      // Notify others about the progress update
      const challenge = await storage.getChallenge(challengeId);
      if (challenge) {
        const participants = await storage.getChallengeParticipants(challengeId);
        
        for (const p of participants) {
          if (p.userId !== req.session.userId) {
            const ws = activeConnections.get(p.userId);
            if (ws && ws.readyState === WebSocket.OPEN) {
              const user = await storage.getUser(req.session.userId);
              if (user) {
                const { password, ...userData } = user;
                const message: WebSocketMessage = {
                  type: 'challenge_progress_updated',
                  senderId: req.session.userId,
                  receiverId: p.userId,
                  data: {
                    entry,
                    participant,
                    challenge,
                    user: userData
                  }
                };
                ws.send(JSON.stringify(message));
              }
            }
          }
        }
        
        // Also notify the challenge creator if they're not a participant
        if (challenge.creatorId !== req.session.userId && !participants.some(p => p.userId === challenge.creatorId)) {
          const creatorWs = activeConnections.get(challenge.creatorId);
          if (creatorWs && creatorWs.readyState === WebSocket.OPEN) {
            const user = await storage.getUser(req.session.userId);
            if (user) {
              const { password, ...userData } = user;
              const message: WebSocketMessage = {
                type: 'challenge_progress_updated',
                senderId: req.session.userId,
                receiverId: challenge.creatorId,
                data: {
                  entry,
                  participant,
                  challenge,
                  user: userData
                }
              };
              creatorWs.send(JSON.stringify(message));
            }
          }
        }
      }
      
      return res.status(201).json(entry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to add progress entry' });
    }
  });
  
  app.get('/api/challenges/:id/progress', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    // Get the user's participation in this challenge
    const participant = await storage.getChallengeParticipantByUserAndChallenge(
      req.session.userId,
      challengeId
    );
    
    if (!participant) {
      return res.status(404).json({ message: 'Not participating in this challenge' });
    }
    
    const entries = await storage.getProgressEntries(participant.id);
    return res.json(entries);
  });
  
  app.post('/api/challenges/:id/comment', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const challenge = await storage.getChallenge(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    try {
      const commentData = challengeCommentSchema.parse({
        ...req.body,
        challengeId,
        userId: req.session.userId
      });
      
      const comment = await storage.addChallengeComment({
        ...commentData,
        createdAt: new Date()
      });
      
      // Notify other participants about the new comment
      const participants = await storage.getChallengeParticipants(challengeId);
      const user = await storage.getUser(req.session.userId);
      
      if (user) {
        const { password, ...userData } = user;
        
        for (const p of participants) {
          if (p.userId !== req.session.userId) {
            const ws = activeConnections.get(p.userId);
            if (ws && ws.readyState === WebSocket.OPEN) {
              const message: WebSocketMessage = {
                type: 'challenge_comment',
                senderId: req.session.userId,
                receiverId: p.userId,
                data: {
                  comment,
                  challenge,
                  user: userData
                }
              };
              ws.send(JSON.stringify(message));
            }
          }
        }
        
        // Also notify the challenge creator if they're not a participant
        if (challenge.creatorId !== req.session.userId && !participants.some(p => p.userId === challenge.creatorId)) {
          const creatorWs = activeConnections.get(challenge.creatorId);
          if (creatorWs && creatorWs.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
              type: 'challenge_comment',
              senderId: req.session.userId,
              receiverId: challenge.creatorId,
              data: {
                comment,
                challenge,
                user: userData
              }
            };
            creatorWs.send(JSON.stringify(message));
          }
        }
      }
      
      return res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Failed to add comment' });
    }
  });
  
  app.get('/api/challenges/:id/comments', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const comments = await storage.getChallengeComments(challengeId);
    
    // Enhance comments with user information
    const enhancedComments = await Promise.all(
      comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        if (!user) return comment;
        
        const { password, ...userData } = user;
        return {
          ...comment,
          user: userData
        };
      })
    );
    
    return res.json(enhancedComments);
  });
  
  app.delete('/api/challenges/:id/leave', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const challengeId = parseInt(req.params.id);
    if (isNaN(challengeId)) {
      return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    
    const success = await storage.leaveChallengeByUserId(challengeId, req.session.userId);
    if (!success) {
      return res.status(404).json({ message: 'Not participating in this challenge' });
    }
    
    return res.json({ success: true });
  });
}