import React, { useState } from "react";
import { usePartnerRatings, PartnerRating, RatingSummary } from "@/hooks/use-partner-ratings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Star, Trophy, Clock, UserCheck, Trash, Edit, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { RatingForm } from "./RatingForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserRatingsProps {
  userId: number;
  userName: string;
  showForm?: boolean;
}

export function UserRatings({ userId, userName, showForm = false }: UserRatingsProps) {
  const { user } = useAuth();
  const { useUserRatings, useRatingSummary, useDeleteRating } = usePartnerRatings();
  const { data: ratings, isLoading: ratingsLoading } = useUserRatings(userId);
  const { data: summary, isLoading: summaryLoading } = useRatingSummary(userId);
  const deleteRatingMutation = useDeleteRating();
  
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<PartnerRating | null>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);

  const isCurrentUser = user?.id === userId;
  
  if (ratingsLoading || summaryLoading) {
    return <div className="flex justify-center py-8">Loading ratings...</div>;
  }
  
  if (!summary) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Partner Ratings</CardTitle>
          <CardDescription>No ratings available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground text-center mb-4">
              {isCurrentUser 
                ? "You haven't received any ratings yet." 
                : `${userName} hasn't received any ratings yet.`}
            </p>
            {showForm && !isCurrentUser && (
              <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Rate {userName}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <RatingForm 
                    user={{ id: userId, name: userName }} 
                    onSuccess={() => setRatingDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Format percentage for display
  const formatPercent = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };
  
  // Check if the current user has already rated this user
  const existingRatingByCurrentUser = ratings?.find(r => r.raterId === user?.id);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Partner Ratings</CardTitle>
            <CardDescription>
              Based on {summary.totalRatings} {summary.totalRatings === 1 ? 'rating' : 'ratings'}
            </CardDescription>
          </div>
          {summary.averageRating > 0 && (
            <div className="flex items-center">
              <div className="flex items-center mr-2">
                <span className="text-2xl font-bold">{summary.averageRating.toFixed(1)}</span>
                <Star className="h-5 w-5 ml-1 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {summary.totalRatings > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Professional</span>
                  <span className="text-sm">{formatPercent(summary.professionalScore)}</span>
                </div>
                <Progress value={summary.professionalScore * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Reliable</span>
                  <span className="text-sm">{formatPercent(summary.reliabilityScore)}</span>
                </div>
                <Progress value={summary.reliabilityScore * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Motivating</span>
                  <span className="text-sm">{formatPercent(summary.motivationScore)}</span>
                </div>
                <Progress value={summary.motivationScore * 100} className="h-2" />
              </div>
            </div>
            
            {/* Add Rating button */}
            {showForm && !isCurrentUser && !existingRatingByCurrentUser && (
              <div className="flex justify-center mt-4">
                <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Rate {userName}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <RatingForm 
                      user={{ id: userId, name: userName }} 
                      onSuccess={() => setRatingDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {/* Edit Rating button if the user has already rated */}
            {showForm && !isCurrentUser && existingRatingByCurrentUser && (
              <div className="flex justify-center mt-4 gap-2">
                <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Rating
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <RatingForm 
                      user={{ id: userId, name: userName }} 
                      existingRating={{
                        id: existingRatingByCurrentUser.id,
                        rating: existingRatingByCurrentUser.rating,
                        feedback: existingRatingByCurrentUser.feedback || undefined,
                        isProfessional: existingRatingByCurrentUser.isProfessional,
                        isReliable: existingRatingByCurrentUser.isReliable,
                        isMotivating: existingRatingByCurrentUser.isMotivating,
                        isPublic: existingRatingByCurrentUser.isPublic
                      }}
                      onSuccess={() => setRatingDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setSelectedRating(existingRatingByCurrentUser);
                    setOpenDeleteAlert(true);
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Rating
                </Button>
              </div>
            )}
            
            {/* Testimonials */}
            {summary.testimonialCount > 0 && (
              <>
                <Separator className="my-6" />
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Testimonials</h3>
                  {ratings?.filter(r => r.feedback && r.isPublic).map((rating) => (
                    <div key={rating.id} className="space-y-2 bg-muted/50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < rating.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(rating.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mt-2">{rating.feedback}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rating.isProfessional && (
                          <Badge variant="outline" className="text-xs">Professional</Badge>
                        )}
                        {rating.isReliable && (
                          <Badge variant="outline" className="text-xs">Reliable</Badge>
                        )}
                        {rating.isMotivating && (
                          <Badge variant="outline" className="text-xs">Motivating</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Delete confirmation alert */}
      <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your rating. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRating) {
                  deleteRatingMutation.mutate(selectedRating.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}