import { storage } from "../storage";
import { 
  InsertWorkoutBattle, 
  InsertBattlePerformance, 
  WorkoutBattle, 
  BattlePerformance,
  WebSocketMessage
} from "@shared/schema";
import { getActiveConnections } from "../routes";
import WebSocket from "ws";

// Service for battle operations using in-memory storage
export class MemBattleService {
  private battles: Map<number, WorkoutBattle> = new Map();
  private performances: Map<number, BattlePerformance> = new Map();
  private nextBattleId: number = 1;
  private nextPerformanceId: number = 1;

  // Create a new workout battle
  async createBattle(battleData: InsertWorkoutBattle): Promise<WorkoutBattle> {
    const now = new Date();
    const id = this.nextBattleId++;
    
    const battle: WorkoutBattle = {
      ...battleData,
      id,
      createdAt: now,
      status: battleData.status || "pending",
      startedAt: null,
      completedAt: null,
      winnerId: null,
      isQuickChallenge: battleData.isQuickChallenge || false
    };
    
    this.battles.set(id, battle);

    // If opponent is specified, send a battle invitation via WebSocket
    if (battleData.opponentId) {
      this.sendBattleInvitation(battle);
    }

    return battle;
  }

  // Send a battle invitation via WebSocket
  async sendBattleInvitation(battle: WorkoutBattle) {
    const connections = getActiveConnections();

    // Get creator details for the message
    const creator = await storage.getUser(battle.creatorId);
    if (!creator) return;

    // Send battle invitation to opponent
    if (battle.opponentId && connections.has(battle.opponentId)) {
      const opponentWs = connections.get(battle.opponentId);
      
      if (opponentWs && opponentWs.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = {
          type: 'battle_invitation',
          senderId: battle.creatorId,
          receiverId: battle.opponentId,
          data: {
            battle,
            creator: {
              id: creator.id,
              name: creator.name,
              profilePicture: creator.profilePicture
            }
          }
        };
        
        opponentWs.send(JSON.stringify(message));
      }
    }
  }

  // Accept a battle invitation
  async acceptBattle(battleId: number, userId: number): Promise<WorkoutBattle | null> {
    const battle = this.battles.get(battleId);
    
    // Make sure the user is actually the opponent for this battle
    if (!battle || battle.opponentId !== userId || battle.status !== "pending") {
      return null;
    }

    // Update the battle status
    const updatedBattle: WorkoutBattle = {
      ...battle,
      status: "in_progress",
      startedAt: new Date()
    };
    
    this.battles.set(battleId, updatedBattle);

    // Send notification to both participants
    this.sendBattleStatusUpdate(updatedBattle, "battle_accepted");

    return updatedBattle;
  }

  // Decline a battle invitation
  async declineBattle(battleId: number, userId: number): Promise<WorkoutBattle | null> {
    const battle = this.battles.get(battleId);
    
    // Make sure the user is actually the opponent for this battle
    if (!battle || battle.opponentId !== userId || battle.status !== "pending") {
      return null;
    }

    // Update the battle status
    const updatedBattle: WorkoutBattle = {
      ...battle,
      status: "cancelled"
    };
    
    this.battles.set(battleId, updatedBattle);

    // Send notification to both participants
    this.sendBattleStatusUpdate(updatedBattle, "battle_declined");

    return updatedBattle;
  }

  // Start a workout battle (countdown, etc.)
  async startBattle(battleId: number): Promise<WorkoutBattle | null> {
    const battle = this.battles.get(battleId);
    
    if (!battle || battle.status !== "in_progress") {
      return null;
    }

    // Send notification to both participants
    this.sendBattleStatusUpdate(battle, "battle_started");

    // Initiate countdown via WebSocket
    this.startBattleCountdown(battle);

    return battle;
  }

  // Start a countdown for the battle
  async startBattleCountdown(battle: WorkoutBattle) {
    const connections = getActiveConnections();
    const participants = [battle.creatorId];
    
    if (battle.opponentId) {
      participants.push(battle.opponentId);
    }

    // Send initial countdown message
    for (const participantId of participants) {
      if (connections.has(participantId)) {
        const ws = connections.get(participantId);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: 'battle_countdown',
            senderId: 0, // System message
            receiverId: participantId,
            data: {
              battleId: battle.id,
              countdown: 3, // Start with 3 seconds
              message: "Battle starting in 3..."
            }
          };
          
          ws.send(JSON.stringify(message));
        }
      }
    }

    // Simulate countdown 3,2,1,Go!
    setTimeout(() => {
      for (const participantId of participants) {
        if (connections.has(participantId)) {
          const ws = connections.get(participantId);
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
              type: 'battle_countdown',
              senderId: 0,
              receiverId: participantId,
              data: {
                battleId: battle.id,
                countdown: 2,
                message: "2..."
              }
            };
            
            ws.send(JSON.stringify(message));
          }
        }
      }
    }, 1000);

    setTimeout(() => {
      for (const participantId of participants) {
        if (connections.has(participantId)) {
          const ws = connections.get(participantId);
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
              type: 'battle_countdown',
              senderId: 0,
              receiverId: participantId,
              data: {
                battleId: battle.id,
                countdown: 1,
                message: "1..."
              }
            };
            
            ws.send(JSON.stringify(message));
          }
        }
      }
    }, 2000);

    setTimeout(() => {
      for (const participantId of participants) {
        if (connections.has(participantId)) {
          const ws = connections.get(participantId);
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
              type: 'battle_countdown',
              senderId: 0,
              receiverId: participantId,
              data: {
                battleId: battle.id,
                countdown: 0,
                message: "GO!",
                startTime: new Date().toISOString()
              }
            };
            
            ws.send(JSON.stringify(message));
          }
        }
      }
    }, 3000);

    // Schedule battle completion after the duration
    const durationMs = battle.duration * 1000;
    setTimeout(() => {
      this.completeBattle(battle.id);
    }, durationMs + 3000); // Add 3 seconds for countdown
  }

  // Update battle reps during active battle
  async updateBattleReps(battleId: number, userId: number, reps: number): Promise<BattlePerformance | null> {
    const battle = this.battles.get(battleId);
    
    // Check if battle exists and is in progress
    if (!battle || battle.status !== "in_progress") {
      return null;
    }

    // Check if user is a participant
    if (battle.creatorId !== userId && battle.opponentId !== userId) {
      return null;
    }

    // Find existing performance record
    let existingPerformance: BattlePerformance | undefined;
    for (const [_, perf] of this.performances.entries()) {
      if (perf.battleId === battleId && perf.userId === userId) {
        existingPerformance = perf;
        break;
      }
    }

    let performance: BattlePerformance;

    if (existingPerformance) {
      // Update existing record
      performance = {
        ...existingPerformance,
        reps
      };
      this.performances.set(existingPerformance.id, performance);
    } else {
      // Create new record
      const id = this.nextPerformanceId++;
      performance = {
        id,
        battleId,
        userId,
        reps,
        verified: false,
        submittedAt: new Date(),
        formQuality: null,
        notes: null,
        videoUrl: null
      };
      this.performances.set(id, performance);
    }

    // Broadcast the rep update to all participants
    this.broadcastRepUpdate(battle, performance);

    return performance;
  }

  // Broadcast rep update to battle participants
  async broadcastRepUpdate(battle: WorkoutBattle, performance: BattlePerformance) {
    const connections = getActiveConnections();
    const participants = [battle.creatorId];
    
    if (battle.opponentId) {
      participants.push(battle.opponentId);
    }

    // Get user info for the rep update
    const user = await storage.getUser(performance.userId);
    if (!user) return;

    // Send update to all participants
    for (const participantId of participants) {
      if (connections.has(participantId)) {
        const ws = connections.get(participantId);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: 'battle_rep_update',
            senderId: performance.userId,
            receiverId: participantId,
            data: {
              battleId: battle.id,
              userId: performance.userId,
              userName: user.name,
              reps: performance.reps,
              timestamp: new Date().toISOString()
            }
          };
          
          ws.send(JSON.stringify(message));
        }
      }
    }
  }

  // Complete a battle and determine winner
  async completeBattle(battleId: number): Promise<WorkoutBattle | null> {
    const battle = this.battles.get(battleId);
    
    // Check if battle exists and is in progress
    if (!battle || battle.status !== "in_progress") {
      return null;
    }

    // Get all performances for this battle
    const performances: BattlePerformance[] = [];
    for (const [_, perf] of this.performances.entries()) {
      if (perf.battleId === battleId) {
        performances.push(perf);
      }
    }

    // Sort performances by reps in descending order
    performances.sort((a, b) => b.reps - a.reps);

    // Determine winner based on reps
    let winnerId: number | null = null;
    
    if (performances.length > 0) {
      // Winner is the one with the most reps
      winnerId = performances[0].userId;
    }

    // Update battle status
    const updatedBattle: WorkoutBattle = {
      ...battle,
      status: "completed",
      completedAt: new Date(),
      winnerId
    };
    
    this.battles.set(battleId, updatedBattle);

    // Send notification to all participants
    this.sendBattleCompletionUpdate(updatedBattle, performances);

    return updatedBattle;
  }

  // Send battle completion update to all participants
  async sendBattleCompletionUpdate(battle: WorkoutBattle, performances: BattlePerformance[]) {
    const connections = getActiveConnections();
    const participants = [battle.creatorId];
    
    if (battle.opponentId) {
      participants.push(battle.opponentId);
    }

    // Get user details for all participants
    const performanceResults = [];
    for (const performance of performances) {
      const user = await storage.getUser(performance.userId);
      if (user) {
        performanceResults.push({
          ...performance,
          user: {
            id: user.id,
            name: user.name,
            profilePicture: user.profilePicture
          }
        });
      }
    }

    // Send completion message to all participants
    for (const participantId of participants) {
      if (connections.has(participantId)) {
        const ws = connections.get(participantId);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: 'battle_completed',
            senderId: 0, // System message
            receiverId: participantId,
            data: {
              battle,
              performances: performanceResults,
              winnerId: battle.winnerId,
              isWinner: battle.winnerId === participantId
            }
          };
          
          ws.send(JSON.stringify(message));
        }
      }
    }
  }

  // Send generic battle status update
  async sendBattleStatusUpdate(battle: WorkoutBattle, messageType: 'battle_accepted' | 'battle_declined' | 'battle_started' | 'battle_cancelled') {
    const connections = getActiveConnections();
    const participants = [battle.creatorId];
    
    if (battle.opponentId) {
      participants.push(battle.opponentId);
    }

    // Send update to all participants
    for (const participantId of participants) {
      if (connections.has(participantId)) {
        const ws = connections.get(participantId);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: messageType,
            senderId: 0, // System message
            receiverId: participantId,
            data: { battle }
          };
          
          ws.send(JSON.stringify(message));
        }
      }
    }
  }

  // Cancel a battle
  async cancelBattle(battleId: number, userId: number): Promise<WorkoutBattle | null> {
    const battle = this.battles.get(battleId);
    
    // Check if battle exists and user is a participant
    if (!battle || 
        (battle.creatorId !== userId && battle.opponentId !== userId) ||
        battle.status === "completed" ||
        battle.status === "cancelled") {
      return null;
    }

    // Update battle status
    const updatedBattle: WorkoutBattle = {
      ...battle,
      status: "cancelled"
    };
    
    this.battles.set(battleId, updatedBattle);

    // Send notification to all participants
    this.sendBattleStatusUpdate(updatedBattle, "battle_cancelled");

    return updatedBattle;
  }

  // Get battles for a user
  async getUserBattles(userId: number, status?: string): Promise<WorkoutBattle[]> {
    const userBattles: WorkoutBattle[] = [];
    
    for (const [_, battle] of this.battles.entries()) {
      if (battle.creatorId === userId || battle.opponentId === userId) {
        if (!status || battle.status === status) {
          userBattles.push(battle);
        }
      }
    }
    
    // Sort by created date (descending)
    return userBattles.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // Get a specific battle by ID
  async getBattleById(battleId: number): Promise<WorkoutBattle | null> {
    const battle = this.battles.get(battleId);
    return battle || null;
  }

  // Get battle performances for a specific battle
  async getBattlePerformances(battleId: number): Promise<BattlePerformance[]> {
    const battlePerformances: BattlePerformance[] = [];
    
    for (const [_, perf] of this.performances.entries()) {
      if (perf.battleId === battleId) {
        battlePerformances.push(perf);
      }
    }
    
    // Sort by reps (descending)
    return battlePerformances.sort((a, b) => b.reps - a.reps);
  }

  // Create a quick challenge for nearby users
  async createQuickChallenge(userId: number, exerciseType: string, duration: number): Promise<WorkoutBattle> {
    const battleData: InsertWorkoutBattle = {
      creatorId: userId,
      exerciseType,
      duration,
      isQuickChallenge: true,
      status: "pending"
    };

    const battle = await this.createBattle(battleData);

    // Send quick challenge notification to nearby users
    this.broadcastQuickChallenge(battle);

    return battle;
  }

  // Broadcast quick challenge to nearby users
  async broadcastQuickChallenge(battle: WorkoutBattle) {
    const connections = getActiveConnections();
    
    // Get creator details
    const creator = await storage.getUser(battle.creatorId);
    if (!creator || !creator.latitude || !creator.longitude) {
      return; // Can't determine location
    }

    // For each connected user, check if they're nearby
    // This is a simplified approach; in a real app, we'd use geospatial queries
    const nearbyRadius = 5; // 5 miles

    for (const [userId, ws] of connections.entries()) {
      // Skip the creator
      if (userId === battle.creatorId) {
        continue;
      }

      // Get user's location
      const user = await storage.getUser(userId);
      if (!user || !user.latitude || !user.longitude) {
        continue; // Skip users without location
      }

      // Calculate distance (simplified)
      const distance = this.calculateDistance(
        creator.latitude, 
        creator.longitude,
        user.latitude,
        user.longitude
      );

      // If nearby, send challenge notification
      if (distance <= nearbyRadius && ws.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = {
          type: 'quick_challenge_nearby',
          senderId: creator.id,
          receiverId: userId,
          data: {
            battle,
            creator: {
              id: creator.id,
              name: creator.name,
              profilePicture: creator.profilePicture,
              distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
            }
          }
        };
        
        ws.send(JSON.stringify(message));
      }
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // Earth radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c;
    return distance;
  }

  toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }
}

export const battleService = new MemBattleService();