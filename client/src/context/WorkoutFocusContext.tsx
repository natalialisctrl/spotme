import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Define constant workout types
export const workoutTypes = [
  'upper_body',
  'lower_body',
  'cardio',
  'core',
  'full_body',
] as const;

// Define WorkoutType as a union of the constant workout types
export type WorkoutType = typeof workoutTypes[number];

// Define the context type
interface WorkoutFocusContextType {
  currentWorkout: WorkoutType | null;
  setWorkoutFocus: (workoutType: WorkoutType) => void;
  isLoading: boolean;
}

// Create the context
const WorkoutFocusContext = createContext<WorkoutFocusContextType | null>(null);

// Provider component
export const WorkoutFocusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutType | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current workout focus from API
  const { data: workoutFocus, isLoading } = useQuery<{ workoutType?: string; focus?: string }>({
    queryKey: ['/api/workout-focus'],
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Set workout focus mutation
  const setWorkoutFocusMutation = useMutation({
    mutationFn: async (workoutType: WorkoutType) => {
      const res = await apiRequest('POST', '/api/workout-focus', { workoutType });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-focus'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update workout focus: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Initialize current workout from API data
  useEffect(() => {
    if (workoutFocus) {
      // Handle different schema formats that might exist
      const workoutType = workoutFocus.workoutType || workoutFocus.focus;
      
      if (workoutType && workoutTypes.includes(workoutType as WorkoutType)) {
        setCurrentWorkout(workoutType as WorkoutType);
      }
    }
  }, [workoutFocus]);
  
  // Function to set workout focus
  const setWorkoutFocus = (workoutType: WorkoutType) => {
    setCurrentWorkout(workoutType);
    setWorkoutFocusMutation.mutate(workoutType);
    
    // Show success toast
    toast({
      title: "Workout focus updated!",
      description: `You've set your focus for today to ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1).replace('_', ' ')}.`,
    });
  };
  
  // Context value
  const contextValue: WorkoutFocusContextType = {
    currentWorkout,
    setWorkoutFocus,
    isLoading,
  };
  
  return (
    <WorkoutFocusContext.Provider value={contextValue}>
      {children}
    </WorkoutFocusContext.Provider>
  );
};

// Custom hook to use the workout focus context
export const useWorkoutFocus = (): WorkoutFocusContextType => {
  const context = useContext(WorkoutFocusContext);
  
  if (!context) {
    throw new Error('useWorkoutFocus must be used within a WorkoutFocusProvider');
  }
  
  return context;
};