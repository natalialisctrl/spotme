import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Schema for gym verification data
const gymVerificationSchema = z.object({
  gymChain: z.string().nullable(),
  gymName: z.string().nullable(),
  gymAddress: z.string().nullable(),
  gymMemberId: z.string().nullable(),
  gymVerified: z.boolean().optional()
});

/**
 * Verify gym information and update user profile
 */
router.post('/verify-gym', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in session" });
    }
    
    const result = gymVerificationSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid gym information", 
        errors: result.error.format() 
      });
    }
    
    const gymData = result.data;
    
    // Check if we need to verify membership with gym API
    const shouldVerifyMembership = 
      gymData.gymChain && 
      gymData.gymChain !== "Other" && 
      gymData.gymMemberId;
    
    let gymVerified = false;
    
    if (shouldVerifyMembership) {
      // In a real implementation, we would verify with the gym's API
      // For now, we'll simulate a verification by checking if the member ID has valid format
      gymVerified = gymData.gymMemberId.length >= 5;
    }
    
    // Update user's gym information
    await storage.updateUser(userId, {
      gymChain: gymData.gymChain,
      gymName: gymData.gymChain === "Other" ? gymData.gymName : gymData.gymChain,
      gymAddress: gymData.gymAddress,
      gymMemberId: gymData.gymMemberId,
      gymVerified: gymVerified
    });
    
    return res.status(200).json({ 
      success: true,
      message: "Gym information updated successfully",
      verified: gymVerified
    });
  } catch (error) {
    console.error("Error updating gym information:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error updating gym information"
    });
  }
});

/**
 * Update user's gym information
 */
router.post('/update-gym-info', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in session" });
    }
    
    const result = gymVerificationSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: "Invalid gym information", 
        errors: result.error.format() 
      });
    }
    
    const gymData = result.data;
    
    // Update user's gym information
    await storage.updateUser(userId, {
      gymChain: gymData.gymChain,
      gymName: gymData.gymName,
      gymAddress: gymData.gymAddress,
      gymMemberId: gymData.gymMemberId,
      gymVerified: gymData.gymVerified || false
    });
    
    return res.status(200).json({ 
      success: true,
      message: "Gym information updated successfully"
    });
  } catch (error) {
    console.error("Error updating gym information:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error updating gym information"
    });
  }
});

/**
 * Get a list of common gym chains
 */
router.get('/gym-chains', async (_req: Request, res: Response) => {
  try {
    const gymChains = [
      "24 Hour Fitness",
      "Anytime Fitness",
      "LA Fitness",
      "Planet Fitness",
      "Gold's Gym",
      "Crunch Fitness",
      "Orangetheory Fitness",
      "YMCA",
      "Equinox",
      "Life Time Fitness",
      "Snap Fitness",
      "Retro Fitness",
      "Blink Fitness",
      "F45 Training",
      "CrossFit",
      "Pure Barre",
      "SoulCycle",
      "The Bar Method",
      "CorePower Yoga",
      "UFC Gym"
    ];
    
    return res.status(200).json({ 
      success: true,
      gymChains
    });
  } catch (error) {
    console.error("Error fetching gym chains:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error fetching gym chains" 
    });
  }
});

/**
 * Verify gym membership
 * Note: In a real implementation, this would attempt to verify with actual gym APIs
 */
router.post('/verify-membership', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in session" });
    }
    
    const { gymChain, gymMemberId } = req.body;
    
    if (!gymChain || !gymMemberId) {
      return res.status(400).json({ message: "Gym chain and member ID are required" });
    }
    
    // In a real implementation, you would verify the membership with the gym's API
    // For now, we'll simulate a verification by checking if the member ID has valid format
    
    // Simple validation (this would be more complex in a real implementation)
    const isValid = gymMemberId.length >= 5;
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid membership ID format" 
      });
    }
    
    // Update the user's gym verification status
    await storage.updateUser(userId, {
      gymVerified: true
    });
    
    return res.status(200).json({
      success: true,
      message: "Gym membership verified successfully"
    });
  } catch (error) {
    console.error("Error verifying gym membership:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error verifying gym membership" 
    });
  }
});

/**
 * Search for nearby gyms
 * Note: In a real implementation, this would use a mapping API to search
 */
router.get('/nearby-gyms', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }
    
    // In a real implementation, this would fetch gyms from a mapping API
    // For now, we'll return some mock data
    const nearbyGyms = [
      {
        name: "24 Hour Fitness - Downtown",
        address: "123 Main St, Austin, TX 78701",
        distance: 0.8,
        chain: "24 Hour Fitness"
      },
      {
        name: "Gold's Gym - Riverside",
        address: "456 Riverside Dr, Austin, TX 78704",
        distance: 1.2,
        chain: "Gold's Gym"
      },
      {
        name: "Planet Fitness - North",
        address: "789 North Loop, Austin, TX 78751",
        distance: 2.5,
        chain: "Planet Fitness"
      },
      {
        name: "LA Fitness - Westlake",
        address: "101 Westlake Dr, Austin, TX 78746",
        distance: 3.1,
        chain: "LA Fitness"
      }
    ];
    
    return res.status(200).json({
      success: true,
      gyms: nearbyGyms
    });
  } catch (error) {
    console.error("Error searching nearby gyms:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error searching nearby gyms" 
    });
  }
});

export default router;