import { db } from "../db";
import { 
  achievementBadges, 
  userAchievements, 
  workoutCheckins, 
  userStreaks,
  InsertAchievementBadge,
  InsertUserAchievement,
  InsertWorkoutCheckin,
  InsertUserStreak,
  AchievementBadge,
  UserAchievement,
  WorkoutCheckin,
  User
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";

const STREAKS = {
  FIRST_WORKOUT: { days: 1, points: 10 },
  GETTING_STARTED: { days: 3, points: 20 },
  CONSISTENCY: { days: 7, points: 50 },
  COMMITTED: { days: 14, points: 100 },
  DEDICATED: { days: 30, points: 200 },
  UNSTOPPABLE: { days: 60, points: 400 },
  LEGENDARY: { days: 100, points: 1000 },
};

// Get all achievement badges
export async function getAllAchievementBadges(): Promise<AchievementBadge[]> {
  return await db.select().from(achievementBadges);
}

// Create a new achievement badge
export async function createAchievementBadge(badge: InsertAchievementBadge): Promise<AchievementBadge> {
  const [newBadge] = await db.insert(achievementBadges).values(badge).returning();
  return newBadge;
}

// Get a user's achievements
export async function getUserAchievements(userId: number): Promise<UserAchievement[]> {
  return await db.select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
}

// Get completed achievements (with badge details)
export async function getCompletedAchievements(userId: number): Promise<(UserAchievement & AchievementBadge)[]> {
  return await db.select()
    .from(userAchievements)
    .innerJoin(achievementBadges, eq(userAchievements.badgeId, achievementBadges.id))
    .where(and(
      eq(userAchievements.userId, userId),
      eq(userAchievements.completed, true)
    ));
}

// Award an achievement to a user
export async function awardAchievement(userId: number, badgeId: number): Promise<UserAchievement> {
  // Check if user already has this achievement
  const existing = await db.select()
    .from(userAchievements)
    .where(and(
      eq(userAchievements.userId, userId),
      eq(userAchievements.badgeId, badgeId)
    ));
  
  if (existing.length > 0) {
    // Update existing achievement if not completed
    if (!existing[0].completed) {
      const [updated] = await db.update(userAchievements)
        .set({ 
          completed: true, 
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userAchievements.id, existing[0].id))
        .returning();
      return updated;
    }
    return existing[0];
  }
  
  // Create new achievement
  const [newAchievement] = await db.insert(userAchievements)
    .values({
      userId,
      badgeId,
      progress: 100, // Complete it immediately
      completed: true,
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  // Update user's total points
  const badge = await db.select().from(achievementBadges).where(eq(achievementBadges.id, badgeId));
  if (badge.length > 0) {
    await updateUserPoints(userId, badge[0].points);
  }
  
  return newAchievement;
}

// Update achievement progress
export async function updateAchievementProgress(
  userId: number, 
  badgeId: number, 
  progress: number
): Promise<UserAchievement> {
  const existing = await db.select()
    .from(userAchievements)
    .where(and(
      eq(userAchievements.userId, userId),
      eq(userAchievements.badgeId, badgeId)
    ));
  
  if (existing.length > 0) {
    // Update existing achievement
    const isNowCompleted = progress >= 100 && !existing[0].completed;
    
    const [updated] = await db.update(userAchievements)
      .set({ 
        progress: progress,
        completed: progress >= 100,
        completedAt: progress >= 100 ? new Date() : existing[0].completedAt,
        updatedAt: new Date()
      })
      .where(eq(userAchievements.id, existing[0].id))
      .returning();
    
    // Update user's points if newly completed
    if (isNowCompleted) {
      const badge = await db.select().from(achievementBadges).where(eq(achievementBadges.id, badgeId));
      if (badge.length > 0) {
        await updateUserPoints(userId, badge[0].points);
      }
    }
    
    return updated;
  }
  
  // Create new achievement
  const [newAchievement] = await db.insert(userAchievements)
    .values({
      userId,
      badgeId,
      progress,
      completed: progress >= 100,
      completedAt: progress >= 100 ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  // Update user's points if completed
  if (progress >= 100) {
    const badge = await db.select().from(achievementBadges).where(eq(achievementBadges.id, badgeId));
    if (badge.length > 0) {
      await updateUserPoints(userId, badge[0].points);
    }
  }
  
  return newAchievement;
}

// Record a workout check-in
export async function recordWorkoutCheckin(checkin: InsertWorkoutCheckin): Promise<WorkoutCheckin> {
  const [newCheckin] = await db.insert(workoutCheckins)
    .values({
      ...checkin,
      createdAt: new Date()
    })
    .returning();
  
  // Update user's streak
  await updateUserStreak(checkin.userId);
  
  // Check for achievements
  await checkForWorkoutAchievements(checkin.userId);
  
  return newCheckin;
}

// Get a user's streak information
export async function getUserStreak(userId: number): Promise<UserStreak | null> {
  const streak = await db.select()
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId));
  
  if (streak.length === 0) {
    return null;
  }
  
  return streak[0];
}

// Initialize user streak
async function initializeUserStreak(userId: number): Promise<void> {
  const existing = await db.select()
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId));
  
  if (existing.length === 0) {
    await db.insert(userStreaks)
      .values({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        weeklyWorkouts: 0,
        monthlyWorkouts: 0,
        totalWorkouts: 0,
        totalPoints: 0,
        level: 1,
        updatedAt: new Date()
      });
  }
}

// Update user streak after a workout check-in
async function updateUserStreak(userId: number): Promise<void> {
  // Make sure user has a streak record
  await initializeUserStreak(userId);
  
  // Get user's streak
  const userStreak = await getUserStreak(userId);
  if (!userStreak) return;
  
  // Get today's date (without time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get the most recent check-in
  const recentCheckins = await db.select()
    .from(workoutCheckins)
    .where(eq(workoutCheckins.userId, userId))
    .orderBy(desc(workoutCheckins.date))
    .limit(2);
  
  // Check if we already worked out today
  const todayWorkouts = recentCheckins.filter(checkin => {
    const checkinDate = new Date(checkin.date);
    checkinDate.setHours(0, 0, 0, 0);
    return checkinDate.getTime() === today.getTime();
  });
  
  // If we already worked out today, don't update streak
  if (todayWorkouts.length > 1) {
    return;
  }
  
  // Calculate new streak value
  let newStreak = userStreak.currentStreak;
  
  if (recentCheckins.length > 1) {
    const mostRecent = new Date(recentCheckins[0].date);
    mostRecent.setHours(0, 0, 0, 0);
    
    const secondMostRecent = new Date(recentCheckins[1].date);
    secondMostRecent.setHours(0, 0, 0, 0);
    
    // If most recent is today and second most recent is yesterday, increment streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (secondMostRecent.getTime() === yesterday.getTime()) {
      newStreak += 1;
    } else {
      // Reset streak if there's a gap
      newStreak = 1;
    }
  } else {
    // First workout
    newStreak = 1;
  }
  
  // Update weekly and monthly counts
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const weeklyCount = await db.select({ count: count() })
    .from(workoutCheckins)
    .where(and(
      eq(workoutCheckins.userId, userId),
      gte(workoutCheckins.date, startOfWeek),
      lte(workoutCheckins.date, today)
    ));
  
  const monthlyCount = await db.select({ count: count() })
    .from(workoutCheckins)
    .where(and(
      eq(workoutCheckins.userId, userId),
      gte(workoutCheckins.date, startOfMonth),
      lte(workoutCheckins.date, today)
    ));
  
  const totalCount = await db.select({ count: count() })
    .from(workoutCheckins)
    .where(eq(workoutCheckins.userId, userId));
  
  // Update streak
  await db.update(userStreaks)
    .set({
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, userStreak.longestStreak),
      lastCheckInDate: today,
      streakUpdatedAt: new Date(),
      weeklyWorkouts: weeklyCount[0]?.count || 0,
      monthlyWorkouts: monthlyCount[0]?.count || 0,
      totalWorkouts: totalCount[0]?.count || 0,
      updatedAt: new Date()
    })
    .where(eq(userStreaks.userId, userId));
  
  // Check for streak achievements
  if (newStreak >= STREAKS.LEGENDARY.days) {
    await checkAndAwardStreakBadge(userId, "Legendary", STREAKS.LEGENDARY.days, STREAKS.LEGENDARY.points);
  } else if (newStreak >= STREAKS.UNSTOPPABLE.days) {
    await checkAndAwardStreakBadge(userId, "Unstoppable", STREAKS.UNSTOPPABLE.days, STREAKS.UNSTOPPABLE.points);
  } else if (newStreak >= STREAKS.DEDICATED.days) {
    await checkAndAwardStreakBadge(userId, "Dedicated", STREAKS.DEDICATED.days, STREAKS.DEDICATED.points);
  } else if (newStreak >= STREAKS.COMMITTED.days) {
    await checkAndAwardStreakBadge(userId, "Committed", STREAKS.COMMITTED.days, STREAKS.COMMITTED.points);
  } else if (newStreak >= STREAKS.CONSISTENCY.days) {
    await checkAndAwardStreakBadge(userId, "Consistency King", STREAKS.CONSISTENCY.days, STREAKS.CONSISTENCY.points);
  } else if (newStreak >= STREAKS.GETTING_STARTED.days) {
    await checkAndAwardStreakBadge(userId, "Getting Started", STREAKS.GETTING_STARTED.days, STREAKS.GETTING_STARTED.points);
  } else if (newStreak >= STREAKS.FIRST_WORKOUT.days) {
    await checkAndAwardStreakBadge(userId, "First Workout", STREAKS.FIRST_WORKOUT.days, STREAKS.FIRST_WORKOUT.points);
  }
}

// Check and award a streak badge
async function checkAndAwardStreakBadge(
  userId: number, 
  badgeName: string, 
  streakDays: number,
  points: number
): Promise<void> {
  // Find the badge
  const badges = await db.select()
    .from(achievementBadges)
    .where(eq(achievementBadges.name, badgeName));
  
  // If badge doesn't exist, create it
  if (badges.length === 0) {
    const [newBadge] = await db.insert(achievementBadges)
      .values({
        name: badgeName,
        description: `Complete a ${streakDays}-day workout streak`,
        category: "streak",
        requirement: `Log workouts for ${streakDays} consecutive days`,
        icon: `streak-${streakDays}`,
        level: Math.min(Math.ceil(streakDays / 20), 5),
        points: points,
        createdAt: new Date()
      })
      .returning();
    
    // Award the badge to the user
    await awardAchievement(userId, newBadge.id);
  } else {
    // Award the existing badge
    await awardAchievement(userId, badges[0].id);
  }
}

// Check for workout-related achievements
async function checkForWorkoutAchievements(userId: number): Promise<void> {
  const totalCount = await db.select({ count: count() })
    .from(workoutCheckins)
    .where(eq(workoutCheckins.userId, userId));
  
  const workoutCount = totalCount[0]?.count || 0;
  
  // First workout
  if (workoutCount === 1) {
    await checkAndAwardWorkoutBadge(userId, "First Sweat", 1, 10);
  }
  
  // Workout milestones
  if (workoutCount >= 5) {
    await checkAndAwardWorkoutBadge(userId, "Getting Into Shape", 5, 20);
  }
  
  if (workoutCount >= 10) {
    await checkAndAwardWorkoutBadge(userId, "Dedicated Gym-Goer", 10, 30);
  }
  
  if (workoutCount >= 25) {
    await checkAndAwardWorkoutBadge(userId, "Fitness Enthusiast", 25, 50);
  }
  
  if (workoutCount >= 50) {
    await checkAndAwardWorkoutBadge(userId, "Fitness Fanatic", 50, 100);
  }
  
  if (workoutCount >= 100) {
    await checkAndAwardWorkoutBadge(userId, "Century Club", 100, 200);
  }
  
  // Check for workout variety
  const distinctWorkoutTypes = await db.select({ type: workoutCheckins.workoutType })
    .from(workoutCheckins)
    .where(eq(workoutCheckins.userId, userId))
    .groupBy(workoutCheckins.workoutType);
  
  if (distinctWorkoutTypes.length >= 3) {
    await checkAndAwardWorkoutBadge(userId, "Jack of All Trades", 3, 30);
  }
  
  if (distinctWorkoutTypes.length >= 5) {
    await checkAndAwardWorkoutBadge(userId, "Complete Athlete", 5, 50);
  }
  
  if (distinctWorkoutTypes.length >= 8) {
    await checkAndAwardWorkoutBadge(userId, "Fitness Master", 8, 100);
  }
  
  // Check for partner workouts
  const partnerWorkouts = await db.select({ count: count() })
    .from(workoutCheckins)
    .where(and(
      eq(workoutCheckins.userId, userId),
      sql`${workoutCheckins.partnerId} IS NOT NULL`
    ));
  
  if (partnerWorkouts[0]?.count >= 1) {
    await checkAndAwardWorkoutBadge(userId, "Buddy System", 1, 20);
  }
  
  if (partnerWorkouts[0]?.count >= 5) {
    await checkAndAwardWorkoutBadge(userId, "Social Lifter", 5, 40);
  }
  
  if (partnerWorkouts[0]?.count >= 20) {
    await checkAndAwardWorkoutBadge(userId, "Gym Squad Leader", 20, 100);
  }
}

// Check and award a workout badge
async function checkAndAwardWorkoutBadge(
  userId: number, 
  badgeName: string, 
  workoutCount: number,
  points: number
): Promise<void> {
  // Find the badge
  const badges = await db.select()
    .from(achievementBadges)
    .where(eq(achievementBadges.name, badgeName));
  
  // If badge doesn't exist, create it
  if (badges.length === 0) {
    const [newBadge] = await db.insert(achievementBadges)
      .values({
        name: badgeName,
        description: getBadgeDescription(badgeName, workoutCount),
        category: "workout",
        requirement: `Complete ${workoutCount} workouts`,
        icon: getIconName(badgeName),
        level: Math.min(Math.ceil(workoutCount / 20), 5),
        points: points,
        createdAt: new Date()
      })
      .returning();
    
    // Award the badge to the user
    await awardAchievement(userId, newBadge.id);
  } else {
    // Award the existing badge
    await awardAchievement(userId, badges[0].id);
  }
}

// Update user points
async function updateUserPoints(userId: number, pointsToAdd: number): Promise<void> {
  // Make sure user has a streak record
  await initializeUserStreak(userId);
  
  // Get current points
  const userStreak = await getUserStreak(userId);
  if (!userStreak) return;
  
  const newPoints = userStreak.totalPoints + pointsToAdd;
  
  // Calculate level based on points (1 level per 100 points, max level 100)
  const newLevel = Math.min(Math.floor(newPoints / 100) + 1, 100);
  const leveledUp = newLevel > userStreak.level;
  
  // Update points and level
  await db.update(userStreaks)
    .set({
      totalPoints: newPoints,
      level: newLevel,
      updatedAt: new Date()
    })
    .where(eq(userStreaks.userId, userId));
  
  // If leveled up, trigger achievement
  if (leveledUp) {
    // Level milestones
    if (newLevel >= 5) {
      await checkAndAwardLevelBadge(userId, "Beginner Gains", 5, 50);
    }
    
    if (newLevel >= 10) {
      await checkAndAwardLevelBadge(userId, "Getting Serious", 10, 100);
    }
    
    if (newLevel >= 25) {
      await checkAndAwardLevelBadge(userId, "Fitness Pro", 25, 250);
    }
    
    if (newLevel >= 50) {
      await checkAndAwardLevelBadge(userId, "Elite Athlete", 50, 500);
    }
    
    if (newLevel >= 100) {
      await checkAndAwardLevelBadge(userId, "Legendary Status", 100, 1000);
    }
  }
}

// Check and award a level badge
async function checkAndAwardLevelBadge(
  userId: number, 
  badgeName: string, 
  level: number,
  points: number
): Promise<void> {
  // Find the badge
  const badges = await db.select()
    .from(achievementBadges)
    .where(eq(achievementBadges.name, badgeName));
  
  // If badge doesn't exist, create it
  if (badges.length === 0) {
    const [newBadge] = await db.insert(achievementBadges)
      .values({
        name: badgeName,
        description: `Reached level ${level}`,
        category: "milestone",
        requirement: `Earn ${level * 100} total achievement points`,
        icon: `level-${level}`,
        level: Math.min(Math.ceil(level / 20), 5),
        points: points,
        createdAt: new Date()
      })
      .returning();
    
    // Award the badge to the user
    await awardAchievement(userId, newBadge.id);
  } else {
    // Award the existing badge
    await awardAchievement(userId, badges[0].id);
  }
}

// Helper function to get badge description
function getBadgeDescription(badgeName: string, count: number): string {
  switch(badgeName) {
    case "First Sweat":
      return "Completed your first workout";
    case "Getting Into Shape":
      return "Completed 5 workouts";
    case "Dedicated Gym-Goer":
      return "Completed 10 workouts";
    case "Fitness Enthusiast":
      return "Completed 25 workouts";
    case "Fitness Fanatic":
      return "Completed 50 workouts";
    case "Century Club":
      return "Completed 100 workouts";
    case "Jack of All Trades":
      return "Tried 3 different workout types";
    case "Complete Athlete":
      return "Mastered 5 different workout types";
    case "Fitness Master":
      return "Experienced in all workout categories";
    case "Buddy System":
      return "Completed your first workout with a partner";
    case "Social Lifter":
      return "Completed 5 workouts with partners";
    case "Gym Squad Leader":
      return "Completed 20 workouts with partners";
    default:
      return `Completed ${count} workouts`;
  }
}

// Helper function to get icon name
function getIconName(badgeName: string): string {
  // Convert badge name to kebab case for icon naming
  return badgeName.toLowerCase().replace(/\s+/g, '-');
}