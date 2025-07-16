import { useState, useEffect } from 'react';
import { 
  useGymTraffic,
  getCurrentDayOfWeek,
  getCurrentHour,
  formatDayOfWeek,
  formatHour,
  getTrafficLevelDescription,
  getTrafficLevelColor
} from '@/hooks/use-gym-traffic';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleOff, Clock, Users, Loader2, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface GymTrafficCardProps {
  gymName: string;
}

export default function GymTrafficCard({ gymName }: GymTrafficCardProps) {
  const { toast } = useToast();
  const [dayOfWeek, setDayOfWeek] = useState<number>(getCurrentDayOfWeek());
  const [hourOfDay, setHourOfDay] = useState<number>(getCurrentHour());
  const [showBestTimes, setShowBestTimes] = useState<boolean>(false);
  
  const gymTrafficHooks = useGymTraffic();
  const { 
    useTrafficPrediction, 
    useBusiestTimes,
    useQuietestTimes,
    useSeedGymTraffic
  } = gymTrafficHooks;
  
  const { data: trafficPrediction, isLoading: isPredictionLoading, isError: isPredictionError } = 
    useTrafficPrediction(gymName, dayOfWeek, hourOfDay);
  
  const { data: busiestTimes, isLoading: isBusiestLoading } = 
    useBusiestTimes(gymName, dayOfWeek);
  
  const { data: quietestTimes, isLoading: isQuietestLoading } = 
    useQuietestTimes(gymName, dayOfWeek);
  
  const seedGymTraffic = useSeedGymTraffic();
  
  // Call seed endpoint if no traffic data is available (only once)
  const [hasTriedSeed, setHasTriedSeed] = useState<boolean>(false);
  
  useEffect(() => {
    if (isPredictionError && !seedGymTraffic.isPending && !hasTriedSeed) {
      setHasTriedSeed(true); // Mark that we've tried seeding
      seedGymTraffic.mutate(gymName, {
        onSuccess: () => {
          toast({
            title: "Traffic data generated",
            description: `Traffic data for ${gymName} has been generated.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: "Failed to generate traffic data.",
            variant: "destructive",
          });
        }
      });
    }
  }, [isPredictionError, gymName, seedGymTraffic, toast, hasTriedSeed]);
  
  // Generate array of day options
  const dayOptions = Array.from({ length: 7 }, (_, i) => ({
    value: i.toString(),
    label: formatDayOfWeek(i)
  }));
  
  // Generate array of hour options (5AM to 11PM)
  const hourOptions = Array.from({ length: 19 }, (_, i) => {
    const hour = i + 5; // Start at 5AM
    return {
      value: hour.toString(),
      label: formatHour(hour)
    };
  });
  
  // Traffic level indicator component
  const TrafficLevelIndicator = ({ level }: { level: number }) => {
    const color = getTrafficLevelColor(level);
    const description = getTrafficLevelDescription(level);
    
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`w-16 h-3 bg-gray-200 rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${level <= 3 ? 'bg-green-500' : level <= 6 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${(level / 10) * 100}%` }}
            />
          </div>
        </div>
        <span className={`text-sm font-medium ${color}`}>{description}</span>
      </div>
    );
  };
  
  return (
    <Card className="w-full max-w-md shadow-lg card-gradient border-purple-100">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-gradient">Gym Traffic</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowBestTimes(!showBestTimes)}
          >
            {showBestTimes ? <Clock className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
          </Button>
        </CardTitle>
        <CardDescription>
          Traffic prediction for {gymName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showBestTimes ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Day</label>
                <Select
                  value={dayOfWeek.toString()}
                  onValueChange={(value) => setDayOfWeek(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Time</label>
                <Select
                  value={hourOfDay.toString()}
                  onValueChange={(value) => setHourOfDay(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Traffic Level</h3>
              
              {isPredictionLoading || seedGymTraffic.isPending ? (
                <div className="flex flex-col items-center justify-center h-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <span className="text-sm text-gray-600">
                    {seedGymTraffic.isPending ? "Generating gym traffic data..." : "Loading traffic prediction..."}
                  </span>
                </div>
              ) : trafficPrediction ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-600" />
                      <span className="font-semibold">
                        {formatDayOfWeek(parseInt(trafficPrediction.dayOfWeek.toString()))}, {formatHour(parseInt(trafficPrediction.hourOfDay.toString()))}
                      </span>
                    </div>
                  </div>
                  <TrafficLevelIndicator level={trafficPrediction.trafficLevel} />
                </div>
              ) : isPredictionError ? (
                <div className="flex flex-col items-center justify-center h-20 text-gray-500">
                  <div className="flex items-center gap-2 mb-1 text-amber-500">
                    <CircleOff className="h-5 w-5" />
                    <span className="text-sm font-medium">Unable to load traffic data for {gymName}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 text-center">
                    {hasTriedSeed ? "We tried generating data but encountered an issue." : "No traffic data is available for this gym."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHasTriedSeed(false); // Reset so we can try again
                      seedGymTraffic.mutate(gymName);
                    }}
                  >
                    Generate Traffic Data
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-16 text-gray-500">
                  <CircleOff className="h-5 w-5 mb-1" />
                  <span className="text-sm">No traffic data available for {gymName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      seedGymTraffic.mutate(gymName);
                    }}
                  >
                    Generate Data
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Select
                  value={dayOfWeek.toString()}
                  onValueChange={(value) => setDayOfWeek(parseInt(value))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="ml-2">Traffic</span>
              </h3>
              
              {isBusiestLoading || isQuietestLoading ? (
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">Busiest Times</h4>
                    {busiestTimes?.busiestTimes && busiestTimes.busiestTimes.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {busiestTimes.busiestTimes.slice(0, 4).map((time, index) => (
                          <div key={index} className="bg-gray-50 p-2 rounded">
                            <div className="text-sm font-medium">{formatHour(time.hour)}</div>
                            <TrafficLevelIndicator level={time.trafficLevel} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No data available</div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">Quietest Times</h4>
                    {quietestTimes?.quietestTimes && quietestTimes.quietestTimes.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {quietestTimes.quietestTimes.slice(0, 4).map((time, index) => (
                          <div key={index} className="bg-gray-50 p-2 rounded">
                            <div className="text-sm font-medium">{formatHour(time.hour)}</div>
                            <TrafficLevelIndicator level={time.trafficLevel} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No data available</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-gray-500">
        Traffic data is updated regularly
      </CardFooter>
    </Card>
  );
}