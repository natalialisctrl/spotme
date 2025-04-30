import express from 'express';
import { storage } from '../storage';

const router = express.Router();

// Get all notifications for current user
router.get('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const notifications = await storage.getUserNotifications(req.user.id);
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Get unread notifications for current user
router.get('/unread', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const notifications = await storage.getUserUnreadNotifications(req.user.id);
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ message: 'Error fetching unread notifications' });
  }
});

// Mark a notification as read
router.patch('/:id/read', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const notificationId = parseInt(req.params.id);
  if (isNaN(notificationId)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }

  try {
    // First check if the notification belongs to the current user
    const notification = await storage.getNotification(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: 'You cannot modify this notification' });
    }

    const updatedNotification = await storage.markNotificationAsRead(notificationId);
    res.status(200).json(updatedNotification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    await storage.markAllNotificationsAsRead(req.user.id);
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

// Delete a notification
router.delete('/:id', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const notificationId = parseInt(req.params.id);
  if (isNaN(notificationId)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }

  try {
    // First check if the notification belongs to the current user
    const notification = await storage.getNotification(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: 'You cannot delete this notification' });
    }

    const success = await storage.deleteNotification(notificationId);
    if (success) {
      res.status(200).json({ message: 'Notification deleted' });
    } else {
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const preferences = await storage.getUserNotificationPreferences(req.user.id);
    res.status(200).json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: 'Error fetching notification preferences' });
  }
});

// Update notification preferences
router.patch('/preferences/:type', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { type } = req.params;
  const { enabled, emailEnabled, pushEnabled } = req.body;

  if (typeof enabled !== 'boolean' || typeof emailEnabled !== 'boolean' || typeof pushEnabled !== 'boolean') {
    return res.status(400).json({ message: 'Invalid preference values' });
  }

  try {
    const preference = await storage.updateNotificationPreference(
      req.user.id,
      type,
      enabled,
      emailEnabled,
      pushEnabled
    );

    if (preference) {
      res.status(200).json(preference);
    } else {
      res.status(500).json({ message: 'Failed to update notification preference' });
    }
  } catch (error) {
    console.error('Error updating notification preference:', error);
    res.status(500).json({ message: 'Error updating notification preference' });
  }
});

// Initialize default notification preferences
router.post('/preferences/initialize', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const preferences = await storage.createDefaultNotificationPreferences(req.user.id);
    res.status(200).json(preferences);
  } catch (error) {
    console.error('Error initializing notification preferences:', error);
    res.status(500).json({ message: 'Error initializing notification preferences' });
  }
});

export default router;