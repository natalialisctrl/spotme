import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PartnerRating, RatingFormData, usePartnerRatings } from '@/hooks/use-partner-ratings';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';

// Define form validation schema
const ratingFormSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
  isProfessional: z.boolean().default(false),
  isReliable: z.boolean().default(false),
  isMotivating: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});

interface RatingFormProps {
  ratedUserId: number;
  userName: string;
  existingRating?: PartnerRating;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RatingForm({ ratedUserId, userName, existingRating, onSuccess, onCancel }: RatingFormProps) {
  const { useCreateRating, useUpdateRating } = usePartnerRatings();
  const createRating = useCreateRating();
  const updateRating = useUpdateRating();
  
  const form = useForm<z.infer<typeof ratingFormSchema>>({
    resolver: zodResolver(ratingFormSchema),
    defaultValues: existingRating ? {
      rating: existingRating.rating,
      feedback: existingRating.feedback || '',
      isProfessional: existingRating.isProfessional,
      isReliable: existingRating.isReliable,
      isMotivating: existingRating.isMotivating,
      isPublic: existingRating.isPublic,
    } : {
      rating: 0,
      feedback: '',
      isProfessional: false,
      isReliable: false,
      isMotivating: false,
      isPublic: true,
    }
  });

  async function onSubmit(data: z.infer<typeof ratingFormSchema>) {
    try {
      if (existingRating) {
        // Update existing rating
        await updateRating.mutateAsync({
          ...data,
          ratedUserId,
          id: existingRating.id,
        } as PartnerRating);
      } else {
        // Create new rating
        await createRating.mutateAsync({
          ...data,
          ratedUserId,
        } as RatingFormData);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{existingRating ? 'Edit Rating' : `Rate ${userName}`}</CardTitle>
        <CardDescription>
          {existingRating 
            ? 'Update your feedback and rating'
            : `Share your experience working out with ${userName}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="rating-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Rating</FormLabel>
                  <FormControl>
                    <StarRating 
                      rating={field.value} 
                      onChange={field.onChange}
                      max={5}
                      size="lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Feedback (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your experience..."
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Your feedback helps others find great workout partners.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Partner Qualities</h3>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="isProfessional"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Professional form & technique</FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isReliable"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Reliable & punctual</FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isMotivating"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Motivating & supportive</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="font-normal cursor-pointer">Make this rating public</FormLabel>
                    <FormDescription className="mt-0">
                      Public ratings are visible to all users
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          form="rating-form"
          disabled={createRating.isPending || updateRating.isPending}
        >
          {createRating.isPending || updateRating.isPending ? 
            'Submitting...' : 
            existingRating ? 'Update Rating' : 'Submit Rating'
          }
        </Button>
      </CardFooter>
    </Card>
  );
}