import { useNavigate } from 'wouter';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Notification, useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  detailed?: boolean;
}

export function NotificationItem({ notification, detailed = false }: NotificationItemProps) {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotifications();
  
  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.actionLink) {
      navigate(notification.actionLink);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_connection_request':
        return '👋';
      case 'connection_request_accepted':
        return '✅';
      case 'new_message':
        return '💬';
      default:
        return '🔔';
    }
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  };

  return (
    <Card 
      className={`w-full p-3 cursor-pointer flex justify-between items-start gap-2 ${!notification.read ? 'bg-accent/30' : ''} ${detailed ? 'mb-2' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl">{getNotificationIcon(notification.type)}</div>
        <div className="flex-1">
          <div className="font-medium">{notification.title}</div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <div className="text-xs text-muted-foreground mt-1">
            {getTimeAgo(notification.createdAt)}
          </div>
        </div>
      </div>
      {detailed && (
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6 rounded-full" 
          onClick={handleDelete}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Card>
  );
}