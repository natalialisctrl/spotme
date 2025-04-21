import { FC } from 'react';
import WorkoutCarousel from '@/components/carousel/WorkoutCarousel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Star, Heart, BarChart3 } from 'lucide-react';

const WorkoutRecommendations: FC = () => {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-8">Personalized Workout Recommendations</h1>
      
      {/* Introduction Section */}
      <Card className="mb-8 bg-accent/10">
        <CardHeader>
          <CardTitle>Tailored For Your Fitness Journey</CardTitle>
          <CardDescription>
            Discover workouts custom-built for your fitness level, goals, and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Targeted Muscle Groups</h3>
                <p className="text-sm text-muted-foreground">
                  Focus on the areas you want to improve with precision
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Experience-Based</h3>
                <p className="text-sm text-muted-foreground">
                  Workouts that match your fitness level, from beginner to advanced
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Fitness Goals</h3>
                <p className="text-sm text-muted-foreground">
                  Whether building strength, endurance, or flexibility
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Track Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Save your favorite workouts and monitor your improvements
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Featured Workout Carousel */}
      <div className="mb-12">
        <WorkoutCarousel limit={8} />
      </div>
      
      {/* More Info (Placeholder for future sections) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Custom Workout Generation</CardTitle>
            <CardDescription>
              Create your own perfect workout routine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Specify your target muscle groups, intensity level, and available equipment 
              to generate a personalized workout routine that meets your exact needs.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Connect With Workout Partners</CardTitle>
            <CardDescription>
              Find gym buddies with similar workout preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Share your favorite workouts with nearby gym partners who have similar fitness 
              goals and schedules. Never lift solo again!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkoutRecommendations;