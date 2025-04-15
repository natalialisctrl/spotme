import { apiRequest } from "@/lib/queryClient";

export type PersonalityInsight = {
  workoutStyle: string;
  motivationTips: string[];
  recommendedGoals: string[];
  partnerPreferences: string;
};

// This function calls our server-side endpoint for personality insights
export async function generatePersonalityInsights(
  userResponses: {
    fitnessLevel: string;
    fitnessGoals: string;
    preferredActivities: string;
    schedule: string;
    motivationFactors: string;
  }
): Promise<PersonalityInsight> {
  try {
    // Call the server-side endpoint
    const response = await apiRequest('POST', '/api/personality-insights', userResponses);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate personality insights');
    }
    
    return data as PersonalityInsight;
  } catch (error) {
    console.error("Error generating personality insights:", error);
    
    // Fallback to default insights when the API is not available
    let workoutStyle = "";
    
    if (userResponses.fitnessLevel.toLowerCase().includes("beginner")) {
      workoutStyle = "You have a methodical approach to fitness, focusing on learning proper form and building foundations gradually.";
    } else if (userResponses.fitnessLevel.toLowerCase().includes("intermediate")) {
      workoutStyle = "You have a balanced workout style that combines structure with variety to keep making progress.";
    } else {
      workoutStyle = "You have an intensive workout style and enjoy pushing your limits with challenging routines.";
    }
    
    const motivationTips = [
      "Set specific, measurable goals that align with your personal values",
      "Find a workout buddy with similar fitness interests for accountability",
      "Track your progress and celebrate small wins to maintain motivation"
    ];
    
    const recommendedGoals = [
      "Establish a consistent workout routine that fits your schedule",
      "Focus on gradual improvement rather than dramatic changes",
      "Balance cardio, strength training, and flexibility work"
    ];
    
    let partnerPreferences = "Look for a gym partner with similar fitness goals and schedule compatibility who can help maintain your motivation.";
    
    // Return the fallback insights
    return {
      workoutStyle,
      motivationTips,
      recommendedGoals,
      partnerPreferences
    };
  }
}