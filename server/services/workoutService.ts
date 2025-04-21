import { v4 as uuidv4 } from 'uuid';
import { User } from '@shared/schema';

// Define workout recommendation types
export interface Exercise {
  name: string;
  sets: number;
  reps: number | string;
  restSeconds: number;
  description?: string;
  muscleGroup: string;
  intensity: 'light' | 'moderate' | 'intense';
}

export interface WorkoutRecommendation {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  intensity: 'beginner' | 'intermediate' | 'advanced';
  targetMuscleGroups: string[];
  exercises: Exercise[];
  imageUrl?: string;
  calories?: number;
  tags: string[];
  equipment: string[];
}

// Predefined muscle groups and equipment
const muscleGroups = [
  'chest', 'back', 'shoulders', 'legs', 'arms', 
  'core', 'full body', 'cardio', 'upper body', 'lower body'
];

const equipmentOptions = [
  'barbell', 'dumbbell', 'kettlebell', 'cable machine', 'resistance bands',
  'bodyweight', 'smith machine', 'medicine ball', 'pull-up bar', 'bench',
  'none'
];

// Exercise database organized by muscle group
const exercisesByMuscleGroup: Record<string, Exercise[]> = {
  chest: [
    {
      name: 'Bench Press',
      sets: 4,
      reps: '8-10',
      restSeconds: 90,
      muscleGroup: 'chest',
      intensity: 'intense',
      description: 'Lie on a bench and press the weight upward until your arms are extended'
    },
    {
      name: 'Incline Dumbbell Press',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      muscleGroup: 'chest',
      intensity: 'moderate',
      description: 'Perform a press on an inclined bench to target the upper chest'
    },
    {
      name: 'Cable Flyes',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      muscleGroup: 'chest',
      intensity: 'light',
      description: 'Use cable machine to perform a fly motion that stretches and contracts the chest'
    },
    {
      name: 'Push-ups',
      sets: 3,
      reps: '15-20',
      restSeconds: 45,
      muscleGroup: 'chest',
      intensity: 'moderate',
      description: 'Classic bodyweight exercise that targets the chest, shoulders, and triceps'
    }
  ],
  back: [
    {
      name: 'Pull-ups',
      sets: 4,
      reps: '6-10',
      restSeconds: 90,
      muscleGroup: 'back',
      intensity: 'intense',
      description: 'Hang from a bar and pull your body up until your chin is over the bar'
    },
    {
      name: 'Bent Over Barbell Rows',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      muscleGroup: 'back',
      intensity: 'intense',
      description: 'Bend forward with a barbell and pull it toward your lower chest'
    },
    {
      name: 'Lat Pulldowns',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      muscleGroup: 'back',
      intensity: 'moderate',
      description: 'Sitting at a machine, pull the bar down toward your upper chest'
    },
    {
      name: 'Seated Cable Rows',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      muscleGroup: 'back',
      intensity: 'moderate',
      description: 'Pull the cable towards your abdomen while maintaining good posture'
    }
  ],
  shoulders: [
    {
      name: 'Overhead Press',
      sets: 4,
      reps: '8-10',
      restSeconds: 90,
      muscleGroup: 'shoulders',
      intensity: 'intense',
      description: 'Press the weight overhead until your arms are fully extended'
    },
    {
      name: 'Lateral Raises',
      sets: 3,
      reps: '12-15',
      restSeconds: 45,
      muscleGroup: 'shoulders',
      intensity: 'light',
      description: 'Raise dumbbells to the sides to target the lateral deltoids'
    },
    {
      name: 'Face Pulls',
      sets: 3,
      reps: '15-20',
      restSeconds: 45,
      muscleGroup: 'shoulders',
      intensity: 'light',
      description: 'Pull the rope attachment towards your face to target rear deltoids'
    },
    {
      name: 'Arnold Press',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      muscleGroup: 'shoulders',
      intensity: 'moderate',
      description: 'A dynamic pressing movement that rotates the shoulder through its range of motion'
    }
  ],
  legs: [
    {
      name: 'Squats',
      sets: 4,
      reps: '8-10',
      restSeconds: 120,
      muscleGroup: 'legs',
      intensity: 'intense',
      description: 'Bend your knees and hips to lower your body, then return to standing'
    },
    {
      name: 'Romanian Deadlifts',
      sets: 3,
      reps: '10-12',
      restSeconds: 90,
      muscleGroup: 'legs',
      intensity: 'intense',
      description: 'Lower the weight while keeping legs mostly straight to target hamstrings'
    },
    {
      name: 'Leg Press',
      sets: 3,
      reps: '12-15',
      restSeconds: 90,
      muscleGroup: 'legs',
      intensity: 'moderate',
      description: 'Push the weight platform away using your legs'
    },
    {
      name: 'Walking Lunges',
      sets: 3,
      reps: '10-12 each leg',
      restSeconds: 60,
      muscleGroup: 'legs',
      intensity: 'moderate',
      description: 'Step forward into a lunge position, then repeat with other leg'
    },
    {
      name: 'Calf Raises',
      sets: 4,
      reps: '15-20',
      restSeconds: 45,
      muscleGroup: 'legs',
      intensity: 'light',
      description: 'Raise your heels off the ground to target the calf muscles'
    }
  ],
  arms: [
    {
      name: 'Bicep Curls',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      muscleGroup: 'arms',
      intensity: 'moderate',
      description: 'Curl the weight up toward your shoulders to target the biceps'
    },
    {
      name: 'Tricep Pushdowns',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      muscleGroup: 'arms',
      intensity: 'moderate',
      description: 'Push the cable down to fully extend your arms, targeting triceps'
    },
    {
      name: 'Hammer Curls',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      muscleGroup: 'arms',
      intensity: 'moderate',
      description: 'Curl with palms facing inward to target the brachialis and forearms'
    },
    {
      name: 'Skull Crushers',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      muscleGroup: 'arms',
      intensity: 'moderate',
      description: 'Lying on a bench, lower the weight towards your forehead then extend arms'
    }
  ],
  core: [
    {
      name: 'Plank',
      sets: 3,
      reps: '30-60 seconds',
      restSeconds: 45,
      muscleGroup: 'core',
      intensity: 'moderate',
      description: 'Hold the top of a push-up position, engaging your core'
    },
    {
      name: 'Crunches',
      sets: 3,
      reps: '15-20',
      restSeconds: 45,
      muscleGroup: 'core',
      intensity: 'light',
      description: 'Lie on your back and curl your torso toward your knees'
    },
    {
      name: 'Russian Twists',
      sets: 3,
      reps: '20-30',
      restSeconds: 45,
      muscleGroup: 'core',
      intensity: 'moderate',
      description: 'Sitting with torso at 45 degrees, twist side to side touching the floor'
    },
    {
      name: 'Hanging Leg Raises',
      sets: 3,
      reps: '10-15',
      restSeconds: 60,
      muscleGroup: 'core',
      intensity: 'intense',
      description: 'Hanging from a bar, raise your legs until they are parallel to the ground'
    }
  ],
  cardio: [
    {
      name: 'Interval Sprints',
      sets: 10,
      reps: '30 secs sprint, 90 secs rest',
      restSeconds: 90,
      muscleGroup: 'cardio',
      intensity: 'intense',
      description: 'Alternate between all-out sprints and walking/jogging recovery'
    },
    {
      name: 'Jump Rope',
      sets: 4,
      reps: '2 minutes',
      restSeconds: 60,
      muscleGroup: 'cardio',
      intensity: 'moderate',
      description: 'Skipping rope to increase heart rate and improve coordination'
    },
    {
      name: 'Burpees',
      sets: 3,
      reps: '10-15',
      restSeconds: 60,
      muscleGroup: 'cardio',
      intensity: 'intense',
      description: 'Full body exercise combining a squat, push-up, and jump'
    },
    {
      name: 'Stair Climber',
      sets: 1,
      reps: '20 minutes',
      restSeconds: 0,
      muscleGroup: 'cardio',
      intensity: 'moderate',
      description: 'Climb stairs at a moderate to fast pace to elevate heart rate'
    }
  ],
  'full body': [
    {
      name: 'Thrusters',
      sets: 4,
      reps: '10-12',
      restSeconds: 90,
      muscleGroup: 'full body',
      intensity: 'intense',
      description: 'Combine a front squat with an overhead press in one fluid motion'
    },
    {
      name: 'Deadlifts',
      sets: 4,
      reps: '8-10',
      restSeconds: 120,
      muscleGroup: 'full body',
      intensity: 'intense',
      description: 'Lift a weight from the ground by extending hips and knees'
    },
    {
      name: 'Clean and Press',
      sets: 3,
      reps: '8-10',
      restSeconds: 90,
      muscleGroup: 'full body',
      intensity: 'intense',
      description: 'Explosive movement to lift weight from floor to overhead in two phases'
    },
    {
      name: 'Mountain Climbers',
      sets: 3,
      reps: '30-45 seconds',
      restSeconds: 45,
      muscleGroup: 'full body',
      intensity: 'moderate',
      description: 'In a push-up position, alternate bringing knees toward chest'
    }
  ]
};

/**
 * Generate personalized workout recommendations based on user data
 */
export function generateWorkoutRecommendations(user: User | undefined, count: number = 8): WorkoutRecommendation[] {
  // Selection of workout names for variety
  const workoutTitles = [
    'Ultimate Power Hour', 'Strong & Sculpted', 'Intensity Fusion',
    'Strength Foundation', 'Balanced Build', 'Metabolic Burn',
    'Power & Performance', 'Hypertrophy Focus', 'Endurance Builder',
    'Recovery Boost', 'Functional Fitness', 'Athletic Edge',
    'Total Body Transformer', 'Lean Machine', 'Explosive Power',
    'Core & More', 'Functional Strength', 'Conditioning Circuit'
  ];
  
  // If user is available, customize the workouts based on their profile
  let intensity = 'intermediate';
  let favoriteMuscleGroups = [...muscleGroups]; // Default to all muscle groups
  
  if (user) {
    // Customize based on experience level
    if (user.experienceLevel === 'beginner') {
      intensity = 'beginner';
    } else if (user.experienceLevel === 'advanced') {
      intensity = 'advanced';
    }
    
    // If user has workout focus data, prioritize those muscle groups
    // We're not using this data right now, but we could if the schema supports it
    // if (user.workoutFocus && user.workoutFocus.focusAreas) {
    //   const userFocusAreas = user.workoutFocus.focusAreas;
    //   // Prioritize but don't limit to only these areas
    //   favoriteMuscleGroups = [
    //     ...userFocusAreas.filter(area => muscleGroups.includes(area)),
    //     ...muscleGroups.filter(group => !userFocusAreas.includes(group))
    //   ];
    // }
  }
  
  // Generate the requested number of workout recommendations
  const recommendations: WorkoutRecommendation[] = [];
  
  for (let i = 0; i < count; i++) {
    // Select random muscle groups (1-3) with preference to user favorites
    const selectedGroups = selectRandomMuscleGroups(favoriteMuscleGroups, 1, 3);
    
    // Select random equipment (1-3)
    const selectedEquipment = selectRandomItems(equipmentOptions, 1, 3);
    
    // Determine workout duration based on intensity and muscle groups
    const duration = determineWorkoutDuration(intensity, selectedGroups);
    
    // Generate exercises for the selected muscle groups
    const exercises = generateExercisesForMuscleGroups(selectedGroups, intensity);
    
    // Generate a workout title
    const title = workoutTitles[Math.floor(Math.random() * workoutTitles.length)];
    
    // Generate a description based on the selected muscle groups and intensity
    const description = generateWorkoutDescription(selectedGroups, intensity);
    
    // Calculate approximate calories (very rough estimate)
    const calories = calculateApproximateCalories(duration, intensity);
    
    // Generate tags
    const tags = [
      ...selectedGroups,
      intensity,
      duration <= 30 ? 'quick' : duration >= 60 ? 'long session' : 'medium length',
      selectedEquipment.includes('none') ? 'no equipment' : 'equipment needed'
    ];
    
    // Create the workout recommendation
    recommendations.push({
      id: uuidv4(),
      title,
      description,
      durationMinutes: duration,
      intensity: intensity as 'beginner' | 'intermediate' | 'advanced',
      targetMuscleGroups: selectedGroups,
      exercises,
      calories,
      tags,
      equipment: selectedEquipment
    });
  }
  
  return recommendations;
}

/**
 * Generate a targeted workout for specific muscle groups and parameters
 */
export function generateTargetedWorkout(
  targetMuscleGroups: string[],
  intensity: string,
  durationMinutes: number
): WorkoutRecommendation {
  // Validate muscle groups
  const validMuscleGroups = targetMuscleGroups.filter(group => 
    muscleGroups.includes(group)
  );
  
  // If no valid muscle groups, select random ones
  if (validMuscleGroups.length === 0) {
    validMuscleGroups.push(...selectRandomMuscleGroups(muscleGroups, 1, 2));
  }
  
  // Validate intensity
  let workoutIntensity: 'beginner' | 'intermediate' | 'advanced';
  if (['beginner', 'intermediate', 'advanced'].includes(intensity)) {
    workoutIntensity = intensity as 'beginner' | 'intermediate' | 'advanced';
  } else {
    workoutIntensity = 'intermediate';
  }
  
  // Generate exercises for the selected muscle groups
  const exercises = generateExercisesForMuscleGroups(validMuscleGroups, workoutIntensity);
  
  // Adjust the number of exercises based on the requested duration
  adjustExercisesForDuration(exercises, durationMinutes);
  
  // Generate a workout title
  const title = `Custom ${validMuscleGroups.join('/')} Workout`;
  
  // Generate a description
  const description = generateWorkoutDescription(validMuscleGroups, workoutIntensity);
  
  // Calculate approximate calories
  const calories = calculateApproximateCalories(durationMinutes, workoutIntensity);
  
  // Select random equipment based on the exercises
  const equipmentNeeded = getEquipmentFromExercises(exercises);
  
  // Generate tags
  const tags = [
    ...validMuscleGroups,
    workoutIntensity,
    durationMinutes <= 30 ? 'quick' : durationMinutes >= 60 ? 'long session' : 'medium length',
    'custom'
  ];
  
  return {
    id: uuidv4(),
    title,
    description,
    durationMinutes,
    intensity: workoutIntensity,
    targetMuscleGroups: validMuscleGroups,
    exercises,
    calories,
    tags,
    equipment: equipmentNeeded
  };
}

// --- Helper functions ---

function selectRandomMuscleGroups(muscleGroups: string[], min: number, max: number): string[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  return selectRandomItems(muscleGroups, count, count);
}

function selectRandomItems<T>(items: T[], min: number, max: number): T[] {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  const count = min + Math.floor(Math.random() * (max - min + 1));
  return shuffled.slice(0, count);
}

function determineWorkoutDuration(intensity: string, muscleGroups: string[]): number {
  // Base duration
  let duration = 45;
  
  // Adjust based on intensity
  if (intensity === 'beginner') {
    duration -= 15;
  } else if (intensity === 'advanced') {
    duration += 15;
  }
  
  // Adjust based on number of muscle groups
  duration += (muscleGroups.length - 1) * 10;
  
  // Add some randomness
  duration += Math.floor(Math.random() * 10) - 5;
  
  // Ensure it's in a reasonable range
  return Math.max(20, Math.min(90, duration));
}

function generateExercisesForMuscleGroups(muscleGroups: string[], intensity: string): Exercise[] {
  const exercises: Exercise[] = [];
  const maxExercisesPerGroup = intensity === 'beginner' ? 2 : 
                              intensity === 'intermediate' ? 3 : 4;
  
  muscleGroups.forEach(group => {
    if (exercisesByMuscleGroup[group]) {
      const groupExercises = exercisesByMuscleGroup[group];
      const shuffled = [...groupExercises].sort(() => 0.5 - Math.random());
      const count = 1 + Math.floor(Math.random() * maxExercisesPerGroup);
      
      // Get exercises for this muscle group
      const selectedExercises = shuffled.slice(0, count);
      
      // Add them to our workout
      exercises.push(...selectedExercises);
    }
  });
  
  return exercises;
}

function adjustExercisesForDuration(exercises: Exercise[], targetDuration: number): void {
  // Calculate current estimated duration
  let currentDuration = exercises.reduce((total, ex) => {
    const setsTime = ex.sets * (typeof ex.reps === 'string' ? 
      parseInt(ex.reps.split('-')[1] || '12') : ex.reps) * 3; // rough estimate of seconds per rep
    const restTime = ex.sets * ex.restSeconds;
    return total + setsTime + restTime;
  }, 0) / 60; // Convert to minutes
  
  // Adjust if needed
  if (Math.abs(currentDuration - targetDuration) > 10) {
    const ratio = targetDuration / currentDuration;
    
    exercises.forEach(ex => {
      // Adjust sets
      ex.sets = Math.max(2, Math.min(5, Math.round(ex.sets * ratio)));
      
      // Adjust rest times slightly
      ex.restSeconds = Math.max(30, Math.min(120, Math.round(ex.restSeconds * Math.sqrt(ratio))));
    });
  }
}

function generateWorkoutDescription(muscleGroups: string[], intensity: string): string {
  const intensityPhrases = {
    beginner: 'An accessible workout designed for beginners focusing on proper form and building a foundation',
    intermediate: 'A balanced workout that challenges your strength and endurance',
    advanced: 'A high-intensity workout designed to push your limits and maximize muscle growth'
  };
  
  const musclePhrase = muscleGroups.length > 1 
    ? `targeting ${muscleGroups.slice(0, -1).join(', ')} and ${muscleGroups[muscleGroups.length - 1]}`
    : `focused on ${muscleGroups[0]}`;
  
  return `${intensityPhrases[intensity as keyof typeof intensityPhrases]} ${musclePhrase}.`;
}

function calculateApproximateCalories(durationMinutes: number, intensity: string): number {
  // Very rough estimate
  const baseRate = intensity === 'beginner' ? 6 :
                  intensity === 'intermediate' ? 8 : 10; // calories per minute
  
  // Add randomness for variety
  const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
  
  return Math.round(durationMinutes * baseRate * randomFactor);
}

function getEquipmentFromExercises(exercises: Exercise[]): string[] {
  // This is a simplification since our exercise data doesn't include equipment
  // In a real app, you'd have equipment info for each exercise
  const needsEquipment = exercises.some(ex => 
    ex.name.includes('Dumbbell') || 
    ex.name.includes('Barbell') || 
    ex.name.includes('Cable') ||
    ex.name.includes('Machine')
  );
  
  if (needsEquipment) {
    return selectRandomItems(
      equipmentOptions.filter(eq => eq !== 'none'), 
      2, 
      3
    );
  } else {
    return ['bodyweight', 'none'];
  }
}