import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Challenge, ChallengeParticipant } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useLocation, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Loader2, Trophy, MessageSquare, PlusCircle, Calendar, Dumbbell, Target, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ChallengeDetailProps {
  challengeId: number;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  name: string;
  progress: number;
  completed: boolean;
  profilePictureUrl?: string | null;
  isFriend?: boolean;
}

interface ProgressEntry {
  id: number;
  createdAt: Date;
  value: number;
  challengeParticipantId: number;
  notes: string | null;
  proofImageUrl: string | null;
  user?: {
    id: number;
    name: string;
    username: string;
    profilePictureUrl: string | null;
  };
}

interface Comment {
  id: number;
  userId: number;
  content: string;
  createdAt: Date;
  challengeId: number;
  user: {
    id: number;
    name: string;
    username: string;
    profilePictureUrl: string | null;
  };
}

export function ChallengeDetail({ challengeId }: ChallengeDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const [progressValue, setProgressValue] = useState<number | ''>('');
  const [progressNotes, setProgressNotes] = useState('');
  const [progressImageUrl, setProgressImageUrl] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isAddProgressDialogOpen, setIsAddProgressDialogOpen] = useState(false);
  
  // Fetch challenge details
  const { data: challenge, isLoading: isLoadingChallenge } = useQuery<Challenge>({
    queryKey: [`/api/challenges/${challengeId}`],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch challenge');
      }
      return res.json();
    },
    enabled: !!challengeId,
  });
  
  // Fetch leaderboard
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/challenges/${challengeId}/leaderboard`],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}/leaderboard`);
      if (!res.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      return res.json();
    },
    enabled: !!challengeId,
  });
  
  // Fetch my participation
  const { data: participation } = useQuery<ChallengeParticipant>({
    queryKey: [`/api/challenges/${challengeId}/participation`],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}/participation`);
      if (!res.ok) {
        throw new Error('Failed to fetch participation');
      }
      return res.json();
    },
    enabled: !!challengeId && !!user,
  });
  
  // Fetch progress entries
  const { data: progressEntries, isLoading: isLoadingProgressEntries } = useQuery<ProgressEntry[]>({
    queryKey: [`/api/challenges/${challengeId}/progress`],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}/progress`);
      if (!res.ok) {
        if (res.status === 404) {
          return []; // Not participating
        }
        throw new Error('Failed to fetch progress entries');
      }
      return res.json();
    },
    enabled: !!challengeId && !!user && !!participation,
  });
  
  // Fetch comments
  const { data: comments, isLoading: isLoadingComments } = useQuery<Comment[]>({
    queryKey: [`/api/challenges/${challengeId}/comments`],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}/comments`);
      if (!res.ok) {
        throw new Error('Failed to fetch comments');
      }
      return res.json();
    },
    enabled: !!challengeId,
  });
  
  // Join challenge mutation
  const joinChallengeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/challenges/${challengeId}/join`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Joined Challenge',
        description: 'You have successfully joined this challenge.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}/participation`] });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}/leaderboard`] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-participations'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to join challenge: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Leave challenge mutation
  const leaveChallengeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/challenges/${challengeId}/leave`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Left Challenge',
        description: 'You have left this challenge.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}/participation`] });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}/leaderboard`] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-participations'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to leave challenge: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Add progress mutation
  const addProgressMutation = useMutation({
    mutationFn: async (data: { value: number; notes?: string; proofImageUrl?: string }) => {
      const res = await apiRequest('POST', `/api/challenges/${challengeId}/progress`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Progress Updated',
        description: 'Your progress has been updated successfully.',
      });
      setProgressValue('');
      setProgressNotes('');
      setProgressImageUrl('');
      setIsAddProgressDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}/progress`] });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}/leaderboard`] });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}/participation`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update progress: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/challenges/${challengeId}/comment`, { content });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Comment Added',
        description: 'Your comment has been added successfully.'
      });
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${challengeId}/comments`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to add comment: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const handleJoinChallenge = () => {
    joinChallengeMutation.mutate();
  };
  
  const handleLeaveChallenge = () => {
    leaveChallengeMutation.mutate();
  };
  
  const handleAddProgress = () => {
    if (typeof progressValue !== 'number' || progressValue <= 0) {
      toast({
        title: 'Invalid value',
        description: 'Please enter a valid progress value',
        variant: 'destructive',
      });
      return;
    }
    
    const data: { value: number; notes?: string; proofImageUrl?: string } = {
      value: progressValue,
    };
    
    if (progressNotes.trim()) {
      data.notes = progressNotes.trim();
    }
    
    if (progressImageUrl.trim()) {
      data.proofImageUrl = progressImageUrl.trim();
    }
    
    addProgressMutation.mutate(data);
  };
  
  const handleAddComment = () => {
    if (!commentText.trim()) {
      toast({
        title: 'Empty comment',
        description: 'Please enter a comment',
        variant: 'destructive',
      });
      return;
    }
    
    addCommentMutation.mutate(commentText.trim());
  };
  
  if (isLoadingChallenge) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!challenge) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold">Challenge not found</h1>
        <p className="text-muted-foreground mt-2">
          The challenge you are looking for does not exist or has been deleted.
        </p>
        <Button
          className="mt-4"
          onClick={() => setLocation('/challenges')}
        >
          Back to Challenges
        </Button>
      </div>
    );
  }
  
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  
  const isActive = now >= startDate && now <= endDate;
  const isPending = now < startDate;
  const isCompleted = now > endDate;
  
  const isParticipating = !!participation;
  const isCreator = challenge.creatorId === user?.id;
  
  const myProgress = participation?.currentProgress || 0;
  const progressPercentage = (myProgress / challenge.goalValue) * 100;
  
  const sortedLeaderboard = [...(leaderboard || [])].sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    return b.progress - a.progress;
  });
  
  const statusColors = {
    active: 'bg-green-500/20 text-green-700 dark:text-green-400',
    pending: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
    completed: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-start gap-4">
        <Button 
          variant="ghost" 
          className="px-2"
          onClick={() => setLocation('/challenges')}
        >
          &larr; Back to Challenges
        </Button>
        
        {!isCreator && (
          isParticipating ? (
            <Button
              variant="outline"
              className="gap-1"
              onClick={handleLeaveChallenge}
              disabled={leaveChallengeMutation.isPending}
            >
              {leaveChallengeMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Leave Challenge
            </Button>
          ) : (
            <Button
              className="gap-1"
              onClick={handleJoinChallenge}
              disabled={joinChallengeMutation.isPending || isCompleted}
            >
              {joinChallengeMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Join Challenge
            </Button>
          )
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Challenge Card */}
          <Card>
            {challenge.imageUrl && (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={challenge.imageUrl}
                  alt={challenge.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{challenge.name}</CardTitle>
                  <CardDescription>
                    Created by {isCreator ? 'you' : 'John Doe'} on {format(new Date(challenge.createdAt), 'PPP')}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`${
                    isActive
                      ? statusColors.active
                      : isPending
                      ? statusColors.pending
                      : statusColors.completed
                  }`}
                >
                  {isActive
                    ? 'Active'
                    : isPending
                    ? 'Starting Soon'
                    : 'Completed'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p>{challenge.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Start Date</span>
                  </div>
                  <p className="font-medium">{format(startDate, 'PPP')}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>End Date</span>
                  </div>
                  <p className="font-medium">{format(endDate, 'PPP')}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Dumbbell className="h-4 w-4" />
                    <span>Target Exercise</span>
                  </div>
                  <p className="font-medium">{challenge.targetExercise}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>Goal</span>
                  </div>
                  <p className="font-medium">
                    {challenge.goalValue} {challenge.goalType}
                  </p>
                </div>
              </div>
              
              {isParticipating && (
                <div className="pt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Your progress</span>
                    <span>
                      {myProgress} / {challenge.goalValue} {challenge.goalType} ({Math.round(progressPercentage)}%)
                    </span>
                  </div>
                  <Progress value={Math.min(100, progressPercentage)} className="h-2" />
                  
                  {(isActive || isCreator) && (
                    <Dialog open={isAddProgressDialogOpen} onOpenChange={setIsAddProgressDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full mt-4 gap-1">
                          <PlusCircle className="h-4 w-4" />
                          Add Progress
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Progress</DialogTitle>
                          <DialogDescription>
                            Record your progress for this challenge
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label htmlFor="progress-value" className="text-sm font-medium">
                              Progress ({challenge.goalType})
                            </label>
                            <Input
                              id="progress-value"
                              type="number"
                              min="1"
                              placeholder={`Enter your progress in ${challenge.goalType}`}
                              value={progressValue}
                              onChange={(e) => setProgressValue(e.target.valueAsNumber || '')}
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="progress-notes" className="text-sm font-medium">
                              Notes (Optional)
                            </label>
                            <Textarea
                              id="progress-notes"
                              placeholder="Add details about your progress"
                              value={progressNotes}
                              onChange={(e) => setProgressNotes(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="progress-image" className="text-sm font-medium">
                              Proof Image URL (Optional)
                            </label>
                            <Input
                              id="progress-image"
                              placeholder="https://example.com/image.jpg"
                              value={progressImageUrl}
                              onChange={(e) => setProgressImageUrl(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={handleAddProgress}
                            disabled={
                              typeof progressValue !== 'number' ||
                              progressValue <= 0 ||
                              addProgressMutation.isPending
                            }
                          >
                            {addProgressMutation.isPending && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Save Progress
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Tabs for Progress and Comments */}
          {isParticipating && (
            <Tabs defaultValue="progress" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="progress">Your Progress</TabsTrigger>
                <TabsTrigger value="comments">
                  Comments {comments && comments.length > 0 && `(${comments.length})`}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="progress" className="space-y-4 pt-4">
                {isLoadingProgressEntries ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : progressEntries && progressEntries.length > 0 ? (
                  <div className="space-y-4">
                    {progressEntries.map((entry) => (
                      <Card key={entry.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              +{entry.value} {challenge.goalType}
                            </CardTitle>
                            <CardDescription>
                              {format(new Date(entry.createdAt), 'PPP p')}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        {(entry.notes || entry.proofImageUrl) && (
                          <CardContent>
                            {entry.notes && <p>{entry.notes}</p>}
                            {entry.proofImageUrl && (
                              <img
                                src={entry.proofImageUrl}
                                alt="Proof"
                                className="mt-2 max-h-48 rounded-md object-cover"
                              />
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg bg-muted/20">
                    <Target className="h-8 w-8 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 font-semibold">No Progress Entries Yet</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                      Track your progress by adding entries to this challenge.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsAddProgressDialogOpen(true)}
                      disabled={!isActive && !isCreator}
                    >
                      Add First Entry
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="comments" className="space-y-4 pt-4">
                <div className="flex items-start gap-3 mb-6">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profilePictureUrl || undefined} />
                    <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || addCommentMutation.isPending}
                      >
                        {addCommentMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
                
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments && comments.length > 0 ? (
                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user?.profilePictureUrl || undefined} />
                          <AvatarFallback>
                            {comment.user?.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{comment.user?.name || 'Unknown User'}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt), 'PPP p')}
                            </span>
                          </div>
                          <p className="mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg bg-muted/20">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 font-semibold">No Comments Yet</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                      Be the first to comment on this challenge.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
        
        {/* Leaderboard */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                <CardTitle>Leaderboard</CardTitle>
              </div>
              <CardDescription>
                {sortedLeaderboard?.length || 0} participants in this challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLeaderboard ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedLeaderboard && sortedLeaderboard.length > 0 ? (
                <div className="space-y-4">
                  {sortedLeaderboard.map((entry, index) => {
                    const progressPercent = Math.min(100, (entry.progress / challenge.goalValue) * 100);
                    return (
                      <div key={entry.userId} className="flex items-center space-x-4">
                        <div className="flex-shrink-0 w-7">
                          {index < 3 ? (
                            <div className={`
                              h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                index === 1 ? 'bg-gray-100 text-gray-800' : 
                                'bg-amber-100 text-amber-800'}
                            `}>
                              {index + 1}
                            </div>
                          ) : (
                            <span className="text-muted-foreground pl-2">{index + 1}</span>
                          )}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.profilePictureUrl || undefined} />
                          <AvatarFallback>{entry.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <p className="font-medium truncate">{entry.name}</p>
                            {entry.isFriend && (
                              <Badge variant="outline" className="ml-2 h-5 text-xs">Friend</Badge>
                            )}
                            {entry.userId === user?.id && (
                              <Badge variant="outline" className="ml-2 h-5 text-xs bg-primary/20 text-primary">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={progressPercent} className="h-1.5 flex-1" />
                            <span className="text-xs">
                              {entry.progress} / {challenge.goalValue}
                            </span>
                          </div>
                        </div>
                        {entry.completed && (
                          <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">No Participants Yet</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Be the first to join this challenge!
                  </p>
                  {!isParticipating && !isCreator && (
                    <Button
                      className="mt-4 w-full"
                      onClick={handleJoinChallenge}
                      disabled={joinChallengeMutation.isPending || isCompleted}
                    >
                      {joinChallengeMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Join Challenge
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recent activity - Only shown if participating */}
          {isParticipating && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates in this challenge</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* This would be populated with real data in a full implementation */}
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">John Doe</span> added 10 reps to their progress
                      </p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback>AS</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">Alice Smith</span> joined the challenge
                      </p>
                      <p className="text-xs text-muted-foreground">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback>TB</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">Tom Brown</span> completed the challenge! 🎉
                      </p>
                      <p className="text-xs text-muted-foreground">Yesterday</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}