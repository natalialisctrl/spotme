import { 
  User, InsertUser, WorkoutFocus, InsertWorkoutFocus, 
  ConnectionRequest, InsertConnectionRequest, Connection, 
  InsertConnection, Message, InsertMessage, CompatibilityResponse,
  InsertCompatibilityResponse, NearbyUsersParams, UpdateLocation,
  WorkoutRoutine, InsertWorkoutRoutine, ScheduledMeetup, 
  InsertScheduledMeetup, MeetupParticipant, InsertMeetupParticipant,
  Challenge, InsertChallenge, ChallengeParticipant, InsertChallengeParticipant,
  ProgressEntry, InsertProgressEntry, ChallengeComment, InsertChallengeComment
} from "@shared/schema";

// Interface for storage operations
import session from "express-session";
import createMemoryStore from "memorystore";

export interface IStorage {
  // User operations
  getAllUsers(): Promise<User[]>;
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
  
  // Workout routine operations
  createWorkoutRoutine(routine: InsertWorkoutRoutine): Promise<WorkoutRoutine>;
  getWorkoutRoutine(id: number): Promise<WorkoutRoutine | undefined>;
  getWorkoutRoutinesByUserId(userId: number): Promise<WorkoutRoutine[]>;
  getPublicWorkoutRoutines(): Promise<WorkoutRoutine[]>;
  updateWorkoutRoutine(id: number, routine: Partial<WorkoutRoutine>): Promise<WorkoutRoutine | undefined>;
  deleteWorkoutRoutine(id: number): Promise<boolean>;
  
  // Scheduled meetup operations
  createScheduledMeetup(meetup: InsertScheduledMeetup): Promise<ScheduledMeetup>;
  getScheduledMeetup(id: number): Promise<ScheduledMeetup | undefined>;
  getScheduledMeetupsByUser(userId: number): Promise<ScheduledMeetup[]>;
  getUpcomingMeetups(userId: number): Promise<ScheduledMeetup[]>;
  updateScheduledMeetup(id: number, meetup: Partial<ScheduledMeetup>): Promise<ScheduledMeetup | undefined>;
  cancelScheduledMeetup(id: number): Promise<boolean>;
  
  // Meetup participant operations
  addMeetupParticipant(participant: InsertMeetupParticipant): Promise<MeetupParticipant>;
  getMeetupParticipants(meetupId: number): Promise<MeetupParticipant[]>;
  updateParticipantStatus(id: number, status: string): Promise<MeetupParticipant | undefined>;
  removeMeetupParticipant(meetupId: number, userId: number): Promise<boolean>;

  // Friend-related operations
  getFriendIds(userId: number): Promise<number[]>;
  
  // Challenge operations
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  getChallenge(id: number): Promise<Challenge | undefined>;
  getAllChallenges(): Promise<Challenge[]>;
  getActiveChallenges(): Promise<Challenge[]>;
  getChallengesByUser(userId: number): Promise<Challenge[]>;
  getChallengesByCreatorId(userId: number): Promise<Challenge[]>;
  getChallengesByCreatorIds(userIds: number[]): Promise<Challenge[]>;
  getChallengesByIds(challengeIds: number[]): Promise<Challenge[]>;
  updateChallenge(id: number, challenge: Partial<Challenge>): Promise<Challenge | undefined>;
  updateChallengeStatus(id: number, status: string): Promise<Challenge | undefined>;
  deleteChallenge(id: number): Promise<boolean>;
  
  // Challenge participant operations
  joinChallenge(userId: number, challengeId: number): Promise<ChallengeParticipant>;
  getChallengeParticipant(id: number): Promise<ChallengeParticipant | undefined>;
  getChallengeParticipation(userId: number, challengeId: number): Promise<ChallengeParticipant | undefined>;
  getChallengeParticipantByUserAndChallenge(userId: number, challengeId: number): Promise<ChallengeParticipant | undefined>;
  getChallengeParticipants(challengeId: number): Promise<ChallengeParticipant[]>;
  getChallengeParticipationsByUserId(userId: number): Promise<ChallengeParticipant[]>;
  getUserChallenges(userId: number): Promise<ChallengeParticipant[]>;
  updateChallengeProgress(id: number, currentProgress: number): Promise<ChallengeParticipant | undefined>;
  updateChallengeParticipation(id: number, currentProgress: number, completed: boolean, completedAt: Date | null): Promise<ChallengeParticipant | undefined>;
  completeChallenge(id: number): Promise<ChallengeParticipant | undefined>;
  leaveChallenge(userId: number, challengeId: number): Promise<boolean>;
  leaveChallengeByUserId(challengeId: number, userId: number): Promise<boolean>;
  
  // Progress entry operations
  addProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry>;
  getProgressEntries(challengeParticipantId: number): Promise<ProgressEntry[]>;
  addChallengeProgress(entry: InsertProgressEntry): Promise<ProgressEntry>;
  getChallengeProgressEntries(challengeParticipantId: number): Promise<ProgressEntry[]>;
  
  // Challenge comment operations
  addChallengeComment(comment: InsertChallengeComment): Promise<ChallengeComment>;
  getChallengeComments(challengeId: number): Promise<ChallengeComment[]>;
  
  // Leaderboard operations
  getChallengeLeaderboard(challengeId: number, currentUserId?: number): Promise<{userId: number, username: string, name: string, progress: number, completed: boolean, profilePictureUrl?: string | null, isFriend?: boolean}[]>;
  getLeaderboardData(): Promise<{id: number, userId: number, username: string, name: string, avatarUrl?: string | null, points: number, rank: number}[]>;
  
  // Demo data generation
  createDemoUsers(count?: number): Promise<User[]>;
  createDemoChallenges(count?: number, creatorId?: number, friendIds?: number[]): Promise<Challenge[]>;
  
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
  private workoutRoutines: Map<number, WorkoutRoutine>;
  private scheduledMeetups: Map<number, ScheduledMeetup>;
  private meetupParticipants: Map<number, MeetupParticipant>;
  private challenges: Map<number, Challenge>;
  private challengeParticipants: Map<number, ChallengeParticipant>;
  private progressEntries: Map<number, ProgressEntry>;
  private challengeComments: Map<number, ChallengeComment>;
  
  private currentUserId: number;
  private currentWorkoutFocusId: number;
  private currentConnectionRequestId: number;
  private currentConnectionId: number;
  private currentMessageId: number;
  private currentCompatibilityResponseId: number;
  private currentWorkoutRoutineId: number;
  private currentScheduledMeetupId: number;
  private currentMeetupParticipantId: number;
  private currentChallengeId: number;
  private currentChallengeParticipantId: number;
  private currentProgressEntryId: number;
  private currentChallengeCommentId: number;

  sessionStore: any; // Using 'any' to avoid TypeScript errors

  constructor() {
    this.users = new Map();
    this.workoutFocuses = new Map();
    this.connectionRequests = new Map();
    this.connections = new Map();
    this.messages = new Map();
    this.compatibilityResponses = new Map();
    this.workoutRoutines = new Map();
    this.scheduledMeetups = new Map();
    this.meetupParticipants = new Map();
    this.challenges = new Map();
    this.challengeParticipants = new Map();
    this.progressEntries = new Map();
    this.challengeComments = new Map();
    
    this.currentUserId = 1;
    this.currentWorkoutFocusId = 1;
    this.currentConnectionRequestId = 1;
    this.currentConnectionId = 1;
    this.currentMessageId = 1;
    this.currentCompatibilityResponseId = 1;
    this.currentWorkoutRoutineId = 1;
    this.currentScheduledMeetupId = 1;
    this.currentMeetupParticipantId = 1;
    this.currentChallengeId = 1;
    this.currentChallengeParticipantId = 1;
    this.currentProgressEntryId = 1;
    this.currentChallengeCommentId = 1;
    
    // Create a memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Add natalia user directly for testing
    const nataliaUser: User = {
      id: this.currentUserId++,
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
      profilePictureUrl: null,
      firebaseUid: null,
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
      }),
      mfaEnabled: false,
      mfaVerified: false,
      mfaSecret: null,
      lastActive: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      resetPasswordExpires: null
    };
    this.users.set(nataliaUser.id, nataliaUser);
    // Removed call to initializeDemoData - this will be done through API endpoint
  }

  // Helper method to generate a nearby location within a given radius in miles
  private generateNearbyLocation(baseLat: number, baseLng: number, radiusMiles: number): { latitude: number, longitude: number } {
    // Earth's radius in miles
    const earthRadius = 3958.8;
    
    // Convert radius from miles to radians
    const radiusRadians = radiusMiles / earthRadius;
    
    // Random distance within radius (using square root for more uniform distribution)
    const distance = radiusMiles * Math.sqrt(Math.random());
    
    // Random angle
    const angle = Math.random() * 2 * Math.PI;
    
    // Convert base coordinates to radians
    const baseLatRad = this.toRadians(baseLat);
    const baseLngRad = this.toRadians(baseLng);
    
    // Calculate new position
    const newLatRad = Math.asin(
      Math.sin(baseLatRad) * Math.cos(distance / earthRadius) +
      Math.cos(baseLatRad) * Math.sin(distance / earthRadius) * Math.cos(angle)
    );
    
    const newLngRad = baseLngRad + Math.atan2(
      Math.sin(angle) * Math.sin(distance / earthRadius) * Math.cos(baseLatRad),
      Math.cos(distance / earthRadius) - Math.sin(baseLatRad) * Math.sin(newLatRad)
    );
    
    // Convert back to degrees
    const newLat = newLatRad * 180 / Math.PI;
    const newLng = newLngRad * 180 / Math.PI;
    
    return { latitude: newLat, longitude: newLng };
  }

  async createDemoUsers(count: number = 5): Promise<User[]> {
    // Austin-based coordinates (for Natalia's default location)
    const baseLatitude = 30.2267;
    const baseLongitude = -97.7476;
    
    // First create our primary user
    const nataliaUser: InsertUser = {
      username: "natalia",
      password: "liscr12",
      email: "natalia@spotme.com",
      name: "Natalia Liscio",
      gender: "female",
      experienceLevel: "intermediate",
      experienceYears: 5,
      bio: "Certified personal trainer who loves connecting with fitness enthusiasts",
      gymName: "FitZone Gym",
      latitude: baseLatitude,  // Austin-based location
      longitude: baseLongitude,
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
    this.createUser(nataliaUser);
    
    // Define the rest of the demo users without specific locations
    const otherUsers = [
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

    // Create each user with a random location near base coordinates
    otherUsers.forEach(user => {
      // Generate location within 0.5-3 miles of the base location
      const nearbyLocation = this.generateNearbyLocation(baseLatitude, baseLongitude, 2);
      
      // Create the user with nearby location
      this.createUser({
        ...user,
        latitude: nearbyLocation.latitude,
        longitude: nearbyLocation.longitude
      });
    });
  }

  // User operations
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
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

  // Workout routine operations
  async createWorkoutRoutine(routine: InsertWorkoutRoutine): Promise<WorkoutRoutine> {
    const id = this.currentWorkoutRoutineId++;
    const newRoutine: WorkoutRoutine = { 
      ...routine, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workoutRoutines.set(id, newRoutine);
    return newRoutine;
  }

  async getWorkoutRoutine(id: number): Promise<WorkoutRoutine | undefined> {
    return this.workoutRoutines.get(id);
  }

  async getWorkoutRoutinesByUserId(userId: number): Promise<WorkoutRoutine[]> {
    return Array.from(this.workoutRoutines.values())
      .filter(routine => routine.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getPublicWorkoutRoutines(): Promise<WorkoutRoutine[]> {
    return Array.from(this.workoutRoutines.values())
      .filter(routine => routine.isPublic)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateWorkoutRoutine(id: number, routineData: Partial<WorkoutRoutine>): Promise<WorkoutRoutine | undefined> {
    const routine = this.workoutRoutines.get(id);
    if (!routine) return undefined;
    
    const updatedRoutine = { 
      ...routine, 
      ...routineData,
      updatedAt: new Date()
    };
    this.workoutRoutines.set(id, updatedRoutine);
    return updatedRoutine;
  }

  async deleteWorkoutRoutine(id: number): Promise<boolean> {
    return this.workoutRoutines.delete(id);
  }

  // Scheduled meetup operations
  async createScheduledMeetup(meetup: InsertScheduledMeetup): Promise<ScheduledMeetup> {
    const id = this.currentScheduledMeetupId++;
    const newMeetup: ScheduledMeetup = { 
      ...meetup, 
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'scheduled' 
    };
    this.scheduledMeetups.set(id, newMeetup);
    return newMeetup;
  }

  async getScheduledMeetup(id: number): Promise<ScheduledMeetup | undefined> {
    return this.scheduledMeetups.get(id);
  }

  async getScheduledMeetupsByUser(userId: number): Promise<ScheduledMeetup[]> {
    // Get all meetups created by this user
    const userMeetups = Array.from(this.scheduledMeetups.values())
      .filter(meetup => meetup.creatorId === userId);
    
    // Get meetup IDs where this user is a participant
    const participantMeetupIds = Array.from(this.meetupParticipants.values())
      .filter(participant => participant.userId === userId)
      .map(participant => participant.meetupId);
    
    // Get those meetups
    const participatingMeetups = participantMeetupIds
      .map(meetupId => this.scheduledMeetups.get(meetupId))
      .filter(Boolean) as ScheduledMeetup[];
    
    // Combine both arrays, removing duplicates
    const allMeetups = [...userMeetups];
    for (const meetup of participatingMeetups) {
      if (!allMeetups.some(m => m.id === meetup.id)) {
        allMeetups.push(meetup);
      }
    }
    
    return allMeetups.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getUpcomingMeetups(userId: number): Promise<ScheduledMeetup[]> {
    const now = new Date();
    const allMeetups = await this.getScheduledMeetupsByUser(userId);
    
    return allMeetups
      .filter(meetup => {
        // Convert string date to Date object if needed
        const meetupDate = typeof meetup.date === 'string' ? new Date(meetup.date) : meetup.date;
        return meetupDate >= now && meetup.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
        const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
        return dateA.getTime() - dateB.getTime();
      });
  }

  async updateScheduledMeetup(id: number, meetupData: Partial<ScheduledMeetup>): Promise<ScheduledMeetup | undefined> {
    const meetup = this.scheduledMeetups.get(id);
    if (!meetup) return undefined;
    
    const updatedMeetup = { 
      ...meetup, 
      ...meetupData,
      updatedAt: new Date()
    };
    this.scheduledMeetups.set(id, updatedMeetup);
    return updatedMeetup;
  }

  async cancelScheduledMeetup(id: number): Promise<boolean> {
    const meetup = this.scheduledMeetups.get(id);
    if (!meetup) return false;
    
    meetup.status = 'cancelled';
    meetup.updatedAt = new Date();
    this.scheduledMeetups.set(id, meetup);
    return true;
  }

  // Meetup participant operations
  async addMeetupParticipant(participant: InsertMeetupParticipant): Promise<MeetupParticipant> {
    const id = this.currentMeetupParticipantId++;
    const newParticipant: MeetupParticipant = { 
      ...participant, 
      id,
      status: participant.status || 'pending',
      joinedAt: new Date()
    };
    this.meetupParticipants.set(id, newParticipant);
    return newParticipant;
  }

  async getMeetupParticipants(meetupId: number): Promise<MeetupParticipant[]> {
    return Array.from(this.meetupParticipants.values())
      .filter(participant => participant.meetupId === meetupId);
  }

  async updateParticipantStatus(id: number, status: string): Promise<MeetupParticipant | undefined> {
    const participant = this.meetupParticipants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = { ...participant, status };
    this.meetupParticipants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async removeMeetupParticipant(meetupId: number, userId: number): Promise<boolean> {
    for (const [id, participant] of this.meetupParticipants.entries()) {
      if (participant.meetupId === meetupId && participant.userId === userId) {
        this.meetupParticipants.delete(id);
        return true;
      }
    }
    return false;
  }
  
  // Friend-related operations
  async getFriendIds(userId: number): Promise<number[]> {
    const friendIds: number[] = [];
    
    // Check connections where the user is either user1Id or user2Id
    for (const connection of this.connections.values()) {
      if (connection.user1Id === userId) {
        friendIds.push(connection.user2Id);
      } else if (connection.user2Id === userId) {
        friendIds.push(connection.user1Id);
      }
    }
    
    return friendIds;
  }
  
  // Challenge operations
  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const id = this.currentChallengeId++;
    const now = new Date();
    
    // Convert Date objects to strings for startDate and endDate if they're not already strings
    const startDate = typeof challenge.startDate === 'string' ? 
      challenge.startDate : 
      challenge.startDate.toISOString().split('T')[0];
      
    const endDate = typeof challenge.endDate === 'string' ? 
      challenge.endDate : 
      challenge.endDate.toISOString().split('T')[0];
    
    const newChallenge: Challenge = {
      ...challenge,
      id,
      startDate,
      endDate,
      createdAt: now,
      updatedAt: now,
      status: challenge.status || "active",
      isPublic: challenge.isPublic === undefined ? true : challenge.isPublic,
      imageUrl: challenge.imageUrl || null
    };
    
    this.challenges.set(id, newChallenge);
    return newChallenge;
  }
  
  async getChallenge(id: number): Promise<Challenge | undefined> {
    return this.challenges.get(id);
  }
  
  async getAllChallenges(): Promise<Challenge[]> {
    return Array.from(this.challenges.values());
  }
  
  async getActiveChallenges(): Promise<Challenge[]> {
    return Array.from(this.challenges.values())
      .filter(challenge => challenge.status === "active");
  }
  
  async getChallengesByUser(userId: number): Promise<Challenge[]> {
    return Array.from(this.challenges.values())
      .filter(challenge => challenge.creatorId === userId);
  }
  
  async getChallengesByCreatorId(userId: number): Promise<Challenge[]> {
    return Array.from(this.challenges.values())
      .filter(challenge => challenge.creatorId === userId);
  }
  
  async getChallengesByCreatorIds(userIds: number[]): Promise<Challenge[]> {
    return Array.from(this.challenges.values())
      .filter(challenge => userIds.includes(challenge.creatorId));
  }
  
  async getChallengesByIds(challengeIds: number[]): Promise<Challenge[]> {
    return Array.from(this.challenges.values())
      .filter(challenge => challengeIds.includes(challenge.id));
  }
  
  async updateChallenge(id: number, challenge: Partial<Challenge>): Promise<Challenge | undefined> {
    const existingChallenge = this.challenges.get(id);
    if (!existingChallenge) return undefined;
    
    const updatedChallenge = {
      ...existingChallenge,
      ...challenge,
      updatedAt: new Date()
    };
    
    this.challenges.set(id, updatedChallenge);
    return updatedChallenge;
  }
  
  async updateChallengeStatus(id: number, status: string): Promise<Challenge | undefined> {
    const challenge = this.challenges.get(id);
    if (!challenge) return undefined;
    
    const updatedChallenge = {
      ...challenge,
      status,
      updatedAt: new Date()
    };
    
    this.challenges.set(id, updatedChallenge);
    return updatedChallenge;
  }
  
  async deleteChallenge(id: number): Promise<boolean> {
    return this.challenges.delete(id);
  }
  
  // Challenge participant operations
  async joinChallenge(userId: number, challengeId: number): Promise<ChallengeParticipant> {
    const participant: InsertChallengeParticipant = {
      userId,
      challengeId,
      joinedAt: new Date(),
      currentProgress: 0,
      completed: false,
      completedAt: null
    };
    
    const id = this.currentChallengeParticipantId++;
    
    const newParticipant: ChallengeParticipant = {
      ...participant,
      id
    };
    
    this.challengeParticipants.set(id, newParticipant);
    return newParticipant;
  }
  
  async getChallengeParticipation(userId: number, challengeId: number): Promise<ChallengeParticipant | undefined> {
    for (const participant of this.challengeParticipants.values()) {
      if (participant.userId === userId && participant.challengeId === challengeId) {
        return participant;
      }
    }
    return undefined;
  }
  
  async getChallengeParticipationsByUserId(userId: number): Promise<ChallengeParticipant[]> {
    return Array.from(this.challengeParticipants.values())
      .filter(participant => participant.userId === userId);
  }
  
  async leaveChallenge(userId: number, challengeId: number): Promise<boolean> {
    return this.leaveChallengeByUserId(challengeId, userId);
  }
  
  async getChallengeParticipant(id: number): Promise<ChallengeParticipant | undefined> {
    return this.challengeParticipants.get(id);
  }
  
  async getChallengeParticipantByUserAndChallenge(userId: number, challengeId: number): Promise<ChallengeParticipant | undefined> {
    for (const participant of this.challengeParticipants.values()) {
      if (participant.userId === userId && participant.challengeId === challengeId) {
        return participant;
      }
    }
    return undefined;
  }
  
  async getChallengeParticipants(challengeId: number): Promise<ChallengeParticipant[]> {
    return Array.from(this.challengeParticipants.values())
      .filter(participant => participant.challengeId === challengeId);
  }
  
  async getUserChallenges(userId: number): Promise<ChallengeParticipant[]> {
    return Array.from(this.challengeParticipants.values())
      .filter(participant => participant.userId === userId);
  }
  
  async updateChallengeProgress(id: number, currentProgress: number): Promise<ChallengeParticipant | undefined> {
    const participant = this.challengeParticipants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = {
      ...participant,
      currentProgress,
      updatedAt: new Date()
    };
    
    this.challengeParticipants.set(id, updatedParticipant);
    return updatedParticipant;
  }
  
  async updateChallengeParticipation(
    id: number, 
    currentProgress: number, 
    completed: boolean, 
    completedAt: Date | null
  ): Promise<ChallengeParticipant | undefined> {
    const participant = this.challengeParticipants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = {
      ...participant,
      currentProgress,
      completed,
      completedAt,
      updatedAt: new Date()
    };
    
    this.challengeParticipants.set(id, updatedParticipant);
    return updatedParticipant;
  }
  
  async addChallengeProgress(entry: InsertProgressEntry): Promise<ProgressEntry> {
    return this.addProgressEntry(entry);
  }
  
  async getChallengeProgressEntries(challengeParticipantId: number): Promise<ProgressEntry[]> {
    return this.getProgressEntries(challengeParticipantId);
  }
  
  async completeChallenge(id: number): Promise<ChallengeParticipant | undefined> {
    const participant = this.challengeParticipants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = {
      ...participant,
      completed: true,
      completedAt: new Date(),
      updatedAt: new Date()
    };
    
    this.challengeParticipants.set(id, updatedParticipant);
    return updatedParticipant;
  }
  
  async leaveChallengeByUserId(challengeId: number, userId: number): Promise<boolean> {
    for (const [id, participant] of this.challengeParticipants.entries()) {
      if (participant.challengeId === challengeId && participant.userId === userId) {
        this.challengeParticipants.delete(id);
        return true;
      }
    }
    return false;
  }
  
  // Progress entry operations
  async addProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry> {
    const id = this.currentProgressEntryId++;
    const now = new Date();
    
    const newEntry: ProgressEntry = {
      ...entry,
      id,
      createdAt: now
    };
    
    this.progressEntries.set(id, newEntry);
    
    // Update the participant's current progress
    const participant = await this.getChallengeParticipant(entry.challengeParticipantId);
    if (participant) {
      const allEntries = await this.getProgressEntries(entry.challengeParticipantId);
      const totalProgress = allEntries.reduce((sum, e) => sum + e.value, 0);
      
      await this.updateChallengeProgress(participant.id, totalProgress);
      
      // Check if the challenge is completed
      const challenge = await this.getChallenge(participant.challengeId);
      if (challenge && totalProgress >= challenge.goalValue && !participant.completed) {
        await this.completeChallenge(participant.id);
      }
    }
    
    return newEntry;
  }
  
  async getProgressEntries(challengeParticipantId: number): Promise<ProgressEntry[]> {
    return Array.from(this.progressEntries.values())
      .filter(entry => entry.challengeParticipantId === challengeParticipantId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  // Challenge comment operations
  async addChallengeComment(comment: InsertChallengeComment): Promise<ChallengeComment> {
    const id = this.currentChallengeCommentId++;
    const now = new Date();
    
    const newComment: ChallengeComment = {
      ...comment,
      id,
      createdAt: now
    };
    
    this.challengeComments.set(id, newComment);
    return newComment;
  }
  
  async getChallengeComments(challengeId: number): Promise<ChallengeComment[]> {
    return Array.from(this.challengeComments.values())
      .filter(comment => comment.challengeId === challengeId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  // Leaderboard operations
  async getChallengeLeaderboard(
    challengeId: number, 
    currentUserId?: number
  ): Promise<{userId: number, username: string, name: string, progress: number, completed: boolean, profilePictureUrl?: string | null, isFriend?: boolean}[]> {
    const participants = await this.getChallengeParticipants(challengeId);
    
    // Get friend IDs if the current user ID is provided
    let friendIds: number[] = [];
    if (currentUserId) {
      friendIds = await this.getFriendIds(currentUserId);
    }
    
    const leaderboardData = await Promise.all(
      participants.map(async (participant) => {
        const user = await this.getUser(participant.userId);
        if (!user) return null;
        
        // Check if the participant is a friend of the current user
        const isFriend = currentUserId && friendIds.includes(participant.userId);
        
        return {
          userId: participant.userId,
          username: user.username,
          name: user.name,
          progress: participant.currentProgress || 0,
          completed: participant.completed || false,
          profilePictureUrl: user.profilePictureUrl,
          isFriend: !!isFriend
        };
      })
    );
    
    // Sort by progress (highest first) and filter out nulls
    return leaderboardData
      .filter(entry => entry !== null)
      .sort((a, b) => {
        if (a && b) {
          return (b.progress || 0) - (a.progress || 0);
        }
        return 0;
      });
  }
  
  // Demo data generation
  async createDemoUsers(count: number = 5): Promise<User[]> {
    const demoUsers: User[] = [];
    
    const experienceLevels = ['beginner', 'intermediate', 'advanced'];
    const genders = ['male', 'female', 'non-binary'];
    
    for (let i = 0; i < count; i++) {
      const username = `demouser${this.currentUserId}`;
      const user = await this.createUser({
        username,
        password: 'Password123!',
        email: `${username}@example.com`,
        name: `Demo User ${this.currentUserId}`,
        gender: genders[Math.floor(Math.random() * genders.length)],
        experienceLevel: experienceLevels[Math.floor(Math.random() * experienceLevels.length)],
        experienceYears: Math.floor(Math.random() * 5) + 1,
        bio: `I'm a demo user with ID ${this.currentUserId}`,
        aiGeneratedInsights: JSON.stringify({
          workoutStyle: "Regular",
          motivationTips: ["Stay consistent", "Focus on form"],
          recommendedGoals: ["Build strength", "Improve endurance"],
          partnerPreferences: "Prefers partners with similar experience level"
        })
      });
      
      demoUsers.push(user);
    }
    
    return demoUsers;
  }
  
  async createDemoChallenges(count: number = 3, creatorId: number, friendIds: number[] = []): Promise<Challenge[]> {
    const demoChallenges: Challenge[] = [];
    const goalTypes = ['reps', 'weight', 'distance', 'duration', 'frequency'];
    const exerciseNames = [
      'Push-ups', 'Pull-ups', 'Squats', 'Deadlifts', 'Bench Press', 
      'Lunges', 'Planks', 'Burpees', 'Running', 'Cycling'
    ];
    
    // Create challenges by the current user
    for (let i = 0; i < count; i++) {
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 28);
      
      const goalType = goalTypes[Math.floor(Math.random() * goalTypes.length)];
      const targetExercise = exerciseNames[Math.floor(Math.random() * exerciseNames.length)];
      
      const challenge = await this.createChallenge({
        name: `Demo Challenge ${i + 1}`,
        description: `This is a demo challenge for ${targetExercise}. Try to complete it by the end date!`,
        creatorId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        goalType,
        goalValue: Math.floor(Math.random() * 100) + 50,
        targetExercise,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
        status: 'active'
      });
      
      demoChallenges.push(challenge);
      
      // Add the creator as a participant
      await this.joinChallenge(creatorId, challenge.id);
      
      // Randomly add some friends as participants
      if (friendIds.length > 0) {
        const participantCount = Math.min(friendIds.length, Math.floor(Math.random() * 3) + 1);
        
        for (let j = 0; j < participantCount; j++) {
          const friendId = friendIds[j];
          await this.joinChallenge(friendId, challenge.id);
          
          // Add some random progress for each friend
          const participation = await this.getChallengeParticipation(friendId, challenge.id);
          if (participation) {
            const progressValue = Math.floor(Math.random() * (challenge.goalValue * 0.8));
            
            await this.addChallengeProgress({
              challengeParticipantId: participation.id,
              value: progressValue,
              notes: `Demo progress for ${targetExercise}`,
              proofImageUrl: null,
              createdAt: new Date()
            });
            
            // Add some comments
            await this.addChallengeComment({
              challengeId: challenge.id,
              userId: friendId,
              content: `This is a great challenge! I'm at ${progressValue} ${goalType} so far.`,
              createdAt: new Date()
            });
          }
        }
      }
    }
    
    // If there are friends, also create some challenges by friends
    if (friendIds.length > 0 && count > 1) {
      const friendCreatorId = friendIds[0];
      
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 25);
      
      const goalType = goalTypes[Math.floor(Math.random() * goalTypes.length)];
      const targetExercise = exerciseNames[Math.floor(Math.random() * exerciseNames.length)];
      
      const challenge = await this.createChallenge({
        name: `Friend's Challenge`,
        description: `This challenge was created by your friend. Can you complete it?`,
        creatorId: friendCreatorId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        goalType,
        goalValue: Math.floor(Math.random() * 100) + 50,
        targetExercise,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
        status: 'active'
      });
      
      demoChallenges.push(challenge);
      
      // Add the friend creator as a participant
      await this.joinChallenge(friendCreatorId, challenge.id);
      
      // Add the main user as a participant
      await this.joinChallenge(creatorId, challenge.id);
    }
    
    return demoChallenges;
  }
}

export const storage = new MemStorage();
