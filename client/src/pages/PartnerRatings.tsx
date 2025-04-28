import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PartnerRating, usePartnerRatings } from '@/hooks/use-partner-ratings';
import { UserRatings } from '@/components/ratings/UserRatings';
import { RatingForm } from '@/components/ratings/RatingForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CircleUser, SquarePen } from 'lucide-react';
import { RatingSummaryBadge } from '@/components/ratings/RatingSummaryBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function PartnerRatingsPage() {
  const { user } = useAuth();
  const {
    useRatingsGiven,
    useRatingsReceived,
  } = usePartnerRatings();

  const [ratingUser, setRatingUser] = useState<{id: number, name: string} | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);

  const {
    data: ratingsGiven,
    isLoading: isLoadingGiven,
    error: errorGiven,
  } = useRatingsGiven();

  const {
    data: ratingsReceived,
    isLoading: isLoadingReceived,
    error: errorReceived,
  } = useRatingsReceived();

  const handleOpenRatingDialog = (userId: number, userName: string) => {
    setRatingUser({ id: userId, name: userName });
    setRatingDialogOpen(true);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
  };

  const getUserName = (rating: PartnerRating, isRater: boolean) => {
    if (!user) return 'Unknown User';
    
    // This is just a temporary solution since we don't have a way to fetch user names yet
    // In a real implementation, we would fetch user data or pass it from a parent component
    if (isRater) {
      return rating.raterId === user.id ? `${user.name} (You)` : `User ${rating.raterId}`;
    } else {
      return rating.ratedUserId === user.id ? `${user.name} (You)` : `User ${rating.ratedUserId}`;
    }
  };

  const LoadingState = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[100px] w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Partner Ratings & Testimonials</h1>
      
      {user && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Rating Summary</CardTitle>
            <CardDescription>
              How your workout partners have rated you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RatingSummaryBadge userId={user.id} variant="expanded" />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="received">
        <TabsList className="mb-6">
          <TabsTrigger value="received">Ratings You've Received</TabsTrigger>
          <TabsTrigger value="given">Ratings You've Given</TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {isLoadingReceived ? (
            <LoadingState />
          ) : errorReceived ? (
            <div className="text-destructive">Error loading ratings: {errorReceived.message}</div>
          ) : ratingsReceived && ratingsReceived.length > 0 ? (
            <div className="space-y-6">
              <UserRatings 
                userId={user?.id || 0} 
                userName={user?.name || ''} 
                isOwnProfile={true} 
              />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">No Ratings Received</CardTitle>
                <CardDescription>
                  You haven't received any ratings from your workout partners yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  As you connect with more workout partners, they'll be able to rate their experience with you.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="given">
          {isLoadingGiven ? (
            <LoadingState />
          ) : errorGiven ? (
            <div className="text-destructive">Error loading ratings: {errorGiven.message}</div>
          ) : ratingsGiven && ratingsGiven.length > 0 ? (
            <div className="space-y-6">
              {ratingsGiven.map((rating) => (
                <Card key={rating.id}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            <CircleUser className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{getUserName(rating, false)}</h3>
                          <p className="text-sm text-muted-foreground">
                            Rated {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenRatingDialog(rating.ratedUserId, getUserName(rating, false))}
                      >
                        <SquarePen className="h-4 w-4 mr-2" />
                        Edit Rating
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <UserRatings 
                      userId={rating.ratedUserId} 
                      userName={getUserName(rating, false)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">No Ratings Given</CardTitle>
                <CardDescription>
                  You haven't rated any of your workout partners yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  After working out with a partner, you can rate your experience to help others find good matches.
                </p>
                <Button>
                  <SquarePen className="h-4 w-4 mr-2" />
                  Rate a Partner
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rate Your Partner</DialogTitle>
            <DialogDescription>
              Share your experience working out with {ratingUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          {ratingUser && (
            <RatingForm
              ratedUserId={ratingUser.id}
              userName={ratingUser.name}
              onSuccess={handleCloseRatingDialog}
              onCancel={handleCloseRatingDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}