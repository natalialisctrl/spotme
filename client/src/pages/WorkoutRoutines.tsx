import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Edit, Trash2, Share2, Sparkles, ListFilter, Dumbbell, Zap, Heart, Medal, FlaskConical, Activity } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';

type Exercise = {
  name: string;
  sets: number;
  reps: number;
};

type WorkoutRoutine = {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  exercises: Exercise[];
  targetMuscleGroups: string[];
  difficulty: string;
  estimatedDuration: number;
  isPublic: boolean | null;
  createdAt: string;
  updatedAt: string;
};

const difficultyOptions = ['beginner', 'intermediate', 'advanced', 'expert'];
const muscleGroupOptions = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full body'
];

// Description templates for quick selection
const descriptionTemplates = [
  { 
    icon: <Medal className="h-4 w-4 mr-2" />,
    name: 'Strength Focus', 
    value: 'A comprehensive strength-building routine designed to increase muscle mass and power. Focus on proper form and progressive overload for best results.'
  },
  { 
    icon: <Zap className="h-4 w-4 mr-2" />,
    name: 'HIIT Circuit', 
    value: 'High-intensity interval training circuit that combines cardio and resistance exercises. Great for fat burning and improving endurance in a time-efficient manner.'
  },
  { 
    icon: <FlaskConical className="h-4 w-4 mr-2" />,
    name: 'Hypertrophy Program', 
    value: 'Targeted muscle growth routine with moderate weights and higher repetitions. Focus on time under tension and mind-muscle connection for maximum hypertrophy.'
  },
  { 
    icon: <ListFilter className="h-4 w-4 mr-2" />,
    name: 'Full Body Workout', 
    value: 'Balanced full-body workout hitting all major muscle groups in a single session. Ideal for those training 2-3 times per week or beginners establishing a foundation.'
  },
  { 
    icon: <Activity className="h-4 w-4 mr-2" />,
    name: 'Leg Day', 
    value: 'Focused lower body workout targeting quads, hamstrings, glutes, and calves. Includes compound movements like squats and deadlifts alongside isolation exercises for complete leg development.'
  },
  { 
    icon: <Dumbbell className="h-4 w-4 mr-2" />,
    name: 'Chest and Arms Day', 
    value: 'Upper body push routine focusing on chest, triceps, and biceps. Combination of compound pressing movements and isolation exercises for maximum muscle stimulation and pump.'
  },
  { 
    icon: <Sparkles className="h-4 w-4 mr-2" />,
    name: 'Back and Shoulders Day', 
    value: 'Upper body pull routine targeting the entire back and shoulder complex. Includes vertical and horizontal pulling movements, along with pressing and lateral raises for well-rounded development.'
  },
  { 
    icon: <Heart className="h-4 w-4 mr-2" />,
    name: 'Core Focus', 
    value: 'Comprehensive core training targeting abs, obliques, and lower back. Combination of dynamic and static exercises to build strength, stability, and definition in the midsection.'
  }
];

const WorkoutRoutines = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine | null>(null);
  const { user } = useAuth();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [duration, setDuration] = useState(45);
  const [isPublic, setIsPublic] = useState(false);
  const [targetMuscleGroups, setTargetMuscleGroups] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '', sets: 3, reps: 10 }]);
  
  // Get user's workout routines
  const { data: routines, isLoading, refetch } = useQuery<WorkoutRoutine[]>({
    queryKey: ['/api/workout-routines'],
    enabled: !!user,
  });
  
  // Create workout routine
  const createMutation = useMutation({
    mutationFn: async (routineData: Partial<WorkoutRoutine>) => {
      const res = await apiRequest('POST', '/api/workout-routines', routineData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-routines'] });
      toast({
        title: 'Success',
        description: 'Workout routine created!',
      });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to create workout routine: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Update workout routine
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<WorkoutRoutine> }) => {
      const res = await apiRequest('PATCH', `/api/workout-routines/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-routines'] });
      toast({
        title: 'Success',
        description: 'Workout routine updated!',
      });
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to update workout routine: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Delete workout routine
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/workout-routines/${id}`);
      if (!res.ok) throw new Error('Failed to delete workout routine');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-routines'] });
      toast({
        title: 'Success',
        description: 'Workout routine deleted!',
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to delete workout routine: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Share workout routine
  const shareMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/workout-routines/${id}/share`);
      if (!res.ok) throw new Error('Failed to share workout routine');
      return true;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Workout routine shared with your connections!',
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to share workout routine: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Reset form
  const resetForm = () => {
    setName('');
    setDescription('');
    setDifficulty('intermediate');
    setDuration(45);
    setIsPublic(false);
    setTargetMuscleGroups([]);
    setExercises([{ name: '', sets: 3, reps: 10 }]);
  };
  
  // Populate form for editing
  const prepareEditForm = (routine: WorkoutRoutine) => {
    setSelectedRoutine(routine);
    setName(routine.name);
    setDescription(routine.description || '');
    setDifficulty(routine.difficulty);
    setDuration(routine.estimatedDuration);
    setIsPublic(routine.isPublic || false);
    setTargetMuscleGroups(routine.targetMuscleGroups);
    setExercises(routine.exercises);
    setIsEditDialogOpen(true);
  };
  
  // Add exercise
  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 10 }]);
  };
  
  // Remove exercise
  const removeExercise = (index: number) => {
    const newExercises = [...exercises];
    newExercises.splice(index, 1);
    setExercises(newExercises);
  };
  
  // Update exercise
  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setExercises(newExercises);
  };
  
  // Toggle muscle group
  const toggleMuscleGroup = (group: string) => {
    if (targetMuscleGroups.includes(group)) {
      setTargetMuscleGroups(targetMuscleGroups.filter(g => g !== group));
    } else {
      setTargetMuscleGroups([...targetMuscleGroups, group]);
    }
  };
  
  // Submit form
  const handleSubmit = () => {
    // Validate form
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a routine name.',
        variant: 'destructive',
      });
      return;
    }
    
    if (exercises.some(e => !e.name.trim())) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all exercise names.',
        variant: 'destructive',
      });
      return;
    }
    
    if (targetMuscleGroups.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one target muscle group.',
        variant: 'destructive',
      });
      return;
    }
    
    const routineData = {
      name,
      description: description || null,
      exercises,
      targetMuscleGroups,
      difficulty,
      estimatedDuration: duration,
      isPublic
    };
    
    if (selectedRoutine) {
      updateMutation.mutate({ id: selectedRoutine.id, data: routineData });
    } else {
      createMutation.mutate(routineData);
    }
  };
  
  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this workout routine?')) {
      deleteMutation.mutate(id);
    }
  };
  
  // Handle share
  const handleShare = (id: number) => {
    shareMutation.mutate(id);
  };
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Workout Routines</h1>
        <Button 
          onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Routine
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : routines && routines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routines.map(routine => (
            <Card key={routine.id} className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>{routine.name}</CardTitle>
                <CardDescription>
                  Difficulty and duration information
                </CardDescription>
                <div className="flex gap-2 mt-2">
                  <Badge className="capitalize">{routine.difficulty}</Badge>
                  <Badge variant="outline">{routine.estimatedDuration} min</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-4">
                  {routine.description || 'No description provided.'}
                </p>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-1">Target Muscle Groups:</h4>
                  <div className="flex flex-wrap gap-1">
                    {routine.targetMuscleGroups.map(group => (
                      <Badge key={group} variant="secondary" className="capitalize">
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Exercises:</h4>
                  <ul className="space-y-1 text-sm">
                    {routine.exercises.map((exercise, i) => (
                      <li key={i}>
                        {exercise.name} ({exercise.sets} sets × {exercise.reps} reps)
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => prepareEditForm(routine)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleShare(routine.id)}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => handleDelete(routine.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-muted/40 rounded-lg p-10 text-center">
          <h3 className="text-xl font-medium mb-2">No workout routines yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first workout routine to get started!
          </p>
          <Button 
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Routine
          </Button>
        </div>
      )}
      
      {/* Create Workout Routine Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Workout Routine</DialogTitle>
            <DialogDescription>
              Design a new workout routine to share with your gym partners.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name" className="mb-2">
                  Routine Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Full Body Strength"
                  className="w-full"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="description">Description</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Use Template
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <div className="p-1">
                        {descriptionTemplates.map((template, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            className="w-full justify-start font-normal px-2 py-2 h-auto mb-1"
                            onClick={() => setDescription(template.value)}
                          >
                            {template.icon}
                            {template.name}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your workout routine..."
                  className="w-full"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="difficulty" className="mb-2">
                    Difficulty Level <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={difficulty}
                    onValueChange={setDifficulty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map(option => (
                        <SelectItem key={option} value={option} className="capitalize">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="duration" className="mb-2">
                    Est. Duration (minutes) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={5}
                    max={300}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">
                  Target Muscle Groups <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {muscleGroupOptions.map(group => (
                    <Badge
                      key={group}
                      variant={targetMuscleGroups.includes(group) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleMuscleGroup(group)}
                    >
                      {group}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>
                    Exercises <span className="text-destructive">*</span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Exercise
                  </Button>
                </div>
                
                {exercises.map((exercise, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-12 gap-2 mb-2 items-center"
                  >
                    <div className="col-span-6">
                      <Input 
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="Sets"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(index, 'sets', Number(e.target.value))}
                        min={1}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="Reps"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(index, 'reps', Number(e.target.value))}
                        min={1}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {exercises.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeExercise(index)}
                          className="text-destructive hover:text-destructive/90 px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="isPublic">
                  Make this routine public for other users to discover
                </Label>
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
              Create Routine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Workout Routine Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Workout Routine</DialogTitle>
            <DialogDescription>
              Update your workout routine details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="edit-name" className="mb-2">
                  Routine Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Full Body Strength"
                  className="w-full"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Use Template
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <div className="p-1">
                        {descriptionTemplates.map((template, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            className="w-full justify-start font-normal px-2 py-2 h-auto mb-1"
                            onClick={() => setDescription(template.value)}
                          >
                            {template.icon}
                            {template.name}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your workout routine..."
                  className="w-full"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-difficulty" className="mb-2">
                    Difficulty Level <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={difficulty}
                    onValueChange={setDifficulty}
                  >
                    <SelectTrigger id="edit-difficulty">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map(option => (
                        <SelectItem key={option} value={option} className="capitalize">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-duration" className="mb-2">
                    Est. Duration (minutes) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={5}
                    max={300}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">
                  Target Muscle Groups <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {muscleGroupOptions.map(group => (
                    <Badge
                      key={group}
                      variant={targetMuscleGroups.includes(group) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleMuscleGroup(group)}
                    >
                      {group}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>
                    Exercises <span className="text-destructive">*</span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Exercise
                  </Button>
                </div>
                
                {exercises.map((exercise, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-12 gap-2 mb-2 items-center"
                  >
                    <div className="col-span-6">
                      <Input 
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="Sets"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(index, 'sets', Number(e.target.value))}
                        min={1}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="Reps"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(index, 'reps', Number(e.target.value))}
                        min={1}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {exercises.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeExercise(index)}
                          className="text-destructive hover:text-destructive/90 px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="edit-isPublic">
                  Make this routine public for other users to discover
                </Label>
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
              Update Routine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutRoutines;