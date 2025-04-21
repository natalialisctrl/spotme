import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Dumbbell, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface WorkoutRecommendation {
  id: string;
  title: string;
  description: string;
  intensity: 'low' | 'medium' | 'high';
  duration: number; // in minutes
  calories: number;
  muscleGroups: string[];
  imageUrl?: string;
  tags: string[];
}

interface WorkoutCarouselProps {
  workouts: WorkoutRecommendation[];
  onWorkoutSelect?: (workout: WorkoutRecommendation) => void;
}

export function WorkoutCarousel({ workouts, onWorkoutSelect }: WorkoutCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'start',
    skipSnaps: false,
    dragFree: true
  });
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Function to render intensity indicator
  const renderIntensity = (intensity: string) => {
    const flames = intensity === 'low' ? 1 : intensity === 'medium' ? 2 : 3;
    
    return (
      <div className="flex items-center gap-0.5 text-orange-500">
        {Array(flames).fill(0).map((_, i) => (
          <Flame key={i} className="h-4 w-4" />
        ))}
      </div>
    );
  };
  
  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {workouts.map((workout, index) => (
            <div 
              key={workout.id} 
              className="flex-[0_0_90%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 pl-4 first:pl-0"
            >
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "h-full rounded-xl overflow-hidden border bg-background p-4 shadow-sm transition-all duration-200",
                  selectedIndex === index ? "ring-2 ring-primary scale-[1.02]" : ""
                )}
                onClick={() => onWorkoutSelect && onWorkoutSelect(workout)}
              >
                <div className="relative h-36 rounded-lg bg-gradient-to-br from-primary-100 to-primary-50 mb-3 overflow-hidden">
                  {workout.imageUrl ? (
                    <img 
                      src={workout.imageUrl} 
                      alt={workout.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <Dumbbell className="h-16 w-16 text-primary" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <div className="px-2 py-1 bg-white/80 text-primary text-xs font-medium rounded-full">
                        {workout.duration} min
                      </div>
                      <div className="px-2 py-1 bg-white/80 text-orange-500 text-xs font-medium rounded-full flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {workout.calories} cal
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-md mb-1 line-clamp-1">{workout.title}</h3>
                <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{workout.description}</p>
                <div className="flex items-center justify-between">
                  {renderIntensity(workout.intensity)}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {workout.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="inline-block px-2 py-1 text-xs bg-muted rounded-full">
                        {tag}
                      </span>
                    ))}
                    {workout.tags.length > 2 && (
                      <span className="inline-block px-2 py-1 text-xs bg-muted rounded-full">
                        +{workout.tags.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={scrollPrev}
          disabled={!prevBtnEnabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex gap-1">
          {scrollSnaps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                selectedIndex === index 
                  ? "bg-primary w-3" 
                  : "bg-muted"
              )}
            />
          ))}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={scrollNext}
          disabled={!nextBtnEnabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}