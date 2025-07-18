import { FC } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Dumbbell, Trophy, Clock, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import WorkoutFocusSelection from "@/components/workout/WorkoutFocusSelection";
import { useWorkoutFocus, workoutTypes } from "@/context/WorkoutFocusContext";

// Workout benefits information
const workoutBenefits: Record<string, { title: string; benefits: string[] }> = {
  upper_body: {
    title: "Upper Body Day",
    benefits: [
      "Improves chest, shoulders, and arm strength",
      "Enhances pushing power",
      "Develops balanced upper body musculature",
      "Supports better posture",
      "Increases functional strength for daily activities"
    ]
  },
  lower_body: {
    title: "Lower Body Day",
    benefits: [
      "Builds leg and glute strength",
      "Improves athletic performance",
      "Enhances stability and balance",
      "Boosts metabolism",
      "Strengthens joints and ligaments"
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
  upper_body: ["Bench Press", "Overhead Press", "Push-Ups", "Rows", "Pull-Ups"],
  lower_body: ["Squats", "Deadlifts", "Lunges", "Leg Press", "Calf Raises"],
  cardio: ["Running", "Cycling", "Jump Rope", "Stair Climbing", "HIIT Intervals"],
  core: ["Planks", "Russian Twists", "Leg Raises", "Ab Rollouts", "Mountain Climbers"],
  full_body: ["Burpees", "Thrusters", "Kettlebell Swings", "Turkish Get-Ups", "Mountain Climbers"]
};

const WorkoutFocusPage: FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { currentWorkout, isLoading: isLoadingWorkout } = useWorkoutFocus();

  const handleFindPartners = () => {
    navigate("/");
  };

  // Render loading state when authenticating or loading workout data
  if (authLoading || isLoadingWorkout) {
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
        {currentWorkout && (
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
          {/* Use our new WorkoutFocusSelection component that uses the shared context */}
          <WorkoutFocusSelection />
        </CardContent>
      </Card>

      {currentWorkout && (
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
                    {currentWorkout ? workoutBenefits[currentWorkout]?.title || "Workout Details" : "Workout Details"}
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    {currentWorkout ? currentWorkout.charAt(0).toUpperCase() + currentWorkout.slice(1).replace('_', ' ') : ""}
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
                      {currentWorkout && workoutBenefits[currentWorkout]?.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" /> Ideal Training Frequency
                    </h3>
                    <p>For optimal results, train {currentWorkout === 'full_body' ? '2-3 times per week with rest days in between' : '1-2 times per week with 48-72 hours recovery between sessions'}.</p>
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
                  A selection of effective exercises for your {currentWorkout ? currentWorkout.replace('_', ' ') : ""} workout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentWorkout && recommendedExercises[currentWorkout]?.map((exercise, index) => (
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
                  Maximize your {currentWorkout ? currentWorkout.replace('_', ' ') : ""} workout with these pro tips
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
                    Working out with a partner can improve motivation, form, and safety, especially for challenging {currentWorkout ? currentWorkout.replace('_', ' ') : ""} exercises.
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