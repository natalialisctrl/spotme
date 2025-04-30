import { Express, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { notifications, notificationTypes, insertNotificationSchema } from '@shared/schema';

/**
 * Middleware to ensure the user is authenticated
 */
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
}

/**
 * Setup notification routes
 */
export function setupNotificationRoutes(app: Express) {
  // Get all notifications for the current user
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userNotifications = await storage.getNotifications(userId);
      res.json(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Get unread notifications for the current user
  app.get('/api/notifications/unread', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const unreadNotifications = await storage.getUnreadNotifications(userId);
      res.json(unreadNotifications);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      res.status(500).json({ message: 'Failed to fetch unread notifications' });
    }
  });

  // Mark a notification as read
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const notificationId = parseInt(req.params.id, 10);
      
      // Ensure the notification belongs to the user
      const notification = await storage.getNotification(notificationId);
      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/mark-all-read', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  // Delete a notification
  app.delete('/api/notifications/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const notificationId = parseInt(req.params.id, 10);
      
      // Ensure the notification belongs to the user
      const notification = await storage.getNotification(notificationId);
      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      await storage.deleteNotification(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });

  // Get notification preferences
  app.get('/api/notifications/preferences', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const preferences = await storage.getNotificationPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ message: 'Failed to fetch notification preferences' });
    }
  });

  // Update notification preference
  app.patch('/api/notifications/preferences/:type', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const type = req.params.type;
      
      // Validate notification type
      if (!notificationTypes.includes(type as any)) {
        return res.status(400).json({ message: 'Invalid notification type' });
      }
      
      const { enabled, emailEnabled, pushEnabled } = req.body;
      
      // Validate request body
      if (typeof enabled !== 'boolean' || 
          typeof emailEnabled !== 'boolean' || 
          typeof pushEnabled !== 'boolean') {
        return res.status(400).json({ message: 'Invalid request body' });
      }
      
      const preference = await storage.updateNotificationPreference(
        userId, 
        type, 
        { enabled, emailEnabled, pushEnabled }
      );
      
      res.json(preference);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      res.status(500).json({ message: 'Failed to update notification preference' });
    }
  });

  // Initialize notification preferences (default settings for all types)
  app.post('/api/notifications/preferences/initialize', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.initializeNotificationPreferences(userId);
      const preferences = await storage.getNotificationPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error('Error initializing notification preferences:', error);
      res.status(500).json({ message: 'Failed to initialize notification preferences' });
    }
  });
}