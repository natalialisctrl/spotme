import { FC } from "react";
import { workoutTypes } from "@shared/schema";
import { useWorkoutFocus } from "@/context/WorkoutFocusContext";
import { Loader2 } from "lucide-react";

type WorkoutType = typeof workoutTypes[number];

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

interface WorkoutFocusSelectionProps {
  className?: string;
}

const WorkoutFocusSelection: FC<WorkoutFocusSelectionProps> = ({ className }) => {
  // Use the shared workout focus context
  const { currentWorkout, setWorkoutFocus, isLoading } = useWorkoutFocus();

  return (
    <section className={`mb-8 ${className || ''}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {workoutTypes.map((workoutType) => (
          <button
            key={workoutType}
            className={`workout-option flex flex-col items-center justify-center bg-white hover:bg-gray-50 border-2 ${currentWorkout === workoutType ? 'border-primary' : 'border-transparent'} p-4 rounded-xl ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isLoading && setWorkoutFocus(workoutType)}
            disabled={isLoading}
          >
            <div className={`${currentWorkout === workoutType ? 'text-primary' : 'text-gray-500'}`}>
              {workoutIcons[workoutType]}
            </div>
            <span className={`mt-2 font-medium ${currentWorkout === workoutType ? 'text-primary' : ''}`}>
              {workoutType.charAt(0).toUpperCase() + workoutType.slice(1).replace('_', ' ')}
            </span>
          </button>
        ))}
      </div>
      {isLoading && (
        <div className="flex justify-center mt-4">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      )}
    </section>
  );
};

export default WorkoutFocusSelection;