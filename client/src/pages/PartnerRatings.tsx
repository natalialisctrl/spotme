import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePartnerRatings, PartnerRating } from "@/hooks/use-partner-ratings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRatings } from "@/components/ratings/UserRatings";
import { Separator } from "@/components/ui/separator";
import { Star, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PartnerRatingsPage() {
  const { user } = useAuth();
  const { useReceivedRatings, useGivenRatings, useCreateDemoRatings } = usePartnerRatings();
  const { data: receivedRatings, isLoading: receivedLoading } = useReceivedRatings();
  const { data: givenRatings, isLoading: givenLoading } = useGivenRatings();
  const createDemoRatingsMutation = useCreateDemoRatings();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("my-ratings");

  // Helper function to get user name from rating
  const getUserName = (rating: PartnerRating, isRater: boolean) => {
    // In a real application, this would fetch the user info from the user ID
    // For this example, we'll just use placeholder names
    return isRater ? "User " + rating.raterId : "User " + rating.ratedUserId;
  };

  const handleCreateDemoRatings = () => {
    if (!user) return;

    createDemoRatingsMutation.mutate(10, {
      onSuccess: (data) => {
        toast({
          title: "Demo ratings created",
          description: `Created ${data.count} demo ratings successfully.`,
        });
      },
    });
  };

  if (!user) {
    return (
      <div className="container max-w-6xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Partner Ratings</CardTitle>
            <CardDescription>
              You need to be logged in to view partner ratings
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Partner Ratings</h1>
        <Button onClick={handleCreateDemoRatings} variant="outline">
          Generate Demo Ratings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6">
          <TabsTrigger value="my-ratings">My Ratings</TabsTrigger>
          <TabsTrigger value="given-ratings">Ratings I've Given</TabsTrigger>
        </TabsList>

        <TabsContent value="my-ratings" className="space-y-6">
          <UserRatings userId={user.id} userName={user.name} />
        </TabsContent>

        <TabsContent value="given-ratings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ratings I've Given</CardTitle>
              <CardDescription>
                Manage the ratings you've given to workout partners
              </CardDescription>
            </CardHeader>
            <CardContent>
              {givenLoading ? (
                <div className="text-center py-8">Loading ratings...</div>
              ) : givenRatings && givenRatings.length > 0 ? (
                <div className="space-y-6">
                  {givenRatings.map((rating) => (
                    <div key={rating.id} className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {getUserName(rating, false)}
                          </h3>
                          <div className="flex items-center mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < rating.rating
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-muted-foreground">
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to profile with rating edit dialog open
                              // This is just a placeholder for now
                              toast({
                                title: "Edit Rating",
                                description: "This would open the edit rating dialog",
                              });
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                      {rating.feedback && (
                        <div className="mt-2">
                          <p className="text-sm">{rating.feedback}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rating.isProfessional && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                            Professional
                          </span>
                        )}
                        {rating.isReliable && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                            Reliable
                          </span>
                        )}
                        {rating.isMotivating && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                            Motivating
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    You haven't rated any workout partners yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}