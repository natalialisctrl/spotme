import { FC, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, ConnectionRequest } from "@shared/schema";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck, UserX, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ConnectionRequestWithUser extends ConnectionRequest {
  sender?: User;
  receiver?: User;
}

const Connections: FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");

  // Get active connections
  const { data: connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['/api/connections'],
    enabled: !!user,
  });

  // Get received connection requests
  const { data: receivedRequests, isLoading: isLoadingReceived } = useQuery<ConnectionRequestWithUser[]>({
    queryKey: ['/api/connection-requests/received'],
    enabled: !!user && activeTab === "requests",
  });

  // Get sent connection requests
  const { data: sentRequests, isLoading: isLoadingSent } = useQuery<ConnectionRequestWithUser[]>({
    queryKey: ['/api/connection-requests/sent'],
    enabled: !!user && activeTab === "sent",
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

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">My Connections</CardTitle>
          <CardDescription>
            Manage your gym partner connections and requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Connections</TabsTrigger>
              <TabsTrigger value="requests">Requests Received</TabsTrigger>
              <TabsTrigger value="sent">Requests Sent</TabsTrigger>
            </TabsList>
            
            {/* Active Connections */}
            <TabsContent value="active" className="mt-4">
              {isLoadingConnections ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : !connections || connections.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">No connections yet</h3>
                  <p className="text-sm text-gray-500 mb-4">When you connect with gym partners, they'll appear here</p>
                  <Button onClick={() => window.location.href = "/"}>
                    Find Partners
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {connections.map((connection) => (
                    <Card key={connection.id} className="overflow-hidden">
                      <div className="flex items-center p-4">
                        <Avatar className="h-14 w-14 bg-primary text-white text-xl">
                          <AvatarFallback>{getInitials(connection.otherUser.name)}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 flex-1">
                          <h3 className="font-semibold text-lg">{connection.otherUser.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="outline" className="capitalize">
                              {connection.otherUser.experienceLevel}
                            </Badge>
                            <Badge variant="outline">
                              {connection.otherUser.experienceYears} {connection.otherUser.experienceYears === 1 ? 'year' : 'years'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Connected on {formatDate(connection.createdAt.toString())}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => window.location.href = "/messages"}
                        >
                          Message
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* Received Requests */}
            <TabsContent value="requests" className="mt-4">
              {isLoadingReceived ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : !receivedRequests || receivedRequests.length === 0 ? (
                <div className="text-center py-10">
                  <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">No pending requests</h3>
                  <p className="text-sm text-gray-500">When someone wants to connect with you, their request will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {receivedRequests
                    .filter(request => request.status === 'pending')
                    .map((request) => (
                      <Card key={request.id} className="overflow-hidden">
                        <div className="flex items-center p-4">
                          <Avatar className="h-14 w-14 bg-primary text-white text-xl">
                            <AvatarFallback>{getInitials(request.sender?.name || '')}</AvatarFallback>
                          </Avatar>
                          <div className="ml-4 flex-1">
                            <h3 className="font-semibold text-lg">{request.sender?.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className="capitalize">
                                {request.sender?.experienceLevel}
                              </Badge>
                              <Badge variant="outline">
                                {request.sender?.experienceYears} {request.sender?.experienceYears === 1 ? 'year' : 'years'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Requested {formatDate(request.createdAt.toString())}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => acceptRequest(request.id)}
                              disabled={isAccepting || isRejecting}
                            >
                              {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectRequest(request.id)}
                              disabled={isAccepting || isRejecting}
                            >
                              {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
            
            {/* Sent Requests */}
            <TabsContent value="sent" className="mt-4">
              {isLoadingSent ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : !sentRequests || sentRequests.length === 0 ? (
                <div className="text-center py-10">
                  <UserX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">No sent requests</h3>
                  <p className="text-sm text-gray-500 mb-4">You haven't sent any connection requests yet</p>
                  <Button onClick={() => window.location.href = "/"}>
                    Find Partners
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sentRequests
                    .filter(request => request.status === 'pending')
                    .map((request) => (
                      <Card key={request.id} className="overflow-hidden">
                        <div className="flex items-center p-4">
                          <Avatar className="h-14 w-14 bg-primary text-white text-xl">
                            <AvatarFallback>{getInitials(request.receiver?.name || '')}</AvatarFallback>
                          </Avatar>
                          <div className="ml-4 flex-1">
                            <h3 className="font-semibold text-lg">{request.receiver?.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className="capitalize">
                                {request.receiver?.experienceLevel}
                              </Badge>
                              <Badge variant="outline">
                                {request.receiver?.experienceYears} {request.receiver?.experienceYears === 1 ? 'year' : 'years'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Sent {formatDate(request.createdAt.toString())}
                            </p>
                          </div>
                          <Badge>Pending</Badge>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Connections;
