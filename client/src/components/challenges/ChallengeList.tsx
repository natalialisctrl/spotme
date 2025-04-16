import React from 'react';
import { Challenge } from '@shared/schema';
import { ChallengeCard } from './ChallengeCard';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface ChallengeListProps {
  filter?: 'all' | 'active' | 'user';
  userId?: number;
}

export function ChallengeList({ filter = 'all', userId }: ChallengeListProps) {
  // Query to get all challenges
  const { data: challenges, isLoading, error } = useQuery<Challenge[]>({
    queryKey: filter === 'all' 
      ? ['/api/challenges'] 
      : filter === 'active' 
        ? ['/api/challenges/active'] 
        : ['/api/challenges/user'],
  });

  // Query to get user's challenge participations
  const { data: userChallenges } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges/user'],
    enabled: filter !== 'user', // Only fetch if we're not already on the user filter
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-red-500">
        Error loading challenges: {(error as Error).message}
      </div>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        {filter === 'all' 
          ? 'No challenges found. Be the first to create one!'
          : filter === 'active' 
            ? 'No active challenges found.'
            : 'You haven\'t joined any challenges yet.'}
      </div>
    );
  }

  // Get the IDs of challenges the user is participating in
  const participatingChallengeIds = userChallenges 
    ? new Set(userChallenges.map(c => c.id)) 
    : new Set<number>();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          joinedParticipants={5} // TODO: Replace with actual count from API
          isParticipating={participatingChallengeIds.has(challenge.id)}
          myProgress={0} // TODO: Replace with actual progress
          creatorName="User" // TODO: Replace with actual creator name
        />
      ))}
    </div>
  );
}