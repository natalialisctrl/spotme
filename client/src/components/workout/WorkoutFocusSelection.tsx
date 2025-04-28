import React from 'react';
import { Dumbbell, Heart, HeartPulse, Activity, MenuSquare } from 'lucide-react';
import { useWorkoutFocus, workoutTypes, type WorkoutType } from '@/context/WorkoutFocusContext';

interface WorkoutFocusSelectionProps {
  className?: string;
}

const workoutIcons = {
  upper_body: <Dumbbell className="h-6 w-6" />,
  lower_body: <MenuSquare className="h-6 w-6" />,
  cardio: <HeartPulse className="h-6 w-6" />,
  core: <Activity className="h-6 w-6" />,
  full_body: <Heart className="h-6 w-6" />,
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
          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
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