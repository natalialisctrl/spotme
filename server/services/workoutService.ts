import { v4 as uuidv4 } from 'uuid';
import { User } from '@shared/schema';
import { WorkoutRecommendation } from '../../client/src/components/carousel/WorkoutCarousel';

// Muscle group types
const muscleGroups = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 
  'quads', 'hamstrings', 'glutes', 'calves', 'core', 'abs'
];

// Workout types
const workoutTypes = [
  'strength', 'cardio', 'hiit', 'circuit', 'functional', 'crossfit',
  'bodyweight', 'endurance', 'flexibility', 'mobility'
];

// List of sample workouts
const sampleWorkouts: Partial<WorkoutRecommendation>[] = [
  {
    title: 'Full Body HIIT Circuit',
    description: 'A high-intensity interval training workout that targets all major muscle groups for maximum calorie burn.',
    intensity: 'high',
    duration: 30,
    calories: 400,
    muscleGroups: ['chest', 'back', 'shoulders', 'core', 'quads', 'glutes'],
    tags: ['hiit', 'cardio', 'strength']
  },
  {
    title: 'Upper Body Power',
    description: 'Build strength in your chest, back, and arms with this powerful compound movement workout.',
    intensity: 'medium',
    duration: 45,
    calories: 320,
    muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    tags: ['strength', 'upper body', 'muscle building']
  },
  {
    title: 'Core Crusher',
    description: 'Strengthen your core with this targeted abdominal and lower back workout.',
    intensity: 'medium',
    duration: 20,
    calories: 200,
    muscleGroups: ['core', 'abs'],
    tags: ['core', 'abs', 'stability']
  },
  {
    title: 'Leg Day Blast',
    description: 'Build powerful legs with this comprehensive lower body workout targeting all major leg muscles.',
    intensity: 'high',
    duration: 40,
    calories: 380,
    muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
    tags: ['strength', 'lower body', 'legs']
  },
  {
    title: 'Morning Cardio Kickstart',
    description: 'Start your day with this energizing cardio session designed to boost your metabolism.',
    intensity: 'medium',
    duration: 25,
    calories: 300,
    muscleGroups: ['quads', 'calves', 'core'],
    tags: ['cardio', 'morning', 'endurance']
  },
  {
    title: 'Functional Fitness Circuit',
    description: 'Improve everyday movement patterns with this functional fitness workout.',
    intensity: 'medium',
    duration: 35,
    calories: 280,
    muscleGroups: ['core', 'shoulders', 'quads', 'glutes', 'back'],
    tags: ['functional', 'circuit', 'mobility']
  },
  {
    title: 'Quick Burn Bodyweight',
    description: 'No equipment needed for this effective full-body workout you can do anywhere.',
    intensity: 'medium',
    duration: 15,
    calories: 150,
    muscleGroups: ['chest', 'triceps', 'core', 'quads'],
    tags: ['bodyweight', 'quick', 'no equipment']
  },
  {
    title: 'Heavy Lifting Session',
    description: 'Build serious strength with this compound movement heavy lifting workout.',
    intensity: 'high',
    duration: 60,
    calories: 450,
    muscleGroups: ['chest', 'back', 'quads', 'glutes', 'hamstrings'],
    tags: ['strength', 'powerlifting', 'compound']
  },
  {
    title: 'Stretching & Mobility',
    description: 'Improve flexibility and mobility with this comprehensive stretching routine.',
    intensity: 'low',
    duration: 30,
    calories: 120,
    muscleGroups: ['hamstrings', 'back', 'shoulders', 'calves'],
    tags: ['flexibility', 'mobility', 'recovery']
  },
  {
    title: 'Boxing Cardio',
    description: 'Punch your way to fitness with this boxing-inspired cardio workout.',
    intensity: 'high',
    duration: 40,
    calories: 420,
    muscleGroups: ['shoulders', 'core', 'quads', 'calves'],
    tags: ['cardio', 'boxing', 'coordination']
  },
  {
    title: 'Muscle Recovery Session',
    description: 'Active recovery workout designed to reduce soreness and promote muscle repair.',
    intensity: 'low',
    duration: 25,
    calories: 140,
    muscleGroups: ['full body'],
    tags: ['recovery', 'mobility', 'stretching']
  },
  {
    title: 'CrossFit WOD',
    description: 'High-intensity WOD (Workout of the Day) combining strength and cardio elements.',
    intensity: 'high',
    duration: 20,
    calories: 300,
    muscleGroups: ['full body'],
    tags: ['crossfit', 'hiit', 'strength']
  }
];

/**
 * Generates personalized workout recommendations based on user preferences
 */
export function generateWorkoutRecommendations(
  user?: User,
  count: number = 8
): WorkoutRecommendation[] {
  // Select random workouts from the sample list if no user preferences are provided
  // In a real app, this would be based on user preferences, history, goals, etc.
  const selectedWorkouts = [...sampleWorkouts]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
    
  // Convert partial recommendations to full recommendations with unique IDs
  return selectedWorkouts.map(workout => ({
    id: uuidv4(),
    title: workout.title!,
    description: workout.description!,
    intensity: workout.intensity!,
    duration: workout.duration!,
    calories: workout.calories!,
    muscleGroups: workout.muscleGroups!,
    tags: workout.tags!,
    // In a real app, you would have real image URLs or generate them
    imageUrl: undefined
  }));
}

/**
 * Generates a personalized workout recommendation based on specified criteria
 */
export function generateTargetedWorkout(
  targetMuscleGroups: string[],
  intensity: 'low' | 'medium' | 'high',
  duration: number
): WorkoutRecommendation {
  // Filter workouts that match the target muscle groups and intensity
  const matchingWorkouts = sampleWorkouts.filter(workout => {
    // Check if workout contains at least one target muscle group
    const hasMuscleGroup = targetMuscleGroups.some(muscle => 
      workout.muscleGroups?.includes(muscle)
    );
    
    // Check if intensity matches
    const intensityMatches = workout.intensity === intensity;
    
    // Check if duration is within 10 minutes of target
    const durationMatches = Math.abs((workout.duration || 0) - duration) <= 10;
    
    return hasMuscleGroup && intensityMatches && durationMatches;
  });
  
  // Select a matching workout or create a new one if no matches
  const selectedWorkout = matchingWorkouts.length > 0
    ? matchingWorkouts[Math.floor(Math.random() * matchingWorkouts.length)]
    : {
        title: `Custom ${intensity} ${targetMuscleGroups.join(', ')} Workout`,
        description: `A personalized ${duration}-minute workout focusing on ${targetMuscleGroups.join(', ')}.`,
        intensity,
        duration,
        calories: intensity === 'low' ? duration * 5 : intensity === 'medium' ? duration * 8 : duration * 12,
        muscleGroups: targetMuscleGroups,
        tags: [intensity, ...targetMuscleGroups.slice(0, 2)]
      };
      
  return {
    id: uuidv4(),
    title: selectedWorkout.title!,
    description: selectedWorkout.description!,
    intensity: selectedWorkout.intensity!,
    duration: selectedWorkout.duration!,
    calories: selectedWorkout.calories!,
    muscleGroups: selectedWorkout.muscleGroups!,
    tags: selectedWorkout.tags!,
    imageUrl: undefined
  };
}