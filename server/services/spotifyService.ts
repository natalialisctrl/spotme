import fetch from 'node-fetch';
import { storage } from '../storage';
import { NextFunction, Request, Response } from 'express';

// Spotify API constants
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://spotme.replit.app/api/spotify/callback'
  : 'http://localhost:5000/api/spotify/callback';

// Helper function to exchange authorization code for token
async function getSpotifyToken(code: string): Promise<any> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI
    })
  });

  if (!response.ok) {
    const errorData = await response.json() as { error: string, error_description: string };
    throw new Error(`Spotify token error: ${errorData.error}: ${errorData.error_description}`);
  }

  return response.json();
}

// Refresh an expired access token
async function refreshSpotifyToken(refreshToken: string): Promise<any> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const errorData = await response.json() as { error: string, error_description: string };
    throw new Error(`Spotify token refresh error: ${errorData.error}: ${errorData.error_description}`);
  }

  return response.json();
}

// Make a request to Spotify API with proper token handling
export async function callSpotifyApi(userId: number, endpoint: string, method = 'GET', body?: any): Promise<any> {
  // Get the user's Spotify credentials
  const spotifyConnection = await storage.getSpotifyConnection(userId);
  
  if (!spotifyConnection) {
    throw new Error('User has not connected their Spotify account');
  }

  // Check if token is expired and refresh if necessary
  const now = Date.now();
  let accessToken = spotifyConnection.accessToken;

  // expiresAt is stored as a timestamp (number), but the type definition might expect a Date
  // Convert expiresAt to number for comparison if needed
  const expiresAtTimestamp = spotifyConnection.expiresAt instanceof Date 
    ? spotifyConnection.expiresAt.getTime() 
    : spotifyConnection.expiresAt;

  if (now >= expiresAtTimestamp) {
    try {
      const tokenData = await refreshSpotifyToken(spotifyConnection.refreshToken);
      
      // Update the stored credentials
      // Use the number type for expiresAt consistently to avoid type issues
      const expiresAt = now + (tokenData.expires_in * 1000);
      await storage.updateSpotifyConnection(userId, {
        accessToken: tokenData.access_token,
        expiresAt, // This will be used as a timestamp (number)
        refreshToken: tokenData.refresh_token || spotifyConnection.refreshToken
      });
      
      accessToken = tokenData.access_token;
    } catch (error) {
      console.error('Failed to refresh Spotify token:', error);
      throw new Error('Failed to refresh Spotify access token');
    }
  }

  // Make the actual API call
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!response.ok) {
    const errorData = await response.json() as { error: { message: string } };
    throw new Error(`Spotify API error: ${errorData.error.message || 'Unknown error'}`);
  }

  return response.json();
}

// Get Spotify authorization URL
export function getAuthorizationUrl(state: string): string {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-top-read'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state,
    scope: scopes
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Handle Spotify OAuth callback
export async function handleSpotifyCallback(code: string, userId: number): Promise<void> {
  try {
    const tokenData = await getSpotifyToken(code);
    
    // Store the Spotify connection for the user
    // Use the number type for expiresAt consistently to avoid type issues
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);
    await storage.saveSpotifyConnection(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt // Using timestamp (number) instead of Date object
    });
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    throw error;
  }
}

// Get the current user's profile
export async function getUserProfile(userId: number): Promise<any> {
  return callSpotifyApi(userId, '/me');
}

// Get user's playlists
export async function getUserPlaylists(userId: number): Promise<any> {
  return callSpotifyApi(userId, '/me/playlists?limit=50');
}

// Create a new workout playlist
export async function createWorkoutPlaylist(
  userId: number, 
  name: string, 
  description: string, 
  isPublic = false,
  trackUris: string[] = []
): Promise<any> {
  // First get the Spotify user ID
  const profile = await getUserProfile(userId);
  const spotifyUserId = profile.id;
  
  // Create an empty playlist
  const playlist = await callSpotifyApi(
    userId,
    `/users/${spotifyUserId}/playlists`,
    'POST',
    {
      name,
      description: description || 'Workout playlist created with SpotMe',
      public: isPublic
    }
  );
  
  // If tracks were provided, add them to the playlist
  if (trackUris.length > 0) {
    await callSpotifyApi(
      userId,
      `/playlists/${playlist.id}/tracks`,
      'POST',
      {
        uris: trackUris
      }
    );
  }
  
  return playlist;
}

// Share playlist with another user
export async function sharePlaylist(userId: number, targetUserId: number, playlistId: string): Promise<void> {
  // Get target user
  const targetUser = await storage.getUser(targetUserId);
  if (!targetUser) {
    throw new Error('Target user not found');
  }
  
  // Save the shared playlist in our database
  await storage.saveSharedPlaylist(userId, targetUserId, playlistId);
}

// Search for tracks
export async function searchTracks(userId: number, query: string): Promise<any> {
  return callSpotifyApi(userId, `/search?q=${encodeURIComponent(query)}&type=track&limit=20`);
}

// Middleware to check if user has connected Spotify
export function requireSpotifyConnection(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  storage.getSpotifyConnection(userId)
    .then(connection => {
      if (!connection) {
        return res.status(403).json({ 
          error: 'Spotify account not connected',
          authUrl: getAuthorizationUrl(userId.toString())
        });
      }
      next();
    })
    .catch(error => {
      console.error('Error checking Spotify connection:', error);
      res.status(500).json({ error: 'Failed to check Spotify connection' });
    });
}

// Get workout recommendations based on exercise type
export async function getWorkoutRecommendations(
  userId: number, 
  exerciseType: string, 
  energyLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<any> {
  // Map exercise types to Spotify genres and attributes
  const exerciseMap: Record<string, { genres: string[], minTempo: number, maxTempo: number, targetEnergy: number }> = {
    'cardio': { 
      genres: ['workout', 'edm', 'dance', 'pop'],
      minTempo: 120,
      maxTempo: 140,
      targetEnergy: 0.8
    },
    'strength': { 
      genres: ['rock', 'hip-hop', 'metal'],
      minTempo: 90,
      maxTempo: 120,
      targetEnergy: 0.7
    },
    'yoga': { 
      genres: ['ambient', 'chill', 'meditation'],
      minTempo: 60,
      maxTempo: 90,
      targetEnergy: 0.4
    },
    'arms': { 
      genres: ['hip-hop', 'trap', 'pop'],
      minTempo: 95,
      maxTempo: 120,
      targetEnergy: 0.75
    },
    'legs': { 
      genres: ['hip-hop', 'pop', 'dance'],
      minTempo: 100,
      maxTempo: 130,
      targetEnergy: 0.8
    },
    'core': { 
      genres: ['electronic', 'dance', 'pop'],
      minTempo: 110,
      maxTempo: 130,
      targetEnergy: 0.7
    },
    'back': { 
      genres: ['rock', 'alternative', 'metal'],
      minTempo: 90,
      maxTempo: 115,
      targetEnergy: 0.75
    },
    'shoulders': { 
      genres: ['electronic', 'rock', 'hip-hop'],
      minTempo: 100,
      maxTempo: 125, 
      targetEnergy: 0.8
    },
    'chest': { 
      genres: ['hip-hop', 'trap', 'rock'],
      minTempo: 95,
      maxTempo: 120,
      targetEnergy: 0.8
    },
    'full_body': { 
      genres: ['pop', 'dance', 'electronic', 'hip-hop'],
      minTempo: 105,
      maxTempo: 135,
      targetEnergy: 0.85
    }
  };
  
  // Default to full_body if exercise type not found
  const exerciseSettings = exerciseMap[exerciseType] || exerciseMap.full_body;
  
  // Adjust energy level based on input
  let targetEnergy = exerciseSettings.targetEnergy;
  if (energyLevel === 'low') targetEnergy -= 0.2;
  if (energyLevel === 'high') targetEnergy += 0.15;
  
  // Clamp energy between 0 and 1
  targetEnergy = Math.max(0, Math.min(1, targetEnergy));
  
  // Get seed genres (randomly select up to 2)
  const selectedGenres = exerciseSettings.genres
    .sort(() => 0.5 - Math.random())
    .slice(0, 2)
    .join(',');
  
  // Get recommendations from Spotify
  const params = new URLSearchParams({
    seed_genres: selectedGenres,
    limit: '25',
    min_tempo: exerciseSettings.minTempo.toString(),
    max_tempo: exerciseSettings.maxTempo.toString(),
    target_energy: targetEnergy.toString(),
    min_popularity: '50'
  });
  
  return callSpotifyApi(userId, `/recommendations?${params.toString()}`);
}