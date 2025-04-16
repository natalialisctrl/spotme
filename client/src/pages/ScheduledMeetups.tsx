import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, isPast, addHours, differenceInDays } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  MapPin, 
  Plus, 
  User, 
  Users, 
  Clock, 
  Edit, 
  ExternalLink, 
  Trash2, 
  CalendarX, 
  Check, 
  X, 
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Component to display time in 12-hour format
const TimeDisplay = ({ time }: { time: string }) => {
  // Convert 24hr time to 12hr format with AM/PM
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const period = h < 12 ? 'AM' : 'PM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${period}`;
  };
  
  return <span>{formatTime(time)}</span>;
};

type User = {
  id: number;
  username: string;
  name: string;
  profilePictureUrl: string | null;
};

type MeetupParticipant = {
  id: number;
  meetupId: number;
  userId: number;
  status: string;
  joinedAt: string;
  user?: User;
};

type Meetup = {
  id: number;
  creatorId: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  gymName: string | null;
  latitude: number | null;
  longitude: number | null;
  workoutType: string | null;
  workoutRoutineId: number | null;
  maxParticipants: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  participants?: MeetupParticipant[];
};

type WorkoutRoutine = {
  id: number;
  name: string;
  difficulty: string;
};

// Constants
const workoutTypeOptions = [
  'strength', 'cardio', 'hiit', 'yoga', 'pilates', 'crossfit', 'bodyweight', 'other'
];

const ScheduledMeetups = () => {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetupDate, setMeetupDate] = useState<Date>(addHours(new Date(), 24));
  const [startTime, setStartTime] = useState('08:00');
  const [gymName, setGymName] = useState('');
  const [workoutType, setWorkoutType] = useState('strength');
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [selectedWorkoutRoutineId, setSelectedWorkoutRoutineId] = useState<number | null>(null);

  // Fetch meetups
  const { data: meetups = [], isLoading, refetch } = useQuery<Meetup[]>({
    queryKey: ['/api/meetups'],
    enabled: !!user,
  });

  // Fetch upcoming meetups
  const { data: upcomingMeetups = [] } = useQuery<Meetup[]>({
    queryKey: ['/api/meetups/upcoming'],
    enabled: !!user,
  });
  
  // Fetch workout routines
  const { data: workoutRoutines = [] } = useQuery<WorkoutRoutine[]>({
    queryKey: ['/api/workout-routines'],
    enabled: !!user,
  });
  
  // Create meetup
  const createMutation = useMutation({
    mutationFn: async (meetupData: Partial<Meetup>) => {
      const res = await apiRequest('POST', '/api/meetups', meetupData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create meetup');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetups/upcoming'] });
      toast({
        title: 'Success',
        description: 'Meetup scheduled successfully!',
      });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to create meetup: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Update meetup
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Meetup> }) => {
      const res = await apiRequest('PATCH', `/api/meetups/${id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update meetup');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetups/upcoming'] });
      toast({
        title: 'Success',
        description: 'Meetup updated successfully!',
      });
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to update meetup: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Cancel meetup
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/meetups/${id}/cancel`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to cancel meetup');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetups/upcoming'] });
      toast({
        title: 'Success',
        description: 'Meetup canceled successfully!',
      });
      setIsCancelAlertOpen(false);
      if (isDetailsDialogOpen) setIsDetailsDialogOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to cancel meetup: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Join meetup
  const joinMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/meetups/${id}/join`, { status: 'confirmed' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to join meetup');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetups/upcoming'] });
      toast({
        title: 'Success',
        description: 'You have joined the meetup!',
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to join meetup: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Leave meetup
  const leaveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/meetups/${id}/leave`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to leave meetup');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetups/upcoming'] });
      toast({
        title: 'Success',
        description: 'You have left the meetup.',
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to leave meetup: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Filter meetups
  const filteredMeetups = meetups.filter(meetup => {
    const isPastMeetup = isPast(new Date(meetup.date));
    const isCancelled = meetup.status === 'cancelled';
    
    if (activeTab === 'upcoming') {
      return !isPastMeetup && !isCancelled;
    } else if (activeTab === 'past') {
      return isPastMeetup && !isCancelled;
    } else if (activeTab === 'cancelled') {
      return isCancelled;
    } else if (activeTab === 'hosting') {
      return meetup.creatorId === user?.id && !isCancelled;
    }
    return true;
  });
  
  // Reset form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setMeetupDate(addHours(new Date(), 24));
    setStartTime('08:00');
    setGymName('');
    setWorkoutType('strength');
    setMaxParticipants(5);
    setSelectedWorkoutRoutineId(null);
  };
  
  // Prepare form for editing
  const prepareEditForm = (meetup: Meetup) => {
    setSelectedMeetup(meetup);
    setTitle(meetup.title);
    setDescription(meetup.description || '');
    setMeetupDate(new Date(meetup.date));
    setStartTime(meetup.startTime);
    setGymName(meetup.gymName || '');
    setWorkoutType(meetup.workoutType || 'strength');
    setMaxParticipants(meetup.maxParticipants || 5);
    setSelectedWorkoutRoutineId(meetup.workoutRoutineId);
    setIsEditDialogOpen(true);
  };
  
  // View meetup details
  const viewMeetupDetails = async (id: number) => {
    try {
      const res = await apiRequest('GET', `/api/meetups/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch meetup details');
      }
      const meetupData = await res.json();
      setSelectedMeetup(meetupData);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to load meetup details: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = () => {
    // Validate form
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a meetup title',
        variant: 'destructive',
      });
      return;
    }
    
    if (!meetupDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date for the meetup',
        variant: 'destructive',
      });
      return;
    }
    
    if (!startTime) {
      toast({
        title: 'Validation Error',
        description: 'Please select a start time',
        variant: 'destructive',
      });
      return;
    }
    
    const meetupData = {
      title,
      description: description || null,
      date: meetupDate.toISOString(),
      startTime,
      gymName: gymName || null,
      workoutType,
      maxParticipants,
      workoutRoutineId: selectedWorkoutRoutineId
    };
    
    if (selectedMeetup) {
      updateMutation.mutate({ id: selectedMeetup.id, data: meetupData });
    } else {
      createMutation.mutate(meetupData);
    }
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'confirmed':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  // Check if user is creator
  const isCreator = (meetup: Meetup) => meetup.creatorId === user?.id;
  
  // Check if user is participant
  const isParticipant = (meetup: Meetup) => {
    if (!meetup.participants) return false;
    return meetup.participants.some(p => p.userId === user?.id);
  };
  
  // Format date for display
  const formatMeetupDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    
    // If within a week, show day name
    if (differenceInDays(date, today) < 7) {
      return format(date, 'EEEE'); // e.g., "Monday"
    }
    
    // Otherwise, show full date
    return format(date, 'MMM d, yyyy'); // e.g., "Apr 16, 2025"
  };
  
  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Scheduled Meetups</h1>
        <Button onClick={() => {
          resetForm();
          setIsCreateDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meetup
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="hosting">Hosting</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredMeetups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetups.map(meetup => (
                <Card key={meetup.id} className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>{meetup.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatMeetupDate(meetup.date)}, <TimeDisplay time={meetup.startTime} />
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {meetup.gymName && (
                      <div className="flex items-start mb-3">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{meetup.gymName}</span>
                      </div>
                    )}
                    <div className="flex items-start mb-3">
                      <Users className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>
                        {meetup.participants?.length || 0} / 
                        {meetup.maxParticipants || '∞'} participants
                      </span>
                    </div>
                    {meetup.workoutType && (
                      <Badge variant="outline" className="capitalize mb-3">
                        {meetup.workoutType}
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {meetup.description || 'No description provided.'}
                    </p>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewMeetupDetails(meetup.id)}
                    >
                      View Details
                    </Button>
                    <div>
                      {isCreator(meetup) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => prepareEditForm(meetup)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      ) : isParticipant(meetup) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to leave this meetup?')) {
                              leaveMutation.mutate(meetup.id);
                            }
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Leave
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => joinMutation.mutate(meetup.id)}
                          disabled={joinMutation.isPending}
                        >
                          {joinMutation.isPending && (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          )}
                          <Check className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-muted/40 rounded-lg p-10 text-center">
              <h3 className="text-xl font-medium mb-2">No upcoming meetups</h3>
              <p className="text-muted-foreground mb-4">
                Schedule a meetup or join an existing one to get started!
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meetup
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="hosting" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredMeetups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetups.map(meetup => (
                <Card key={meetup.id} className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{meetup.title}</CardTitle>
                      {getStatusBadge(meetup.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatMeetupDate(meetup.date)}, <TimeDisplay time={meetup.startTime} />
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {meetup.gymName && (
                      <div className="flex items-start mb-3">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{meetup.gymName}</span>
                      </div>
                    )}
                    <div className="flex items-start mb-3">
                      <Users className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>
                        {meetup.participants?.length || 0} / 
                        {meetup.maxParticipants || '∞'} participants
                      </span>
                    </div>
                    {meetup.workoutType && (
                      <Badge variant="outline" className="capitalize mb-3">
                        {meetup.workoutType}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewMeetupDetails(meetup.id)}
                    >
                      View Details
                    </Button>
                    <div className="flex gap-2">
                      {meetup.status !== 'cancelled' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => prepareEditForm(meetup)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => {
                              setSelectedMeetup(meetup);
                              setIsCancelAlertOpen(true);
                            }}
                          >
                            <CalendarX className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-muted/40 rounded-lg p-10 text-center">
              <h3 className="text-xl font-medium mb-2">You're not hosting any meetups</h3>
              <p className="text-muted-foreground mb-4">
                Schedule a meetup to start connecting with gym buddies!
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meetup
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredMeetups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetups.map(meetup => (
                <Card key={meetup.id} className="h-full flex flex-col opacity-80">
                  <CardHeader>
                    <CardTitle>{meetup.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(meetup.date), 'MMM d, yyyy')}, <TimeDisplay time={meetup.startTime} />
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {meetup.gymName && (
                      <div className="flex items-start mb-3">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{meetup.gymName}</span>
                      </div>
                    )}
                    <div className="flex items-start mb-3">
                      <Users className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>
                        {meetup.participants?.length || 0} / 
                        {meetup.maxParticipants || '∞'} participants
                      </span>
                    </div>
                    {meetup.workoutType && (
                      <Badge variant="outline" className="capitalize mb-3">
                        {meetup.workoutType}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewMeetupDetails(meetup.id)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-muted/40 rounded-lg p-10 text-center">
              <h3 className="text-xl font-medium mb-2">No past meetups</h3>
              <p className="text-muted-foreground">
                When you complete meetups, they'll appear here.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="cancelled" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredMeetups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetups.map(meetup => (
                <Card key={meetup.id} className="h-full flex flex-col opacity-80">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{meetup.title}</CardTitle>
                      <Badge variant="destructive">Cancelled</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(meetup.date), 'MMM d, yyyy')}, <TimeDisplay time={meetup.startTime} />
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {meetup.gymName && (
                      <div className="flex items-start mb-3">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{meetup.gymName}</span>
                      </div>
                    )}
                    {meetup.workoutType && (
                      <Badge variant="outline" className="capitalize mb-3">
                        {meetup.workoutType}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewMeetupDetails(meetup.id)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-muted/40 rounded-lg p-10 text-center">
              <h3 className="text-xl font-medium mb-2">No cancelled meetups</h3>
              <p className="text-muted-foreground">
                Cancelled meetups will appear here.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Meetup Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Meetup</DialogTitle>
            <DialogDescription>
              Create a new meetup to connect with gym buddies at your favorite gym.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="title" className="mb-2">
                  Meetup Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Morning Workout Session"
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="description" className="mb-2">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your meetup..."
                  className="w-full"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="mb-2">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {meetupDate ? format(meetupDate, 'PPP') : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={meetupDate}
                        onSelect={(date) => {
                          setMeetupDate(date!);
                          setIsDatePickerOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor="startTime" className="mb-2">
                    Start Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gymName" className="mb-2">Gym Location</Label>
                  <Input
                    id="gymName"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="e.g., Fitness Center Downtown"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor="workoutType" className="mb-2">
                    Workout Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={workoutType}
                    onValueChange={setWorkoutType}
                  >
                    <SelectTrigger id="workoutType">
                      <SelectValue placeholder="Select workout type" />
                    </SelectTrigger>
                    <SelectContent>
                      {workoutTypeOptions.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxParticipants" className="mb-2">
                    Max Participants <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    min={2}
                    max={50}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor="workoutRoutine" className="mb-2">Workout Routine (Optional)</Label>
                  <Select
                    value={selectedWorkoutRoutineId?.toString() || ""}
                    onValueChange={(value) => setSelectedWorkoutRoutineId(value ? Number(value) : null)}
                  >
                    <SelectTrigger id="workoutRoutine">
                      <SelectValue placeholder="Select a workout routine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {workoutRoutines.map(routine => (
                        <SelectItem key={routine.id} value={routine.id.toString()}>
                          {routine.name} ({routine.difficulty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Schedule Meetup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Meetup Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Meetup</DialogTitle>
            <DialogDescription>
              Update the details of your scheduled meetup.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="edit-title" className="mb-2">
                  Meetup Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Morning Workout Session"
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description" className="mb-2">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your meetup..."
                  className="w-full"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-date" className="mb-2">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="edit-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {meetupDate ? format(meetupDate, 'PPP') : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={meetupDate}
                        onSelect={(date) => {
                          setMeetupDate(date!);
                          setIsDatePickerOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor="edit-startTime" className="mb-2">
                    Start Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-gymName" className="mb-2">Gym Location</Label>
                  <Input
                    id="edit-gymName"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="e.g., Fitness Center Downtown"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-workoutType" className="mb-2">
                    Workout Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={workoutType}
                    onValueChange={setWorkoutType}
                  >
                    <SelectTrigger id="edit-workoutType">
                      <SelectValue placeholder="Select workout type" />
                    </SelectTrigger>
                    <SelectContent>
                      {workoutTypeOptions.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-maxParticipants" className="mb-2">
                    Max Participants <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-maxParticipants"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    min={2}
                    max={50}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-workoutRoutine" className="mb-2">Workout Routine (Optional)</Label>
                  <Select
                    value={selectedWorkoutRoutineId?.toString() || ""}
                    onValueChange={(value) => setSelectedWorkoutRoutineId(value ? Number(value) : null)}
                  >
                    <SelectTrigger id="edit-workoutRoutine">
                      <SelectValue placeholder="Select a workout routine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {workoutRoutines.map(routine => (
                        <SelectItem key={routine.id} value={routine.id.toString()}>
                          {routine.name} ({routine.difficulty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Meetup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Meetup Details Dialog */}
      {selectedMeetup && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>{selectedMeetup.title}</DialogTitle>
                {getStatusBadge(selectedMeetup.status)}
              </div>
              <DialogDescription>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(new Date(selectedMeetup.date), 'EEEE, MMMM d, yyyy')} at{' '}
                    <TimeDisplay time={selectedMeetup.startTime} />
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Meetup Details</h3>
                  
                  {selectedMeetup.gymName && (
                    <div className="flex items-start mb-4">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p>{selectedMeetup.gymName}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedMeetup.workoutType && (
                    <div className="mb-4">
                      <p className="font-medium mb-1">Workout Type</p>
                      <Badge variant="outline" className="capitalize">
                        {selectedMeetup.workoutType}
                      </Badge>
                    </div>
                  )}
                  
                  {selectedMeetup.description && (
                    <div className="mb-4">
                      <p className="font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {selectedMeetup.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <p className="font-medium mb-1">Hosted by</p>
                    <div className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      <span>
                        {selectedMeetup.participants?.find(p => p.userId === selectedMeetup.creatorId)?.user?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Participants</h3>
                    <Badge variant="outline">
                      {selectedMeetup.participants?.length || 0} / 
                      {selectedMeetup.maxParticipants || '∞'}
                    </Badge>
                  </div>
                  
                  {selectedMeetup.participants && selectedMeetup.participants.length > 0 ? (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {selectedMeetup.participants.map(participant => (
                        <div 
                          key={participant.id} 
                          className="flex items-center justify-between border-b pb-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{participant.user?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {participant.userId === selectedMeetup.creatorId ? 'Host' : 'Participant'}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(participant.status)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-muted/40 rounded-lg">
                      <p className="text-muted-foreground">No participants yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Separator className="my-2" />
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center pt-2">
              <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
                {selectedMeetup.status !== 'cancelled' && (
                  isCreator(selectedMeetup) ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDetailsDialogOpen(false);
                          prepareEditForm(selectedMeetup);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setIsCancelAlertOpen(true);
                        }}
                      >
                        <CalendarX className="h-4 w-4 mr-2" />
                        Cancel Meetup
                      </Button>
                    </>
                  ) : (
                    isParticipant(selectedMeetup) ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to leave this meetup?')) {
                            leaveMutation.mutate(selectedMeetup.id);
                            setIsDetailsDialogOpen(false);
                          }
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Leave Meetup
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          joinMutation.mutate(selectedMeetup.id);
                        }}
                        disabled={joinMutation.isPending}
                      >
                        {joinMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        <Check className="h-4 w-4 mr-2" />
                        Join Meetup
                      </Button>
                    )
                  )
                )}
              </div>
              <div className="text-xs text-muted-foreground text-center sm:text-right">
                Created {format(new Date(selectedMeetup.createdAt), 'MMM d, yyyy')}
                {selectedMeetup.updatedAt !== selectedMeetup.createdAt && 
                  ` • Updated ${format(new Date(selectedMeetup.updatedAt), 'MMM d, yyyy')}`}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Cancel Meetup Alert */}
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Meetup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this meetup? This action cannot be undone, 
              and all participants will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Meetup</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (selectedMeetup) {
                  cancelMutation.mutate(selectedMeetup.id);
                }
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Yes, Cancel Meetup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScheduledMeetups;