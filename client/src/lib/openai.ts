import OpenAI from "openai";

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null;
try {
  if (import.meta.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: import.meta.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Only for demonstration, in production, API calls should go through the server
    });
  }
} catch (error) {
  console.warn("OpenAI client initialization skipped. API key not available.");
}

export type PersonalityInsight = {
  workoutStyle: string;
  motivationTips: string[];
  recommendedGoals: string[];
  partnerPreferences: string;
};

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
    // Check if OpenAI client is available
    if (!openai) {
      console.warn("OpenAI client not available. Using default insights.");
      throw new Error("OpenAI client not initialized");
    }
    
    const prompt = `
      As a fitness personality analyzer, generate personalized insights based on the following information:
      
      Fitness Level: ${userResponses.fitnessLevel}
      Fitness Goals: ${userResponses.fitnessGoals}
      Preferred Activities: ${userResponses.preferredActivities}
      Schedule: ${userResponses.schedule}
      Motivation Factors: ${userResponses.motivationFactors}
      
      Provide the following in JSON format:
      1. workoutStyle: A brief description of their workout personality and style (1-2 sentences)
      2. motivationTips: 3 specific motivation tips tailored to their profile
      3. recommendedGoals: 3 recommended fitness goals that align with their preferences
      4. partnerPreferences: A suggestion for what kind of gym partner might be ideal for them
    `;

    // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a fitness personality expert who helps users understand their workout style and provides personalized recommendations." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Failed to generate personality insights");
    
    return JSON.parse(content) as PersonalityInsight;
  } catch (error) {
    console.error("Error generating personality insights:", error);
    
    // Generate insights based on user responses without OpenAI
    // This is a simple rule-based approach when OpenAI is not available
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
    
    // Return the insights
    return {
      workoutStyle,
      motivationTips,
      recommendedGoals,
      partnerPreferences
    };
  }
}