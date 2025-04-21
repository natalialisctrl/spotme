import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "./useWebSocket";

interface GeolocationHookResult {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
  accuracy: number | null;
}

export function useGeolocation(): GeolocationHookResult {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const { user } = useAuth();
  const { sendMessage, isConnected } = useWebSocket();
  
  // Use refs to avoid unnecessary re-renders and effect triggers
  const lastUpdateTime = useRef<number>(0);
  const watchId = useRef<number | null>(null);
  const locationUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Use Austin-based fallback coordinates for development if needed
  const useFallbackLocation = useCallback((forceFallback = false) => {
    if (forceFallback || !latitude || !longitude) {
      // Austin, TX coordinates with slight randomization to distribute users
      const randomLat = (Math.random() * 0.01) - 0.005; // +/- 0.005 degrees (~550m)
      const randomLng = (Math.random() * 0.01) - 0.005;
      
      const austinLat = 30.2267 + randomLat;
      const austinLng = -97.7476 + randomLng;
      
      console.log("Using fallback location coordinates (Austin, TX)", {
        latitude: austinLat,
        longitude: austinLng
      });
      
      setLatitude(austinLat);
      setLongitude(austinLng);
      setAccuracy(1000); // Lower accuracy for fallback
      setIsLoading(false);
      
      // Also update the server with fallback location if user is logged in
      if (user) {
        // Use Promise.catch instead of try/catch for better error handling with async operations
        apiRequest('PATCH', '/api/users/location', { 
          latitude: austinLat, 
          longitude: austinLng 
        })
        .then(() => {
          // Only send WebSocket message if the user is logged in and WebSocket is connected
          if (isConnected && user) {
            sendMessage({
              type: 'user_location',
              senderId: user.id,
              data: { latitude: austinLat, longitude: austinLng }
            });
          }
        })
        .catch(err => {
          // This is expected when not logged in (401), so we'll only log in development
          if (process.env.NODE_ENV === 'development') {
            console.debug('Location update not sent - user may not be authenticated');
          }
        });
      }
      
      return true;
    }
    return false;
  }, [latitude, longitude, user, isConnected, sendMessage]);

  const updateUserLocation = useCallback((position: GeolocationPosition) => {
    const now = Date.now();
    const { latitude: lat, longitude: lng, accuracy: acc } = position.coords;
    
    // Don't update too frequently (once per second is enough)
    if (now - lastUpdateTime.current < 1000) {
      return;
    }
    
    lastUpdateTime.current = now;
    
    // Update local state
    setLatitude(lat);
    setLongitude(lng);
    setAccuracy(acc);
    setIsLoading(false);
    setError(null); // Clear any previous errors

    // Update server with new location if authenticated
    if (user) {
      // Use Promise handling for better error management
      apiRequest('PATCH', '/api/users/location', { latitude: lat, longitude: lng })
        .then(() => {
          // Only send WebSocket message if the user is logged in and WebSocket is connected
          if (isConnected && user) {
            sendMessage({
              type: 'user_location',
              senderId: user.id,
              data: { latitude: lat, longitude: lng }
            });
          }
        })
        .catch(error => {
          // This is expected when not logged in (401), so we'll only log in development
          if (process.env.NODE_ENV === 'development') {
            console.debug('Location update not sent - user may not be authenticated');
          }
        });
    }
  }, [user, isConnected, sendMessage]);

  const handleError = useCallback((err: GeolocationPositionError | any) => {
    console.error('Geolocation error:', err);
    
    // Always use fallback location on any kind of error
    if (useFallbackLocation()) {
      // Set a non-blocking message
      setError("Using approximate location instead of precise GPS location.");
      return;
    }
    
    // Only if fallback failed (which shouldn't happen), set a blocking error
    let errorMessage: string;
    if (err && typeof err.code === 'number') {
      switch(err.code) {
        case 1: // PERMISSION_DENIED
          errorMessage = "Please allow location access to find gym partners near you.";
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMessage = "Location information is unavailable.";
          break;
        case 3: // TIMEOUT
          errorMessage = "Location request timed out.";
          break;
        default:
          errorMessage = "Unable to determine your location.";
      }
    } else {
      errorMessage = "Location error occurred. Using fallback location.";
    }
    
    setError(errorMessage);
    setIsLoading(false);
  }, [useFallbackLocation]);

  useEffect(() => {
    // ALWAYS use fallback location initially to ensure we have something right away
    // This provides instant location data while waiting for real GPS
    useFallbackLocation(true);
    
    // Set up retry if more accurate location isn't available after a while
    locationUpdateTimeout.current = setTimeout(() => {
      if (!latitude || !longitude) {
        console.log("Location not received in time, using fallback");
        useFallbackLocation(true);
      }
    }, 3000); // Reduced to 3 seconds for faster fallback

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      // Fallback already set above, but make sure it's applied
      useFallbackLocation(true);
      return;
    }

    // Now try to get more accurate position
    try {
      // Try with higher accuracy first, but shorter timeout
      navigator.geolocation.getCurrentPosition(
        updateUserLocation,
        (err) => {
          console.warn("High accuracy position failed, trying with low accuracy", err);
          // Try again with lower accuracy
          navigator.geolocation.getCurrentPosition(
            updateUserLocation,
            handleError, 
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 60000 // Allow cached positions up to 1 minute old
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      // Watch position for changes
      watchId.current = navigator.geolocation.watchPosition(
        updateUserLocation,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000 // Allow cached positions up to 1 minute old
        }
      );
    } catch (e) {
      console.error("Error setting up geolocation:", e);
      // Fallback already set above, but make sure it's applied
      useFallbackLocation(true);
    }

    // Cleanup
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      
      if (locationUpdateTimeout.current) {
        clearTimeout(locationUpdateTimeout.current);
        locationUpdateTimeout.current = null;
      }
    };
  }, [useFallbackLocation, updateUserLocation, handleError, latitude, longitude]);

  return { latitude, longitude, error, isLoading, accuracy };
}
