import { FC, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import PersonalityQuiz from '@/components/profile/PersonalityQuiz';
import PersonalityInsights from '@/components/profile/PersonalityInsights';
import { PersonalityInsight } from '@/lib/openai';

const ProfileSetup: FC = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Function to refresh user data
  const checkAuth = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };
  const { toast } = useToast();
  const [step, setStep] = useState<'quiz' | 'insights' | 'saving'>('quiz');
  const [insights, setInsights] = useState<PersonalityInsight | null>(null);
  
  if (!user) {
    // Redirect to auth if not logged in
    setLocation('/auth');
    return null;
  }
  
  const handleQuizComplete = (generatedInsights: PersonalityInsight) => {
    setInsights(generatedInsights);
    setStep('insights');
  };
  
  const handleQuizSkip = () => {
    // Skip the profile setup and go to the main app
    setLocation('/');
    
    toast({
      title: "Setup skipped",
      description: "You can complete your profile later from the Profile page."
    });
  };
  
  const handleInsightsEdit = () => {
    // Go back to the quiz
    setStep('quiz');
  };
  
  const handleInsightsSave = async () => {
    if (!insights) return;
    
    try {
      setStep('saving');
      
      // Use our new special endpoint for saving insights
      await apiRequest('POST', '/api/save-personality-insights', {
        insights: insights
      });
      
      // Refresh user data
      await checkAuth();
      
      toast({
        title: "Profile updated!",
        description: "Your AI-generated profile insights have been saved."
      });
      
      // Redirect to home page or profile page
      setLocation('/');
    } catch (error) {
      console.error("Failed to save profile insights:", error);
      
      toast({
        title: "Update failed",
        description: "We couldn't save your profile insights. Please try again.",
        variant: "destructive"
      });
      
      // Try to log in again if it's an authentication error
      if (error instanceof Error && error.message.includes('401')) {
        toast({
          title: "Session expired",
          description: "Please log in again to save your profile.",
          variant: "destructive"
        });
        setTimeout(() => {
          setLocation('/auth');
        }, 2000);
        return;
      }
      
      setStep('insights');
    }
  };
  
  // Show loading indicator while saving
  if (step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg">Saving your profile...</p>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Welcome to SpotMe</h1>
        <p className="text-gray-500 mt-2">Never lift solo again. Let's setup your fitness profile with AI assistance.</p>
      </div>
      
      {step === 'quiz' && (
        <PersonalityQuiz 
          onComplete={handleQuizComplete}
          onSkip={handleQuizSkip}
        />
      )}
      
      {step === 'insights' && insights && (
        <PersonalityInsights 
          insights={insights}
          onSave={handleInsightsSave}
          onEdit={handleInsightsEdit}
        />
      )}
    </div>
  );
};

export default ProfileSetup;