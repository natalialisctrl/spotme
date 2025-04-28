import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, StarHalf } from "lucide-react";
import { RatingFormData, usePartnerRatings } from "@/hooks/use-partner-ratings";

// Form validation schema
const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
  isProfessional: z.boolean().default(false),
  isReliable: z.boolean().default(false),
  isMotivating: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});

type RatingFormProps = {
  user: {
    id: number;
    name: string;
  };
  onSuccess?: () => void;
  existingRating?: {
    id: number;
    rating: number;
    feedback?: string;
    isProfessional: boolean;
    isReliable: boolean;
    isMotivating: boolean;
    isPublic: boolean;
  };
};

export function RatingForm({ user, onSuccess, existingRating }: RatingFormProps) {
  const { useCreateRating, useUpdateRating } = usePartnerRatings();
  const createRatingMutation = useCreateRating();
  const updateRatingMutation = useUpdateRating();
  const [selectedRating, setSelectedRating] = React.useState(existingRating?.rating || 0);

  const form = useForm<z.infer<typeof ratingSchema>>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: existingRating?.rating || 0,
      feedback: existingRating?.feedback || "",
      isProfessional: existingRating?.isProfessional || false,
      isReliable: existingRating?.isReliable || false,
      isMotivating: existingRating?.isMotivating || false,
      isPublic: existingRating?.isPublic !== false,
    },
  });

  const onSubmit = (values: z.infer<typeof ratingSchema>) => {
    const data: RatingFormData = {
      ...values,
      ratedUserId: user.id,
    };

    if (existingRating) {
      updateRatingMutation.mutate(
        { id: existingRating.id, ...data },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess();
          },
        }
      );
    } else {
      createRatingMutation.mutate(data, {
        onSuccess: () => {
          form.reset();
          setSelectedRating(0);
          if (onSuccess) onSuccess();
        },
      });
    }
  };

  // Star rating component
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-8 h-8 cursor-pointer transition-colors ${
            i <= selectedRating
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300"
          }`}
          onClick={() => {
            setSelectedRating(i);
            form.setValue("rating", i);
          }}
        />
      );
    }
    return stars;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{existingRating ? "Update Rating" : "Rate Your Partner"}</CardTitle>
        <CardDescription>
          Share your experience working out with {user.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex space-x-1">
                      {renderStars()}
                      <input
                        type="hidden"
                        {...field}
                        value={selectedRating}
                      />
                    </div>
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
                  <FormLabel>Feedback (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your experience with this workout partner..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Partner Qualities</FormLabel>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="isProfessional"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Professional</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isReliable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Reliable</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isMotivating"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Motivating</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Make this rating public</FormLabel>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={createRatingMutation.isPending || updateRatingMutation.isPending}
            >
              {existingRating ? "Update Rating" : "Submit Rating"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}