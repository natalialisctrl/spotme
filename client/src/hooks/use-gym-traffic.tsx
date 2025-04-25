import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Define types for API responses
export interface GymTrafficPrediction {
  gymName: string;
  dayOfWeek: number;
  hourOfDay: number;
  trafficLevel: number;
}

export interface BusiestTimesResponse {
  gymName: string;
  dayOfWeek: number;
  busiestTimes: { hour: number, trafficLevel: number }[];
}

export interface QuietestTimesResponse {
  gymName: string;
  dayOfWeek: number;
  quietestTimes: { hour: number, trafficLevel: number }[];
}

// Helper to get current day of week (0-6, where 0 is Sunday)
export const getCurrentDayOfWeek = (): number => {
  return new Date().getDay();
};

// Helper to get current hour (0-23)
export const getCurrentHour = (): number => {
  return new Date().getHours();
};

// Format hours for display (e.g., "8:00 AM", "2:00 PM")
export const formatHour = (hour: number): string => {
  const amPm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${amPm}`;
};

// Format day of week (e.g., "Sunday", "Monday")
export const formatDayOfWeek = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
};

// Format traffic level description
export const getTrafficLevelDescription = (level: number): string => {
  if (level <= 3) return "Not busy";
  if (level <= 6) return "Moderately busy";
  return "Very busy";
};

// Format traffic level color
export const getTrafficLevelColor = (level: number): string => {
  if (level <= 3) return "text-green-500";
  if (level <= 6) return "text-amber-500";
  return "text-red-500";
};

export function useGymTraffic() {
  // Get traffic prediction for specific gym, day and hour
  const useTrafficPrediction = (gymName: string, dayOfWeek: number, hourOfDay: number) => {
    return useQuery<GymTrafficPrediction>({
      queryKey: ['/api/gym-traffic/predict', gymName, dayOfWeek, hourOfDay],
      queryFn: ({ queryKey }) => {
        const [, gymName, dayOfWeek, hourOfDay] = queryKey as [string, string, number, number];
        return fetch(`/api/gym-traffic/predict?gymName=${encodeURIComponent(gymName)}&dayOfWeek=${dayOfWeek}&hourOfDay=${hourOfDay}`)
          .then(res => res.json());
      },
      enabled: !!gymName && dayOfWeek !== undefined && hourOfDay !== undefined,
    });
  };

  // Get busiest times for a gym on a specific day
  const useBusiestTimes = (gymName: string, dayOfWeek: number) => {
    return useQuery<BusiestTimesResponse>({
      queryKey: ['/api/gym-traffic/busiest-times', gymName, dayOfWeek],
      queryFn: ({ queryKey }) => {
        const [, gymName, dayOfWeek] = queryKey as [string, string, number];
        return fetch(`/api/gym-traffic/busiest-times?gymName=${encodeURIComponent(gymName)}&dayOfWeek=${dayOfWeek}`)
          .then(res => res.json());
      },
      enabled: !!gymName && dayOfWeek !== undefined,
    });
  };

  // Get quietest times for a gym on a specific day
  const useQuietestTimes = (gymName: string, dayOfWeek: number) => {
    return useQuery<QuietestTimesResponse>({
      queryKey: ['/api/gym-traffic/quietest-times', gymName, dayOfWeek],
      queryFn: ({ queryKey }) => {
        const [, gymName, dayOfWeek] = queryKey as [string, string, number];
        return fetch(`/api/gym-traffic/quietest-times?gymName=${encodeURIComponent(gymName)}&dayOfWeek=${dayOfWeek}`)
          .then(res => res.json());
      },
      enabled: !!gymName && dayOfWeek !== undefined,
    });
  };

  // Generate seed data for a gym
  const useSeedGymTraffic = () => {
    return useMutation({
      mutationFn: async (gymName: string) => {
        const response = await fetch('/api/gym-traffic/seed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gymName }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to seed gym traffic data');
        }
        
        return response.json();
      },
      onSuccess: () => {
        // Invalidate all gym traffic queries
        queryClient.invalidateQueries({ queryKey: ['/api/gym-traffic'] });
      },
    });
  };

  return {
    useTrafficPrediction,
    useBusiestTimes,
    useQuietestTimes,
    useSeedGymTraffic,
    getCurrentDayOfWeek,
    getCurrentHour,
    formatHour,
    formatDayOfWeek,
    getTrafficLevelDescription,
    getTrafficLevelColor,
  };
}