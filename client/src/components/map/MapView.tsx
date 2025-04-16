import { FC, useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterModal from "@/components/filters/FilterModal";

// Set your Mapbox access token here
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

interface MapViewProps {
  nearbyUsers?: User[];
  currentUser?: User;
  filterParams: any;
  onUpdateFilters: (filters: any) => void;
}

const MapView: FC<MapViewProps> = ({ nearbyUsers = [], currentUser, filterParams, onUpdateFilters }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const { latitude, longitude, error: locationError } = useGeolocation();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Initialize map when container and location are available
  useEffect(() => {
    if (mapContainer.current && latitude && longitude && !map.current && mapboxgl.accessToken) {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [longitude, latitude],
          zoom: 14
        });

        map.current.on('load', () => {
          setIsMapLoaded(true);
        });
      } catch (error) {
        console.error("Error initializing Mapbox:", error);
      }
    }
  }, [mapContainer, latitude, longitude]);

  // Update map markers when nearby users or current location changes
  useEffect(() => {
    if (isMapLoaded && map.current && latitude && longitude) {
      // Remove existing markers
      const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
      existingMarkers.forEach(marker => marker.remove());

      // Add current user marker
      const currentUserEl = document.createElement('div');
      currentUserEl.className = 'relative';
      
      const userMarker = document.createElement('div');
      userMarker.className = 'w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg';
      userMarker.innerHTML = '<span class="font-medium">You</span>';
      
      currentUserEl.appendChild(userMarker);
      
      if (map.current) {
        new mapboxgl.Marker(currentUserEl)
          .setLngLat([longitude, latitude])
          .addTo(map.current);
      }

      // Add markers for nearby users
      nearbyUsers.forEach((user, index) => {
        if (user.latitude && user.longitude) {
          const userEl = document.createElement('div');
          userEl.className = 'relative';
          
          const markerEl = document.createElement('div');
          markerEl.className = 'w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg';
          markerEl.innerHTML = `<span>${user.name.charAt(0)}</span>`;
          
          // Add indicator based on workout focus match
          const workoutIndicator = document.createElement('div');
          workoutIndicator.className = 'absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border border-white';
          
          userEl.appendChild(markerEl);
          userEl.appendChild(workoutIndicator);
          
          const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-semibold">${user.name}</h3>
                <p class="text-xs text-gray-600">${user.experienceLevel} (${user.experienceYears} years)</p>
              </div>
            `);
          
          if (map.current) {
            new mapboxgl.Marker(userEl)
              .setLngLat([user.longitude, user.latitude])
              .setPopup(popup)
              .addTo(map.current);
          }
        }
      });

      // Center the map on current user location
      if (map.current) {
        map.current.flyTo({
          center: [longitude, latitude],
          zoom: 14
        });
      }
    }
  }, [isMapLoaded, nearbyUsers, latitude, longitude]);

  const handleZoomIn = () => {
    if (map.current) {
      map.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (map.current) {
      map.current.zoomOut();
    }
  };

  const handleRecenterMap = () => {
    if (map.current && latitude && longitude) {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 14
      });
    }
  };

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
      
      <div className="relative bg-white rounded-xl overflow-hidden shadow-md h-64 md:h-96">
        {!mapboxgl.accessToken ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 p-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Map View Unavailable</h3>
              <p className="text-sm text-gray-600 mt-1">We're currently showing demo partners without map visualization.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {nearbyUsers.slice(0, 4).map((user, index) => (
                <div key={user.id || index} className="bg-white p-2 rounded-lg shadow-sm flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
                    {user.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{Math.round(user.distance * 10) / 10} miles</p>
                  </div>
                </div>
              ))}
            </div>
            {nearbyUsers.length > 4 && (
              <p className="text-xs text-gray-500 mt-2">+{nearbyUsers.length - 4} more partners available</p>
            )}
          </div>
        ) : locationError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-center p-4">
              <p className="text-red-500 font-medium">Unable to access your location</p>
              <p className="text-sm text-gray-600 mt-2">Please enable location services to find nearby gym partners.</p>
            </div>
          </div>
        ) : !latitude || !longitude ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <p className="text-gray-500">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapContainer} className="absolute inset-0" />
        )}
        
        {/* Map controls - only show if map is likely to render */}
        {mapboxgl.accessToken && (
          <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
            <button 
              className="bg-white p-2 rounded-full shadow-md text-gray-600 hover:bg-gray-50"
              onClick={handleZoomIn}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button 
              className="bg-white p-2 rounded-full shadow-md text-gray-600 hover:bg-gray-50"
              onClick={handleZoomOut}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
              </svg>
            </button>
            <button 
              className="bg-white p-2 rounded-full shadow-md text-gray-600 hover:bg-gray-50"
              onClick={handleRecenterMap}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </button>
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
