import { BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'wouter';

export function NotificationBell() {
  const [, navigate] = useLocation();
  const {
    unreadNotifications,
    isLoadingUnread,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  const hasUnread = unreadNotifications.length > 0;

  if (isLoadingUnread) {
    return (
      <Button variant="ghost" size="icon" className="relative" disabled>
        <BellIcon className="h-5 w-5" />
        <Skeleton className="absolute -top-1 -right-1 h-4 w-4 rounded-full" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          {hasUnread && (
            <Badge 
              className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 bg-red-500"
              variant="destructive"
            >
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between p-2">
          <h3 className="text-sm font-medium">Notifications</h3>
          {hasUnread && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-80 overflow-y-auto">
          {unreadNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            unreadNotifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="p-0 focus:bg-transparent">
                <NotificationItem notification={notification} />
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="p-2 text-center cursor-pointer hover:bg-muted"
          onClick={() => navigate('/notifications')}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}