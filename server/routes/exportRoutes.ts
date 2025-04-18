import { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { exportService } from "../services/exportService";
import { fitnessPlatforms, exportFileFormats } from "@shared/schema";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

// Export workout data validation schema
const exportWorkoutSchema = z.object({
  workoutIds: z.array(z.number()).min(1, "At least one workout must be selected"),
  platform: z.enum(fitnessPlatforms as unknown as [string, ...string[]]),
  format: z.enum(exportFileFormats as unknown as [string, ...string[]])
});

// Platform integration validation schema
const platformIntegrationSchema = z.object({
  platform: z.enum(fitnessPlatforms as unknown as [string, ...string[]]),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  scope: z.string().optional()
});

export function setupExportRoutes(app: Express) {
  // Get user's workout history
  app.get('/api/workouts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const workouts = await exportService.getUserWorkouts(userId);
      return res.json(workouts);
    } catch (error) {
      console.error("Error getting user workouts:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get workouts"
      });
    }
  });

  // Create a workout export
  app.post('/api/workouts/export', isAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const validation = exportWorkoutSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error.message
        });
      }

      const userId = req.session!.userId!;
      const { workoutIds, platform, format } = validation.data;

      // Create export request
      const exportRecord = await exportService.createExportRequest(
        userId,
        workoutIds,
        platform,
        format
      );

      return res.json({
        success: true,
        export: exportRecord
      });
    } catch (error) {
      console.error("Error exporting workouts:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to export workouts"
      });
    }
  });

  // Get user's export history
  app.get('/api/workouts/exports', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const exports = await exportService.getUserExports(userId);
      return res.json(exports);
    } catch (error) {
      console.error("Error getting export history:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get export history"
      });
    }
  });

  // Get user's fitness platform integrations
  app.get('/api/integrations', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const integrations = await exportService.getUserIntegrations(userId);
      return res.json(integrations);
    } catch (error) {
      console.error("Error getting user integrations:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get integrations"
      });
    }
  });

  // Connect to a fitness platform
  app.post('/api/integrations/connect', isAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const validation = platformIntegrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error.message
        });
      }

      const userId = req.session!.userId!;
      const { platform, ...tokenData } = validation.data;

      // Update or create integration
      const integration = await exportService.upsertIntegration(
        userId,
        platform,
        tokenData
      );

      return res.json({
        success: true,
        integration
      });
    } catch (error) {
      console.error("Error connecting to fitness platform:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect"
      });
    }
  });

  // Disconnect from a fitness platform
  app.post('/api/integrations/disconnect', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const { platform } = req.body;

      if (!platform || !fitnessPlatforms.includes(platform as any)) {
        return res.status(400).json({
          success: false,
          error: "Invalid platform"
        });
      }

      await exportService.disconnectIntegration(userId, platform);

      return res.json({
        success: true,
        message: `Successfully disconnected from ${platform}`
      });
    } catch (error) {
      console.error("Error disconnecting from fitness platform:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to disconnect"
      });
    }
  });
}