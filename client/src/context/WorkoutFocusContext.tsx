import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DailyWorkoutFocus, workoutTypes } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type WorkoutType = typeof workoutTypes[number];

interface WorkoutFocusContextType {
  currentWorkout: WorkoutType | null;
  setWorkoutFocus: (workoutType: WorkoutType) => void;
  isLoading: boolean;
}

const WorkoutFocusContext = createContext<WorkoutFocusContextType | undefined>(undefined);

export const WorkoutFocusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutType | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current workout focus
  const { data: workoutFocusData, isLoading: isLoadingWorkout } = useQuery<DailyWorkoutFocus>({
    queryKey: ['/api/workout-focus'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Set workout focus mutation
  const { mutate, isPending: isSettingWorkout } = useMutation({
    mutationFn: async (workoutType: string) => {
      return apiRequest('POST', '/api/workout-focus', { workoutType });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/workout-focus'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/nearby'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating workout focus",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Initialize from server data
  useEffect(() => {
    if (workoutFocusData && workoutFocusData.workoutType) {
      const workoutType = workoutFocusData.workoutType as WorkoutType;
      if (workoutTypes.includes(workoutType)) {
        setCurrentWorkout(workoutType);
      }
    }
  }, [workoutFocusData]);

  // Function to update workout focus
  const setWorkoutFocus = (workoutType: WorkoutType) => {
    setCurrentWorkout(workoutType);
    mutate(workoutType);
    
    toast({
      title: "Workout focus updated!",
      description: `You've set your focus for today to ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1).replace('_', ' ')}.`,
    });
  };

  const contextValue: WorkoutFocusContextType = {
    currentWorkout,
    setWorkoutFocus,
    isLoading: isLoadingWorkout || isSettingWorkout
  };

  return (
    <WorkoutFocusContext.Provider value={contextValue}>
      {children}
    </WorkoutFocusContext.Provider>
  );
};

export const useWorkoutFocus = (): WorkoutFocusContextType => {
  const context = useContext(WorkoutFocusContext);
  if (!context) {
    throw new Error("useWorkoutFocus must be used within a WorkoutFocusProvider");
  }
  return context;
};