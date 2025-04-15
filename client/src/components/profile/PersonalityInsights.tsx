import { FC } from 'react';
import { Sparkles, Rocket, Target, Clock, Users, Check } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PersonalityInsight } from '@/lib/openai';

interface PersonalityInsightsProps {
  insights: PersonalityInsight;
  onSave: () => void;
  onEdit: () => void;
}

const PersonalityInsights: FC<PersonalityInsightsProps> = ({ insights, onSave, onEdit }) => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          Your AI-Generated Fitness Profile
        </CardTitle>
        <CardDescription>
          Personalized insights based on your responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <ul className="space-y-1">
            {insights.recommendedGoals.map((goal, index) => (
              <li key={index} className="flex items-start">
                <Check className="h-4 w-4 mr-2 text-green-500 mt-1 shrink-0" />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            Motivation Tips
          </h3>
          <ul className="space-y-1">
            {insights.motivationTips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <Check className="h-4 w-4 mr-2 text-green-500 mt-1 shrink-0" />
                <span>{tip}</span>
              </li>
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
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onEdit}>Edit Responses</Button>
        <Button onClick={onSave}>Save to Profile</Button>
      </CardFooter>
    </Card>
  );
};

export default PersonalityInsights;