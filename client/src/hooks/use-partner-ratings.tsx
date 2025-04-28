import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export type PartnerRating = {
  id: number;
  raterId: number;
  ratedUserId: number;
  workoutId?: number | null;
  meetupId?: number | null;
  rating: number;
  feedback?: string | null;
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

export type UserRatingSummary = {
  userId: number;
  averageRating: number;
  totalRatings: number;
  professionalScore: number;
  reliabilityScore: number;
  motivationScore: number;
  testimonialCount: number;
  updatedAt: string;
};

export function usePartnerRatings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const useRatingsByUser = (userId: number) => {
    return useQuery({
      queryKey: ['/api/ratings/by-user', userId],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/ratings/by-user/${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch ratings');
        }
        
        return response.json() as Promise<PartnerRating[]>;
      },
      enabled: !!userId,
    });
  };

  const useRatingSummary = (userId: number) => {
    return useQuery({
      queryKey: ['/api/ratings/summary', userId],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/ratings/summary/${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch rating summary');
        }
        
        return response.json() as Promise<UserRatingSummary>;
      },
      enabled: !!userId,
    });
  };

  const useRatingsGiven = () => {
    return useQuery({
      queryKey: ['/api/ratings/given'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/ratings/given');
        
        if (!response.ok) {
          throw new Error('Failed to fetch ratings given');
        }
        
        return response.json() as Promise<PartnerRating[]>;
      },
    });
  };

  const useRatingsReceived = () => {
    return useQuery({
      queryKey: ['/api/ratings/received'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/ratings/received');
        
        if (!response.ok) {
          throw new Error('Failed to fetch ratings received');
        }
        
        return response.json() as Promise<PartnerRating[]>;
      },
    });
  };

  const useCreateRating = () => {
    return useMutation({
      mutationFn: async (data: RatingFormData) => {
        const response = await apiRequest('POST', '/api/ratings', data);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create rating');
        }
        
        return response.json() as Promise<PartnerRating>;
      },
      onSuccess: (data) => {
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/by-user', data.ratedUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary', data.ratedUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });
        
        toast({
          title: 'Rating Submitted',
          description: 'Your rating has been submitted successfully',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to submit rating',
          variant: 'destructive',
        });
      },
    });
  };

  const useUpdateRating = () => {
    return useMutation({
      mutationFn: async (data: PartnerRating) => {
        const response = await apiRequest('PUT', `/api/ratings/${data.id}`, data);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update rating');
        }
        
        return response.json() as Promise<PartnerRating>;
      },
      onSuccess: (data) => {
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/by-user', data.ratedUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/summary', data.ratedUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/ratings/given'] });
        
        toast({
          title: 'Rating Updated',
          description: 'Your rating has been updated successfully',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update rating',
          variant: 'destructive',
        });
      },
    });
  };

  const useDeleteRating = () => {
    return useMutation({
      mutationFn: async (ratingId: number) => {
        const response = await apiRequest('DELETE', `/api/ratings/${ratingId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete rating');
        }
        
        return true;
      },
      onSuccess: () => {
        // Invalidate all relevant queries since we don't know which user was rated
        queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
        
        toast({
          title: 'Rating Deleted',
          description: 'Your rating has been deleted successfully',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete rating',
          variant: 'destructive',
        });
      },
    });
  };

  const useCreateDemoRatings = () => {
    return useMutation({
      mutationFn: async (count?: number) => {
        const response = await apiRequest('POST', '/api/ratings/demo', { count });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create demo ratings');
        }
        
        return response.json();
      },
      onSuccess: () => {
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
        
        toast({
          title: 'Demo Ratings Created',
          description: 'Demo ratings have been created successfully',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create demo ratings',
          variant: 'destructive',
        });
      },
    });
  };

  return {
    useRatingsByUser,
    useRatingSummary,
    useRatingsGiven,
    useRatingsReceived,
    useCreateRating,
    useUpdateRating,
    useDeleteRating,
    useCreateDemoRatings,
  };
}