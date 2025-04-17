import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Award, Trophy, Flame, Dumbbell, Medal } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const Achievements = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("badges");

  // Fetch user streak information
  const { 
    data: streak, 
    isLoading: isStreakLoading,
    error: streakError
  } = useQuery({
    queryKey: ['/api/achievements/streak'],
    retry: false,
  });

  // Fetch user achievements
  const { 
    data: achievements, 
    isLoading: isAchievementsLoading,
    error: achievementsError
  } = useQuery({
    queryKey: ['/api/achievements/user'],
  });

  // Fetch all available badges
  const { 
    data: badges, 
    isLoading: isBadgesLoading,
    error: badgesError
  } = useQuery({
    queryKey: ['/api/achievements/badges'],
  });

  // Record workout check-in
  const handleWorkoutCheckIn = async () => {
    try {
      const response = await fetch('/api/achievements/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: new Date().toISOString(),
          workoutType: 'full_body',
          duration: 60,
          notes: 'Daily workout check-in',
          verified: true
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to check in');
      }
      
      const data = await response.json();
      
      toast({
        title: "Workout Checked In!",
        description: `Current streak: ${data.streak.currentStreak} days`,
      });
      
      // Refresh streak and achievements data
      // queryClient.invalidateQueries(['/api/achievements/streak']);
      // queryClient.invalidateQueries(['/api/achievements/user']);
    } catch (error) {
      toast({
        title: "Check-in Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'workout':
        return <Dumbbell className="h-5 w-5" />;
      case 'streak':
        return <Flame className="h-5 w-5" />;
      case 'challenge':
        return <Trophy className="h-5 w-5" />;
      case 'social':
        return <CalendarDays className="h-5 w-5" />;
      case 'milestone':
        return <Medal className="h-5 w-5" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "bg-red-500";
    if (progress < 50) return "bg-orange-500";
    if (progress < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (isStreakLoading || isAchievementsLoading || isBadgesLoading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Achievements & Streaks</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (streakError || achievementsError || badgesError) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Achievements & Streaks</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Failed to load achievements data. Please try again later.</span>
        </div>
        <Button onClick={() => window.location.reload()}>Reload Page</Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold">Achievements & Streaks</h1>
        <Button onClick={handleWorkoutCheckIn} className="mt-4 md:mt-0">
          <Dumbbell className="mr-2 h-4 w-4" />
          Check-in Workout
        </Button>
      </div>

      {/* Streak Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Current Streak</CardTitle>
            <CardDescription>Your ongoing workout streak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <Flame className="h-8 w-8 text-orange-500 mr-2" />
              <span className="text-4xl font-bold">{streak?.currentStreak || 0}</span>
              <span className="ml-2 text-lg">days</span>
            </div>
          </CardContent>
          <CardFooter className="pt-0 text-sm text-muted-foreground">
            Last checked in: {streak?.lastCheckInDate ? new Date(streak.lastCheckInDate).toLocaleDateString() : 'Never'}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Longest Streak</CardTitle>
            <CardDescription>Your best streak so far</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <Trophy className="h-8 w-8 text-yellow-500 mr-2" />
              <span className="text-4xl font-bold">{streak?.longestStreak || 0}</span>
              <span className="ml-2 text-lg">days</span>
            </div>
          </CardContent>
          <CardFooter className="pt-0 text-sm text-muted-foreground">
            Total workouts: {streak?.totalWorkouts || 0}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Fitness Level</CardTitle>
            <CardDescription>Your progress and points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <Medal className="h-8 w-8 text-blue-500 mr-2" />
              <span className="text-4xl font-bold">{streak?.level || 1}</span>
              <span className="ml-2 text-lg">level</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Points: {streak?.totalPoints || 0}</span>
                <span>Next: {(Math.floor((streak?.totalPoints || 0) / 100) + 1) * 100}</span>
              </div>
              <Progress 
                value={((streak?.totalPoints || 0) % 100)} 
                className="h-2" 
              />
            </div>
          </CardContent>
          <CardFooter className="pt-0 text-sm text-muted-foreground">
            Weekly workouts: {streak?.weeklyWorkouts || 0} | Monthly: {streak?.monthlyWorkouts || 0}
          </CardFooter>
        </Card>
      </div>

      {/* Achievement Tabs */}
      <Tabs defaultValue="badges" className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="badges">All Badges</TabsTrigger>
          <TabsTrigger value="earned">Earned ({(achievements || []).filter(a => a.completed).length})</TabsTrigger>
          <TabsTrigger value="progress">In Progress ({(achievements || []).filter(a => !a.completed).length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="badges" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges && badges.map((badge) => {
              const userAchievement = achievements?.find(a => a.badgeId === badge.id);
              const isCompleted = userAchievement?.completed || false;
              const progress = userAchievement?.progress || 0;
              
              return (
                <Card key={badge.id} className={isCompleted ? "border-green-500 shadow-md" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                      <Badge variant={isCompleted ? "default" : "outline"}>
                        {getCategoryIcon(badge.category)}
                        <span className="ml-1">{badge.category}</span>
                      </Badge>
                    </div>
                    <CardDescription>{badge.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-2">
                      <div className="flex mr-2">
                        {Array(badge.level).fill(0).map((_, i) => (
                          <Award key={i} className="h-4 w-4 text-yellow-500" />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">{badge.points} pts</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress:</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress 
                        value={progress} 
                        className={`h-2 ${getProgressColor(progress)}`} 
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 text-sm">
                    {isCompleted ? (
                      <div className="flex items-center text-green-600">
                        <Trophy className="h-4 w-4 mr-1" />
                        <span>Achieved!</span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">{badge.requirement}</div>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="earned" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {achievements && badges && achievements
              .filter(a => a.completed)
              .map((achievement) => {
                const badge = badges.find(b => b.id === achievement.badgeId);
                if (!badge) return null;
                
                return (
                  <Card key={achievement.id} className="border-green-500 shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{badge.name}</CardTitle>
                        <Badge>
                          {getCategoryIcon(badge.category)}
                          <span className="ml-1">{badge.category}</span>
                        </Badge>
                      </div>
                      <CardDescription>{badge.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center mb-2">
                        <div className="flex mr-2">
                          {Array(badge.level).fill(0).map((_, i) => (
                            <Award key={i} className="h-4 w-4 text-yellow-500" />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">{badge.points} pts</span>
                      </div>
                      <Progress value={100} className="h-2 bg-green-500" />
                    </CardContent>
                    <CardFooter className="pt-0 text-sm">
                      <div className="flex items-center text-green-600">
                        <Trophy className="h-4 w-4 mr-1" />
                        <span>Earned on {achievement.completedAt ? new Date(achievement.completedAt).toLocaleDateString() : 'Unknown'}</span>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
              
            {achievements && (!achievements.some(a => a.completed)) && (
              <div className="col-span-full text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No Badges Earned Yet</h3>
                <p className="text-muted-foreground mb-4">Complete workouts and challenges to earn badges!</p>
                <Button onClick={handleWorkoutCheckIn}>
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Check-in Your First Workout
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="progress" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {achievements && badges && achievements
              .filter(a => !a.completed)
              .map((achievement) => {
                const badge = badges.find(b => b.id === achievement.badgeId);
                if (!badge) return null;
                
                return (
                  <Card key={achievement.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{badge.name}</CardTitle>
                        <Badge variant="outline">
                          {getCategoryIcon(badge.category)}
                          <span className="ml-1">{badge.category}</span>
                        </Badge>
                      </div>
                      <CardDescription>{badge.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center mb-2">
                        <div className="flex mr-2">
                          {Array(badge.level).fill(0).map((_, i) => (
                            <Award key={i} className="h-4 w-4 text-yellow-500" />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">{badge.points} pts</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress:</span>
                          <span>{achievement.progress}%</span>
                        </div>
                        <Progress 
                          value={achievement.progress} 
                          className={`h-2 ${getProgressColor(achievement.progress)}`} 
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 text-sm">
                      <div className="text-xs text-muted-foreground">{badge.requirement}</div>
                    </CardFooter>
                  </Card>
                );
              })}
              
            {achievements && (!achievements.some(a => !a.completed)) && (
              <div className="col-span-full text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No Badges In Progress</h3>
                <p className="text-muted-foreground">Keep working out to unlock more badge opportunities!</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Achievements;