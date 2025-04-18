import { db } from "../db";
import { 
  workoutCheckins, 
  workoutExports, 
  fitnessIntegrations,
  WorkoutCheckin,
  fitnessPlatforms,
  exportFileFormats
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Directory for storing exported workout files
const EXPORT_DIR = path.join(process.cwd(), "public", "exports");

// Ensure the export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * Service for handling workout exports to various fitness platforms
 */
export class ExportService {
  /**
   * Get user's workout check-ins
   */
  async getUserWorkouts(userId: number): Promise<WorkoutCheckin[]> {
    return await db
      .select()
      .from(workoutCheckins)
      .where(eq(workoutCheckins.userId, userId))
      .orderBy(desc(workoutCheckins.date));
  }

  /**
   * Create a workout export request
   */
  async createExportRequest(userId: number, workoutIds: number[], platform: string, format: string) {
    // Validate platform and format
    if (!fitnessPlatforms.includes(platform as any)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!exportFileFormats.includes(format as any)) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    // Create the export record
    const [exportRecord] = await db
      .insert(workoutExports)
      .values({
        userId,
        workoutIds: workoutIds.join(","),
        platform,
        format,
        status: "pending",
      })
      .returning();

    // Process the export (this would typically be done in a background job)
    await this.processExport(exportRecord.id);

    return exportRecord;
  }

  /**
   * Process a workout export request
   */
  async processExport(exportId: number) {
    // Get the export record
    const [exportRecord] = await db
      .select()
      .from(workoutExports)
      .where(eq(workoutExports.id, exportId));

    if (!exportRecord) {
      throw new Error(`Export record not found: ${exportId}`);
    }

    try {
      // Update status to processing
      await db
        .update(workoutExports)
        .set({ status: "processing" })
        .where(eq(workoutExports.id, exportId));

      // Get the workouts
      const workoutIds = exportRecord.workoutIds.split(",").map(id => parseInt(id));
      const workouts = await db
        .select()
        .from(workoutCheckins)
        .where(and(
          eq(workoutCheckins.userId, exportRecord.userId),
          inArray(workoutCheckins.id, workoutIds)
        ));

      // Generate the export file based on format
      const fileName = `workout_export_${exportRecord.userId}_${Date.now()}.${exportRecord.format}`;
      const filePath = path.join(EXPORT_DIR, fileName);
      
      switch (exportRecord.format) {
        case "json":
          await this.generateJsonExport(workouts, filePath);
          break;
        case "csv":
          await this.generateCsvExport(workouts, filePath);
          break;
        case "gpx":
          await this.generateGpxExport(workouts, filePath);
          break;
        case "tcx":
          await this.generateTcxExport(workouts, filePath);
          break;
        case "fit":
          await this.generateFitExport(workouts, filePath);
          break;
        default:
          throw new Error(`Unsupported export format: ${exportRecord.format}`);
      }

      // Update status to completed with export URL
      const exportUrl = `/exports/${fileName}`;
      await db
        .update(workoutExports)
        .set({ 
          status: "completed", 
          exportUrl, 
          completedAt: new Date() 
        })
        .where(eq(workoutExports.id, exportId));

      // Return the export URL
      return exportUrl;
    } catch (error) {
      // Update status to failed with error message
      await db
        .update(workoutExports)
        .set({ 
          status: "failed", 
          errorMessage: error instanceof Error ? error.message : "Unknown error" 
        })
        .where(eq(workoutExports.id, exportId));

      throw error;
    }
  }

  /**
   * Generate a JSON export file
   */
  async generateJsonExport(workouts: WorkoutCheckin[], filePath: string) {
    const data = JSON.stringify(workouts, null, 2);
    fs.writeFileSync(filePath, data);
  }

  /**
   * Generate a CSV export file
   */
  async generateCsvExport(workouts: WorkoutCheckin[], filePath: string) {
    // CSV header
    const header = "id,date,workoutType,duration,verified,partnerId,meetupId,notes\n";
    
    // CSV rows
    const rows = workouts.map(workout => {
      return `${workout.id},${workout.date},${workout.workoutType},${workout.duration},${workout.verified},${workout.partnerId || ""},${workout.meetupId || ""},${(workout.notes || "").replace(",", " ")}`;
    }).join("\n");

    // Write to file
    fs.writeFileSync(filePath, header + rows);
  }

  /**
   * Generate a GPX export file
   */
  async generateGpxExport(workouts: WorkoutCheckin[], filePath: string) {
    // Simple GPX template
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx += '<gpx version="1.1" creator="SpotMe Workout App" xmlns="http://www.topografix.com/GPX/1/1">\n';
    
    for (const workout of workouts) {
      const date = new Date(workout.date).toISOString();
      gpx += `  <trk>\n`;
      gpx += `    <name>${workout.workoutType} Workout</name>\n`;
      gpx += `    <time>${date}</time>\n`;
      gpx += `    <desc>Duration: ${workout.duration} minutes</desc>\n`;
      gpx += `  </trk>\n`;
    }
    
    gpx += '</gpx>';
    
    fs.writeFileSync(filePath, gpx);
  }

  /**
   * Generate a TCX export file
   */
  async generateTcxExport(workouts: WorkoutCheckin[], filePath: string) {
    // Simple TCX template
    let tcx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    tcx += '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">\n';
    tcx += '  <Activities>\n';
    
    for (const workout of workouts) {
      const date = new Date(workout.date).toISOString();
      const endDate = new Date(new Date(workout.date).getTime() + workout.duration * 60000).toISOString();
      
      tcx += '    <Activity Sport="Other">\n';
      tcx += `      <Id>${date}</Id>\n`;
      tcx += '      <Lap StartTime="' + date + '">\n';
      tcx += `        <TotalTimeSeconds>${workout.duration * 60}</TotalTimeSeconds>\n`;
      tcx += '        <Notes>' + (workout.notes || workout.workoutType + ' workout') + '</Notes>\n';
      tcx += '      </Lap>\n';
      tcx += '    </Activity>\n';
    }
    
    tcx += '  </Activities>\n';
    tcx += '</TrainingCenterDatabase>';
    
    fs.writeFileSync(filePath, tcx);
  }

  /**
   * Generate a FIT export file (simplified)
   */
  async generateFitExport(workouts: WorkoutCheckin[], filePath: string) {
    // For now, just create a JSON file with .fit extension
    // In a real implementation, you would use a FIT SDK
    const data = JSON.stringify(workouts, null, 2);
    fs.writeFileSync(filePath, data);
  }

  /**
   * Get user's fitness platform integrations
   */
  async getUserIntegrations(userId: number) {
    return await db
      .select()
      .from(fitnessIntegrations)
      .where(eq(fitnessIntegrations.userId, userId));
  }

  /**
   * Add or update a fitness platform integration
   */
  async upsertIntegration(userId: number, platform: string, tokenData: any) {
    // Check if integration exists
    const [existingIntegration] = await db
      .select()
      .from(fitnessIntegrations)
      .where(and(
        eq(fitnessIntegrations.userId, userId),
        eq(fitnessIntegrations.platform, platform)
      ));

    if (existingIntegration) {
      // Update existing integration
      const [updatedIntegration] = await db
        .update(fitnessIntegrations)
        .set({
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken || null,
          tokenExpiry: tokenData.expiresAt ? new Date(tokenData.expiresAt) : null,
          scope: tokenData.scope || null,
          connected: true,
          updatedAt: new Date()
        })
        .where(eq(fitnessIntegrations.id, existingIntegration.id))
        .returning();

      return updatedIntegration;
    } else {
      // Create new integration
      const [newIntegration] = await db
        .insert(fitnessIntegrations)
        .values({
          userId,
          platform,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken || null,
          tokenExpiry: tokenData.expiresAt ? new Date(tokenData.expiresAt) : null,
          scope: tokenData.scope || null,
          connected: true
        })
        .returning();

      return newIntegration;
    }
  }

  /**
   * Disconnect a fitness platform integration
   */
  async disconnectIntegration(userId: number, platform: string) {
    return await db
      .update(fitnessIntegrations)
      .set({
        connected: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(fitnessIntegrations.userId, userId),
        eq(fitnessIntegrations.platform, platform)
      ));
  }

  /**
   * Get user's export history
   */
  async getUserExports(userId: number) {
    return await db
      .select()
      .from(workoutExports)
      .where(eq(workoutExports.userId, userId))
      .orderBy(desc(workoutExports.createdAt));
  }
}

// Export a singleton instance
export const exportService = new ExportService();