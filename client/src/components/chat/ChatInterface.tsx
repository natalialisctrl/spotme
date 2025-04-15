import { FC, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Send, Loader2 } from "lucide-react";
import { User, Message, Connection } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInterfaceProps {
  connection: Connection & { otherUser: User };
}

const ChatInterface: FC<ChatInterfaceProps> = ({ connection }) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const connectionId = connection.id;
  const otherUser = connection.otherUser;

  // Set up WebSocket connection
  const socket = useWebSocket(user?.id);

  // Get messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/connections', connectionId, 'messages'],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`/api/connections/${connectionId}/messages`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds as a fallback
  });

  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/messages', { connectionId, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections', connectionId, 'messages'] });
      setMessage('');
    }
  });

  // Handle WebSocket message
  useEffect(() => {
    if (socket && user) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message' && data.data.message.connectionId === connectionId) {
            queryClient.invalidateQueries({ queryKey: ['/api/connections', connectionId, 'messages'] });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message', error);
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => {
        socket.removeEventListener('message', handleMessage);
      };
    }
  }, [socket, user, connectionId, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() && !isSending) {
      sendMessage(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow">
      {/* Chat header */}
      <div className="px-4 py-3 border-b flex items-center">
        <Avatar className="h-10 w-10 bg-primary text-white">
          <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h3 className="text-lg font-semibold">{otherUser.name}</h3>
          <p className="text-xs text-gray-500">
            {otherUser.experienceLevel.charAt(0).toUpperCase() + otherUser.experienceLevel.slice(1)} • {otherUser.experienceYears} years
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                  msg.senderId === user?.id
                    ? 'bg-primary text-white rounded-tr-none'
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.senderId === user?.id ? 'text-primary-100' : 'text-gray-500'}`}>
                  {formatTime(msg.timestamp.toString())}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet. Say hello!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t p-3">
        <div className="flex items-end">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="resize-none min-h-[60px]"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            className="ml-2 h-10 w-10 p-0"
            disabled={!message.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
