import { NotificationList } from '@/components/notifications/NotificationList';
import { Container } from '@/components/layout/Container';

export default function NotificationsPage() {
  return (
    <Container>
      <div className="py-6">
        <NotificationList />
      </div>
    </Container>
  );
}