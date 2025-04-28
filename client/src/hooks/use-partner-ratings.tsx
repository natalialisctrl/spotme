import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "./use-toast";

export interface PartnerRating {
  id: number;
  raterId: number;
  ratedUserId: number;
  workoutId: number | null;
  meetupId: number | null;
  rating: number;
  feedback: string | null;
  isProfessional: boolean;
  isReliable: boolean;
  isMotivating: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RatingSummary {
  userId: number;
  totalRatings: number;
  averageRating: number;
  professionalScore: number;
  reliabilityScore: number;
  motivationScore: number;
  testimonialCount: number;
  updatedAt: string;
}

export interface RatingFormData {
  ratedUserId: number;
  rating: number;
  feedback?: string;
  isProfessional?: boolean;
  isReliable?: boolean;
  isMotivating?: boolean;
  isPublic?: boolean;
}

export function usePartnerRatings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get ratings received by the current user
  const useReceivedRatings = () => {
    return useQuery<PartnerRating[]>({
      queryKey: ['/api/ratings/received'],
      retry: 1,
    });
  };

  // Get ratings given by the current user
  const useGivenRatings = () => {
    return useQuery<PartnerRating[]>({
      queryKey: ['/api/ratings/given'],
      retry: 1,
    });
  };

  // Get ratings for a specific user
  const useUserRatings = (userId: number) => {
    return useQuery<PartnerRating[]>({
      queryKey: ['/api/ratings/by-user', userId],
      queryFn: async () => {
        const res = await apiRequest('GET', `/api/ratings/by-user/${userId}`);
        return res.json();
      },
      retry: 1,
    });
  };

  // Get rating summary for a specific user
  const useRatingSummary = (userId: number) => {
    return useQuery<RatingSummary>({
      queryKey: ['/api/ratings/summary', userId],
      queryFn: async () => {
        const res = await apiRequest('GET', `/api/ratings/summary/${userId}`);
        return res.json();
      },
      retry: 1,
    });
  };

  // Mutation to create a new rating
  const useCreateRating = () => {
    return useMutation({
      mutationFn: async (data: RatingFormData) => {
        const res = await apiRequest('POST', '/api/ratings', data);
        return res.json();
      },
      onSuccess: () => {
        // Invalidate all ratings queries to ensure latest data
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/received'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/by-user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary'] });
        
        toast({
          title: "Rating submitted",
          description: "Your partner rating has been submitted successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to submit rating",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      },
    });
  };

  // Mutation to update an existing rating
  const useUpdateRating = () => {
    return useMutation({
      mutationFn: async ({ id, ...data }: { id: number } & Partial<RatingFormData>) => {
        const res = await apiRequest('PUT', `/api/ratings/${id}`, data);
        return res.json();
      },
      onSuccess: (_, variables) => {
        // Invalidate all ratings queries to ensure latest data
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/received'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/by-user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary'] });
        
        toast({
          title: "Rating updated",
          description: "Your partner rating has been updated successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to update rating",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      },
    });
  };

  // Mutation to delete a rating
  const useDeleteRating = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        const res = await apiRequest('DELETE', `/api/ratings/${id}`);
        return res.json();
      },
      onSuccess: () => {
        // Invalidate all ratings queries to ensure latest data
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/received'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/by-user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary'] });
        
        toast({
          title: "Rating deleted",
          description: "The partner rating has been deleted successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to delete rating",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      },
    });
  };

  // Mutation to create demo ratings (for testing)
  const useCreateDemoRatings = () => {
    return useMutation({
      mutationFn: async (count: number = 10) => {
        const res = await apiRequest('POST', '/api/ratings/demo', { count });
        return res.json();
      },
      onSuccess: (data) => {
        // Invalidate all ratings queries to ensure latest data
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/received'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/by-user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary'] });
        
        toast({
          title: "Demo ratings created",
          description: `Created ${data.count} demo ratings successfully.`,
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to create demo ratings",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      },
    });
  };

  return {
    useReceivedRatings,
    useGivenRatings,
    useUserRatings,
    useRatingSummary,
    useCreateRating,
    useUpdateRating,
    useDeleteRating,
    useCreateDemoRatings,
  };
}