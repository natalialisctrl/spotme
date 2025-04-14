import { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import PartnerCard from "./PartnerCard";
import { Loader2 } from "lucide-react";

interface PartnersListProps {
  filterParams: any;
}

type NearbyUser = User & { distance: number };

const PartnersList: FC<PartnersListProps> = ({ filterParams }) => {
  const { data: nearbyUsers, isLoading, error } = useQuery<NearbyUser[]>({
    queryKey: ['/api/users/nearby', filterParams],
    queryFn: async ({ queryKey }) => {
      const [_path, filters] = queryKey;
      const queryParams = new URLSearchParams();
      
      if (filters.workoutType) queryParams.append('workoutType', filters.workoutType);
      if (filters.gender) queryParams.append('gender', filters.gender);
      if (filters.experienceLevel) queryParams.append('experienceLevel', filters.experienceLevel);
      if (filters.maxDistance) queryParams.append('maxDistance', filters.maxDistance.toString());
      if (filters.sameGymOnly) queryParams.append('sameGymOnly', filters.sameGymOnly.toString());
      
      const url = `/api/users/nearby?${queryParams.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error('Failed to fetch nearby users');
      }
      
      return res.json();
    }
  });

  // Function to format distance
  const formatDistance = (distance: number) => {
    if (distance < 0.1) {
      return 'Less than 0.1 miles';
    } else {
      return `${distance.toFixed(1)} miles away`;
    }
  };

  return (
    <section className="mb-8 px-4">
      <h2 className="text-xl font-bold font-poppins text-dark mb-4">Potential Workout Partners</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600">Error loading potential partners. Please try again.</p>
        </div>
      ) : nearbyUsers && nearbyUsers.length > 0 ? (
        <div className="space-y-4">
          {nearbyUsers.map((user) => (
            <PartnerCard 
              key={user.id}
              user={user}
              distance={formatDistance(user.distance)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <p className="text-gray-600">No workout partners found matching your criteria.</p>
          <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or workout focus.</p>
        </div>
      )}
    </section>
  );
};

export default PartnersList;
