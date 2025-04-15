import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "./useWebSocket";

interface GeolocationHookResult {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation(): GeolocationHookResult {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const socket = useWebSocket(user?.id);

  useEffect(() => {
    let watchId: number;

    const updateUserLocation = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setLatitude(latitude);
      setLongitude(longitude);
      setIsLoading(false);

      // Update server with new location
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
        }
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      setError(
        err.code === 1
          ? "Please allow location access to find gym partners near you."
          : "Unable to determine your location. Please try again."
      );
      setIsLoading(false);
    };

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(updateUserLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });

    // Watch position for changes
    watchId = navigator.geolocation.watchPosition(
      updateUserLocation,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    // Cleanup
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user, socket]);

  return { latitude, longitude, error, isLoading };
}
