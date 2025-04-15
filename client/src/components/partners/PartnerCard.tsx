import { FC, useState } from "react";
import { User } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { calculateCompatibilityScore, getCompatibilityLabel, getCompatibilityColor } from "@/lib/compatibilityMatcher";

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
              {/* Compatibility score badge */}
              {compatibilityScore > 0 && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${compatibilityScore >= 70 ? 'bg-green-100 text-green-800' : compatibilityScore >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                  <Zap className="h-3 w-3 mr-1" />
                  {compatibilityScore}% {compatibilityLabel}
                </span>
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

export default PartnerCard;
