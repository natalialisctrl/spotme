import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PartnerRating, usePartnerRatings } from '@/hooks/use-partner-ratings';
import { StarRating } from '@/components/ui/star-rating';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { RatingForm } from './RatingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface UserRatingsProps {
  userId: number;
  userName: string;
  isOwnProfile?: boolean;
}

export function UserRatings({ userId, userName, isOwnProfile = false }: UserRatingsProps) {
  const { user } = useAuth();
  const { 
    useRatingsByUser, 
    useDeleteRating 
  } = usePartnerRatings();
  
  const [editingRating, setEditingRating] = useState<PartnerRating | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ratingToDelete, setRatingToDelete] = useState<number | null>(null);
  
  const deleteRating = useDeleteRating();
  const { data: ratings, isLoading, error } = useRatingsByUser(userId);

  const handleEdit = (rating: PartnerRating) => {
    setEditingRating(rating);
    setShowEditDialog(true);
  };

  const handleCloseEdit = () => {
    setEditingRating(null);
    setShowEditDialog(false);
  };

  const handleDelete = (ratingId: number) => {
    setRatingToDelete(ratingId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (ratingToDelete) {
      await deleteRating.mutateAsync(ratingToDelete);
      setDeleteConfirmOpen(false);
      setRatingToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Error loading ratings</div>;
  }

  if (!ratings || ratings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">No Ratings Yet</CardTitle>
          <CardDescription>
            {isOwnProfile 
              ? "You haven't received any ratings yet."
              : `${userName} hasn't received any ratings yet.`}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Sort ratings by date, most recent first
  const sortedRatings = [...ratings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      <div className="space-y-4">
        {sortedRatings.map((rating) => (
          <Card key={rating.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <StarRating rating={rating.rating} readOnly size="sm" />
                  <CardDescription className="mt-1">
                    {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                  </CardDescription>
                </div>
                
                {user && user.id === rating.raterId && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(rating)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(rating.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              {rating.feedback ? (
                <p className="text-sm">{rating.feedback}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No written feedback provided</p>
              )}
              
              {(rating.isProfessional || rating.isReliable || rating.isMotivating) && (
                <div className="flex flex-wrap gap-2 mt-3">
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
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Rating Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Rating</DialogTitle>
            <DialogDescription>
              Update your feedback for {userName}
            </DialogDescription>
          </DialogHeader>
          
          {editingRating && (
            <RatingForm
              ratedUserId={userId}
              userName={userName}
              existingRating={editingRating}
              onSuccess={handleCloseEdit}
              onCancel={handleCloseEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rating</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this rating? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteRating.isPending}
            >
              {deleteRating.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}