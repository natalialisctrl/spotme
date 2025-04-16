import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Challenge } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { CreateChallengeForm } from '@/components/challenges/CreateChallengeForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, Trophy, PlusCircle, Users, Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Demo users for testing
interface DemoUser {
  id: number;
  username: string;
  name: string;
  profilePictureUrl: string | null;
  isFriend: boolean;
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>(['active', 'upcoming', 'completed']);
  const [friendsOnlyFilter, setFriendsOnlyFilter] = useState(false);
  
  // Demo users creation
  const createDemoUsersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/demo/create-users', {
        count: 5,
        withFriendships: true
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Demo users created',
        description: 'Demo users have been created and some are now your friends.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/nearby'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      // Also create some sample challenges
      createDemoChallengesMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create demo users: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Demo challenges creation
  const createDemoChallengesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/demo/create-challenges', {
        count: 3,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Demo challenges created',
        description: 'Sample challenges have been created with participants.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create demo challenges: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Fetch challenges
  const { data: challenges, isLoading } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges', activeTab, friendsOnlyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab === 'mine') {
        params.append('mine', 'true');
      } else if (activeTab === 'participating') {
        params.append('participating', 'true');
      }
      
      if (friendsOnlyFilter) {
        params.append('friendsOnly', 'true');
      }
      
      const res = await fetch(`/api/challenges?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch challenges');
      }
      return res.json();
    },
    enabled: !!user,
  });
  
  // Fetch participations
  const { data: myParticipations } = useQuery({
    queryKey: ['/api/challenges/my-participations'],
    queryFn: async () => {
      const res = await fetch('/api/challenges/my-participations');
      if (!res.ok) {
        throw new Error('Failed to fetch participations');
      }
      return res.json();
    },
    enabled: !!user,
  });
  
  // Filter challenges based on search query and status filters
  const filteredChallenges = challenges?.filter(challenge => {
    const matchesSearch = !searchQuery || 
      challenge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.targetExercise.toLowerCase().includes(searchQuery.toLowerCase());
    
    const now = new Date();
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    
    const isActive = now >= startDate && now <= endDate;
    const isUpcoming = now < startDate;
    const isCompleted = now > endDate;
    
    const matchesStatus = 
      (isActive && statusFilter.includes('active')) ||
      (isUpcoming && statusFilter.includes('upcoming')) ||
      (isCompleted && statusFilter.includes('completed'));
    
    return matchesSearch && matchesStatus;
  });
  
  const isParticipating = (challengeId: number) => {
    return myParticipations?.some(p => p.challengeId === challengeId);
  };
  
  const getMyProgress = (challengeId: number) => {
    const participation = myParticipations?.find(p => p.challengeId === challengeId);
    return participation?.currentProgress || 0;
  };
  
  const handleCreateDemoUsers = () => {
    createDemoUsersMutation.mutate();
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Workout Challenges</h1>
          <p className="text-muted-foreground">
            Join challenges, track progress, and compete with friends
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Create Challenge
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create a New Challenge</DialogTitle>
              </DialogHeader>
              <CreateChallengeForm />
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={handleCreateDemoUsers} disabled={createDemoUsersMutation.isPending}>
            {createDemoUsersMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Create Demo Users
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All Challenges</TabsTrigger>
            <TabsTrigger value="participating">Participating</TabsTrigger>
            <TabsTrigger value="mine">My Challenges</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search challenges..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {(statusFilter.length < 3 || friendsOnlyFilter) && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1">
                      {statusFilter.length < 3 && friendsOnlyFilter ? '2' : '1'}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes('active')}
                  onCheckedChange={(checked) => {
                    setStatusFilter(prev => 
                      checked 
                        ? [...prev, 'active'] 
                        : prev.filter(s => s !== 'active')
                    );
                  }}
                >
                  Active
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes('upcoming')}
                  onCheckedChange={(checked) => {
                    setStatusFilter(prev => 
                      checked 
                        ? [...prev, 'upcoming'] 
                        : prev.filter(s => s !== 'upcoming')
                    );
                  }}
                >
                  Upcoming
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes('completed')}
                  onCheckedChange={(checked) => {
                    setStatusFilter(prev => 
                      checked 
                        ? [...prev, 'completed'] 
                        : prev.filter(s => s !== 'completed')
                    );
                  }}
                >
                  Completed
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Show Only</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={friendsOnlyFilter}
                  onCheckedChange={(checked) => {
                    setFriendsOnlyFilter(checked);
                  }}
                >
                  Friends' Challenges
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <TabsContent value="all" className="mt-0">
          {renderChallengesList(filteredChallenges, "No challenges found matching your filters.")}
        </TabsContent>
        
        <TabsContent value="participating" className="mt-0">
          {renderChallengesList(
            filteredChallenges?.filter(c => isParticipating(c.id)), 
            "You're not participating in any challenges yet. Join one to get started!"
          )}
        </TabsContent>
        
        <TabsContent value="mine" className="mt-0">
          {renderChallengesList(
            filteredChallenges?.filter(c => c.creatorId === user?.id), 
            "You haven't created any challenges yet. Create one to start competing with friends!"
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
  
  function renderChallengesList(challenges: Challenge[] | undefined, emptyMessage: string) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    if (!challenges || challenges.length === 0) {
      return (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 font-semibold text-lg">No Challenges Found</h3>
          <p className="text-muted-foreground mt-1">{emptyMessage}</p>
          {activeTab !== 'mine' && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Create a Challenge
            </Button>
          )}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            joinedParticipants={10} // This will be replaced with actual data
            isParticipating={isParticipating(challenge.id)}
            myProgress={getMyProgress(challenge.id)}
            creatorName="John Doe" // This will be replaced with actual data
          />
        ))}
      </div>
    );
  }
}