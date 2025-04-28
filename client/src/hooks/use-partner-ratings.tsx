import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types
export type PartnerRating = {
  id: number;
  raterId: number;
  ratedUserId: number;
  rating: number;
  feedback?: string;
  isProfessional: boolean;
  isReliable: boolean;
  isMotivating: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RatingFormData = {
  rating: number;
  feedback?: string;
  isProfessional: boolean;
  isReliable: boolean;
  isMotivating: boolean;
  isPublic: boolean;
  ratedUserId: number;
};

export type RatingSummary = {
  userId: number;
  averageRating: number;
  totalRatings: number;
  professionalScore: number;
  reliabilityScore: number;
  motivationScore: number;
  testimonialCount: number;
  updatedAt: string;
};

// Main hook
export function usePartnerRatings() {
  const { toast } = useToast();

  // Query hook to get ratings for a specific user
  const useUserRatings = (userId: number) => {
    return useQuery({
      queryKey: ['/api/ratings', userId],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/ratings/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user ratings');
        }
        return response.json() as Promise<PartnerRating[]>;
      },
      enabled: !!userId,
    });
  };

  // Query hook to get rating summary for a user
  const useRatingSummary = (userId: number) => {
    return useQuery({
      queryKey: ['/api/ratings/summary', userId],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/ratings/summary/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch rating summary');
        }
        return response.json() as Promise<RatingSummary>;
      },
      enabled: !!userId,
    });
  };

  // Query hook to get ratings the current user has received
  const useReceivedRatings = () => {
    return useQuery({
      queryKey: ['/api/ratings/received'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/ratings/received');
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required');
          }
          throw new Error('Failed to fetch received ratings');
        }
        return response.json() as Promise<PartnerRating[]>;
      },
    });
  };

  // Query hook to get ratings the current user has given
  const useGivenRatings = () => {
    return useQuery({
      queryKey: ['/api/ratings/given'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/ratings/given');
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required');
          }
          throw new Error('Failed to fetch given ratings');
        }
        return response.json() as Promise<PartnerRating[]>;
      },
    });
  };

  // Mutation hook to create a new rating
  const useCreateRating = () => {
    return useMutation({
      mutationFn: async (data: RatingFormData) => {
        const response = await apiRequest('POST', '/api/ratings', data);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create rating');
        }
        return response.json() as Promise<PartnerRating>;
      },
      onSuccess: (data) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/ratings', data.ratedUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary', data.ratedUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/received'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });

        toast({
          title: 'Rating Submitted',
          description: 'Your rating has been submitted successfully.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Failed to Submit Rating',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  // Mutation hook to update an existing rating
  const useUpdateRating = () => {
    return useMutation({
      mutationFn: async (data: PartnerRating) => {
        const response = await apiRequest('PUT', `/api/ratings/${data.id}`, data);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update rating');
        }
        return response.json() as Promise<PartnerRating>;
      },
      onSuccess: (data) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/ratings', data.ratedUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary', data.ratedUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/received'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });

        toast({
          title: 'Rating Updated',
          description: 'Your rating has been updated successfully.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Failed to Update Rating',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  // Mutation hook to delete a rating
  const useDeleteRating = () => {
    return useMutation({
      mutationFn: async (ratingId: number) => {
        const response = await apiRequest('DELETE', `/api/ratings/${ratingId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete rating');
        }
        return { id: ratingId };
      },
      onSuccess: (_, ratingId) => {
        // We need to invalidate all rating queries since we don't know the user ID
        queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/received'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });

        toast({
          title: 'Rating Deleted',
          description: 'Your rating has been deleted successfully.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Failed to Delete Rating',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  // Mutation to create demo ratings (for testing)
  const useCreateDemoRatings = () => {
    return useMutation({
      mutationFn: async (count: number = 5) => {
        const response = await apiRequest('POST', '/api/ratings/demo', { count });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create demo ratings');
        }
        return response.json() as Promise<{ success: boolean; count: number }>;
      },
      onSuccess: () => {
        // Invalidate all rating queries
        queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/received'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });
      },
      onError: (error: Error) => {
        toast({
          title: 'Failed to Create Demo Ratings',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return {
    useUserRatings,
    useRatingSummary,
    useReceivedRatings,
    useGivenRatings,
    useCreateRating,
    useUpdateRating,
    useDeleteRating,
    useCreateDemoRatings,
  };
}