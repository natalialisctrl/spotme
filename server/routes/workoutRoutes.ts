import express, { Request, Response } from 'express';
import { 
  generateWorkoutRecommendations, 
  generateTargetedWorkout 
} from '../services/workoutService';

const router = express.Router();

// Get personalized workout recommendations for the current user
router.get('/recommendations', (req: Request, res: Response) => {
  try {
    // If user is logged in, use their info for personalization
    // Otherwise, return generic recommendations
    const count = req.query.count ? parseInt(req.query.count as string) : 8;
    const workouts = generateWorkoutRecommendations(req.user, count);
    
    res.json({ workouts });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating workout recommendations:', errorMessage);
    res.status(500).json({ 
      message: 'Failed to generate workout recommendations',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    });
  }
});

// Get a targeted workout based on specified criteria
router.post('/targeted', (req: Request, res: Response) => {
  try {
    const { targetMuscleGroups, intensity, duration } = req.body;
    
    if (!targetMuscleGroups || !Array.isArray(targetMuscleGroups) || !intensity || !duration) {
      return res.status(400).json({ 
        message: 'Missing required parameters: targetMuscleGroups, intensity, and duration are required' 
      });
    }
    
    const workout = generateTargetedWorkout(
      targetMuscleGroups,
      intensity,
      duration
    );
    
    res.json({ workout });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating targeted workout:', errorMessage);
    res.status(500).json({ 
      message: 'Failed to generate targeted workout',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    });
  }
});

export default router;