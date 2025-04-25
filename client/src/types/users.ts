// User types for the client application
export interface SelectUser {
  id: number;
  username: string;
  email: string;
  name: string;
  gender: string;
  experienceLevel: string;
  experienceYears: number;
  bio: string | null;
  gymName: string | null;
  gymChain: string | null;
  latitude: number | null;
  longitude: number | null;
  workoutFocus: string | null;
  profilePicture: string | null;
  aiGeneratedInsights: any | null;
  membershipTier: string;
  // Add other relevant fields as needed
}