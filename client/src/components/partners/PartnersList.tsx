import { FC, useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import PartnerCard from "./PartnerCard";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { calculateCompatibilityScore } from "@/lib/compatibilityMatcher";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterParams {
  workoutType?: string;
  gender?: string;
  experienceLevel?: string;
  maxDistance?: number;
  sameGymOnly?: boolean;
}

interface PartnersListProps {
  filterParams: FilterParams;
}

type NearbyUser = User & { distance: number };
type NearbyUserWithScore = NearbyUser & { compatibilityScore: number };

type SortType = 'compatibility' | 'distance' | 'experienceLevel';

const PartnersList: FC<PartnersListProps> = ({ filterParams }) => {
  const { user: currentUser } = useAuth();
  const [sortBy, setSortBy] = useState<SortType>('compatibility');
  const [animateIn, setAnimateIn] = useState<Record<number, boolean>>({});
  
  const { data: nearbyUsers, isLoading, error } = useQuery<NearbyUser[]>({
    queryKey: ['/api/users/nearby', filterParams],
    queryFn: async ({ queryKey }) => {
      const [_path, filters] = queryKey as [string, FilterParams];
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
  
  // Calculate compatibility scores and sort users
  const sortedUsers = useMemo<NearbyUserWithScore[]>(() => {
    if (!nearbyUsers || !currentUser) return [];
    
    // Create a new array with compatibility scores
    const usersWithScores: NearbyUserWithScore[] = nearbyUsers.map(user => ({
      ...user, 
      compatibilityScore: calculateCompatibilityScore(currentUser, user)
    }));
    
    // Sort by selected criteria
    return [...usersWithScores].sort((a, b) => {
      if (sortBy === 'compatibility') {
        return b.compatibilityScore - a.compatibilityScore;
      } else if (sortBy === 'distance') {
        return a.distance - b.distance;
      } else if (sortBy === 'experienceLevel') {
        const levelMap = { beginner: 0, intermediate: 1, advanced: 2 };
        return levelMap[b.experienceLevel as keyof typeof levelMap] - 
               levelMap[a.experienceLevel as keyof typeof levelMap];
      }
      return 0;
    });
  }, [nearbyUsers, currentUser, sortBy]);
  
  // Animate new partners in when they appear
  useEffect(() => {
    if (sortedUsers && sortedUsers.length > 0) {
      // Reset animation state
      const newAnimateState: Record<number, boolean> = {};
      
      // Schedule animations for each user with staggered timing
      sortedUsers.forEach((user, index) => {
        setTimeout(() => {
          setAnimateIn(prev => ({ ...prev, [user.id]: true }));
        }, index * 150); // Stagger the animations
        
        newAnimateState[user.id] = false;
      });
      
      setAnimateIn(newAnimateState);
    }
  }, [sortedUsers]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-poppins text-dark mb-2 md:mb-0">Potential Workout Partners</h2>
        
        {/* Sorting controls */}
        {nearbyUsers && nearbyUsers.length > 0 && (
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 mr-2">Sort by:</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compatibility">Compatibility</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="experienceLevel">Experience Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600">Error loading potential partners. Please try again.</p>
        </div>
      ) : sortedUsers && sortedUsers.length > 0 ? (
        <div className="space-y-4">
          {sortedUsers.map((user) => (
            <div 
              key={user.id}
              className={`transform transition-all duration-500 ease-out ${
                animateIn[user.id] 
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-4 opacity-0'
              }`}
            >
              <PartnerCard 
                user={user}
                distance={formatDistance(user.distance)}
                currentUser={currentUser}
              />
            </div>
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
