import React from 'react';
import { usePartnerRatings } from '@/hooks/use-partner-ratings';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RatingSummaryBadgeProps {
  userId: number;
  variant?: 'default' | 'expanded';
}

export function RatingSummaryBadge({ userId, variant = 'default' }: RatingSummaryBadgeProps) {
  const { useRatingSummary } = usePartnerRatings();
  const { 
    data: summary, 
    isLoading, 
    error 
  } = useRatingSummary(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <Skeleton className="h-6 w-24" />
      </div>
    );
  }

  if (error || !summary) {
    return null;
  }

  // If there are no ratings yet, show a different message
  if (summary.totalRatings === 0) {
    return (
      <Badge variant="outline" className="py-1.5 h-auto flex items-center gap-1 text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        <span>No ratings yet</span>
      </Badge>
    );
  }

  if (variant === 'expanded') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <StarRating rating={summary.averageRating} readOnly size="sm" />
          <span className="font-medium text-sm">
            {summary.averageRating.toFixed(1)} ({summary.totalRatings} {summary.totalRatings === 1 ? 'rating' : 'ratings'})
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center bg-muted rounded-md p-2">
            <span className="text-xs text-muted-foreground">Professional</span>
            <span className="font-medium text-sm">{Math.round(summary.professionalScore * 100)}%</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-muted rounded-md p-2">
            <span className="text-xs text-muted-foreground">Reliable</span>
            <span className="font-medium text-sm">{Math.round(summary.reliabilityScore * 100)}%</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-muted rounded-md p-2">
            <span className="text-xs text-muted-foreground">Motivating</span>
            <span className="font-medium text-sm">{Math.round(summary.motivationScore * 100)}%</span>
          </div>
        </div>
        
        {summary.testimonialCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {summary.testimonialCount} written testimonial{summary.testimonialCount !== 1 ? 's' : ''}
          </div>
        )}
        
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          <span>Updated {formatDistanceToNow(new Date(summary.updatedAt), { addSuffix: true })}</span>
        </div>
      </div>
    );
  }

  // Default compact badge
  return (
    <Badge variant="secondary" className="py-1.5 h-auto flex items-center gap-1">
      <StarRating rating={summary.averageRating} readOnly size="sm" />
      <span className="font-medium">
        {summary.averageRating.toFixed(1)}
      </span>
      <span className="text-xs">
        ({summary.totalRatings})
      </span>
    </Badge>
  );
}