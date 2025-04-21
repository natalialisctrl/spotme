import { FC, useState, useRef, useEffect, useCallback } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { User } from "@shared/schema";
import { Filter, MapPin, Compass, AlertCircle, MapIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FilterModal from "@/components/filters/FilterModal";
import mapboxgl, { 
  createMarkerElement, 
  createMarkerPopup, 
  calculateDistance,
  isMapboxInitialized 
} from "@/lib/mapboxClient";

interface MapViewProps {
  nearbyUsers?: User[];
  currentUser?: User;
  filterParams: any;
  onUpdateFilters: (filters: any) => void;
}

// Define the main component with MapBox integration
const MapView: FC<MapViewProps> = ({ nearbyUsers = [], currentUser, filterParams, onUpdateFilters }) => {
  const { latitude: geoLatitude, longitude: geoLongitude, error: locationError, accuracy, updateManualLocation } = useGeolocation();
  
  // State for manual location input - hidden by default, only shown in case of persistent issues
  const [manualLatitude, setManualLatitude] = useState<string>("");
  const [manualLongitude, setManualLongitude] = useState<string>("");
  const [isManualLocation, setIsManualLocation] = useState<boolean>(false); 
  const [showManualOption, setShowManualOption] = useState<boolean>(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Use either manual coordinates or geolocation coordinates
  const latitude = isManualLocation && manualLatitude ? parseFloat(manualLatitude) : geoLatitude;
  const longitude = isManualLocation && manualLongitude ? parseFloat(manualLongitude) : geoLongitude;
  
  // MapBox refs and state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  // Handle manual location submission
  const handleManualLocationSubmit = () => {
    if (manualLatitude && manualLongitude) {
      const lat = parseFloat(manualLatitude);
      const lng = parseFloat(manualLongitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        setIsManualLocation(true);
        
        // Also update the location in the geolocation hook and server
        updateManualLocation(lat, lng);
        
        // If map exists, fly to the new location
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 14,
            essential: true
          });
        }
      }
    }
  };

  // Check if Mapbox is initialized
  const mapboxReady = isMapboxInitialized();

  // Calculate and group users into distance categories
  const getNearbyUsersWithDistances = () => {
    return nearbyUsers.map(user => {
      // TypeScript workaround for the added "distance" property
      const userWithDistance = user as (User & { distance?: number });
      
      // Calculate real distance if both user and current user have coordinates
      if (latitude && longitude && user.latitude && user.longitude) {
        userWithDistance.distance = calculateDistance(
          latitude, 
          longitude, 
          user.latitude, 
          user.longitude
        );
      }
      
      return {
        ...userWithDistance,
        distanceCategory: userWithDistance.distance 
          ? userWithDistance.distance < 1 
            ? 'Very Close' 
            : userWithDistance.distance < 2 
              ? 'Close'
              : 'Nearby'
          : 'Nearby'
      };
    });
  };

  const formattedUsers = getNearbyUsersWithDistances();

  // Function to update map markers
  const updateMapMarkers = useCallback(() => {
    if (!mapRef.current) return;
    
    // Don't proceed if we don't have real coordinates
    if (!latitude || !longitude) {
      console.log("Can't update markers without real coordinates");
      return;
    }
    
    console.log("Updating map markers with coordinates:", {lat: latitude, lng: longitude});
    
    // Clear all existing markers
    markersRef.current.forEach(marker => {
      try {
        marker.remove();
      } catch (err) {
        console.error("Error removing marker:", err);
      }
    });
    markersRef.current = [];
    
    // Always add current user marker first
    try {
      console.log("Adding YOU marker at:", [longitude, latitude]);
      
      // Create custom marker element for current user
      const youMarkerElement = document.createElement('div');
      youMarkerElement.className = 'relative';
      
      const markerInner = document.createElement('div');
      markerInner.className = 'w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg';
      markerInner.innerHTML = '<span class="font-medium">You</span>';
      youMarkerElement.appendChild(markerInner);
      
      // Create and add the current user marker
      const youMarker = new mapboxgl.Marker({
        element: youMarkerElement,
        anchor: 'bottom'
      })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);
      
      markersRef.current.push(youMarker);
    } catch (err) {
      console.error("Error adding YOU marker:", err);
    }
    
    // Then add markers for nearby users with valid coordinates
    nearbyUsers.forEach(user => {
      if (user.latitude && user.longitude) {
        try {
          console.log("Adding user marker for:", user.name, [user.longitude, user.latitude]);
          
          const marker = new mapboxgl.Marker(createMarkerElement(user))
            .setLngLat([user.longitude, user.latitude])
            .setPopup(createMarkerPopup(user))
            .addTo(mapRef.current!);
          
          markersRef.current.push(marker);
        } catch (error) {
          console.error("Error adding marker for user", user.id, error);
        }
      }
    });
  }, [latitude, longitude, nearbyUsers]);
  
  // Initialize and update the MapBox map
  useEffect(() => {
    // Don't try to initialize the map if Mapbox is not ready
    if (!mapboxReady) {
      setMapError("MapBox token is not properly configured. Please check your environment variables.");
      return;
    }

    // Ensure we have coordinates - don't use fallback, wait for real ones
    if (!latitude || !longitude) {
      console.log("Waiting for real coordinates before initializing map...");
      return;
    }
    
    // Only initialize if we have the container
    if (!mapContainerRef.current) return;
    
    // If map already exists, just update the center
    if (mapRef.current) {
      try {
        mapRef.current.setCenter([longitude, latitude]);
        
        // Update the current user marker position if it exists
        if (markersRef.current.length > 0 && markersRef.current[0]) {
          markersRef.current[0].setLngLat([longitude, latitude]);
        }
        
        return;
      } catch (err) {
        console.error("Error updating map center:", err);
        // If there was an error, the map might be corrupted, so we'll recreate it
        try {
          mapRef.current.remove();
        } catch (removeErr) {
          console.error("Error removing map:", removeErr);
        }
        mapRef.current = null;
      }
    }
    
    try {
      console.log("Initializing MapBox map with coordinates:", { latitude, longitude });
      setMapError(null);
      
      // Initialize the map with the user's real coordinates
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [longitude, latitude],
        zoom: 13,
        attributionControl: false,
        // These options improve map stability
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true
      });
      
      // Save the map reference
      mapRef.current = map;
      
      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // When map is loaded, add markers
      map.on('load', () => {
        console.log("MapBox map loaded successfully");
        
        // Add all markers using the updateMapMarkers function
        updateMapMarkers();
      });
      
      // Handle map errors
      map.on('error', (e) => {
        console.error("MapBox error:", e);
        setMapError("An error occurred with the map. Please try refreshing the page.");
      });
      
    } catch (error) {
      console.error("Error initializing MapBox map:", error);
      setMapError("Failed to initialize the map. Please check your internet connection and try again.");
    }
    
    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapRef.current = null;
        markersRef.current = [];
      }
    };
  }, [latitude, longitude, currentUser, mapboxReady, updateMapMarkers]);
  
  // Update map markers when nearby users change
  useEffect(() => {
    if (mapRef.current) {
      updateMapMarkers();
    }
  }, [nearbyUsers, updateMapMarkers]);
  
  // Show manual controls automatically if location error persists
  useEffect(() => {
    // If there's a location error for more than 5 seconds, show manual controls
    if (locationError) {
      const timer = setTimeout(() => {
        setShowManualOption(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [locationError]);

  return (
    <section className="mb-8 px-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-poppins text-dark">Nearby Workout Partners</h2>
        <Button
          variant="outline"
          size="sm"
          className="text-sm"
          onClick={() => setIsFilterModalOpen(true)}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>
      </div>
      
      <div className="relative bg-white rounded-xl overflow-hidden shadow-md h-auto md:h-auto">
        {locationError ? (
          <div className="flex items-center justify-center bg-gray-100 p-6">
            <div className="text-center">
              <p className="text-red-500 font-medium">Unable to access your location</p>
              <p className="text-sm text-gray-600 mt-2">Please enable location services to find nearby gym partners.</p>
            </div>
          </div>
        ) : !latitude || !longitude ? (
          <div className="flex items-center justify-center bg-gray-100 p-6">
            <div className="text-center">
              <p className="text-gray-500">Loading your location...</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* MapBox Token Error */}
            {mapError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Map Error</AlertTitle>
                <AlertDescription>{mapError}</AlertDescription>
              </Alert>
            )}
            
            {/* Your location indicator with manual input option */}
            <div className="flex flex-col space-y-3">
              <div className="flex items-center bg-accent/10 p-3 rounded-lg">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white mr-3">
                  <Compass className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Your Location</p>
                    {locationError && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowManualOption(true)}
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Having Issues?
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {isManualLocation ? 
                      'Manual location active' : 
                      accuracy ? 
                        (accuracy < 500 ? 
                          'High accuracy location detected' : 
                          accuracy < 1000 ? 
                            'Moderate accuracy location' : 
                            'Approximate location')
                        : 'Location found'}
                  </p>
                  <p className="text-xs text-gray-500">Showing partners within 5 miles</p>
                </div>
              </div>
              
              {/* Manual Location Input - only shown if user has issues */}
              {(showManualOption || isManualLocation) && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-sm font-medium mb-2">Enter Coordinates</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <Label htmlFor="latitude" className="text-xs mb-1">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.0001"
                        placeholder={latitude?.toString() || "Enter latitude"}
                        value={manualLatitude}
                        onChange={(e) => setManualLatitude(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude" className="text-xs mb-1">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.0001"
                        placeholder={longitude?.toString() || "Enter longitude"}
                        value={manualLongitude}
                        onChange={(e) => setManualLongitude(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-8 text-xs w-full"
                      onClick={handleManualLocationSubmit}
                      disabled={!manualLatitude || !manualLongitude}
                    >
                      Update Location
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        if (latitude && longitude) {
                          setManualLatitude(latitude.toString());
                          setManualLongitude(longitude.toString());
                        }
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Tip: You can use websites like Google Maps to find your actual coordinates.
                  </p>
                </div>
              )}
            </div>
            
            {/* Interactive Map */}
            <div className="space-y-6">
              {/* MapBox Map Container */}
              <div 
                ref={mapContainerRef}
                className="w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden border border-gray-200"
              />
            
              {/* User Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formattedUsers.map((user, index) => (
                  <div 
                    key={user.id || index}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-start space-x-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0">
                      <span className="text-lg font-semibold">{user.name.charAt(0)}</span>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{user.name}</p>
                        <div className="flex items-center bg-gray-100 px-2 py-0.5 rounded-full">
                          <MapPin className="h-3 w-3 text-primary mr-1" />
                          <span className="text-xs">
                            {(user as any).distance ? `${Math.round((user as any).distance * 10) / 10} mi` : 'Nearby'}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-0.5">{user.experienceLevel} • {user.experienceYears} years</p>
                      
                      <div className="flex items-center mt-2">
                        <div className="flex space-x-1">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{user.gender}</span>
                          {user.gymName && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs truncate max-w-[100px]">
                              {user.gymName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {formattedUsers.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No workout partners found nearby</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Filter Modal */}
      <FilterModal 
        isOpen={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)}
        initialFilters={filterParams}
        onApplyFilters={onUpdateFilters}
      />
    </section>
  );
};

export default MapView;
