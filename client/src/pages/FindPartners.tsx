import { FC, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/context/AuthContext";
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
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude, error: locationError } = useGeolocation();
  const [showLogin, setShowLogin] = useState(true);
  const [filterParams, setFilterParams] = useState({
    workoutType: undefined as string | undefined,
    gender: undefined as string | undefined,
    experienceLevel: undefined as string | undefined,
    maxDistance: 5,
    sameGymOnly: false
  });
  const { toast } = useToast();

  // Get nearby users
  const { data: nearbyUsers, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users/nearby', filterParams],
    enabled: !!user && !!latitude && !!longitude,
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

  // If not authenticated, show login/registration form
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 font-poppins">GymBuddy</h2>
            <p className="mt-2 text-sm text-gray-600">
              Find your perfect workout partner in real-time
            </p>
          </div>
          
          <div className="mt-8">
            <div className="flex justify-center mb-4">
              <Button 
                variant={showLogin ? "default" : "outline"}
                className="mx-2"
                onClick={() => setShowLogin(true)}
              >
                Login
              </Button>
              <Button 
                variant={!showLogin ? "default" : "outline"}
                className="mx-2"
                onClick={() => setShowLogin(false)}
              >
                Register
              </Button>
            </div>
            
            {showLogin ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <WorkoutSelection onSelectWorkout={handleWorkoutSelect} />
      <MapView 
        nearbyUsers={nearbyUsers} 
        currentUser={user}
        filterParams={filterParams}
        onUpdateFilters={handleUpdateFilters}
      />
      <PartnersList filterParams={filterParams} />
    </>
  );
};

export default FindPartners;
