import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { insertChallengeSchema, Challenge } from '@shared/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Create a more strict schema that enforces required fields
const createChallengeSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  goalType: z.enum(['reps', 'sets', 'weight', 'distance', 'time', 'days']),
  goalValue: z.coerce.number().positive('Goal must be a positive number'),
  targetExercise: z.string().min(2, 'Target exercise is required'),
  isPublic: z.boolean().default(true),
  imageUrl: z.string().url().optional().nullable(),
});

type CreateChallengeFormData = z.infer<typeof createChallengeSchema>;

export function CreateChallengeForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  
  const form = useForm<CreateChallengeFormData>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      goalType: 'reps',
      goalValue: 100,
      targetExercise: '',
      isPublic: true,
      imageUrl: '',
    }
  });
  
  const createChallengeMutation = useMutation({
    mutationFn: async (data: CreateChallengeFormData) => {
      const res = await apiRequest('POST', '/api/challenges', data);
      return res.json();
    },
    onSuccess: (data: Challenge) => {
      toast({
        title: 'Challenge created',
        description: 'Your workout challenge has been created successfully.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      setLocation(`/challenges/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create challenge: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const onSubmit = (data: CreateChallengeFormData) => {
    createChallengeMutation.mutate(data);
  };
  
  const goalTypes = [
    { value: 'reps', label: 'Repetitions' },
    { value: 'sets', label: 'Sets' },
    { value: 'weight', label: 'Weight (lbs)' },
    { value: 'distance', label: 'Distance (miles)' },
    { value: 'time', label: 'Time (minutes)' },
    { value: 'days', label: 'Days' },
  ];
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Challenge Name</FormLabel>
              <FormControl>
                <Input placeholder="30-Day Pushup Challenge" {...field} />
              </FormControl>
              <FormDescription>
                Create a motivating name for your challenge
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Complete 1000 pushups over 30 days to build upper body strength and endurance." 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Explain the challenge and its benefits
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => {
                        const startDate = form.watch('startDate');
                        return startDate && date < new Date(startDate);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="targetExercise"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Exercise</FormLabel>
                <FormControl>
                  <Input placeholder="Push-ups" {...field} />
                </FormControl>
                <FormDescription>
                  The main exercise for this challenge
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="goalType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {goalTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  How you'll measure progress
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="goalValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Target</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1} 
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>
                The total amount to achieve by the end date
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Image URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/image.jpg" 
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || null)}  
                />
              </FormControl>
              <FormDescription>
                Add an inspiring image for your challenge
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Make this challenge public
                </FormLabel>
                <FormDescription>
                  Public challenges are visible to all users
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={createChallengeMutation.isPending}
        >
          {createChallengeMutation.isPending ? 'Creating...' : 'Create Challenge'}
        </Button>
      </form>
    </Form>
  );
}