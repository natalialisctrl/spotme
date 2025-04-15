import { User } from "@shared/schema";
import { PersonalityInsight } from "./openai";

/**
 * Calculate compatibility score between current user and potential partner
 * based on their AI-generated insights and profile data
 * 
 * @param currentUser The logged in user
 * @param potentialPartner The potential workout partner
 * @returns A compatibility score between 0-100
 */
export function calculateCompatibilityScore(
  currentUser: User,
  potentialPartner: User
): number {
  // Return a basic score if either user doesn't have AI insights
  if (!currentUser.aiGeneratedInsights || !potentialPartner.aiGeneratedInsights) {
    return calculateBasicCompatibilityScore(currentUser, potentialPartner);
  }

  try {
    // Parse AI insights for both users
    const currentUserInsights: PersonalityInsight = typeof currentUser.aiGeneratedInsights === 'string' 
      ? JSON.parse(currentUser.aiGeneratedInsights) 
      : currentUser.aiGeneratedInsights;
    
    const partnerInsights: PersonalityInsight = typeof potentialPartner.aiGeneratedInsights === 'string'
      ? JSON.parse(potentialPartner.aiGeneratedInsights)
      : potentialPartner.aiGeneratedInsights;

    // Calculate different factors of compatibility
    const workoutStyleScore = compareWorkoutStyles(currentUserInsights.workoutStyle, partnerInsights.workoutStyle);
    const goalScore = compareGoals(currentUserInsights.recommendedGoals, partnerInsights.recommendedGoals);
    const experienceScore = compareExperienceLevels(currentUser.experienceLevel, potentialPartner.experienceLevel);
    const preferenceScore = evaluatePreferenceCompatibility(currentUserInsights.partnerPreferences, partnerInsights);
    
    // Weight the factors
    const weightedScore = (
      workoutStyleScore * 0.30 +  // 30% workout style compatibility
      goalScore * 0.30 +          // 30% goals alignment
      experienceScore * 0.15 +    // 15% experience compatibility
      preferenceScore * 0.25      // 25% preference match
    );
    
    // Convert to 0-100 scale and round to nearest integer
    return Math.round(weightedScore * 100);
  } catch (error) {
    console.error("Error calculating compatibility score:", error);
    return calculateBasicCompatibilityScore(currentUser, potentialPartner);
  }
}

/**
 * Calculate a basic compatibility score when AI insights aren't available
 * based on profile information only
 */
function calculateBasicCompatibilityScore(user1: User, user2: User): number {
  let score = 0;
  
  // Experience level match (0-1)
  if (user1.experienceLevel === user2.experienceLevel) {
    score += 0.8; // High score for same experience level
  } else if (
    (user1.experienceLevel === 'intermediate' && user2.experienceLevel === 'beginner') ||
    (user1.experienceLevel === 'beginner' && user2.experienceLevel === 'intermediate') ||
    (user1.experienceLevel === 'intermediate' && user2.experienceLevel === 'advanced') ||
    (user1.experienceLevel === 'advanced' && user2.experienceLevel === 'intermediate')
  ) {
    score += 0.4; // Medium score for adjacent experience levels
  } else {
    score += 0.2; // Low score for very different experience levels
  }
  
  // Same gym bonus
  if (user1.gymName && user2.gymName && user1.gymName === user2.gymName) {
    score += 0.2;
  }
  
  // Convert to 0-100 scale
  return Math.round(score * 100);
}

/**
 * Compare workout styles for compatibility
 * @returns Score between 0-1
 */
function compareWorkoutStyles(style1: string, style2: string): number {
  // Define workout style compatibility matrix
  const styleCompatibility: Record<string, Record<string, number>> = {
    "high intensity": {
      "high intensity": 0.9,
      "methodical": 0.5,
      "balanced": 0.7,
      "social": 0.6,
      "consistent": 0.6
    },
    "methodical": {
      "high intensity": 0.5,
      "methodical": 0.9,
      "balanced": 0.7,
      "social": 0.5,
      "consistent": 0.8
    },
    "balanced": {
      "high intensity": 0.7,
      "methodical": 0.7,
      "balanced": 0.9,
      "social": 0.8,
      "consistent": 0.8
    },
    "social": {
      "high intensity": 0.6,
      "methodical": 0.5,
      "balanced": 0.8,
      "social": 0.9,
      "consistent": 0.7
    },
    "consistent": {
      "high intensity": 0.6,
      "methodical": 0.8,
      "balanced": 0.8,
      "social": 0.7,
      "consistent": 0.9
    }
  };
  
  // Normalize workout style strings
  const normalizedStyle1 = style1.toLowerCase().trim();
  const normalizedStyle2 = style2.toLowerCase().trim();
  
  // Look up compatibility score
  if (styleCompatibility[normalizedStyle1] && styleCompatibility[normalizedStyle1][normalizedStyle2]) {
    return styleCompatibility[normalizedStyle1][normalizedStyle2];
  }
  
  // Default to medium compatibility if styles aren't in the matrix
  return 0.5;
}

/**
 * Compare fitness goals for compatibility
 * @returns Score between 0-1
 */
function compareGoals(goals1: string[], goals2: string[]): number {
  if (!goals1 || !goals2 || goals1.length === 0 || goals2.length === 0) {
    return 0.5; // Default medium compatibility for missing goals
  }
  
  // Normalize goals to lowercase
  const normalizedGoals1 = goals1.map(g => g.toLowerCase().trim());
  const normalizedGoals2 = goals2.map(g => g.toLowerCase().trim());
  
  // Count matching goals
  let matchCount = 0;
  for (const goal1 of normalizedGoals1) {
    for (const goal2 of normalizedGoals2) {
      if (goal1.includes(goal2) || goal2.includes(goal1)) {
        matchCount++;
        break;
      }
    }
  }
  
  // Calculate overlap percentage
  const maxGoals = Math.max(normalizedGoals1.length, normalizedGoals2.length);
  const minMatchesNeeded = Math.min(normalizedGoals1.length, normalizedGoals2.length) / 2;
  const overlapScore = matchCount / maxGoals;
  
  // Boost score if there's at least some overlap
  return matchCount >= minMatchesNeeded ? Math.max(0.5, overlapScore) : 0.3 + (overlapScore * 0.4);
}

/**
 * Compare experience levels for compatibility
 * @returns Score between 0-1
 */
function compareExperienceLevels(level1: string, level2: string): number {
  if (level1 === level2) {
    return 1.0; // Exact match
  }
  
  const levels = ['beginner', 'intermediate', 'advanced'];
  const level1Index = levels.indexOf(level1);
  const level2Index = levels.indexOf(level2);
  
  if (level1Index === -1 || level2Index === -1) {
    return 0.5; // Default for unknown levels
  }
  
  // Calculate difference
  const diff = Math.abs(level1Index - level2Index);
  if (diff === 1) {
    return 0.7; // Adjacent levels
  } else {
    return 0.4; // Maximum difference
  }
}

/**
 * Evaluate if a user matches the partner preferences of another user
 * @returns Score between 0-1
 */
function evaluatePreferenceCompatibility(
  preferences: string,
  partnerInsights: PersonalityInsight
): number {
  if (!preferences) {
    return 0.5; // Default medium compatibility
  }
  
  const normalizedPrefs = preferences.toLowerCase();
  const normalizedStyle = partnerInsights.workoutStyle.toLowerCase();
  
  // Check how many preference keywords match the partner's profile
  const preferenceKeywords = [
    "intensity", "intense", "methodical", "balanced", 
    "social", "consistent", "challenge", "push", "motivate",
    "patient", "technique", "form", "fun", "enjoy",
    "regular", "schedule", "routine"
  ];
  
  let matches = 0;
  let relevantKeywords = 0;
  
  for (const keyword of preferenceKeywords) {
    if (normalizedPrefs.includes(keyword)) {
      relevantKeywords++;
      
      // Check if partner's workout style contains this keyword
      if (normalizedStyle.includes(keyword)) {
        matches++;
      }
      
      // Check if any of partner's goals match this keyword
      const goalsMatch = partnerInsights.recommendedGoals.some(
        goal => goal.toLowerCase().includes(keyword)
      );
      
      if (goalsMatch) {
        matches++;
      }
    }
  }
  
  // If no relevant keywords were found, return default score
  if (relevantKeywords === 0) {
    return 0.5;
  }
  
  // Calculate match percentage with minimum threshold
  const matchScore = matches / (relevantKeywords * 2); // Max 2 matches per keyword
  return Math.max(0.4, matchScore);
}

/**
 * Get a text description of the compatibility level
 */
export function getCompatibilityLabel(score: number): string {
  if (score >= 90) return "Perfect Match";
  if (score >= 80) return "Excellent Match";
  if (score >= 70) return "Great Match";
  if (score >= 60) return "Good Match";
  if (score >= 50) return "Decent Match";
  if (score >= 40) return "Moderate Match";
  if (score >= 30) return "Fair Match";
  if (score >= 20) return "Low Match";
  return "Minimal Match";
}

/**
 * Get color for compatibility visualization
 */
export function getCompatibilityColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-emerald-500";
  if (score >= 50) return "text-blue-500";
  if (score >= 30) return "text-amber-500";
  return "text-gray-500";
}