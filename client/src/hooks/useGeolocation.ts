import { useState, useEffect, useRef } from "react";
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
  const socket = useWebSocket(user?.id);
  
  // Use refs to avoid unnecessary re-renders and effect triggers
  const lastUpdateTime = useRef<number>(0);
  const watchId = useRef<number | null>(null);
  const locationUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Use Austin-based fallback coordinates for development if needed
  const useFallbackLocation = () => {
    if (!latitude || !longitude) {
      // Austin, TX coordinates
      console.log("Using fallback location coordinates (Austin, TX)");
      setLatitude(30.2267);
      setLongitude(-97.7476);
      setAccuracy(1000); // Lower accuracy for fallback
      setIsLoading(false);
      return true;
    }
    return false;
  };

  const updateUserLocation = async (position: GeolocationPosition) => {
    const now = Date.now();
    const { latitude, longitude, accuracy } = position.coords;
    
    // Don't update too frequently (once per second is enough)
    if (now - lastUpdateTime.current < 1000) {
      return;
    }
    
    lastUpdateTime.current = now;
    
    // Update local state
    setLatitude(latitude);
    setLongitude(longitude);
    setAccuracy(accuracy);
    setIsLoading(false);
    setError(null); // Clear any previous errors

    // Update server with new location if authenticated
    if (user) {
      try {
        await apiRequest('PATCH', '/api/users/location', { latitude, longitude });
        
        // Also send location update through WebSocket for real-time updates
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'user_location',
            senderId: user.id,
            data: { latitude, longitude }
          }));
        }
      } catch (error) {
        console.error('Failed to update user location:', error);
        // Don't set UI error for background updates
      }
    }
  };

  const handleError = (err: GeolocationPositionError) => {
    console.error('Geolocation error:', err);
    
    let errorMessage: string;
    switch(err.code) {
      case 1: // PERMISSION_DENIED
        errorMessage = "Please allow location access to find gym partners near you.";
        break;
      case 2: // POSITION_UNAVAILABLE
        errorMessage = "Location information is unavailable. Using approximated location.";
        // Try using a fallback location
        if (useFallbackLocation()) {
          return; // Don't set error if we can use fallback
        }
        break;
      case 3: // TIMEOUT
        errorMessage = "Location request timed out. Using approximated location.";
        // Try using a fallback location
        if (useFallbackLocation()) {
          return; // Don't set error if we can use fallback
        }
        break;
      default:
        errorMessage = "Unable to determine your location. Using approximated location.";
        // Try using a fallback location
        if (useFallbackLocation()) {
          return; // Don't set error if we can use fallback
        }
    }
    
    setError(errorMessage);
    setIsLoading(false);
  };

  useEffect(() => {
    // Set up retry if location isn't available
    locationUpdateTimeout.current = setTimeout(() => {
      if (!latitude || !longitude) {
        console.log("Location not received in time, using fallback");
        useFallbackLocation();
      }
    }, 5000); // If no location after 5 seconds, use fallback

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      useFallbackLocation();
      return;
    }

    // Get initial position
    try {
      navigator.geolocation.getCurrentPosition(
        updateUserLocation,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 8000,
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
          maximumAge: 0
        }
      );
    } catch (e) {
      console.error("Error setting up geolocation:", e);
      useFallbackLocation();
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
  }, [user, socket]);

  return { latitude, longitude, error, isLoading, accuracy };
}
