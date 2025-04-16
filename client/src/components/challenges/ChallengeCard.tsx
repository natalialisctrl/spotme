import React from 'react';
import { Challenge } from '@shared/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from 'date-fns';
import { Trophy, Users, Calendar, Target, TrendingUp, Dumbbell } from 'lucide-react';
import { useLocation } from 'wouter';

interface ChallengeCardProps {
  challenge: Challenge;
  joinedParticipants?: number;
  isParticipating?: boolean;
  myProgress?: number;
  creatorName?: string;
  creatorAvatarUrl?: string;
}

export function ChallengeCard({
  challenge,
  joinedParticipants = 0,
  isParticipating = false,
  myProgress = 0,
  creatorName = '',
  creatorAvatarUrl = '',
}: ChallengeCardProps) {
  const [_, setLocation] = useLocation();
  
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  
  const isActive = now >= startDate && now <= endDate;
  const isPending = now < startDate;
  const isCompleted = now > endDate;
  
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const formattedTimeUntilStart = formatDistanceToNow(startDate);
  
  const statusColors = {
    active: 'bg-green-500/20 text-green-700 dark:text-green-400',
    pending: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
    completed: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };
  
  const progressPercentage = isParticipating 
    ? Math.min(100, (myProgress / challenge.goalValue) * 100) 
    : 0;
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
      {challenge.imageUrl && (
        <div className="w-full h-32 overflow-hidden">
          <img
            src={challenge.imageUrl}
            alt={challenge.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold line-clamp-2">{challenge.name}</CardTitle>
          <Badge
            variant="outline"
            className={`${
              isActive
                ? statusColors.active
                : isPending
                ? statusColors.pending
                : statusColors.completed
            } ml-2`}
          >
            {isActive
              ? 'Active'
              : isPending
              ? 'Starting Soon'
              : 'Completed'}
          </Badge>
        </div>
        <CardDescription className="text-xs flex items-center gap-1">
          <Calendar className="h-3 w-3 inline" />
          {isPending
            ? `Starts in ${formattedTimeUntilStart}`
            : isActive
            ? `${daysLeft} days left`
            : `Ended ${formatDistanceToNow(endDate)} ago`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        {isParticipating && (
          <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
              <span>Your progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
        
        <div className="flex gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1">
            <Dumbbell className="h-3 w-3" />
            <span>{challenge.targetExercise}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>
              Goal: {challenge.goalValue} {challenge.goalType}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{joinedParticipants} participants</span>
          </div>
        </div>
        
        <div className="flex items-center mt-3">
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={creatorAvatarUrl} />
            <AvatarFallback>{creatorName?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-xs">Created by {creatorName || "Another user"}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant={isParticipating ? "outline" : "default"} 
          className="w-full"
          onClick={() => setLocation(`/challenges/${challenge.id}`)}
        >
          {isParticipating ? "View Challenge" : "Join Challenge"}
        </Button>
      </CardFooter>
    </Card>
  );
}