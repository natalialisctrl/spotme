import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import SpotifyConnectButton from "@/components/spotify/SpotifyConnectButton";
import PlaylistCard, { PlaylistProps } from "@/components/spotify/PlaylistCard";
import { Loader2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectUser } from "@/types/users";

export default function MusicSharing() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("my-playlists");

  // Check Spotify connection status
  const { data: connection, isLoading: isLoadingConnection } = useQuery({
    queryKey: ["/api/spotify/connection"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/spotify/connection");
      return response.json();
    },
  });

  // Get user's playlists
  const { data: playlists, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ["/api/spotify/playlists"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/spotify/playlists");
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to load playlists");
        }
        return response.json();
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load playlists",
          variant: "destructive",
        });
        return { items: [] };
      }
    },
    enabled: connection?.connected === true,
  });

  // Get shared playlists sent by the user
  const { data: sentPlaylists, isLoading: isLoadingSent } = useQuery({
    queryKey: ["/api/spotify/shared/sent"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/spotify/shared/sent");
      return response.json();
    },
    enabled: connection?.connected === true && activeTab === "shared",
  });

  // Get playlists shared with the user
  const { data: receivedPlaylists, isLoading: isLoadingReceived } = useQuery({
    queryKey: ["/api/spotify/shared/received"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/spotify/shared/received");
      return response.json();
    },
    enabled: connection?.connected === true && activeTab === "shared",
  });

  // Get user's connections for sharing
  const { data: connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/connections");
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to load connections");
        }
        return response.json();
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load connections",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  const renderConnectionState = () => {
    if (isLoadingConnection) {
      return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!connection?.connected) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Music className="h-16 w-16 text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect your Spotify account</h2>
          <p className="text-muted-foreground mb-6">
            Connect your Spotify account to share playlists with your gym buddies
          </p>
          <SpotifyConnectButton />
        </div>
      );
    }
    
    return null;
  };

  const renderPlaylists = () => {
    if (!connection?.connected) return null;
    
    if (isLoadingPlaylists) {
      return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!playlists?.items?.length) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">You don't have any playlists on Spotify.</p>
          <Button asChild>
            <a href="https://open.spotify.com/playlist/create" target="_blank" rel="noopener noreferrer">
              Create a Playlist on Spotify
            </a>
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlists.items.map((playlist: PlaylistProps) => (
          <PlaylistCard 
            key={playlist.id} 
            playlist={playlist} 
            connections={connections || []} 
          />
        ))}
      </div>
    );
  };

  const renderSharedPlaylists = () => {
    if (!connection?.connected) return null;
    
    if (isLoadingSent || isLoadingReceived || isLoadingConnections) {
      return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!sentPlaylists?.length && !receivedPlaylists?.length) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            You haven't shared any playlists yet, and no one has shared playlists with you.
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {receivedPlaylists?.length > 0 && (
          <div>
            <h3 className="text-xl font-medium mb-4">Shared with you</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {receivedPlaylists.map((shared: any) => (
                <div key={shared.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {shared.sender?.profilePicture ? (
                      <img 
                        src={shared.sender.profilePicture} 
                        alt={shared.sender.name} 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        {shared.sender?.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{shared.sender?.name}</div>
                      <div className="text-sm text-muted-foreground">shared a playlist with you</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    asChild
                  >
                    <a href={`https://open.spotify.com/playlist/${shared.playlistId}`} target="_blank" rel="noopener noreferrer">
                      Open Playlist
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {sentPlaylists?.length > 0 && (
          <div>
            <h3 className="text-xl font-medium mb-4">Shared by you</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sentPlaylists.map((shared: any) => (
                <div key={shared.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div>
                      <div className="font-medium">Shared with {shared.receiver?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: {shared.status.charAt(0).toUpperCase() + shared.status.slice(1)}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    asChild
                  >
                    <a href={`https://open.spotify.com/playlist/${shared.playlistId}`} target="_blank" rel="noopener noreferrer">
                      Open Playlist
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Music Sharing</h1>
        <SpotifyConnectButton />
      </div>
      
      {renderConnectionState()}
      
      {connection?.connected && (
        <Tabs defaultValue="my-playlists" onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid grid-cols-2 w-[400px] mb-6">
            <TabsTrigger value="my-playlists">My Playlists</TabsTrigger>
            <TabsTrigger value="shared">Shared Playlists</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-playlists" className="mt-0">
            {renderPlaylists()}
          </TabsContent>
          
          <TabsContent value="shared" className="mt-0">
            {renderSharedPlaylists()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}