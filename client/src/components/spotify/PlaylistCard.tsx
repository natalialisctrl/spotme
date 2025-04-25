import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, Music } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SelectUser } from "@/types/users";

export interface PlaylistProps {
  id: string;
  name: string;
  description: string | null;
  images: { url: string }[];
  tracks: { total: number };
  external_urls: { spotify: string };
  collaborative: boolean;
  public: boolean;
}

interface PlaylistCardProps {
  playlist: PlaylistProps;
  connections: SelectUser[];
}

export default function PlaylistCard({ playlist, connections }: PlaylistCardProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const thumbnail = playlist.images?.[0]?.url || '';
  
  const handleShare = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a connection to share with",
        variant: "destructive",
      });
      return;
    }
    
    setIsSharing(true);
    
    try {
      const response = await apiRequest("POST", "/api/spotify/share", {
        targetUserId: selectedUserId,
        playlistId: playlist.id
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Playlist shared successfully",
          variant: "default",
        });
        setDialogOpen(false);
        // Invalidate shared playlists query if we have one
        queryClient.invalidateQueries({ queryKey: ["/api/spotify/shared/sent"] });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to share playlist");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share playlist",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };
  
  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg truncate">{playlist.name}</CardTitle>
        <CardDescription className="truncate">
          {playlist.description || `${playlist.tracks.total} tracks`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pb-2">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={`${playlist.name} thumbnail`} 
            className="w-full h-40 object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-40 bg-slate-200 flex items-center justify-center rounded-md">
            <Music size={40} className="text-slate-400" />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          asChild
        >
          <a href={playlist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
            Open in Spotify
          </a>
        </Button>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost">
              <Share size={18} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share "{playlist.name}"</DialogTitle>
              <DialogDescription>
                Choose a gym buddy to share this playlist with
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-60 overflow-y-auto">
              {connections.length > 0 ? (
                <div className="grid gap-2">
                  {connections.map((connection) => (
                    <div 
                      key={connection.id} 
                      className={`p-3 rounded-md cursor-pointer flex items-center gap-3 ${
                        selectedUserId === connection.id 
                          ? 'bg-primary/10 border border-primary' 
                          : 'border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedUserId(connection.id)}
                    >
                      {connection.profilePicture ? (
                        <img 
                          src={connection.profilePicture} 
                          alt={connection.name} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          {connection.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{connection.name}</div>
                        <div className="text-sm text-muted-foreground">@{connection.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  You don't have any connections yet. Connect with gym buddies to share playlists.
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleShare}
                disabled={!selectedUserId || isSharing}
              >
                {isSharing ? "Sharing..." : "Share Playlist"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}