import { FC, useState } from "react";
import { User } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Zap, ThumbsUp, ThumbsDown, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  calculateCompatibilityScore, 
  calculateCompatibilityWithBreakdown,
  getCompatibilityLabel, 
  getCompatibilityColor 
} from "@/lib/compatibilityMatcher";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface PartnerCardProps {
  user: User;
  distance: string;
  currentUser?: User | null;
}

const PartnerCard: FC<PartnerCardProps> = ({ user, distance, currentUser }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSent, setConnectionSent] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  
  // Use either provided currentUser or authUser from context
  const loggedInUser = currentUser || authUser;
  
  // Calculate compatibility score if both users have data
  const compatibilityScore = loggedInUser && user ? calculateCompatibilityScore(loggedInUser, user) : 0;
  const compatibilityLabel = getCompatibilityLabel(compatibilityScore);
  const compatibilityColor = getCompatibilityColor(compatibilityScore);

  // Send connection request mutation
  const { mutate: sendConnectionRequest } = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/connection-requests', { receiverId: user.id });
    },
    onMutate: () => {
      setIsConnecting(true);
    },
    onSuccess: () => {
      setConnectionSent(true);
      toast({
        title: "Connection request sent!",
        description: `Your request has been sent to ${user.name}.`,
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests/sent'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send request",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsConnecting(false);
    }
  });

  // Get initials for avatar placeholder
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Format workout type for display
  const formatWorkoutType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  // Generate a placeholder avatar background color
  const getAvatarColor = (name: string) => {
    const colors = ['#2563EB', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Handle connection request
  const handleConnect = () => {
    if (!connectionSent && !isConnecting) {
      sendConnectionRequest();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="md:flex">
        <div className="md:flex-shrink-0">
          <div 
            className="h-48 w-full md:w-48 flex items-center justify-center text-white text-4xl font-bold"
            style={{ backgroundColor: getAvatarColor(user.name) }}
          >
            {getInitials(user.name)}
          </div>
        </div>
        <div className="p-4 md:flex-1 flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold font-poppins text-gray-900">{user.name}</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {distance}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {/* Compatibility score badge with hover card */}
              {compatibilityScore > 0 && loggedInUser && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 hover:shadow-md
                        ${compatibilityScore >= 70 ? 'bg-green-100 text-green-800' : 
                          compatibilityScore >= 50 ? 'bg-blue-100 text-blue-800' : 
                          'bg-amber-100 text-amber-800'}`}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {compatibilityScore}% {compatibilityLabel}
                      <Info className="h-3 w-3 ml-1 opacity-50" />
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 p-0">
                    <CompatibilityDetails 
                      currentUser={loggedInUser} 
                      potentialPartner={user}
                      onFeedback={(isAccurate) => {
                        toast({
                          title: `Thanks for your feedback!`,
                          description: isAccurate ? 
                            "We'll use this to improve future matches." :
                            "We'll adjust our algorithm based on your feedback.",
                          duration: 3000,
                        });
                      }} 
                    />
                  </HoverCardContent>
                </HoverCard>
              )}
              
              {/* Experience level badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {user.experienceLevel.charAt(0).toUpperCase() + user.experienceLevel.slice(1)} • {user.experienceYears} years
              </span>
              
              {/* Gender badge */}
              {user.gender && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {user.bio || "No bio provided"}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">
                {user.gymName ? `At ${user.gymName}` : 'Nearby gym'}
              </span>
              <CheckCircle className="h-4 w-4 ml-1 text-secondary" />
            </div>
            <div>
              <button
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm 
                  ${connectionSent 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'}`}
                onClick={handleConnect}
                disabled={connectionSent || isConnecting}
              >
                {connectionSent ? 'Pending' : (isConnecting ? 'Connecting...' : 'Connect')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Compatibility details component to show in hover card
interface CompatibilityDetailsProps {
  currentUser: User;
  potentialPartner: User;
  onFeedback: (isAccurate: boolean) => void;
}

const CompatibilityDetails: FC<CompatibilityDetailsProps> = ({ 
  currentUser, 
  potentialPartner,
  onFeedback
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  
  // Get detailed breakdown of compatibility scores
  const breakdown = calculateCompatibilityWithBreakdown(currentUser, potentialPartner);
  
  // Format score as percentage
  const formatScore = (score: number) => `${score}%`;
  
  // Generate a color class based on score
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-emerald-500";
    if (score >= 50) return "text-blue-500";
    if (score >= 30) return "text-amber-500";
    return "text-gray-500";
  };
  
  // Calculate score bar width
  const getScoreBarWidth = (score: number) => {
    return `${Math.max(5, score)}%`;
  };
  
  const handleFeedback = (isAccurate: boolean) => {
    setFeedbackGiven(true);
    onFeedback(isAccurate);
    
    // In a real app, we would send this feedback to the backend
    // apiRequest('POST', '/api/match-feedback', {
    //   userId: currentUser.id,
    //   matchUserId: potentialPartner.id,
    //   isAccurate,
    //   score: breakdown.totalScore
    // });
  };
  
  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900 mb-1">Compatibility Breakdown</h3>
        <p className="text-xs text-gray-500">
          See how you match with {potentialPartner.name} based on our AI analysis
        </p>
      </div>
      
      {/* Compatibility factors */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Workout Style</span>
            <span className={`text-xs font-medium ${getScoreColorClass(breakdown.workoutStyleScore)}`}>
              {formatScore(breakdown.workoutStyleScore)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getScoreColorClass(breakdown.workoutStyleScore).replace('text-', 'bg-')}`}
              style={{ width: getScoreBarWidth(breakdown.workoutStyleScore) }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Fitness Goals</span>
            <span className={`text-xs font-medium ${getScoreColorClass(breakdown.goalScore)}`}>
              {formatScore(breakdown.goalScore)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getScoreColorClass(breakdown.goalScore).replace('text-', 'bg-')}`}
              style={{ width: getScoreBarWidth(breakdown.goalScore) }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Experience Level</span>
            <span className={`text-xs font-medium ${getScoreColorClass(breakdown.experienceScore)}`}>
              {formatScore(breakdown.experienceScore)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getScoreColorClass(breakdown.experienceScore).replace('text-', 'bg-')}`}
              style={{ width: getScoreBarWidth(breakdown.experienceScore) }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Partner Preferences</span>
            <span className={`text-xs font-medium ${getScoreColorClass(breakdown.preferenceScore)}`}>
              {formatScore(breakdown.preferenceScore)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getScoreColorClass(breakdown.preferenceScore).replace('text-', 'bg-')}`}
              style={{ width: getScoreBarWidth(breakdown.preferenceScore) }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Overall score */}
      <div className="bg-gray-50 p-3 rounded-md mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Overall Compatibility</span>
          <span className={`text-sm font-bold ${getScoreColorClass(breakdown.totalScore)}`}>
            {formatScore(breakdown.totalScore)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
          <div 
            className={`h-3 rounded-full ${getScoreColorClass(breakdown.totalScore).replace('text-', 'bg-')}`}
            style={{ width: getScoreBarWidth(breakdown.totalScore) }}
          ></div>
        </div>
      </div>
      
      {/* Feedback section */}
      {!feedbackGiven ? (
        <div className="border-t pt-3">
          <p className="text-xs text-gray-500 mb-2">Is this match accurate for you?</p>
          <div className="flex space-x-2">
            <button
              onClick={() => handleFeedback(true)}
              className="flex items-center justify-center px-3 py-1 text-xs rounded-md border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Yes, good match
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className="flex items-center justify-center px-3 py-1 text-xs rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              No, improve it
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t pt-3">
          <p className="text-xs text-green-600">
            Thank you for your feedback! We'll use it to improve future matches.
          </p>
        </div>
      )}
    </div>
  );
};

export default PartnerCard;
