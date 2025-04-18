import { Request, Response, NextFunction, Express } from "express";
import { battleService } from "../services/battleService";
import { workoutBattleSchema, battlePerformanceSchema } from "@shared/schema";
import { z } from "zod";
import WebSocket from "ws";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function setupBattleRoutes(app: Express, activeConnections: Map<number, WebSocket>) {
  // Create a new workout battle
  app.post("/api/battles", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const battleData = workoutBattleSchema.parse({
        ...req.body,
        creatorId: userId
      });

      const battle = await battleService.createBattle(battleData);
      
      res.status(201).json(battle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid battle data", errors: error.errors });
      }
      console.error("Error creating battle:", error);
      res.status(500).json({ message: "Failed to create battle" });
    }
  });

  // Get user's battles
  app.get("/api/battles/my-battles", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string | undefined;
      
      const battles = await battleService.getUserBattles(userId, status);
      
      res.json(battles);
    } catch (error) {
      console.error("Error getting battles:", error);
      res.status(500).json({ message: "Failed to get battles" });
    }
  });

  // Get a specific battle by ID
  app.get("/api/battles/:battleId", isAuthenticated, async (req, res) => {
    try {
      const battleId = parseInt(req.params.battleId);
      
      if (isNaN(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }
      
      const battle = await battleService.getBattleById(battleId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }
      
      res.json(battle);
    } catch (error) {
      console.error("Error getting battle:", error);
      res.status(500).json({ message: "Failed to get battle" });
    }
  });

  // Get battle performances for a specific battle
  app.get("/api/battles/:battleId/performances", isAuthenticated, async (req, res) => {
    try {
      const battleId = parseInt(req.params.battleId);
      
      if (isNaN(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }
      
      const performances = await battleService.getBattlePerformances(battleId);
      
      res.json(performances);
    } catch (error) {
      console.error("Error getting performances:", error);
      res.status(500).json({ message: "Failed to get performances" });
    }
  });

  // Accept a battle invitation
  app.post("/api/battles/:battleId/accept", isAuthenticated, async (req, res) => {
    try {
      const battleId = parseInt(req.params.battleId);
      const userId = req.user!.id;
      
      if (isNaN(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }
      
      const battle = await battleService.acceptBattle(battleId, userId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle not found or you're not the opponent" });
      }
      
      res.json(battle);
    } catch (error) {
      console.error("Error accepting battle:", error);
      res.status(500).json({ message: "Failed to accept battle" });
    }
  });

  // Decline a battle invitation
  app.post("/api/battles/:battleId/decline", isAuthenticated, async (req, res) => {
    try {
      const battleId = parseInt(req.params.battleId);
      const userId = req.user!.id;
      
      if (isNaN(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }
      
      const battle = await battleService.declineBattle(battleId, userId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle not found or you're not the opponent" });
      }
      
      res.json(battle);
    } catch (error) {
      console.error("Error declining battle:", error);
      res.status(500).json({ message: "Failed to decline battle" });
    }
  });

  // Start a workout battle
  app.post("/api/battles/:battleId/start", isAuthenticated, async (req, res) => {
    try {
      const battleId = parseInt(req.params.battleId);
      
      if (isNaN(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }
      
      const battle = await battleService.startBattle(battleId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle not found or not in progress" });
      }
      
      res.json(battle);
    } catch (error) {
      console.error("Error starting battle:", error);
      res.status(500).json({ message: "Failed to start battle" });
    }
  });

  // Update battle reps during active battle
  app.post("/api/battles/:battleId/reps", isAuthenticated, async (req, res) => {
    try {
      const battleId = parseInt(req.params.battleId);
      const userId = req.user!.id;
      
      if (isNaN(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }
      
      // Validate request body
      const { reps } = req.body;
      
      if (typeof reps !== 'number' || reps < 0) {
        return res.status(400).json({ message: "Invalid reps value" });
      }
      
      const performance = await battleService.updateBattleReps(battleId, userId, reps);
      
      if (!performance) {
        return res.status(404).json({ message: "Battle not found or not in progress" });
      }
      
      res.json(performance);
    } catch (error) {
      console.error("Error updating reps:", error);
      res.status(500).json({ message: "Failed to update reps" });
    }
  });

  // Complete a battle
  app.post("/api/battles/:battleId/complete", isAuthenticated, async (req, res) => {
    try {
      const battleId = parseInt(req.params.battleId);
      
      if (isNaN(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }
      
      const battle = await battleService.completeBattle(battleId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle not found or not in progress" });
      }
      
      res.json(battle);
    } catch (error) {
      console.error("Error completing battle:", error);
      res.status(500).json({ message: "Failed to complete battle" });
    }
  });

  // Cancel a battle
  app.post("/api/battles/:battleId/cancel", isAuthenticated, async (req, res) => {
    try {
      const battleId = parseInt(req.params.battleId);
      const userId = req.user!.id;
      
      if (isNaN(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }
      
      const battle = await battleService.cancelBattle(battleId, userId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle not found or you're not a participant" });
      }
      
      res.json(battle);
    } catch (error) {
      console.error("Error cancelling battle:", error);
      res.status(500).json({ message: "Failed to cancel battle" });
    }
  });

  // Create a quick challenge for nearby users
  app.post("/api/battles/quick-challenge", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const { exerciseType, duration } = req.body;
      
      if (!exerciseType || typeof duration !== 'number') {
        return res.status(400).json({ message: "Invalid challenge data" });
      }
      
      const battle = await battleService.createQuickChallenge(userId, exerciseType, duration);
      
      res.status(201).json(battle);
    } catch (error) {
      console.error("Error creating quick challenge:", error);
      res.status(500).json({ message: "Failed to create quick challenge" });
    }
  });

  // Handle WebSocket messages for battles
  app.post("/api/battles/ws-message", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { type, battleId, data } = req.body;
      
      if (!type || !battleId) {
        return res.status(400).json({ message: "Invalid message data" });
      }
      
      // Handle different message types
      switch (type) {
        case 'battle_rep_update':
          if (typeof data.reps !== 'number') {
            return res.status(400).json({ message: "Invalid reps value" });
          }
          
          const performance = await battleService.updateBattleReps(battleId, userId, data.reps);
          
          if (!performance) {
            return res.status(404).json({ message: "Battle not found or not in progress" });
          }
          
          res.json({ success: true });
          break;
          
        default:
          res.status(400).json({ message: "Unsupported message type" });
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });
}