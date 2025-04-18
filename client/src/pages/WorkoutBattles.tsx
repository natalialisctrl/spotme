import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, Users, Clock, PlusCircle, TimerOff, Activity, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useWebSocket } from "@/hooks/useWebSocket";
import { battleExerciseTypes, battleDurations } from "@shared/schema";
import { useGeolocation } from "@/hooks/useGeolocation";

// Battle creation form schema
const battleFormSchema = z.object({
  exerciseType: z.string({
    required_error: "Please select an exercise type",
  }),
  duration: z.number({
    required_error: "Please select a duration",
  }),
  opponentId: z.number().optional(),
});

type BattleFormValues = z.infer<typeof battleFormSchema>;

// Battle types for the API
interface User {
  id: number;
  name: string;
  profilePicture?: string;
}

interface Battle {
  id: number;
  createdAt: string;
  creatorId: number;
  opponentId?: number | null;
  exerciseType: string;
  duration: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  startedAt?: string | null;
  completedAt?: string | null;
  winnerId?: number | null;
  isQuickChallenge: boolean;
}

interface BattleWithCreator extends Battle {
  creator?: User;
}

interface Performance {
  id: number;
  battleId: number;
  userId: number;
  reps: number;
  submittedAt: string;
  user?: User;
}

export default function WorkoutBattles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBattle, setSelectedBattle] = useState<BattleWithCreator | null>(null);
  const [quickChallengeDialogOpen, setQuickChallengeDialogOpen] = useState(false);
  const [createBattleDialogOpen, setCreateBattleDialogOpen] = useState(false);
  const [battleProgress, setBattleProgress] = useState<{ isActive: boolean; reps: number; countdown: number | null; battleId: number | null }>({
    isActive: false,
    reps: 0,
    countdown: null,
    battleId: null,
  });
  const [nearbyChallenges, setNearbyChallenges] = useState<BattleWithCreator[]>([]);
  
  const { location } = useGeolocation();
  const { lastMessage, sendMessage } = useWebSocket();

  // Form for creating a new battle
  const form = useForm<BattleFormValues>({
    resolver: zodResolver(battleFormSchema),
    defaultValues: {
      exerciseType: "",
      duration: 60,
    },
  });

  // Form for creating a quick challenge
  const quickChallengeForm = useForm<Omit<BattleFormValues, "opponentId">>({
    resolver: zodResolver(battleFormSchema.omit({ opponentId: true })),
    defaultValues: {
      exerciseType: "",
      duration: 60,
    },
  });

  // Fetch user's battles
  const { data: myBattles, isLoading: isLoadingMyBattles } = useQuery({
    queryKey: ["/api/battles/my-battles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/battles/my-battles");
      const data: Battle[] = await res.json();
      return data;
    },
  });

  // Fetch battle performances when a battle is selected
  const { data: performances, isLoading: isLoadingPerformances } = useQuery({
    queryKey: ["/api/battles", selectedBattle?.id, "performances"],
    queryFn: async () => {
      if (!selectedBattle) return [];
      const res = await apiRequest("GET", `/api/battles/${selectedBattle.id}/performances`);
      const data: Performance[] = await res.json();
      return data;
    },
    enabled: !!selectedBattle,
  });

  // Create a new battle
  const createBattleMutation = useMutation({
    mutationFn: async (values: BattleFormValues) => {
      const res = await apiRequest("POST", "/api/battles", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Battle created",
        description: "Your workout battle has been created successfully.",
      });
      setCreateBattleDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create battle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create a quick challenge
  const quickChallengeMutation = useMutation({
    mutationFn: async (values: Omit<BattleFormValues, "opponentId">) => {
      const res = await apiRequest("POST", "/api/battles/quick-challenge", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Quick challenge created",
        description: "Your quick challenge has been broadcasted to nearby users.",
      });
      setQuickChallengeDialogOpen(false);
      quickChallengeForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create quick challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Accept a battle invitation
  const acceptBattleMutation = useMutation({
    mutationFn: async (battleId: number) => {
      const res = await apiRequest("POST", `/api/battles/${battleId}/accept`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Battle accepted",
        description: "Get ready for the battle!",
      });
      setSelectedBattle(data);
      queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battles", data.id, "performances"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to accept battle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Decline a battle invitation
  const declineBattleMutation = useMutation({
    mutationFn: async (battleId: number) => {
      const res = await apiRequest("POST", `/api/battles/${battleId}/decline`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Battle declined",
        description: "You have declined the battle invitation.",
      });
      setSelectedBattle(null);
      queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to decline battle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start a battle
  const startBattleMutation = useMutation({
    mutationFn: async (battleId: number) => {
      const res = await apiRequest("POST", `/api/battles/${battleId}/start`);
      return res.json();
    },
    onSuccess: (data) => {
      setSelectedBattle(data);
      queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battles", data.id, "performances"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to start battle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update reps during a battle
  const updateRepsMutation = useMutation({
    mutationFn: async ({ battleId, reps }: { battleId: number; reps: number }) => {
      const res = await apiRequest("POST", `/api/battles/${battleId}/reps`, { reps });
      return res.json();
    },
    onError: (error) => {
      toast({
        title: "Failed to update reps",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel a battle
  const cancelBattleMutation = useMutation({
    mutationFn: async (battleId: number) => {
      const res = await apiRequest("POST", `/api/battles/${battleId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Battle cancelled",
        description: "The battle has been cancelled.",
      });
      setSelectedBattle(null);
      queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to cancel battle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Join a quick challenge
  const joinQuickChallengeMutation = useMutation({
    mutationFn: async (battleId: number) => {
      const res = await apiRequest("POST", `/api/battles/${battleId}/accept`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Challenge joined",
        description: "Get ready for the challenge!",
      });
      setSelectedBattle(data);
      // Remove from nearby challenges list
      setNearbyChallenges(prevChallenges => 
        prevChallenges.filter(challenge => challenge.id !== data.id)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to join challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const parsedMessage = JSON.parse(lastMessage.data);
      
      switch (parsedMessage.type) {
        case "battle_invitation":
          const battleData = parsedMessage.data.battle;
          const creatorData = parsedMessage.data.creator;
          
          toast({
            title: "New Battle Invitation",
            description: `${creatorData.name} has invited you to a ${battleData.exerciseType} battle!`,
            action: (
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => acceptBattleMutation.mutate(battleData.id)}
                >
                  Accept
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => declineBattleMutation.mutate(battleData.id)}
                >
                  Decline
                </Button>
              </div>
            ),
          });
          queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
          break;
          
        case "battle_accepted":
          const acceptedBattle = parsedMessage.data.battle;
          toast({
            title: "Battle Accepted",
            description: "Your battle invitation was accepted. Get ready!",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
          if (selectedBattle?.id === acceptedBattle.id) {
            setSelectedBattle(acceptedBattle);
          }
          break;
          
        case "battle_declined":
          toast({
            title: "Battle Declined",
            description: "Your battle invitation was declined.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
          break;
          
        case "battle_started":
          queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
          break;
          
        case "battle_countdown":
          const { battleId, countdown, message: countdownMessage, startTime } = parsedMessage.data;
          
          setBattleProgress(prev => ({
            ...prev,
            countdown,
            battleId
          }));
          
          // If countdown is 0, start the battle
          if (countdown === 0 && startTime) {
            setBattleProgress(prev => ({
              ...prev,
              isActive: true,
              reps: 0,
              countdown: null
            }));
          }
          break;
          
        case "battle_rep_update":
          const { battleId: repBattleId, userId, userName, reps } = parsedMessage.data;
          
          // Update UI to show opponent's progress
          toast({
            title: "Battle Update",
            description: `${userName} has completed ${reps} reps!`,
            variant: "default",
          });
          
          // Refresh performances data
          if (selectedBattle?.id === repBattleId) {
            queryClient.invalidateQueries({ queryKey: ["/api/battles", repBattleId, "performances"] });
          }
          break;
          
        case "battle_completed":
          const completedBattle = parsedMessage.data.battle;
          const isWinner = parsedMessage.data.isWinner;
          
          // Reset battle progress
          setBattleProgress({
            isActive: false,
            reps: 0,
            countdown: null,
            battleId: null
          });
          
          // Show completion toast
          toast({
            title: isWinner ? "Victory! 🏆" : "Battle Completed",
            description: isWinner 
              ? "Congratulations! You won the battle!" 
              : "The battle has ended. Check your results!",
            variant: isWinner ? "default" : "default",
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
          if (selectedBattle?.id === completedBattle.id) {
            queryClient.invalidateQueries({ queryKey: ["/api/battles", completedBattle.id, "performances"] });
            setSelectedBattle(prev => prev ? { ...prev, ...completedBattle } : null);
          }
          break;
          
        case "battle_cancelled":
          toast({
            title: "Battle Cancelled",
            description: "The battle has been cancelled.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/battles/my-battles"] });
          break;
          
        case "quick_challenge_nearby":
          const challenge = parsedMessage.data.battle;
          const creator = parsedMessage.data.creator;
          const distance = parsedMessage.data.creator.distance;
          
          // Add to nearby challenges if not already in the list
          setNearbyChallenges(prevChallenges => {
            if (!prevChallenges.find(c => c.id === challenge.id)) {
              return [...prevChallenges, { ...challenge, creator }];
            }
            return prevChallenges;
          });
          
          toast({
            title: "Nearby Workout Challenge!",
            description: `${creator.name} (${distance} miles away) is looking for a ${challenge.exerciseType} challenge!`,
            action: (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => joinQuickChallengeMutation.mutate(challenge.id)}
              >
                Join
              </Button>
            ),
          });
          break;
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }, [lastMessage, queryClient, toast, selectedBattle?.id, acceptBattleMutation, declineBattleMutation, joinQuickChallengeMutation]);

  // Function to increment reps and update server
  const incrementReps = () => {
    if (!battleProgress.isActive || !battleProgress.battleId) return;
    
    const newReps = battleProgress.reps + 1;
    setBattleProgress(prev => ({ ...prev, reps: newReps }));
    
    // Update server with new reps
    updateRepsMutation.mutate({ 
      battleId: battleProgress.battleId, 
      reps: newReps 
    });
  };

  // Function to handle battle creation form submission
  const onSubmit = (values: BattleFormValues) => {
    createBattleMutation.mutate(values);
  };

  // Function to handle quick challenge form submission
  const onQuickChallengeSubmit = (values: Omit<BattleFormValues, "opponentId">) => {
    quickChallengeMutation.mutate(values);
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds >= 60) {
      return `${seconds / 60} min`;
    }
    return `${seconds} sec`;
  };

  // Group battles by status
  const pendingBattles = myBattles?.filter(b => b.status === "pending") || [];
  const activeBattles = myBattles?.filter(b => b.status === "in_progress") || [];
  const completedBattles = myBattles?.filter(b => b.status === "completed") || [];

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workout Battles</h1>
        <div className="flex gap-2">
          <Dialog open={quickChallengeDialogOpen} onOpenChange={setQuickChallengeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Activity className="mr-2 h-4 w-4" />
                Quick Challenge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Quick Challenge</DialogTitle>
              </DialogHeader>
              <Form {...quickChallengeForm}>
                <form onSubmit={quickChallengeForm.handleSubmit(onQuickChallengeSubmit)} className="space-y-6">
                  <FormField
                    control={quickChallengeForm.control}
                    name="exerciseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exercise Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select exercise type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {battleExerciseTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={quickChallengeForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (seconds)</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {battleDurations.map((duration) => (
                              <SelectItem key={duration} value={duration.toString()}>
                                {formatDuration(duration)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={quickChallengeMutation.isPending}>
                      {quickChallengeMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Challenge
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={createBattleDialogOpen} onOpenChange={setCreateBattleDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Battle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workout Battle</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="exerciseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exercise Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select exercise type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {battleExerciseTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (seconds)</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {battleDurations.map((duration) => (
                              <SelectItem key={duration} value={duration.toString()}>
                                {formatDuration(duration)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="opponentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opponent ID (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter opponent user ID"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createBattleMutation.isPending}>
                      {createBattleMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Battle
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Battle UI */}
      {battleProgress.isActive && battleProgress.battleId && (
        <Card className="mb-8 bg-primary/10 border-primary">
          <CardHeader>
            <CardTitle className="text-center">BATTLE IN PROGRESS</CardTitle>
            <CardDescription className="text-center">
              Complete as many reps as possible!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-6xl font-bold mb-4">{battleProgress.reps}</div>
            <Button
              size="lg"
              className="px-8 py-6 text-xl"
              onClick={incrementReps}
            >
              +1 REP
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Battle Countdown UI */}
      {battleProgress.countdown !== null && battleProgress.countdown >= 0 && (
        <Card className="mb-8 bg-primary/10 border-primary">
          <CardHeader>
            <CardTitle className="text-center">BATTLE STARTING</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-7xl font-bold mb-4">
              {battleProgress.countdown === 0 ? "GO!" : battleProgress.countdown}
            </div>
            <p className="text-lg">Get ready!</p>
          </CardContent>
        </Card>
      )}

      {/* Nearby Challenges */}
      {nearbyChallenges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Nearby Challenges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyChallenges.map((challenge) => (
              <Card key={challenge.id} className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-lg">{challenge.exerciseType.replace('_', ' ')}</CardTitle>
                    <Badge>{formatDuration(challenge.duration)}</Badge>
                  </div>
                  <CardDescription>
                    From {challenge.creator?.name} ({challenge.creator?.distance} miles away)
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => joinQuickChallengeMutation.mutate(challenge.id)}
                    disabled={joinQuickChallengeMutation.isPending}
                  >
                    {joinQuickChallengeMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Join Challenge
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Battles UI */}
      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="relative">
            Active
            {activeBattles.length > 0 && (
              <Badge className="ml-2 bg-primary">{activeBattles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingBattles.length > 0 && (
              <Badge className="ml-2 bg-primary">{pendingBattles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          {isLoadingMyBattles ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeBattles.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No active battles found</p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateBattleDialogOpen(true)}>
                Create a Battle
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBattles.map((battle) => (
                <Card key={battle.id} className={selectedBattle?.id === battle.id ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">{battle.exerciseType.replace('_', ' ')}</CardTitle>
                      <Badge>{formatDuration(battle.duration)}</Badge>
                    </div>
                    <CardDescription>
                      Started {new Date(battle.startedAt!).toLocaleTimeString()}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedBattle(battle)}
                    >
                      View Details
                    </Button>
                    {!battleProgress.isActive && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => startBattleMutation.mutate(battle.id)}
                        disabled={startBattleMutation.isPending}
                      >
                        {startBattleMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Start Battle
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pending">
          {isLoadingMyBattles ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingBattles.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No pending battle invitations</p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateBattleDialogOpen(true)}>
                Create a Battle
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingBattles.map((battle) => (
                <Card key={battle.id} className={selectedBattle?.id === battle.id ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">{battle.exerciseType.replace('_', ' ')}</CardTitle>
                      <Badge>{formatDuration(battle.duration)}</Badge>
                    </div>
                    <CardDescription>
                      {battle.isQuickChallenge ? "Quick Challenge" : "Battle Invitation"}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between">
                    {/* Show different actions based on whether user is creator or opponent */}
                    {battle.opponentId === null || battle.isQuickChallenge ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelBattleMutation.mutate(battle.id)}
                          disabled={cancelBattleMutation.isPending}
                        >
                          {cancelBattleMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Cancel
                        </Button>
                        <p className="text-sm text-muted-foreground">Waiting for opponent</p>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => acceptBattleMutation.mutate(battle.id)}
                          disabled={acceptBattleMutation.isPending}
                        >
                          {acceptBattleMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Accept
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => declineBattleMutation.mutate(battle.id)}
                          disabled={declineBattleMutation.isPending}
                        >
                          {declineBattleMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Decline
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          {isLoadingMyBattles ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : completedBattles.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No completed battles found</p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateBattleDialogOpen(true)}>
                Create a Battle
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedBattles.map((battle) => (
                <Card key={battle.id} className={selectedBattle?.id === battle.id ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">{battle.exerciseType.replace('_', ' ')}</CardTitle>
                      <Badge>{formatDuration(battle.duration)}</Badge>
                    </div>
                    <CardDescription>
                      {new Date(battle.completedAt!).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setSelectedBattle(battle)}
                    >
                      View Results
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Battle Details Dialog */}
      {selectedBattle && (
        <Dialog open={!!selectedBattle} onOpenChange={(open) => !open && setSelectedBattle(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Dumbbell className="mr-2 h-5 w-5" />
                {selectedBattle.exerciseType.replace('_', ' ')} Battle
                <Badge className="ml-auto">{selectedBattle.status}</Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDuration(selectedBattle.duration)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedBattle.opponentId ? '1 vs 1' : 'Solo Challenge'}
                  </span>
                </div>
                
                {selectedBattle.winnerId && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span>Winner: ID {selectedBattle.winnerId}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-semibold mb-2">Performance</h3>
                {isLoadingPerformances ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : performances && performances.length > 0 ? (
                  <div className="space-y-2">
                    {performances.map((perf) => (
                      <div key={perf.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>User #{perf.userId}</span>
                        <span className="font-semibold">{perf.reps} reps</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No performance data available</p>
                )}
              </div>
              
              {/* Actions based on battle status */}
              <div className="flex justify-end gap-2 pt-2">
                {selectedBattle.status === "pending" && (
                  <>
                    {selectedBattle.creatorId === 1 ? (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          cancelBattleMutation.mutate(selectedBattle.id);
                        }}
                        disabled={cancelBattleMutation.isPending}
                      >
                        {cancelBattleMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Cancel Battle
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            declineBattleMutation.mutate(selectedBattle.id);
                          }}
                          disabled={declineBattleMutation.isPending}
                        >
                          {declineBattleMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Decline
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            acceptBattleMutation.mutate(selectedBattle.id);
                          }}
                          disabled={acceptBattleMutation.isPending}
                        >
                          {acceptBattleMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Accept
                        </Button>
                      </>
                    )}
                  </>
                )}
                
                {selectedBattle.status === "in_progress" && !battleProgress.isActive && (
                  <Button 
                    variant="default"
                    onClick={() => {
                      startBattleMutation.mutate(selectedBattle.id);
                    }}
                    disabled={startBattleMutation.isPending}
                  >
                    {startBattleMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Start Battle
                  </Button>
                )}
                
                {selectedBattle.status === "in_progress" && battleProgress.isActive && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setBattleProgress({
                        isActive: false,
                        reps: 0,
                        countdown: null,
                        battleId: null
                      });
                      cancelBattleMutation.mutate(selectedBattle.id);
                    }}
                    disabled={cancelBattleMutation.isPending}
                  >
                    {cancelBattleMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <TimerOff className="mr-2 h-4 w-4" />
                    End Early
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}