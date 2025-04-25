import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function SpotifyConnectButton() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if the user has connected their Spotify account
  const { data: connection, isLoading } = useQuery({
    queryKey: ["/api/spotify/connection"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/spotify/connection");
        return await response.json();
      } catch (error) {
        return { connected: false };
      }
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await apiRequest("GET", "/api/spotify/connect");
      const data = await response.json();
      
      if (data.url) {
        // Redirect the user to Spotify authorization page
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "Failed to get Spotify authorization URL",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to connect to Spotify. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/spotify/connection"] });
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        Checking Spotify connection...
      </Button>
    );
  }

  if (connection?.connected) {
    return (
      <Button variant="outline" className="bg-green-50 text-green-700" onClick={handleRefresh}>
        Spotify Connected ✓
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      className="bg-[#1DB954] hover:bg-[#1AA34A] text-white"
    >
      {isConnecting ? "Connecting..." : "Connect Spotify"}
    </Button>
  );
}