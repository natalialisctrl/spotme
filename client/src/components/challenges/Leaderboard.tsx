import { FC, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Trophy,
  ArrowRight,
  Medal,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LeaderboardProps {
  maxEntries?: number;
  showAllLink?: boolean;
  className?: string;
  title?: string;
  challengeId?: number; // Optional challenge ID for challenge-specific leaderboards
}

interface LeaderboardEntry {
  id: number;
  userId: number;
  username: string;
  name: string;
  avatarUrl?: string;
  points: number;
  rank: number;
}

const Leaderboard: FC<LeaderboardProps> = ({
  maxEntries = 5,
  showAllLink = true,
  className = '',
  title = 'Challenge Leaderboard',
  challengeId = null
}) => {
  // Use the provided challengeId or null for global leaderboard
  
  // Fetch leaderboard data - either global or challenge-specific
  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: [challengeId ? `/api/challenges/${challengeId}/leaderboard` : '/api/leaderboard', maxEntries, challengeId],
    queryFn: async () => {
      try {
        // Determine which API endpoint to use based on whether we have a challenge ID
        const endpoint = challengeId 
          ? `/api/challenges/${challengeId}/leaderboard` 
          : `/api/leaderboard?limit=${maxEntries}`;
          
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        return await response.json();
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
        return [];
      }
    }
  });

  const medals = ['🥇', '🥈', '🥉'];

  if (isLoading) {
    return (
      <Card className={`w-full card-gradient border-purple-100 shadow-lg ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            <span className="text-gradient">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !leaderboardData || leaderboardData.length === 0) {
    return (
      <Card className={`w-full card-gradient border-purple-100 shadow-lg ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            <span className="text-gradient">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No leaderboard data available yet.</p>
            <p className="text-sm mt-2">Complete challenges to appear on the leaderboard!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayEntries = leaderboardData.slice(0, maxEntries);

  return (
    <Card className={`w-full card-gradient border-purple-100 shadow-lg floating-element ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
          <span className="text-gradient">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {displayEntries.map((entry: LeaderboardEntry, index: number) => (
            <li key={entry.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 text-center font-bold">
                  {index < 3 ? (
                    <span className="text-lg">{medals[index]}</span>
                  ) : (
                    <span className="text-gray-500">{index + 1}</span>
                  )}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.avatarUrl} alt={entry.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {entry.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate max-w-[120px]">{entry.name}</span>
              </div>
              <Badge variant="secondary" className="ml-auto font-bold">
                {entry.points} pts
              </Badge>
            </li>
          ))}
        </ul>
        
        {showAllLink && (
          <>
            <Separator className="my-4" />
            <div className="text-right">
              <Link href="/challenges">
                <Button variant="ghost" size="sm" className="gap-1">
                  View all challenges
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;