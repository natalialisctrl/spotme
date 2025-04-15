import { FC, useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { PersonalityInsight, generatePersonalityInsights } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';

// Form schema
const personalityQuizSchema = z.object({
  fitnessLevel: z.string().min(3, "Please describe your fitness level"),
  fitnessGoals: z.string().min(3, "Please describe your fitness goals"),
  preferredActivities: z.string().min(3, "Please describe activities you enjoy"),
  schedule: z.string().min(3, "Please describe your typical workout schedule"),
  motivationFactors: z.string().min(3, "Please describe what motivates you")
});

type PersonalityQuizValues = z.infer<typeof personalityQuizSchema>;

interface PersonalityQuizProps {
  onComplete: (insights: PersonalityInsight) => void;
  onSkip: () => void;
}

const PersonalityQuiz: FC<PersonalityQuizProps> = ({ onComplete, onSkip }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  
  // Initialize form
  const form = useForm<PersonalityQuizValues>({
    resolver: zodResolver(personalityQuizSchema),
    defaultValues: {
      fitnessLevel: "",
      fitnessGoals: "",
      preferredActivities: "",
      schedule: "",
      motivationFactors: ""
    }
  });
  
  // Submit handler
  const onSubmit = async (values: PersonalityQuizValues) => {
    try {
      setIsGenerating(true);
      
      // Call OpenAI to generate personality insights
      const insights = await generatePersonalityInsights(values);
      
      // Pass insights to parent component
      onComplete(insights);
    } catch (error) {
      console.error("Error generating insights:", error);
      
      toast({
        title: "Generation failed",
        description: "We couldn't generate your profile insights. Please try again or skip this step.",
        variant: "destructive"
      });
      
      setIsGenerating(false);
    }
  };
  
  if (isGenerating) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <h3 className="text-xl font-semibold">Generating Your Fitness Profile</h3>
            <p className="text-gray-500 text-center max-w-md">
              Our AI is analyzing your responses to create personalized workout insights just for you. This may take a moment...
            </p>
            <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          Fitness Personality Quiz
        </CardTitle>
        <CardDescription>
          Answer a few questions to generate personalized workout insights
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fitnessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe your current fitness level</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Beginner looking to build stamina, intermediate with 2 years of weight training, etc."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fitnessGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are your fitness goals?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Build muscle, lose weight, improve endurance, train for a marathon, etc."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="preferredActivities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What workout activities do you enjoy?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., HIIT classes, weightlifting, yoga, running, swimming, team sports, etc."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe your typical workout schedule</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Mornings before work, weekends only, 3-4 times per week, lunchtime sessions, etc."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="motivationFactors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What keeps you motivated to work out?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Setting personal records, social accountability, tracking progress, clear goals, etc."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={onSkip}>
              Skip for Now
            </Button>
            <Button type="submit">
              Generate Insights
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default PersonalityQuiz;