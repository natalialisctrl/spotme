import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type PersonalityInsight = {
  workoutStyle: string;
  motivationTips: string[];
  recommendedGoals: string[];
  partnerPreferences: string;
};

export type PersonalityQuizResponses = {
  fitnessLevel: string;
  fitnessGoals: string;
  preferredActivities: string;
  schedule: string;
  motivationFactors: string;
};

export async function generatePersonalityInsights(
  userResponses: PersonalityQuizResponses
): Promise<PersonalityInsight> {
  try {
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a fitness personality expert who helps users understand their workout style and provides personalized recommendations." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Failed to generate personality insights");
    
    return JSON.parse(content) as PersonalityInsight;
  } catch (error) {
    console.error("Error generating personality insights:", error);
    throw error;
  }
}