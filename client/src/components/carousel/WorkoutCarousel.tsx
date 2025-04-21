import { FC, useCallback, useEffect, useState } from 'react';
// Using default import syntax from the embla-carousel-react package
import useEmblaCarousel from 'embla-carousel-react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Clock, 
  Flame, 
  ArrowRight,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Type definitions based on the API response
interface Exercise {
  name: string;
  sets: number;
  reps: number | string;
  restSeconds: number;
  description?: string;
  muscleGroup: string;
  intensity: 'light' | 'moderate' | 'intense';
}

interface WorkoutRecommendation {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  intensity: 'beginner' | 'intermediate' | 'advanced';
  targetMuscleGroups: string[];
  exercises: Exercise[];
  imageUrl?: string;
  calories?: number;
  tags: string[];
  equipment: string[];
}

interface WorkoutCarouselProps {
  limit?: number;
  className?: string;
}

const WorkoutCarousel: FC<WorkoutCarouselProps> = ({ limit = 8, className = '' }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    skipSnaps: false,
    dragFree: true
  });

  // Fetch workout recommendations from the API
  const { data, isLoading, error } = useQuery<{ workouts: WorkoutRecommendation[] }>({
    queryKey: ['/api/workouts/recommendations'],
    queryFn: async () => {
      const res = await fetch(`/api/workouts/recommendations?count=${limit}`);
      if (!res.ok) {
        throw new Error('Failed to fetch workout recommendations');
      }
      return res.json();
    }
  });

  // Scroll to previous slide
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  // Scroll to next slide
  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Update selected index when carousel slides
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect(); // Initialize with the current snap

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Get intensity color based on level
  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={`w-full p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Workout Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-7 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="h-24 bg-gray-200 rounded mb-4"></div>
                <div className="flex gap-2 mb-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="h-9 bg-gray-200 rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`w-full p-4 ${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Failed to load workout recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              We couldn't load workout recommendations right now. Please try again later.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // No workouts available
  if (!data || !data.workouts || data.workouts.length === 0) {
    return (
      <div className={`w-full p-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>No Workout Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              We don't have any workout recommendations for you at the moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const workouts = data.workouts;
  const canScrollPrev = emblaApi?.canScrollPrev() || false;
  const canScrollNext = emblaApi?.canScrollNext() || false;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-2xl font-bold">Workout Recommendations</h2>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="rounded-full w-8 h-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous slide</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="rounded-full w-8 h-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next slide</span>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {workouts.map((workout) => (
            <div key={workout.id} className="flex-[0_0_90%] min-w-0 pl-4 md:flex-[0_0_45%] lg:flex-[0_0_30%]">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle>{workout.title}</CardTitle>
                  <CardDescription>
                    {workout.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-2 flex-1">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge 
                      variant="secondary" 
                      className={getIntensityColor(workout.intensity)}
                    >
                      {workout.intensity}
                    </Badge>
                    
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {workout.durationMinutes} min
                    </Badge>
                    
                    {workout.calories && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {workout.calories} cal
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1">Target Muscle Groups</h4>
                    <div className="flex flex-wrap gap-1">
                      {workout.targetMuscleGroups.map((group) => (
                        <Badge key={group} variant="outline" className="capitalize">
                          {group}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Equipment Needed</h4>
                    <div className="flex flex-wrap gap-1">
                      {workout.equipment.map((item) => (
                        <Badge key={item} variant="outline" className="flex items-center gap-1">
                          <Dumbbell className="h-3 w-3" />
                          <span className="capitalize">{item}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-2 mt-auto">
                  <Button className="w-full">
                    View Workout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination dots */}
      {workouts.length > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {workouts.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === selectedIndex ? 'bg-primary' : 'bg-gray-300'
              }`}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutCarousel;