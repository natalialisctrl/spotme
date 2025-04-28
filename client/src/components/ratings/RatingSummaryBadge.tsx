import React from 'react';
import { usePartnerRatings } from '@/hooks/use-partner-ratings';
import { Star, User as UserIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RatingSummaryBadgeProps {
  userId: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingSummaryBadge({ userId, size = 'md' }: RatingSummaryBadgeProps) {
  const { useRatingSummary } = usePartnerRatings();
  const { data: summary, isLoading } = useRatingSummary(userId);
  
  if (isLoading) {
    return <Skeleton className="h-5 w-16" />;
  }
  
  if (!summary || summary.totalRatings === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1">
              <UserIcon className="h-3 w-3" />
              <span>New</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>No ratings yet</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Size variations
  const starSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size];
  
  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];
  
  const badgeSize = {
    sm: 'px-1.5 py-0',
    md: 'px-2 py-0.5',
    lg: 'px-2.5 py-1',
  }[size];
  
  // Create tooltip content showing qualities percentages
  const qualitiesText = [
    `Professional: ${Math.round(summary.professionalScore * 100)}%`,
    `Reliable: ${Math.round(summary.reliabilityScore * 100)}%`,
    `Motivating: ${Math.round(summary.motivationScore * 100)}%`,
  ].join('\n');
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`gap-1 ${badgeSize}`}>
            <Star className={`${starSize} text-yellow-400 fill-yellow-400`} />
            <span className={textSize}>{summary.averageRating.toFixed(1)}</span>
            <span className={`${textSize} text-muted-foreground`}>({summary.totalRatings})</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p>Average rating: {summary.averageRating.toFixed(1)} stars</p>
            <p>{summary.totalRatings} total {summary.totalRatings === 1 ? 'rating' : 'ratings'}</p>
            <p className="whitespace-pre-line text-xs text-muted-foreground">{qualitiesText}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}