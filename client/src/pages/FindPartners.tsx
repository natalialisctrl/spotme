import { FC, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/hooks/use-auth";
import WorkoutSelection from "@/components/workout/WorkoutSelection";
import MapView from "@/components/map/MapView";
import PartnersList from "@/components/partners/PartnersList";
import Leaderboard from "@/components/challenges/Leaderboard";
import GymTrafficCard from "@/components/gym-traffic/GymTrafficCard";
import { Loader2, Dumbbell, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { apiRequest } from "@/lib/queryClient";

const FindPartners: FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { latitude, longitude, error: locationError } = useGeolocation();
  const [filterParams, setFilterParams] = useState({
    workoutType: undefined as string | undefined,
    gender: undefined as string | undefined,
    experienceLevel: undefined as string | undefined,
    maxDistance: 5,
    sameGymOnly: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch nearby users with the current filters
  const { data: nearbyUsers, isLoading: usersLoading } = useQuery<(User & { distance: number })[]>({
    queryKey: ['/api/users/nearby', filterParams],
    queryFn: async ({ queryKey }) => {
      const [_path, filters] = queryKey as [string, typeof filterParams];
      const queryParams = new URLSearchParams();
      
      if (filters.workoutType) queryParams.append('workoutType', filters.workoutType);
      if (filters.gender) queryParams.append('gender', filters.gender);
      if (filters.experienceLevel) queryParams.append('experienceLevel', filters.experienceLevel);
      if (filters.maxDistance) queryParams.append('maxDistance', filters.maxDistance.toString());
      if (filters.sameGymOnly) queryParams.append('sameGymOnly', filters.sameGymOnly.toString());
      
      const url = `/api/users/nearby?${queryParams.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error('Failed to fetch nearby users');
      }
      
      return res.json();
    }
  });
  
  // Create demo data mutation
  const createDemoDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/demo/initialize', {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Demo Data Created',
        description: `Created ${data.data.users} users, ${data.data.challenges} challenges, and ${data.data.connections} connections.`,
      });
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users/nearby'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create demo data: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Reset demo users mutation
  const resetDemoUsersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/demo/reset-users', {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Demo Users Reset',
        description: `Reset ${data.users.length} demo users with new nearby locations.`,
      });
      // Invalidate nearby users query to refresh map
      queryClient.invalidateQueries({ queryKey: ['/api/users/nearby'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to reset demo users: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Show error toast for location errors
  useEffect(() => {
    if (locationError) {
      toast({
        title: "Location Error",
        description: locationError,
        variant: "destructive",
      });
    }
  }, [locationError, toast]);

  const handleWorkoutSelect = (workoutType: string) => {
    setFilterParams(prev => ({ ...prev, workoutType }));
  };

  const handleUpdateFilters = (newFilters: any) => {
    setFilterParams(prev => ({ ...prev, ...newFilters }));
  };

  // Display loading state
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }
  
  // Main dashboard content
  return (
    <div className="space-y-6">
      <section className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}</h1>
            <p className="text-gray-600">Set your workout focus for today and find compatible partners nearby.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/challenges">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                View Challenges
              </Button>
            </Link>
            <Button 
              variant="default" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => createDemoDataMutation.mutate()}
              disabled={createDemoDataMutation.isPending}
            >
              {createDemoDataMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Generate Demo Data
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
      
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2 md:mb-0">Today's Workout Focus</h2>
          <Link href="/workout-focus">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Detailed Workout Page
            </Button>
          </Link>
        </div>
        <WorkoutSelection onSelectWorkout={handleWorkoutSelect} />
      </div>
      
      {/* Leaderboard section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {/* Gym Traffic Card */}
          {user?.gymName ? (
            <GymTrafficCard gymName={user.gymName} />
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 h-full flex flex-col justify-center items-center text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Gym Selected</h3>
              <p className="text-gray-600 mb-4">Add your preferred gym in your profile to see traffic predictions.</p>
              <Link href="/profile">
                <Button variant="outline" size="sm">Update Profile</Button>
              </Link>
            </div>
          )}
        </div>
        
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <Leaderboard 
              title="Top Fitness Champions" 
              maxEntries={5}
              showAllLink={true}
            />
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                  Challenge Spotlight
                </h2>
                <p className="text-gray-600">
                  Join an active challenge to compete with others and track your progress! Earn points by participating
                  in challenges and reaching your fitness goals.
                </p>
                {user ? (
                  <Link href="/challenges">
                    <Button variant="default" size="sm" className="w-full mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      Create or Join a Challenge
                    </Button>
                  </Link>
                ) : (
                  <p className="text-sm italic text-gray-500 mt-4">
                    Sign in to create and join challenges with other members.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pass the nearbyUsers to the MapView */}
      <div className="relative">
        <MapView 
          nearbyUsers={nearbyUsers || []} 
          currentUser={user || undefined}
          filterParams={filterParams}
          onUpdateFilters={handleUpdateFilters}
        />
        
        {/* Reset users button */}
        <div className="absolute top-4 right-4">
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex items-center gap-2 bg-white/70 hover:bg-white"
            onClick={() => resetDemoUsersMutation.mutate()}
            disabled={resetDemoUsersMutation.isPending}
          >
            {resetDemoUsersMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4" />
                Reset Demo Locations
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Pass the nearbyUsers to PartnersList also */}
      <PartnersList 
        filterParams={filterParams} 
        nearbyUsers={nearbyUsers || []}
      />
    </div>
  );
};

export default FindPartners;
