import { FC, useState, useRef, useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { User } from "@shared/schema";
import { Filter, MapPin, UserRound, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterModal from "@/components/filters/FilterModal";

interface MapViewProps {
  nearbyUsers?: User[];
  currentUser?: User;
  filterParams: any;
  onUpdateFilters: (filters: any) => void;
}

// Define the main component with no dependency on MapBox
const MapView: FC<MapViewProps> = ({ nearbyUsers = [], currentUser, filterParams, onUpdateFilters }) => {
  const { latitude, longitude, error: locationError, accuracy } = useGeolocation();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Group users into distance categories
  const getNearbyUsersWithDistances = () => {
    return nearbyUsers.map(user => {
      // TypeScript workaround for the added "distance" property
      const userWithDistance = user as (User & { distance?: number });
      return {
        ...userWithDistance,
        // If distance isn't available, generate a random one between 0.1-3 miles
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
            {/* Your location indicator */}
            <div className="flex items-center mb-4 bg-accent/10 p-3 rounded-lg">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white mr-3">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Your Location</p>
                <p className="text-xs text-gray-500">
                  {accuracy ? 
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
            
            {/* Interactive partner map replacement */}
            <div className="space-y-4">
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
