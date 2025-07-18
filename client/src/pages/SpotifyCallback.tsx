import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function SpotifyCallback() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    console.log("SpotifyCallback component mounted");
    
    const processCallback = async () => {
      try {
        // Parse the URL for code and state
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          setError(`Spotify authorization error: ${error}`);
          setIsProcessing(false);
          return;
        }
        
        if (!code) {
          setError('No authorization code received from Spotify');
          setIsProcessing(false);
          return;
        }
        
        if (!user) {
          setError('You must be logged in to connect Spotify');
          setIsProcessing(false);
          return;
        }
        
        console.log("Sending code to backend:", code);
        
        // Call our backend to process the code
        const response = await apiRequest("POST", "/api/spotify/callback", { 
          code, 
          state: user.id.toString() 
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to connect Spotify account');
        }
        
        // Invalidate Spotify connection cache
        queryClient.invalidateQueries({ queryKey: ['/api/spotify/connection'] });
        
        // Successful connection
        toast({
          title: "Success!",
          description: "Your Spotify account has been connected successfully.",
        });
        
        setTimeout(() => {
          setIsProcessing(false);
          setLocation("/music-sharing");
        }, 1500);
        
      } catch (error) {
        console.error('Error processing Spotify callback:', error);
        setError(error instanceof Error ? error.message : 'Failed to connect Spotify account');
        setIsProcessing(false);
        
        toast({
          title: "Connection Failed",
          description: error instanceof Error ? error.message : 'Failed to connect Spotify account',
          variant: "destructive"
        });
      }
    };
    
    processCallback();
  }, [setLocation, user, toast]);
  
  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Spotify Connection</CardTitle>
          <CardDescription>
            {isProcessing 
              ? "Processing your Spotify connection..." 
              : error 
                ? "There was a problem connecting your account" 
                : "Successfully connected to Spotify!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Connecting to Spotify...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={() => setLocation('/music-sharing')}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
              >
                Back to Music Sharing
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <p className="text-green-600 font-medium mb-4">Spotify account connected successfully!</p>
              <p className="text-sm text-muted-foreground mb-4">Redirecting you back to the music sharing page...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}