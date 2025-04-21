import { FC, useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import PartnerCard from "./PartnerCard";
import { Loader2, SlidersHorizontal, Share2, Sliders, Info, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { 
  calculateCompatibilityWithBreakdown, 
  getCompatibilityLabel,
  CompatibilityBreakdown,
  DEFAULT_WEIGHTS
} from "@/lib/compatibilityMatcher";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface FilterParams {
  workoutType?: string;
  gender?: string;
  experienceLevel?: string;
  maxDistance?: number;
  sameGymOnly?: boolean;
}

interface PartnersListProps {
  filterParams: FilterParams;
  nearbyUsers?: (User & { distance: number })[];
}

type NearbyUser = User & { distance: number };
type NearbyUserWithScore = NearbyUser & { 
  compatibilityScore: number;
  compatibilityBreakdown?: CompatibilityBreakdown;
};

type SortType = 'compatibility' | 'distance' | 'experienceLevel';

const PartnersList: FC<PartnersListProps> = ({ filterParams, nearbyUsers: propNearbyUsers }) => {
  const { user: currentUser } = useAuth();
  const [sortBy, setSortBy] = useState<SortType>('compatibility');
  const [animateIn, setAnimateIn] = useState<Record<number, boolean>>({});
  const [showOneTapTip, setShowOneTapTip] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Using the users that are passed from the parent component instead of fetching again
  const nearbyUsers = propNearbyUsers || [];
  
  // Customize compatibility weight factors
  const [compatibilityWeights, setCompatibilityWeights] = useState(DEFAULT_WEIGHTS);
  const [showWeightSettings, setShowWeightSettings] = useState(false);
  
  // Store compatibility breakdowns for each user
  const [compatibilityBreakdowns, setCompatibilityBreakdowns] = useState<Record<number, CompatibilityBreakdown>>({});
  
  // Calculate compatibility scores and sort users
  const sortedUsers = useMemo<NearbyUserWithScore[]>(() => {
    if (!nearbyUsers || !currentUser) return [];
    
    // Create a new array with compatibility scores and store breakdowns
    const usersWithScores: NearbyUserWithScore[] = nearbyUsers.map(user => {
      // Calculate detailed compatibility with breakdown
      const breakdown = calculateCompatibilityWithBreakdown(currentUser, user, compatibilityWeights);
      
      // Store breakdown for this user to use in tooltips/cards
      setCompatibilityBreakdowns(prev => ({
        ...prev,
        [user.id]: breakdown
      }));
      
      return {
        ...user, 
        compatibilityScore: breakdown.totalScore
      };
    });
    
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
  }, [nearbyUsers, currentUser, sortBy, compatibilityWeights]);
  
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
  
  // Dismiss one-tap tip
  const dismissTip = () => {
    setShowOneTapTip(false);
    // Could store this preference in localStorage to remember across sessions
    localStorage.setItem('oneTapTipDismissed', 'true');
  };
  
  // Check if tip was previously dismissed
  useEffect(() => {
    const tipDismissed = localStorage.getItem('oneTapTipDismissed');
    if (tipDismissed === 'true') {
      setShowOneTapTip(false);
    }
  }, []);

  return (
    <section className="mb-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-poppins text-dark mb-2 md:mb-0">Potential Workout Partners</h2>
        
        {/* Sorting controls and compatibility settings */}
        {nearbyUsers && nearbyUsers.length > 0 && (
          <div className="flex items-center space-x-2">
            {/* Customization for compatibility weights */}
            <Popover open={showWeightSettings} onOpenChange={setShowWeightSettings}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1 text-xs h-8"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Customize Match</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Customize Compatibility Factors</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Workout Style</label>
                        <span className="text-xs">{Math.round(compatibilityWeights.workoutStyle * 100)}%</span>
                      </div>
                      <Slider 
                        value={[compatibilityWeights.workoutStyle * 100]} 
                        min={0} 
                        max={100}
                        step={5}
                        onValueChange={(value) => {
                          setCompatibilityWeights(prev => ({
                            ...prev,
                            workoutStyle: value[0] / 100
                          }));
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Fitness Goals</label>
                        <span className="text-xs">{Math.round(compatibilityWeights.goals * 100)}%</span>
                      </div>
                      <Slider 
                        value={[compatibilityWeights.goals * 100]} 
                        min={0} 
                        max={100}
                        step={5}
                        onValueChange={(value) => {
                          setCompatibilityWeights(prev => ({
                            ...prev,
                            goals: value[0] / 100
                          }));
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Experience Level</label>
                        <span className="text-xs">{Math.round(compatibilityWeights.experience * 100)}%</span>
                      </div>
                      <Slider 
                        value={[compatibilityWeights.experience * 100]} 
                        min={0} 
                        max={100}
                        step={5}
                        onValueChange={(value) => {
                          setCompatibilityWeights(prev => ({
                            ...prev,
                            experience: value[0] / 100
                          }));
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Partner Preferences</label>
                        <span className="text-xs">{Math.round(compatibilityWeights.preferences * 100)}%</span>
                      </div>
                      <Slider 
                        value={[compatibilityWeights.preferences * 100]} 
                        min={0} 
                        max={100}
                        step={5}
                        onValueChange={(value) => {
                          setCompatibilityWeights(prev => ({
                            ...prev,
                            preferences: value[0] / 100
                          }));
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCompatibilityWeights(DEFAULT_WEIGHTS)}
                    >
                      Reset
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => setShowWeightSettings(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Sorting dropdown */}
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
          </div>
        )}
      </div>
      
      {/* Feature tip for one-tap connect */}
      {showOneTapTip && sortedUsers && sortedUsers.length > 0 && (
        <Alert className="mb-4 bg-primary-50 border-primary/30">
          <Zap className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">New Feature: One-tap Fitness Buddy Connect</AlertTitle>
          <AlertDescription className="text-gray-700 flex justify-between items-center">
            <span>
              Hover over a potential partner card to see the quick connect button. Get instant compatibility details before sending a request.
            </span>
            <Button variant="ghost" size="sm" onClick={dismissTip} className="text-gray-500">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
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
