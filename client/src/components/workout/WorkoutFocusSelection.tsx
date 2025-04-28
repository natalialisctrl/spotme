import React from 'react';
import { Dumbbell, Heart, HeartPulse, BicepsFlexed, Shapes, Triangle, Activity, Weight, Target } from 'lucide-react';
import { useWorkoutFocus, workoutTypes, type WorkoutType } from '@/context/WorkoutFocusContext';

interface WorkoutFocusSelectionProps {
  className?: string;
}

const workoutIcons = {
  upper_body: <BicepsFlexed className="h-8 w-8" />,
  lower_body: <Triangle className="h-8 w-8" />,
  cardio: <HeartPulse className="h-8 w-8" />,
  core: <Target className="h-8 w-8" />,
  full_body: <Dumbbell className="h-8 w-8" />,
};

const workoutLabels = {
  upper_body: 'Upper Body',
  lower_body: 'Lower Body',
  cardio: 'Cardio',
  core: 'Core',
  full_body: 'Full Body',
};

const WorkoutFocusSelection: React.FC<WorkoutFocusSelectionProps> = ({ className }) => {
  const { currentWorkout, setWorkoutFocus, isLoading } = useWorkoutFocus();

  return (
    <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${className}`}>
      {workoutTypes.map((type) => (
        <button
          key={type}
          className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
            currentWorkout === type
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-white border-gray-200 hover:border-primary/40 hover:bg-primary/5'
          }`}
          onClick={() => setWorkoutFocus(type)}
          disabled={isLoading}
        >
          <div className="w-12 h-12 flex items-center justify-center mb-2">
            {workoutIcons[type]}
          </div>
          <span className="font-medium text-sm">{workoutLabels[type]}</span>
        </button>
      ))}
    </div>
  );
};

export default WorkoutFocusSelection;