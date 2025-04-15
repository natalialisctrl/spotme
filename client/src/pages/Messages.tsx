import { FC, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Connection, Message } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import ChatInterface from "@/components/chat/ChatInterface";
import { Loader2, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";

interface ConnectionWithUser extends Connection {
  otherUser: User;
}

const Messages: FC = () => {
  const { user } = useAuth();
  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithUser | null>(null);
  const socket = useWebSocket(user?.id);

  // Get all connections
  const { data: connections, isLoading } = useQuery<ConnectionWithUser[]>({
    queryKey: ['/api/connections'],
    enabled: !!user,
  });

  // Get unread message counts for each connection
  const { data: messagesByConnection } = useQuery<Record<number, Message[]>>({
    queryKey: ['/api/connections/messages'],
    queryFn: async () => {
      if (!connections) return {};
      
      const messagesByConnectionId: Record<number, Message[]> = {};
      
      // Fetch messages for each connection
      await Promise.all(
        connections.map(async (connection) => {
          try {
            const response = await fetch(`/api/connections/${connection.id}/messages`, {
              credentials: 'include'
            });
            
            if (response.ok) {
              const messages = await response.json();
              messagesByConnectionId[connection.id] = messages;
            }
          } catch (error) {
            console.error(`Failed to fetch messages for connection ${connection.id}:`, error);
          }
        })
      );
      
      return messagesByConnectionId;
    },
    enabled: !!connections && connections.length > 0,
  });

  // Calculate unread messages
  const getUnreadCount = (connectionId: number): number => {
    if (!messagesByConnection || !messagesByConnection[connectionId] || !user) {
      return 0;
    }
    
    return messagesByConnection[connectionId].filter(
      msg => !msg.read && msg.senderId !== user.id
    ).length;
  };

  // Format timestamp for last message
  const formatLastMessageTime = (connectionId: number): string => {
    if (!messagesByConnection || !messagesByConnection[connectionId] || messagesByConnection[connectionId].length === 0) {
      return '';
    }
    
    const messages = messagesByConnection[connectionId];
    const lastMessage = messages[messages.length - 1];
    const date = new Date(lastMessage.timestamp);
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get last message text
  const getLastMessageText = (connectionId: number): string => {
    if (!messagesByConnection || !messagesByConnection[connectionId] || messagesByConnection[connectionId].length === 0) {
      return 'No messages yet';
    }
    
    const messages = messagesByConnection[connectionId];
    const lastMessage = messages[messages.length - 1];
    
    return lastMessage.content.length > 30
      ? `${lastMessage.content.substring(0, 30)}...`
      : lastMessage.content;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No messages yet</h3>
        <p className="text-gray-500 mb-6 max-w-md">
          Connect with gym partners to start messaging. You'll see your conversations here.
        </p>
        <Button onClick={() => window.location.href = "/"}>
          Find Partners
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
      {/* Connection list */}
      <div className="md:col-span-1 bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>
        <ScrollArea className="h-[calc(100%-60px)]">
          {connections.map((connection) => (
            <div key={connection.id}>
              <button
                className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 text-left ${
                  selectedConnection?.id === connection.id ? 'bg-gray-50' : ''
                }`}
                onClick={() => setSelectedConnection(connection)}
              >
                <Avatar className="h-10 w-10 flex-shrink-0 bg-primary text-white">
                  <AvatarFallback>{getInitials(connection.otherUser.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {connection.otherUser.name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatLastMessageTime(connection.id)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {getLastMessageText(connection.id)}
                  </p>
                </div>
                {getUnreadCount(connection.id) > 0 && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-xs">
                    {getUnreadCount(connection.id)}
                  </span>
                )}
              </button>
              <Separator />
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat interface */}
      <div className="md:col-span-2 flex flex-col">
        {selectedConnection ? (
          <ChatInterface connection={selectedConnection} />
        ) : (
          <div className="flex-1 bg-white rounded-xl shadow flex items-center justify-center">
            <div className="text-center p-4">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">Select a conversation</h3>
              <p className="text-sm text-gray-500">Choose a connection to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
