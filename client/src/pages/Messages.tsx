import { FC, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Connection, Message, ConnectionRequest } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import ChatInterface from "@/components/chat/ChatInterface";
import { Loader2, MessageSquare, Users, Star, UserCheck, UserX } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePartnerRatings } from "@/hooks/use-partner-ratings";
import { UserRatings } from "@/components/ratings/UserRatings";
import { RatingForm } from "@/components/ratings/RatingForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConnectionWithUser extends Connection {
  otherUser: User;
}

interface ConnectionRequestWithUser extends ConnectionRequest {
  sender?: User;
  receiver?: User;
}

const Messages: FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithUser | null>(null);
  const socket = useWebSocket(user?.id);
  const [activeTab, setActiveTab] = useState("messages");
  const [ratingUser, setRatingUser] = useState<{id: number, name: string} | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  
  const {
    useRatingsGiven,
    useRatingsReceived,
  } = usePartnerRatings();

  // Get all connections
  const { data: connections, isLoading } = useQuery<ConnectionWithUser[]>({
    queryKey: ['/api/connections'],
    enabled: !!user,
  });

  // Get received connection requests
  const { data: receivedRequests, isLoading: isLoadingReceived } = useQuery<ConnectionRequestWithUser[]>({
    queryKey: ['/api/connection-requests/received'],
    enabled: !!user && activeTab === "connections",
  });

  // Get sent connection requests
  const { data: sentRequests, isLoading: isLoadingSent } = useQuery<ConnectionRequestWithUser[]>({
    queryKey: ['/api/connection-requests/sent'],
    enabled: !!user && activeTab === "connections",
  });

  // Get ratings data
  const {
    data: ratingsGiven,
    isLoading: isLoadingGiven,
  } = useRatingsGiven();

  const {
    data: ratingsReceived,
    isLoading: isLoadingRatingsReceived,
  } = useRatingsReceived();

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

  // Accept connection request mutation
  const { mutate: acceptRequest, isPending: isAccepting } = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('PATCH', `/api/connection-requests/${requestId}/status`, { status: 'accepted' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests/received'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      toast({
        title: "Connection Accepted",
        description: "You can now message this gym partner",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Accept",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Reject connection request mutation
  const { mutate: rejectRequest, isPending: isRejecting } = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('PATCH', `/api/connection-requests/${requestId}/status`, { status: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests/received'] });
      toast({
        title: "Connection Rejected",
        description: "This request has been declined",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Reject",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    },
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

  const handleOpenRatingDialog = (userId: number, userName: string) => {
    setRatingUser({ id: userId, name: userName });
    setRatingDialogOpen(true);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
  };

  const renderMessagesTab = () => {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-18rem)]">
        {/* Connection list */}
        <div className="md:col-span-1 bg-gray-50 rounded-xl border overflow-hidden glow-effect-subtle hover-lift">
          <div className="p-4 border-b bg-white">
            <h2 className="text-lg font-semibold text-gradient">Messages</h2>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            {connections.map((connection) => (
              <div key={connection.id}>
                <button
                  className={`w-full flex items-center space-x-3 p-4 hover:bg-white text-left hover-pulse ${
                    selectedConnection?.id === connection.id ? 'bg-white border-r-2 border-primary glow-effect' : ''
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
            <div className="flex items-center justify-center h-full bg-white rounded-xl border glow-effect-subtle hover-lift">
              <div className="text-center p-4">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose a connection to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConnectionsTab = () => {
    return (
      <div className="space-y-6">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glow-effect-subtle">
            <TabsTrigger value="active" className="hover-glow">Active Connections</TabsTrigger>
            <TabsTrigger value="requests" className="hover-glow">Received Requests</TabsTrigger>
            <TabsTrigger value="sent" className="hover-glow">Sent Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {connections && connections.length > 0 ? (
              <div className="grid gap-4">
                {connections.map((connection) => (
                  <Card key={connection.id} className="glow-effect-subtle hover-lift">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 bg-primary text-white">
                          <AvatarFallback>{getInitials(connection.otherUser.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{connection.otherUser.name}</h3>
                          <p className="text-sm text-gray-500">
                            Connected since {new Date(connection.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover-glow"
                          onClick={() => {
                            setSelectedConnection(connection);
                            setActiveTab("messages");
                          }}
                        >
                          Message
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover-glow"
                          onClick={() => handleOpenRatingDialog(connection.otherUser.id, connection.otherUser.name)}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Rate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No connections yet</h3>
                <p className="text-gray-500">Accept connection requests to start building your network</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {isLoadingReceived ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : receivedRequests && receivedRequests.length > 0 ? (
              <div className="grid gap-4">
                {receivedRequests.map((request) => (
                  <Card key={request.id} className="glow-effect-subtle hover-lift">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 bg-primary text-white">
                            <AvatarFallback>{getInitials(request.sender?.name || 'Unknown')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{request.sender?.name}</h3>
                            <p className="text-sm text-gray-500">
                              Wants to connect • {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => acceptRequest(request.id)}
                            disabled={isAccepting}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectRequest(request.id)}
                            disabled={isRejecting}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No pending requests</h3>
                <p className="text-gray-500">You'll see connection requests from other users here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {isLoadingSent ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : sentRequests && sentRequests.length > 0 ? (
              <div className="grid gap-4">
                {sentRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 bg-primary text-white">
                            <AvatarFallback>{getInitials(request.receiver?.name || 'Unknown')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{request.receiver?.name}</h3>
                            <p className="text-sm text-gray-500">
                              Sent {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'accepted' ? 'default' : 'destructive'}>
                          {request.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No sent requests</h3>
                <p className="text-gray-500">Connect with gym partners from the Find Partners page</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderRatingsTab = () => {
    return (
      <div className="space-y-6">
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">Ratings Received</TabsTrigger>
            <TabsTrigger value="given">Ratings Given</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {isLoadingRatingsReceived ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <UserRatings ratings={ratingsReceived || []} />
            )}
          </TabsContent>

          <TabsContent value="given" className="space-y-4">
            {isLoadingGiven ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <UserRatings ratings={ratingsGiven || []} />
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate {ratingUser?.name}</DialogTitle>
            </DialogHeader>
            {ratingUser && (
              <RatingForm
                ratedUserId={ratingUser.id}
                onSuccess={handleCloseRatingDialog}
                onCancel={handleCloseRatingDialog}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="bg-white rounded-xl shadow-sm border glow-effect-subtle hover-lift">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900 text-gradient">Messages & Connections</h1>
          <p className="text-gray-600 mt-1">Chat with your gym partners and manage your connections</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-6">
            <TabsList className="grid w-full grid-cols-3 glow-effect-subtle">
              <TabsTrigger value="messages" className="flex items-center gap-2 hover-glow">
                <MessageSquare className="h-4 w-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="connections" className="flex items-center gap-2 hover-glow">
                <Users className="h-4 w-4" />
                Connections
              </TabsTrigger>
              <TabsTrigger value="ratings" className="flex items-center gap-2 hover-glow">
                <Star className="h-4 w-4" />
                Partner Ratings
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="messages" className="m-0">
              {renderMessagesTab()}
            </TabsContent>

            <TabsContent value="connections" className="m-0">
              {renderConnectionsTab()}
            </TabsContent>

            <TabsContent value="ratings" className="m-0">
              {renderRatingsTab()}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Messages;
