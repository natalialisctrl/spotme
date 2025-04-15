import { 
  User, InsertUser, WorkoutFocus, InsertWorkoutFocus, 
  ConnectionRequest, InsertConnectionRequest, Connection, 
  InsertConnection, Message, InsertMessage, CompatibilityResponse,
  InsertCompatibilityResponse, NearbyUsersParams, UpdateLocation
} from "@shared/schema";

// Interface for storage operations
import session from "express-session";
import createMemoryStore from "memorystore";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserLocation(id: number, location: UpdateLocation): Promise<User | undefined>;
  
  // Social media verification operations
  linkSocialAccount(userId: number, provider: string, firebaseUid: string): Promise<User | undefined>;
  
  // Workout focus operations
  getWorkoutFocus(userId: number): Promise<WorkoutFocus | undefined>;
  setWorkoutFocus(workoutFocus: InsertWorkoutFocus): Promise<WorkoutFocus>;
  
  // Connection request operations
  createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest>;
  getConnectionRequest(id: number): Promise<ConnectionRequest | undefined>;
  getConnectionRequestsBySender(senderId: number): Promise<ConnectionRequest[]>;
  getConnectionRequestsByReceiver(receiverId: number): Promise<ConnectionRequest[]>;
  updateConnectionRequestStatus(id: number, status: string): Promise<ConnectionRequest | undefined>;
  
  // Connection operations
  createConnection(connection: InsertConnection): Promise<Connection>;
  getConnection(id: number): Promise<Connection | undefined>;
  getConnectionsByUserId(userId: number): Promise<Connection[]>;
  getConnectionBetweenUsers(user1Id: number, user2Id: number): Promise<Connection | undefined>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConnectionId(connectionId: number): Promise<Message[]>;
  markMessagesAsRead(connectionId: number, userId: number): Promise<void>;
  
  // Compatibility operations
  saveCompatibilityResponses(responses: InsertCompatibilityResponse): Promise<CompatibilityResponse>;
  getCompatibilityResponses(userId: number): Promise<CompatibilityResponse | undefined>;
  
  // Find nearby users
  findNearbyUsers(params: NearbyUsersParams): Promise<User[]>;
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
  
  // Session storage
  sessionStore: any; // Using 'any' to avoid TypeScript errors with SessionStore
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workoutFocuses: Map<number, WorkoutFocus>;
  private connectionRequests: Map<number, ConnectionRequest>;
  private connections: Map<number, Connection>;
  private messages: Map<number, Message>;
  private compatibilityResponses: Map<number, CompatibilityResponse>;
  
  private currentUserId: number;
  private currentWorkoutFocusId: number;
  private currentConnectionRequestId: number;
  private currentConnectionId: number;
  private currentMessageId: number;
  private currentCompatibilityResponseId: number;

  sessionStore: any; // Using 'any' to avoid TypeScript errors

  constructor() {
    this.users = new Map();
    this.workoutFocuses = new Map();
    this.connectionRequests = new Map();
    this.connections = new Map();
    this.messages = new Map();
    this.compatibilityResponses = new Map();
    
    this.currentUserId = 1;
    this.currentWorkoutFocusId = 1;
    this.currentConnectionRequestId = 1;
    this.currentConnectionId = 1;
    this.currentMessageId = 1;
    this.currentCompatibilityResponseId = 1;
    
    // Create a memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Add some demo users for testing
    this.createDemoUsers();
  }

  private createDemoUsers() {
    const demoUsers: InsertUser[] = [
      {
        username: "natalia",
        password: "liscr12",
        email: "natalia@spotme.com",
        name: "Natalia Trainer",
        gender: "female",
        experienceLevel: "advanced",
        experienceYears: 5,
        bio: "Certified personal trainer who loves connecting with fitness enthusiasts",
        gymName: "FitZone Gym",
        latitude: 37.7749,
        longitude: -122.4194,
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
      },
      {
        username: "newuser",
        password: "password123",
        email: "newuser@spotme.com",
        name: "New User",
        gender: "non-binary",
        experienceLevel: "beginner",
        experienceYears: 0,
        bio: "Just starting my fitness journey and looking for guidance",
        gymName: "Community Fitness Center",
        latitude: 37.7650,
        longitude: -122.4230,
        aiGeneratedInsights: null
      },
      {
        username: "sarah_fit",
        password: "password123",
        email: "sarah@example.com",
        name: "Sarah Johnson",
        gender: "female",
        experienceLevel: "intermediate",
        experienceYears: 4,
        bio: "Love challenging workouts and helping others reach their goals",
        gymName: "FitZone Gym",
        latitude: 37.775,
        longitude: -122.42,
        aiGeneratedInsights: JSON.stringify({
          workoutStyle: "balanced",
          motivationTips: [
            "Create a reward system for hitting targets",
            "Mix up routine to avoid plateaus",
            "Find a workout buddy for accountability"
          ],
          recommendedGoals: [
            "Increase overall strength",
            "Improve endurance for longer workouts",
            "Maintain consistent schedule"
          ],
          partnerPreferences: "Seeking someone who values consistency and balanced approach to fitness"
        })
      },
      {
        username: "mike_power",
        password: "password123",
        email: "mike@example.com",
        name: "Mike Power",
        gender: "male",
        experienceLevel: "advanced",
        experienceYears: 7,
        bio: "Powerlifting enthusiast looking to help beginners and intermediates",
        gymName: "Strength Central",
        latitude: 37.77,
        longitude: -122.41,
        aiGeneratedInsights: JSON.stringify({
          workoutStyle: "high intensity",
          motivationTips: [
            "Track personal records for motivation",
            "Compete with yourself, not others",
            "Visualize success before each set"
          ],
          recommendedGoals: [
            "Increase max lifts by 10%",
            "Perfect form on compound movements",
            "Add muscle mass while maintaining mobility"
          ],
          partnerPreferences: "Looking for dedicated partners who want to push their limits"
        })
      },
      {
        username: "yoga_lisa",
        password: "password123",
        email: "lisa@example.com",
        name: "Lisa Chen",
        gender: "female",
        experienceLevel: "beginner",
        experienceYears: 1,
        bio: "Just getting started with fitness after years of yoga practice",
        gymName: "Wellness Studio",
        latitude: 37.78,
        longitude: -122.43,
        aiGeneratedInsights: JSON.stringify({
          workoutStyle: "methodical",
          motivationTips: [
            "Focus on form over intensity",
            "Celebrate small improvements",
            "Use mind-body connection during workouts"
          ],
          recommendedGoals: [
            "Build foundation of strength",
            "Improve flexibility while gaining muscle",
            "Learn proper technique for all major exercises"
          ],
          partnerPreferences: "Seeking patient partners who value proper form and mindful approach"
        })
      },
      {
        username: "fitness_carlos",
        password: "password123",
        email: "carlos@example.com",
        name: "Carlos Rodriguez",
        gender: "male",
        experienceLevel: "intermediate",
        experienceYears: 3,
        bio: "Fitness should be fun! Looking for workout buddies who enjoy social training",
        gymName: "FitZone Gym",
        latitude: 37.773,
        longitude: -122.415,
        aiGeneratedInsights: JSON.stringify({
          workoutStyle: "social",
          motivationTips: [
            "Make workouts a social event",
            "Use group classes for motivation",
            "Share goals with friends for accountability"
          ],
          recommendedGoals: [
            "Try a new group fitness class each month",
            "Improve overall fitness while having fun",
            "Build a supportive fitness community"
          ],
          partnerPreferences: "Looking for partners who believe workouts should be effective AND enjoyable"
        })
      }
    ];

    demoUsers.forEach(user => this.createUser(user));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      console.warn(`User with ID ${id} not found in memory storage`);
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.firebaseUid === firebaseUid) {
        return user;
      }
    }
    return undefined;
  }

  async linkSocialAccount(userId: number, provider: string, firebaseUid: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updates: Partial<User> = { firebaseUid };
    
    // Set the appropriate verification flag based on the provider
    if (provider === 'google') {
      updates.googleVerified = true;
    } else if (provider === 'facebook') {
      updates.facebookVerified = true;
    } else if (provider === 'instagram') {
      updates.instagramVerified = true;
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    // Initialize with default values for new fields
    const newUser: User = { 
      ...user, 
      id, 
      lastActive: new Date(),
      aiGeneratedInsights: user.aiGeneratedInsights || null,
      latitude: user.latitude || null,
      longitude: user.longitude || null,
      bio: user.bio || null,
      gymName: user.gymName || null,
      firebaseUid: user.firebaseUid || null,
      googleVerified: user.googleVerified || false,
      facebookVerified: user.facebookVerified || false,
      instagramVerified: user.instagramVerified || false
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      console.warn(`Attempted to update non-existent user with ID ${id}`);
      return undefined;
    }
    
    // Log the update operation
    console.log(`Updating user ${id}:`, {
      beforeUpdate: {
        name: user.name,
        email: user.email,
        hasInsights: !!user.aiGeneratedInsights,
        insightsLength: user.aiGeneratedInsights?.length || 0
      },
      updateData: {
        name: userData.name,
        email: userData.email,
        hasNewInsights: !!userData.aiGeneratedInsights,
        newInsightsLength: userData.aiGeneratedInsights?.length || 0
      }
    });
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    
    // Verify the update was successful
    const verifyUser = this.users.get(id);
    console.log(`User ${id} after update:`, {
      updateSuccess: !!verifyUser,
      name: verifyUser?.name,
      email: verifyUser?.email,
      hasInsights: !!verifyUser?.aiGeneratedInsights,
      insightsLength: verifyUser?.aiGeneratedInsights?.length || 0,
      dataMatches: verifyUser?.aiGeneratedInsights === userData.aiGeneratedInsights
    });
    
    return updatedUser;
  }

  async updateUserLocation(id: number, location: UpdateLocation): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      latitude: location.latitude, 
      longitude: location.longitude,
      lastActive: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Workout focus operations
  async getWorkoutFocus(userId: number): Promise<WorkoutFocus | undefined> {
    for (const focus of this.workoutFocuses.values()) {
      // Find the most recent workout focus for today
      if (focus.userId === userId && 
          focus.date.toDateString() === new Date().toDateString()) {
        return focus;
      }
    }
    return undefined;
  }

  async setWorkoutFocus(workoutFocus: InsertWorkoutFocus): Promise<WorkoutFocus> {
    const id = this.currentWorkoutFocusId++;
    const newWorkoutFocus: WorkoutFocus = { ...workoutFocus, id };
    this.workoutFocuses.set(id, newWorkoutFocus);
    return newWorkoutFocus;
  }

  // Connection request operations
  async createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest> {
    const id = this.currentConnectionRequestId++;
    const newRequest: ConnectionRequest = { ...request, id };
    this.connectionRequests.set(id, newRequest);
    return newRequest;
  }

  async getConnectionRequest(id: number): Promise<ConnectionRequest | undefined> {
    return this.connectionRequests.get(id);
  }

  async getConnectionRequestsBySender(senderId: number): Promise<ConnectionRequest[]> {
    return Array.from(this.connectionRequests.values())
      .filter(request => request.senderId === senderId);
  }

  async getConnectionRequestsByReceiver(receiverId: number): Promise<ConnectionRequest[]> {
    return Array.from(this.connectionRequests.values())
      .filter(request => request.receiverId === receiverId);
  }

  async updateConnectionRequestStatus(id: number, status: string): Promise<ConnectionRequest | undefined> {
    const request = this.connectionRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { ...request, status };
    this.connectionRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  // Connection operations
  async createConnection(connection: InsertConnection): Promise<Connection> {
    const id = this.currentConnectionId++;
    const newConnection: Connection = { ...connection, id };
    this.connections.set(id, newConnection);
    return newConnection;
  }

  async getConnection(id: number): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async getConnectionsByUserId(userId: number): Promise<Connection[]> {
    return Array.from(this.connections.values())
      .filter(connection => connection.user1Id === userId || connection.user2Id === userId);
  }

  async getConnectionBetweenUsers(user1Id: number, user2Id: number): Promise<Connection | undefined> {
    for (const connection of this.connections.values()) {
      if ((connection.user1Id === user1Id && connection.user2Id === user2Id) ||
          (connection.user1Id === user2Id && connection.user2Id === user1Id)) {
        return connection;
      }
    }
    return undefined;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const newMessage: Message = { ...message, id };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async getMessagesByConnectionId(connectionId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.connectionId === connectionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async markMessagesAsRead(connectionId: number, userId: number): Promise<void> {
    for (const [id, message] of this.messages.entries()) {
      if (message.connectionId === connectionId && message.senderId !== userId && !message.read) {
        this.messages.set(id, { ...message, read: true });
      }
    }
  }

  // Compatibility operations
  async saveCompatibilityResponses(responses: InsertCompatibilityResponse): Promise<CompatibilityResponse> {
    const id = this.currentCompatibilityResponseId++;
    const newResponses: CompatibilityResponse = { ...responses, id };
    this.compatibilityResponses.set(id, newResponses);
    return newResponses;
  }

  async getCompatibilityResponses(userId: number): Promise<CompatibilityResponse | undefined> {
    for (const response of this.compatibilityResponses.values()) {
      if (response.userId === userId) {
        return response;
      }
    }
    return undefined;
  }

  // Find nearby users
  async findNearbyUsers(params: NearbyUsersParams): Promise<User[]> {
    const { latitude, longitude, workoutType, gender, experienceLevel, maxDistance, sameGymOnly } = params;
    const activeUsers = Array.from(this.users.values())
      .filter(user => user.latitude && user.longitude); // Only users with location data
    
    const nearbyUsers = activeUsers.filter(user => {
      // Skip if user doesn't have location
      if (!user.latitude || !user.longitude) return false;
      
      // Calculate distance
      const distance = this.calculateDistance(
        latitude, longitude,
        user.latitude, user.longitude
      );
      
      // Filter by distance
      if (distance > maxDistance) return false;
      
      // Filter by same gym if requested
      if (sameGymOnly) {
        const currentUser = activeUsers.find(u => 
          u.latitude === latitude && u.longitude === longitude
        );
        if (!currentUser || user.gymName !== currentUser.gymName) return false;
      }
      
      // Filter by gender if specified
      if (gender && user.gender !== gender) return false;
      
      // Filter by experience level if specified
      if (experienceLevel && user.experienceLevel !== experienceLevel) return false;
      
      // Filter by workout type
      if (workoutType) {
        const userWorkoutFocus = Array.from(this.workoutFocuses.values())
          .find(focus => 
            focus.userId === user.id && 
            focus.date.toDateString() === new Date().toDateString()
          );
        
        if (!userWorkoutFocus || userWorkoutFocus.workoutType !== workoutType) return false;
      }
      
      return true;
    });
    
    // Sort results by distance
    nearbyUsers.sort((a, b) => {
      const distA = this.calculateDistance(
        latitude, longitude,
        a.latitude!, a.longitude!
      );
      const distB = this.calculateDistance(
        latitude, longitude,
        b.latitude!, b.longitude!
      );
      return distA - distB;
    });
    
    return nearbyUsers;
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // Earth's radius in miles
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

  private toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }
}

export const storage = new MemStorage();
