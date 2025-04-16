import { FC } from 'react';
import { Sparkles, Rocket, Target, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PersonalityInsight } from '@/lib/openai';
import { useLocation } from 'wouter';

interface ProfileInsightsProps {
  insights: PersonalityInsight;
  isProfile?: boolean;
}

const ProfileInsights: FC<ProfileInsightsProps> = ({ insights, isProfile = false }) => {
  const [, setLocation] = useLocation();

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          AI-Generated Fitness Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center">
            <Rocket className="h-5 w-5 mr-2 text-primary" />
            Your Workout Style
          </h3>
          <p className="text-gray-700">{insights.workoutStyle}</p>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center">
            <Target className="h-5 w-5 mr-2 text-primary" />
            Recommended Goals
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            {insights.recommendedGoals.map((goal, index) => (
              <li key={index} className="text-gray-700">{goal}</li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            Motivation Tips
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            {insights.motivationTips.map((tip, index) => (
              <li key={index} className="text-gray-700">{tip}</li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            Ideal Gym Partner
          </h3>
          <p className="text-gray-700">{insights.partnerPreferences}</p>
        </div>
        
        {isProfile && (
          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/profile-setup')}
              className="w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Update AI Fitness Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileInsights;