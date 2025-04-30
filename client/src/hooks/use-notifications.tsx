import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt: string | null;
  expiresAt: string | null;
  actionLink: string | null;
  relatedEntityId: number | null;
  relatedEntityType: string | null;
  metadata: any;
}

export function useNotifications() {
  const { toast } = useToast();

  // Get all notifications for current user
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: getQueryFn(),
  });

  // Get unread notifications
  const {
    data: unreadNotifications = [],
    isLoading: isLoadingUnread,
    error: unreadError,
    refetch: refetchUnread,
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/unread'],
    queryFn: getQueryFn(),
  });

  // Get notification preferences
  const {
    data: preferences = [],
    isLoading: isLoadingPreferences,
    error: preferencesError,
    refetch: refetchPreferences,
  } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    queryFn: getQueryFn(),
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to mark notification as read: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/notifications/mark-all-read');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to mark all notifications as read: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest('DELETE', `/api/notifications/${notificationId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete notification: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update notification preference
  const updatePreferenceMutation = useMutation({
    mutationFn: async ({
      type,
      enabled,
      emailEnabled,
      pushEnabled,
    }: {
      type: string;
      enabled: boolean;
      emailEnabled: boolean;
      pushEnabled: boolean;
    }) => {
      const res = await apiRequest('PATCH', `/api/notifications/preferences/${type}`, {
        enabled,
        emailEnabled,
        pushEnabled,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: 'Success',
        description: 'Notification preference updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update notification preference: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Initialize notification preferences if they don't exist
  const initializePreferencesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/notifications/preferences/initialize');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
    },
    onError: (error: Error) => {
      console.error('Failed to initialize notification preferences:', error);
    },
  });

  return {
    notifications,
    unreadNotifications,
    preferences,
    isLoadingNotifications,
    isLoadingUnread,
    isLoadingPreferences,
    notificationsError,
    unreadError,
    preferencesError,
    refetchNotifications,
    refetchUnread,
    refetchPreferences,
    markAsRead: markAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    deleteNotification: deleteNotificationMutation.mutate,
    isDeletingNotification: deleteNotificationMutation.isPending,
    updatePreference: updatePreferenceMutation.mutate,
    isUpdatingPreference: updatePreferenceMutation.isPending,
    initializePreferences: initializePreferencesMutation.mutate,
    isInitializingPreferences: initializePreferencesMutation.isPending,
  };
}