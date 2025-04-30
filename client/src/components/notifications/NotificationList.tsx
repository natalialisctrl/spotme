import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export function NotificationList() {
  const {
    notifications,
    unreadNotifications,
    isLoadingNotifications,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  if (isLoadingNotifications) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasUnread = unreadNotifications.length > 0;
  const hasNotifications = notifications.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notifications</h2>
        {hasUnread && (
          <Button 
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllAsRead}
          >
            {isMarkingAllAsRead ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Marking as read...
              </>
            ) : (
              'Mark all as read'
            )}
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadNotifications.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {!hasNotifications ? (
            <div className="text-center p-8 text-muted-foreground">
              You don't have any notifications.
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  detailed
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="unread" className="mt-4">
          {!hasUnread ? (
            <div className="text-center p-8 text-muted-foreground">
              You don't have any unread notifications.
            </div>
          ) : (
            <div className="space-y-2">
              {unreadNotifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  detailed
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}