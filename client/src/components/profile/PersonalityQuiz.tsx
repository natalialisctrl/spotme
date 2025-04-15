import { FC, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { generatePersonalityInsights, PersonalityInsight } from '@/lib/openai';

interface PersonalityQuizProps {
  onComplete: (insights: PersonalityInsight) => void;
  onSkip: () => void;
}

const PersonalityQuiz: FC<PersonalityQuizProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState({
    fitnessLevel: '',
    fitnessGoals: '',
    preferredActivities: '',
    schedule: '',
    motivationFactors: ''
  });
  const { toast } = useToast();
  
  const updateResponse = (field: keyof typeof responses, value: string) => {
    setResponses(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      generateInsights();
    }
  };
  
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const generateInsights = async () => {
    try {
      setIsLoading(true);
      
      // Validate that all responses are provided
      const emptyFields = Object.entries(responses).filter(([_, value]) => !value);
      if (emptyFields.length > 0) {
        toast({
          title: "Missing information",
          description: "Please complete all questions before generating insights.",
          variant: "destructive",
        });
        return;
      }
      
      // Generate insights using OpenAI
      const insights = await generatePersonalityInsights(responses);
      
      toast({
        title: "Profile insights generated!",
        description: "We've created personalized workout insights based on your responses.",
      });
      
      // Pass insights to parent component
      onComplete(insights);
    } catch (error) {
      console.error("Failed to generate insights:", error);
      toast({
        title: "Generation failed",
        description: "We couldn't generate your profile insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          AI-Guided Profile Setup
        </CardTitle>
        <CardDescription>
          Answer a few questions and we'll help you create a great fitness profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="fitnessLevel">What's your current fitness level?</Label>
            <Select value={responses.fitnessLevel} onValueChange={(value) => updateResponse('fitnessLevel', value)}>
              <SelectTrigger id="fitnessLevel">
                <SelectValue placeholder="Select your fitness level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner - Just starting my fitness journey</SelectItem>
                <SelectItem value="intermediate">Intermediate - Regular exercises for 6+ months</SelectItem>
                <SelectItem value="advanced">Advanced - Consistent training for 2+ years</SelectItem>
                <SelectItem value="expert">Expert - Training for 5+ years or professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-2">
            <Label htmlFor="fitnessGoals">What are your main fitness goals?</Label>
            <Textarea 
              id="fitnessGoals" 
              placeholder="Example: Build muscle, lose weight, improve endurance, etc." 
              className="min-h-[100px]"
              value={responses.fitnessGoals}
              onChange={(e) => updateResponse('fitnessGoals', e.target.value)}
            />
          </div>
        )}
        
        {step === 3 && (
          <div className="space-y-2">
            <Label htmlFor="preferredActivities">What types of workouts or activities do you enjoy?</Label>
            <Textarea 
              id="preferredActivities" 
              placeholder="Example: Weight lifting, running, yoga, team sports, etc." 
              className="min-h-[100px]"
              value={responses.preferredActivities}
              onChange={(e) => updateResponse('preferredActivities', e.target.value)}
            />
          </div>
        )}
        
        {step === 4 && (
          <div className="space-y-2">
            <Label htmlFor="schedule">What does your typical workout schedule look like?</Label>
            <Textarea 
              id="schedule" 
              placeholder="Example: Morning workouts 3 times a week, weekends only, etc." 
              className="min-h-[100px]"
              value={responses.schedule}
              onChange={(e) => updateResponse('schedule', e.target.value)}
            />
          </div>
        )}
        
        {step === 5 && (
          <div className="space-y-2">
            <Label htmlFor="motivationFactors">What keeps you motivated to work out?</Label>
            <Textarea 
              id="motivationFactors" 
              placeholder="Example: Health goals, mental wellbeing, social aspects, etc." 
              className="min-h-[100px]"
              value={responses.motivationFactors}
              onChange={(e) => updateResponse('motivationFactors', e.target.value)}
            />
          </div>
        )}
        
        <div className="text-muted-foreground text-sm flex justify-between">
          <span>Question {step} of 5</span>
          <span>{Math.round((step / 5) * 100)}% complete</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {step > 1 ? (
            <Button variant="outline" onClick={handlePrevious}>Previous</Button>
          ) : (
            <Button variant="ghost" onClick={onSkip}>Skip</Button>
          )}
        </div>
        <Button onClick={handleNext} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : step < 5 ? 'Next' : 'Generate Insights'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PersonalityQuiz;