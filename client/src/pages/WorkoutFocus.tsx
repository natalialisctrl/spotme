import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workoutTypes } from "@shared/schema";
import { Loader2, Calendar, Dumbbell, Trophy, Clock, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Workout benefits information
const workoutBenefits: Record<string, { title: string; benefits: string[] }> = {
  chest: {
    title: "Chest Day",
    benefits: [
      "Improves upper body strength",
      "Enhances pushing power",
      "Develops pectoral muscles",
      "Supports better posture",
      "Increases bench press capacity"
    ]
  },
  arms: {
    title: "Arms Day",
    benefits: [
      "Builds bicep and tricep strength",
      "Improves grip strength",
      "Enhances forearm definition",
      "Increases pulling power",
      "Supports functional daily movements"
    ]
  },
  legs: {
    title: "Legs Day",
    benefits: [
      "Builds lower body strength",
      "Improves athletic performance",
      "Enhances core stability",
      "Boosts metabolism",
      "Strengthens joints and ligaments"
    ]
  },
  back: {
    title: "Back Day",
    benefits: [
      "Improves posture",
      "Reduces risk of back pain",
      "Increases pulling strength",
      "Enhances overall body stability",
      "Supports better spinal alignment"
    ]
  },
  shoulders: {
    title: "Shoulders Day",
    benefits: [
      "Improves upper body definition",
      "Enhances overhead pressing power",
      "Increases shoulder stability",
      "Supports better posture",
      "Reduces risk of shoulder injuries"
    ]
  },
  core: {
    title: "Core Day",
    benefits: [
      "Improves body stability and balance",
      "Enhances all athletic movements",
      "Supports better posture",
      "Reduces risk of lower back pain",
      "Increases functional strength"
    ]
  },
  cardio: {
    title: "Cardio Day",
    benefits: [
      "Improves heart health",
      "Increases endurance",
      "Burns calories efficiently",
      "Reduces stress",
      "Enhances recovery between strength workouts"
    ]
  },
  full_body: {
    title: "Full Body Day",
    benefits: [
      "Targets multiple muscle groups",
      "Saves time with efficient training",
      "Increases calorie burn",
      "Improves overall functional fitness",
      "Great for beginners and busy schedules"
    ]
  }
};

// Recommended exercise templates
const recommendedExercises: Record<string, string[]> = {
  chest: ["Bench Press", "Incline Dumbbell Press", "Push-Ups", "Chest Flyes", "Cable Crossovers"],
  arms: ["Bicep Curls", "Tricep Extensions", "Hammer Curls", "Skull Crushers", "Forearm Curls"],
  legs: ["Squats", "Deadlifts", "Lunges", "Leg Press", "Calf Raises"],
  back: ["Pull-Ups", "Rows", "Lat Pulldowns", "Face Pulls", "Back Extensions"],
  shoulders: ["Overhead Press", "Lateral Raises", "Front Raises", "Reverse Flyes", "Shrugs"],
  core: ["Planks", "Russian Twists", "Leg Raises", "Ab Rollouts", "Mountain Climbers"],
  cardio: ["Running", "Cycling", "Jump Rope", "Stair Climbing", "HIIT Intervals"],
  full_body: ["Burpees", "Thrusters", "Kettlebell Swings", "Turkish Get-Ups", "Mountain Climbers"]
};

const WorkoutFocusPage: FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle workout selection
  const handleWorkoutSelected = (workoutType: string) => {
    setSelectedWorkout(workoutType);
    
    // Save workout focus to server
    setWorkoutFocus(workoutType);
    
    // Show success toast
    toast({
      title: "Workout focus updated!",
      description: `You've set your focus for today to ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1).replace('_', ' ')}.`,
    });
  };

  // Set workout focus
  const { mutate: setWorkoutFocus, isPending: isSettingWorkout } = useMutation({
    mutationFn: async (workoutType: string) => {
      try {
        const response = await apiRequest('POST', '/api/workout-focus', { workoutType });
        return response;
      } catch (error) {
        console.error("Error setting workout focus:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-focus'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/nearby'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating workout focus",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFindPartners = () => {
    navigate("/");
  };

  // Render loading state only when authenticating
  if (authLoading || isSettingWorkout) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Format today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Today's Workout Focus</h1>
          <p className="text-muted-foreground flex items-center mt-1">
            <Calendar className="w-4 h-4 mr-1" /> {formattedDate}
          </p>
        </div>
        {selectedWorkout && (
          <Button 
            onClick={handleFindPartners} 
            className="flex items-center gap-2"
          >
            <UserPlus size={18} />
            Find Workout Partners
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Your Focus</CardTitle>
          <CardDescription>
            Choose what you'll be training today to find compatible gym partners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {workoutTypes.map((workoutType) => (
              <button
                key={workoutType}
                className={`flex flex-col items-center justify-center bg-white hover:bg-gray-50 border-2 ${selectedWorkout === workoutType ? 'border-primary' : 'border-transparent'} p-4 rounded-xl`}
                onClick={() => !isSettingWorkout && handleWorkoutSelected(workoutType)}
                disabled={isSettingWorkout}
              >
                <div className={`${selectedWorkout === workoutType ? 'text-primary' : 'text-gray-500'}`}>
                  <Dumbbell className="h-8 w-8" />
                </div>
                <span className={`mt-2 font-medium ${selectedWorkout === workoutType ? 'text-primary' : ''}`}>
                  {workoutType.charAt(0).toUpperCase() + workoutType.slice(1).replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedWorkout && (
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Workout Info</TabsTrigger>
            <TabsTrigger value="exercises">Recommended Exercises</TabsTrigger>
            <TabsTrigger value="tips">Tips & Techniques</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-6 w-6" />
                    {workoutBenefits[selectedWorkout]?.title || "Workout Details"}
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    {selectedWorkout.charAt(0).toUpperCase() + selectedWorkout.slice(1).replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription>
                  Key benefits and information about today's focus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" /> Benefits
                    </h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {workoutBenefits[selectedWorkout]?.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" /> Ideal Training Frequency
                    </h3>
                    <p>For optimal results, train {selectedWorkout === 'full_body' ? '2-3 times per week with rest days in between' : '1-2 times per week with 48-72 hours recovery between sessions'}.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="exercises">
            <Card>
              <CardHeader>
                <CardTitle>Recommended Exercises</CardTitle>
                <CardDescription>
                  A selection of effective exercises for your {selectedWorkout.replace('_', ' ')} workout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedExercises[selectedWorkout]?.map((exercise, index) => (
                    <div key={index} className="flex items-center p-3 border rounded-lg">
                      <div className="bg-primary/10 p-2 rounded-full mr-3">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{exercise}</h4>
                        <p className="text-sm text-muted-foreground">
                          {index % 2 === 0 ? '3-4 sets × 8-12 reps' : '4 sets × 10-15 reps'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Remember to warm up properly and use appropriate weights for your fitness level.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="tips">
            <Card>
              <CardHeader>
                <CardTitle>Training Tips & Techniques</CardTitle>
                <CardDescription>
                  Maximize your {selectedWorkout.replace('_', ' ')} workout with these pro tips
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-l-4 border-primary pl-4 py-2">
                  <h3 className="font-medium">Proper Form</h3>
                  <p className="text-sm text-muted-foreground">
                    Always prioritize proper form over heavier weights. This prevents injuries and ensures optimal muscle engagement.
                  </p>
                </div>
                
                <div className="border-l-4 border-primary pl-4 py-2">
                  <h3 className="font-medium">Progressive Overload</h3>
                  <p className="text-sm text-muted-foreground">
                    Gradually increase weight, reps, or sets over time to continue making progress and avoid plateaus.
                  </p>
                </div>
                
                <div className="border-l-4 border-primary pl-4 py-2">
                  <h3 className="font-medium">Mind-Muscle Connection</h3>
                  <p className="text-sm text-muted-foreground">
                    Focus on feeling the target muscles working during each exercise for better results.
                  </p>
                </div>
                
                <div className="border-l-4 border-primary pl-4 py-2">
                  <h3 className="font-medium">Rest Periods</h3>
                  <p className="text-sm text-muted-foreground">
                    For strength, rest 2-3 minutes between sets. For hypertrophy, keep rest periods between 60-90 seconds.
                  </p>
                </div>
                
                <div className="border-l-4 border-primary pl-4 py-2">
                  <h3 className="font-medium">Training Partners</h3>
                  <p className="text-sm text-muted-foreground">
                    Working out with a partner can improve motivation, form, and safety, especially for challenging {selectedWorkout.replace('_', ' ')} exercises.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleFindPartners} className="w-full">
                  Find a Training Partner Now
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default WorkoutFocusPage;