import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Music } from "lucide-react";
import SpotifyConnectButton from "./SpotifyConnectButton";

export default function SpotifyConnectionPrompt() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Connect Spotify</CardTitle>
        <CardDescription className="text-center">
          Share your workout playlists with gym buddies
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Music className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-center mb-6">
          Connect your Spotify account to share your favorite workout playlists and discover new music from your gym buddies.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <SpotifyConnectButton />
      </CardFooter>
    </Card>
  );
}