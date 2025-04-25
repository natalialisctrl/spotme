import { Router } from 'express';
import { z } from 'zod';
import * as spotifyService from '../services/spotifyService';
import { storage } from '../storage';

const router = Router();

// Route to initiate Spotify OAuth flow
router.get('/connect', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Generate a state parameter to prevent CSRF attacks
  const state = req.session.userId.toString();
  const authUrl = spotifyService.getAuthorizationUrl(state);
  
  res.json({ url: authUrl });
});

// Process the callback code without redirecting
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const userId = parseInt(state as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    await spotifyService.handleSpotifyCallback(code as string, userId);
    
    // Return success message
    res.status(200).json({ success: true, message: 'Spotify account connected successfully' });
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    res.status(500).json({ error: 'Failed to connect Spotify account' });
  }
});

// Check connection status
router.get('/connection', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const connection = await storage.getSpotifyConnection(req.session.userId);
    
    if (!connection) {
      return res.json({ 
        connected: false,
        authUrl: spotifyService.getAuthorizationUrl(req.session.userId.toString())
      });
    }
    
    res.json({ connected: true });
  } catch (error) {
    console.error('Error checking Spotify connection:', error);
    res.status(500).json({ error: 'Failed to check Spotify connection' });
  }
});

// Get user profile
router.get('/profile', spotifyService.requireSpotifyConnection, async (req, res) => {
  try {
    const profile = await spotifyService.getUserProfile(req.session.userId);
    res.json(profile);
  } catch (error) {
    console.error('Error fetching Spotify profile:', error);
    res.status(500).json({ error: 'Failed to fetch Spotify profile' });
  }
});

// Get user playlists
router.get('/playlists', spotifyService.requireSpotifyConnection, async (req, res) => {
  try {
    const playlists = await spotifyService.getUserPlaylists(req.session.userId);
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching Spotify playlists:', error);
    res.status(500).json({ error: 'Failed to fetch Spotify playlists' });
  }
});

// Create a workout playlist
const createPlaylistSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  workoutType: z.string(),
  energyLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  isPublic: z.boolean().default(false),
  tracks: z.array(z.string()).optional()
});

router.post('/playlists', spotifyService.requireSpotifyConnection, async (req, res) => {
  try {
    const validationResult = createPlaylistSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error });
    }
    
    const { name, description, workoutType, energyLevel, isPublic, tracks } = validationResult.data;
    
    // First create the playlist on Spotify
    const playlist = await spotifyService.createWorkoutPlaylist(
      req.session.userId,
      name,
      description || '',
      isPublic,
      tracks || []
    );
    
    // Then save it in our database
    const savedPlaylist = await storage.createWorkoutPlaylist({
      userId: req.session.userId,
      spotifyPlaylistId: playlist.id,
      name,
      description: description || null,
      workoutType,
      energyLevel,
      isPublic
    });
    
    res.status(201).json(savedPlaylist);
  } catch (error) {
    console.error('Error creating workout playlist:', error);
    res.status(500).json({ error: 'Failed to create workout playlist' });
  }
});

// Get workout recommendations based on exercise type
router.get('/recommendations/:exerciseType', spotifyService.requireSpotifyConnection, async (req, res) => {
  try {
    const { exerciseType } = req.params;
    const energyLevel = req.query.energy as 'low' | 'medium' | 'high' || 'medium';
    
    const recommendations = await spotifyService.getWorkoutRecommendations(
      req.session.userId,
      exerciseType,
      energyLevel
    );
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting workout recommendations:', error);
    res.status(500).json({ error: 'Failed to get workout recommendations' });
  }
});

// Share a playlist with another user
const sharePlaylistSchema = z.object({
  targetUserId: z.number().int().positive(),
  playlistId: z.string().min(1)
});

router.post('/share', spotifyService.requireSpotifyConnection, async (req, res) => {
  try {
    const validationResult = sharePlaylistSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error });
    }
    
    const { targetUserId, playlistId } = validationResult.data;
    
    // Check if the target user exists
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    
    // Share the playlist
    await spotifyService.sharePlaylist(req.session.userId, targetUserId, playlistId);
    
    res.status(200).json({ success: true, message: 'Playlist shared successfully' });
  } catch (error) {
    console.error('Error sharing playlist:', error);
    res.status(500).json({ error: 'Failed to share playlist' });
  }
});

// Get playlists shared with me
router.get('/shared/received', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const sharedPlaylists = await storage.getSharedPlaylistsByReceiverId(req.session.userId);
    
    // Enrich data with sender information
    const enrichedPlaylists = await Promise.all(
      sharedPlaylists.map(async (playlist) => {
        const sender = await storage.getUser(playlist.senderId);
        return {
          ...playlist,
          sender: sender ? {
            id: sender.id,
            name: sender.name,
            username: sender.username,
            profilePicture: sender.profilePicture
          } : null
        };
      })
    );
    
    res.json(enrichedPlaylists);
  } catch (error) {
    console.error('Error fetching received shared playlists:', error);
    res.status(500).json({ error: 'Failed to fetch received shared playlists' });
  }
});

// Get playlists I've shared with others
router.get('/shared/sent', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const sharedPlaylists = await storage.getSharedPlaylistsBySenderId(req.session.userId);
    
    // Enrich data with receiver information
    const enrichedPlaylists = await Promise.all(
      sharedPlaylists.map(async (playlist) => {
        const receiver = await storage.getUser(playlist.receiverId);
        return {
          ...playlist,
          receiver: receiver ? {
            id: receiver.id,
            name: receiver.name,
            username: receiver.username,
            profilePicture: receiver.profilePicture
          } : null
        };
      })
    );
    
    res.json(enrichedPlaylists);
  } catch (error) {
    console.error('Error fetching sent shared playlists:', error);
    res.status(500).json({ error: 'Failed to fetch sent shared playlists' });
  }
});

// Accept or reject a shared playlist
const respondToSharedPlaylistSchema = z.object({
  playlistId: z.number().int().positive(),
  accept: z.boolean()
});

router.post('/shared/respond', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const validationResult = respondToSharedPlaylistSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error });
    }
    
    const { playlistId, accept } = validationResult.data;
    
    // Get the shared playlist
    const sharedPlaylist = await storage.getSharedPlaylist(playlistId);
    
    if (!sharedPlaylist) {
      return res.status(404).json({ error: 'Shared playlist not found' });
    }
    
    // Check if the user is the intended recipient
    if (sharedPlaylist.receiverId !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to respond to this shared playlist' });
    }
    
    // Update the status
    const status = accept ? 'accepted' : 'rejected';
    const updatedPlaylist = await storage.updateSharedPlaylistStatus(playlistId, status);
    
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Error responding to shared playlist:', error);
    res.status(500).json({ error: 'Failed to respond to shared playlist' });
  }
});

// Search for tracks
router.get('/search', spotifyService.requireSpotifyConnection, async (req, res) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await spotifyService.searchTracks(req.session.userId, query);
    res.json(results);
  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

export default router;