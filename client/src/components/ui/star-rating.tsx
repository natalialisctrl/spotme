import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  onChange,
  max = 5,
  size = 'md',
  readOnly = false,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  };

  const handleClick = (newRating: number) => {
    if (readOnly || !onChange) return;
    onChange(newRating);
  };

  const handleMouseEnter = (starIndex: number) => {
    if (readOnly || !onChange) return;
  };

  const handleMouseLeave = () => {
    if (readOnly || !onChange) return;
  };

  return (
    <div
      className={cn(
        'flex items-center',
        containerClasses[size],
        className
      )}
    >
      {Array.from({ length: max }).map((_, index) => {
        const starIndex = index + 1;
        const isFilled = starIndex <= rating;

        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              'transition-colors',
              isFilled ? 'fill-primary text-primary' : 'text-muted-foreground',
              !readOnly && 'cursor-pointer hover:text-primary'
            )}
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </div>
  );
}