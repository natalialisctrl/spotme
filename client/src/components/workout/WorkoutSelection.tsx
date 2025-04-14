import { FC, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { workoutTypes } from "@shared/schema";
import { WorkoutFocus } from "@shared/schema";

type WorkoutType = typeof workoutTypes[number];

interface WorkoutSelectionProps {
  onSelectWorkout?: (workoutType: WorkoutType) => void;
}

const WorkoutSelection: FC<WorkoutSelectionProps> = ({ onSelectWorkout }) => {
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutType | null>(null);
  const queryClient = useQueryClient();

  // Get current workout focus
  const { data: currentWorkoutFocus, isLoading: isLoadingWorkout } = useQuery<WorkoutFocus>({
    queryKey: ['/api/workout-focus'],
  });

  // Set workout focus
  const { mutate: setWorkoutFocus, isPending: isSettingWorkout } = useMutation({
    mutationFn: async (workoutType: string) => {
      return apiRequest('POST', '/api/workout-focus', { workoutType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-focus'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/nearby'] });
    },
  });

  // Initialize selected workout from current focus
  useEffect(() => {
    if (currentWorkoutFocus && !selectedWorkout) {
      setSelectedWorkout(currentWorkoutFocus.workoutType as WorkoutType);
      if (onSelectWorkout) {
        onSelectWorkout(currentWorkoutFocus.workoutType as WorkoutType);
      }
    }
  }, [currentWorkoutFocus, selectedWorkout, onSelectWorkout]);

  const handleSelectWorkout = (workoutType: WorkoutType) => {
    setSelectedWorkout(workoutType);
    setWorkoutFocus(workoutType);
    if (onSelectWorkout) {
      onSelectWorkout(workoutType);
    }
  };

  // Icons for each workout type
  const workoutIcons: Record<WorkoutType, JSX.Element> = {
    chest: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    ),
    arms: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
    legs: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
      </svg>
    ),
    back: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    ),
    shoulders: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    core: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    cardio: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    full_body: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  };

  const isLoading = isLoadingWorkout || isSettingWorkout;

  return (
    <section className="mb-8 px-4">
      <h2 className="text-xl font-bold font-poppins text-dark mb-4">Today's Workout Focus</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {workoutTypes.map((workoutType) => (
          <button
            key={workoutType}
            className={`workout-option flex flex-col items-center justify-center bg-white hover:bg-gray-50 border-2 ${selectedWorkout === workoutType ? 'border-primary' : 'border-transparent'} p-4 rounded-xl ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isLoading && handleSelectWorkout(workoutType)}
            disabled={isLoading}
          >
            <div className={`${selectedWorkout === workoutType ? 'text-primary' : 'text-gray-500'}`}>
              {workoutIcons[workoutType]}
            </div>
            <span className={`mt-2 font-medium ${selectedWorkout === workoutType ? 'text-primary' : ''}`}>
              {workoutType.charAt(0).toUpperCase() + workoutType.slice(1).replace('_', ' ')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default WorkoutSelection;
