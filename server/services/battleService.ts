import { db } from "../db";
import { workoutBattles, battlePerformance, users } from "@shared/schema";
import { 
  InsertWorkoutBattle, 
  InsertBattlePerformance, 
  WorkoutBattle, 
  BattlePerformance,
  WebSocketMessage
} from "@shared/schema";
import { eq, and, gte, lte, ne, desc, sql, or } from "drizzle-orm";
import { getActiveConnections } from "../routes";

// Service for battle operations
export class BattleService {
  // Create a new workout battle
  async createBattle(battleData: InsertWorkoutBattle): Promise<WorkoutBattle> {
    const [battle] = await db
      .insert(workoutBattles)
      .values(battleData)
      .returning();

    // If opponent is specified, send a battle invitation via WebSocket
    if (battleData.opponentId) {
      this.sendBattleInvitation(battle);
    }

    return battle;
  }

  // Send a battle invitation via WebSocket
  async sendBattleInvitation(battle: WorkoutBattle) {
    const connections = getActiveConnections();

    // Get creator and opponent details for the message
    const [creator] = await db
      .select({
        id: users.id,
        name: users.name,
        profilePicture: users.profilePicture,
      })
      .from(users)
      .where(eq(users.id, battle.creatorId));

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
    // Make sure the user is actually the opponent for this battle
    const [battle] = await db
      .select()
      .from(workoutBattles)
      .where(and(
        eq(workoutBattles.id, battleId),
        eq(workoutBattles.opponentId, userId),
        eq(workoutBattles.status, "pending")
      ));

    if (!battle) {
      return null;
    }

    // Update the battle status
    const [updatedBattle] = await db
      .update(workoutBattles)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(eq(workoutBattles.id, battleId))
      .returning();

    // Send notification to both participants
    this.sendBattleStatusUpdate(updatedBattle, "battle_accepted");

    return updatedBattle;
  }

  // Decline a battle invitation
  async declineBattle(battleId: number, userId: number): Promise<WorkoutBattle | null> {
    // Make sure the user is actually the opponent for this battle
    const [battle] = await db
      .select()
      .from(workoutBattles)
      .where(and(
        eq(workoutBattles.id, battleId),
        eq(workoutBattles.opponentId, userId),
        eq(workoutBattles.status, "pending")
      ));

    if (!battle) {
      return null;
    }

    // Update the battle status
    const [updatedBattle] = await db
      .update(workoutBattles)
      .set({ status: "cancelled" })
      .where(eq(workoutBattles.id, battleId))
      .returning();

    // Send notification to both participants
    this.sendBattleStatusUpdate(updatedBattle, "battle_declined");

    return updatedBattle;
  }

  // Start a workout battle (countdown, etc.)
  async startBattle(battleId: number): Promise<WorkoutBattle | null> {
    const [battle] = await db
      .select()
      .from(workoutBattles)
      .where(and(
        eq(workoutBattles.id, battleId),
        eq(workoutBattles.status, "in_progress")
      ));

    if (!battle) {
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
    // Check if battle exists and is in progress
    const [battle] = await db
      .select()
      .from(workoutBattles)
      .where(and(
        eq(workoutBattles.id, battleId),
        eq(workoutBattles.status, "in_progress")
      ));

    if (!battle) {
      return null;
    }

    // Check if user is a participant
    if (battle.creatorId !== userId && battle.opponentId !== userId) {
      return null;
    }

    // Check if performance record exists
    const [existing] = await db
      .select()
      .from(battlePerformance)
      .where(and(
        eq(battlePerformance.battleId, battleId),
        eq(battlePerformance.userId, userId)
      ));

    let performance: BattlePerformance;

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(battlePerformance)
        .set({ reps })
        .where(and(
          eq(battlePerformance.battleId, battleId),
          eq(battlePerformance.userId, userId)
        ))
        .returning();
      
      performance = updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(battlePerformance)
        .values({
          battleId,
          userId,
          reps,
          submittedAt: new Date()
        })
        .returning();
      
      performance = created;
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
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, performance.userId));

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
    // Check if battle exists and is in progress
    const [battle] = await db
      .select()
      .from(workoutBattles)
      .where(and(
        eq(workoutBattles.id, battleId),
        eq(workoutBattles.status, "in_progress")
      ));

    if (!battle) {
      return null;
    }

    // Get all performances for this battle
    const performances = await db
      .select()
      .from(battlePerformance)
      .where(eq(battlePerformance.battleId, battleId))
      .orderBy(desc(battlePerformance.reps));

    // Determine winner based on reps
    let winnerId: number | null = null;
    
    if (performances.length > 0) {
      // Winner is the one with the most reps
      winnerId = performances[0].userId;
    }

    // Update battle status
    const [updatedBattle] = await db
      .update(workoutBattles)
      .set({ 
        status: "completed", 
        completedAt: new Date(),
        winnerId
      })
      .where(eq(workoutBattles.id, battleId))
      .returning();

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
    const userIds = performances.map(p => p.userId);
    const userDetails = await db
      .select({
        id: users.id,
        name: users.name,
        profilePicture: users.profilePicture,
      })
      .from(users)
      .where(sql`${users.id} IN (${userIds.join(',')})`);

    // Create a map of user details
    const userMap = new Map(userDetails.map(u => [u.id, u]));

    // Enhance performance data with user details
    const performanceResults = performances.map(p => ({
      ...p,
      user: userMap.get(p.userId)
    }));

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
    // Check if battle exists and user is a participant
    const [battle] = await db
      .select()
      .from(workoutBattles)
      .where(and(
        eq(workoutBattles.id, battleId),
        or(
          eq(workoutBattles.creatorId, userId),
          eq(workoutBattles.opponentId, userId)
        ),
        ne(workoutBattles.status, "completed"),
        ne(workoutBattles.status, "cancelled")
      ));

    if (!battle) {
      return null;
    }

    // Update battle status
    const [updatedBattle] = await db
      .update(workoutBattles)
      .set({ status: "cancelled" })
      .where(eq(workoutBattles.id, battleId))
      .returning();

    // Send notification to all participants
    this.sendBattleStatusUpdate(updatedBattle, "battle_cancelled");

    return updatedBattle;
  }

  // Get battles for a user
  async getUserBattles(userId: number, status?: string): Promise<WorkoutBattle[]> {
    let query = db
      .select()
      .from(workoutBattles)
      .where(or(
        eq(workoutBattles.creatorId, userId),
        eq(workoutBattles.opponentId, userId)
      ));

    if (status) {
      query = query.where(eq(workoutBattles.status, status));
    }

    query = query.orderBy(desc(workoutBattles.createdAt));
    
    return await query;
  }

  // Get a specific battle by ID
  async getBattleById(battleId: number): Promise<WorkoutBattle | null> {
    const [battle] = await db
      .select()
      .from(workoutBattles)
      .where(eq(workoutBattles.id, battleId));

    return battle || null;
  }

  // Get battle performances for a specific battle
  async getBattlePerformances(battleId: number): Promise<BattlePerformance[]> {
    return await db
      .select()
      .from(battlePerformance)
      .where(eq(battlePerformance.battleId, battleId))
      .orderBy(desc(battlePerformance.reps));
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

    const [battle] = await db
      .insert(workoutBattles)
      .values(battleData)
      .returning();

    // Send quick challenge notification to nearby users
    this.broadcastQuickChallenge(battle);

    return battle;
  }

  // Broadcast quick challenge to nearby users
  async broadcastQuickChallenge(battle: WorkoutBattle) {
    const connections = getActiveConnections();
    
    // Get creator details
    const [creator] = await db
      .select({
        id: users.id,
        name: users.name,
        profilePicture: users.profilePicture,
        latitude: users.latitude,
        longitude: users.longitude
      })
      .from(users)
      .where(eq(users.id, battle.creatorId));

    if (!creator.latitude || !creator.longitude) {
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
      const [user] = await db
        .select({
          id: users.id,
          latitude: users.latitude,
          longitude: users.longitude
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user.latitude || !user.longitude) {
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

export const battleService = new BattleService();