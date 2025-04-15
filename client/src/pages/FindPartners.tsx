import { FC, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/hooks/use-auth";
import WorkoutSelection from "@/components/workout/WorkoutSelection";
import MapView from "@/components/map/MapView";
import PartnersList from "@/components/partners/PartnersList";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}</h1>
        <p className="text-gray-600">Set your workout focus for today and find compatible partners nearby.</p>
      </section>
      
      <WorkoutSelection onSelectWorkout={handleWorkoutSelect} />
      
      <MapView 
        nearbyUsers={[]} 
        currentUser={user}
        filterParams={filterParams}
        onUpdateFilters={handleUpdateFilters}
      />
      
      <PartnersList filterParams={filterParams} />
    </div>
  );
};

export default FindPartners;
