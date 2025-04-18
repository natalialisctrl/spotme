import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Check, X, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';

const platformIcons = {
  strava: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>,
  fitbit: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.7 11.18c-1.3 0-2.35 1.05-2.35 2.35s1.05 2.34 2.35 2.34 2.35-1.05 2.35-2.34c0-1.31-1.05-2.35-2.35-2.35M12 4.57c-1.56 0-2.82 1.26-2.82 2.82s1.26 2.82 2.82 2.82 2.82-1.26 2.82-2.82S13.56 4.57 12 4.57m0 7.05c-1.3 0-2.35 1.05-2.35 2.35s1.05 2.34 2.35 2.34 2.35-1.05 2.35-2.34c0-1.31-1.05-2.35-2.35-2.35m0 6.34c-1.04 0-1.87.84-1.87 1.87S10.96 21.7 12 21.7s1.87-.84 1.87-1.87-.83-1.87-1.87-1.87M6.3 11.65c-1.3 0-2.35 1.05-2.35 2.35s1.05 2.35 2.35 2.35 2.35-1.05 2.35-2.35-1.05-2.35-2.35-2.35M12 2.7c.93 0 1.87.14 2.8.47-.7 1.4-.7 2.8 0 4.2-1.87.7-3.73.7-5.6 0 .7-1.4.7-2.8 0-4.2.93-.33 1.87-.47 2.8-.47m5.7 7.05c.84.33 1.63.84 2.33 1.4-.47.84-.94 1.4-1.87 1.87-.47-1.4-1.4-2.34-2.8-2.8.94-.93 1.87-1.4 2.34-2.34.23.7.23 1.3 0 1.87m-5.7 4.67c-.93 0-1.87-.14-2.8-.47.7-1.4.7-2.8 0-4.2 1.87-.7 3.73-.7 5.6 0-.7 1.4-.7 2.8 0 4.2-.93.33-1.87.47-2.8.47M3.97 11.1c.94.93 1.87 1.4 2.33 2.33-1.4.47-2.33 1.4-2.8 2.8-.7-.46-1.4-1.16-1.87-1.86.7-.47 1.17-1.17 1.4-1.87.47-.47.94-.93.94-1.4" /></svg>,
  garmin: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0m0 1.8C17.6 1.8 22.2 6.4 22.2 12S17.6 22.2 12 22.2 1.8 17.6 1.8 12 6.4 1.8 12 1.8M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6m-2.57 3.43h2.36c1.31 0 2.37 1.06 2.37 2.37v2.4a3.5 3.5 0 0 1-3.5-3.5c0-.45.1-.89.28-1.27h-1.51z" /></svg>,
  apple_health: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.2 12.1c0-1.9.3-3.5-1.9-5.3-1.9-1.5-4-1-5.4.3-1 .9-1.4 1.1-2.4.2-1.5-1.4-3.7-1.8-5.5-.4-5.7 4.3 1.7 14.8 4.2 14.8 1.2 0 2-1 3.3-2.2 1.3 1.2 2.1 2.2 3.2 2.2 2.5-.1 4.6-5.5 4.5-9.6" /></svg>,
  google_fit: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="m13.2 7.07-1.62 1.38v3.1l1.62 1.37 2.15-2.15V9.22Zm-.43-4.74-9.4 9.4a4.4 4.4 0 0 0-1.24 3c0 1.14.44 2.26 1.23 3.1l3.97 4.23 5.38-5.43v-4.22L7.3 17.81l-2.54-2.75A1.35 1.35 0 0 1 4.45 14c0-.44.16-.81.48-1.13L14 3.78c.69-.69 1.82-.69 2.52 0l2.54 2.54a1.78 1.78 0 0 1 0 2.54l-5.18 5.17h-.01l-1.67-1.39L17.17 7.7a.7.7 0 0 0 0-.99l-2.55-2.56a.7.7 0 0 0-.98 0ZM9.64 19.05l-3.1 3.11a.7.7 0 0 1-.98 0 .7.7 0 0 1 0-.99l3.1-3.11 .98.99Z" /></svg>,
  generic: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" /></svg>
};

const formatMap = {
  'tcx': 'TCX (Training Center XML)',
  'gpx': 'GPX (GPS Exchange Format)',
  'csv': 'CSV (Comma Separated Values)',
  'json': 'JSON (JavaScript Object Notation)',
  'fit': 'FIT (Flexible and Interoperable Data Transfer)'
};

export default function WorkoutExports() {
  const { toast } = useToast();
  const [selectedWorkouts, setSelectedWorkouts] = useState<number[]>([]);
  const [exportPlatform, setExportPlatform] = useState('generic');
  const [exportFormat, setExportFormat] = useState('gpx');
  const [activeTab, setActiveTab] = useState('workouts');

  // Fetch workouts
  const { 
    data: workouts = [], 
    isLoading: isLoadingWorkouts,
    error: workoutsError,
    refetch: refetchWorkouts
  } = useQuery({
    queryKey: ['/api/workouts'],
    queryFn: undefined, // Default fetcher will be used
  });

  // Fetch exports
  const { 
    data: exports = [], 
    isLoading: isLoadingExports,
    error: exportsError,
    refetch: refetchExports
  } = useQuery({
    queryKey: ['/api/workouts/exports'],
    queryFn: undefined, // Default fetcher will be used
  });

  // Fetch integrations
  const { 
    data: integrations = [], 
    isLoading: isLoadingIntegrations,
    error: integrationsError,
    refetch: refetchIntegrations
  } = useQuery({
    queryKey: ['/api/integrations'],
    queryFn: undefined, // Default fetcher will be used
  });

  // Export workout mutation
  const exportMutation = useMutation({
    mutationFn: async (data: { workoutIds: number[], platform: string, format: string }) => {
      const response = await fetch('/api/workouts/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export workouts');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Export created successfully',
        description: 'Your workout data export has been processed',
        variant: 'default',
      });
      // Invalidate exports query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/exports'] });
      // Clear selection
      setSelectedWorkouts([]);
    },
    onError: (error) => {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export workouts',
        variant: 'destructive',
      });
    },
  });

  // Connect platform mutation
  const connectMutation = useMutation({
    mutationFn: async (data: { platform: string, accessToken: string }) => {
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect platform');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Platform connected',
        description: 'Your fitness platform has been connected successfully',
        variant: 'default',
      });
      // Invalidate integrations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error) => {
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect platform',
        variant: 'destructive',
      });
    },
  });

  // Disconnect platform mutation
  const disconnectMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect platform');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Platform disconnected',
        description: 'Your fitness platform has been disconnected',
        variant: 'default',
      });
      // Invalidate integrations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
    onError: (error) => {
      toast({
        title: 'Disconnection failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect platform',
        variant: 'destructive',
      });
    },
  });

  // Handle workout selection
  const toggleWorkout = (id: number) => {
    setSelectedWorkouts(prev => 
      prev.includes(id) 
        ? prev.filter(workoutId => workoutId !== id) 
        : [...prev, id]
    );
  };

  // Handle export button click
  const handleExport = () => {
    if (selectedWorkouts.length === 0) {
      toast({
        title: 'No workouts selected',
        description: 'Please select at least one workout to export',
        variant: 'destructive',
      });
      return;
    }

    exportMutation.mutate({
      workoutIds: selectedWorkouts,
      platform: exportPlatform,
      format: exportFormat
    });
  };

  // Handle connect platform
  const handleConnectPlatform = (platform: string) => {
    // In a real implementation, this would redirect to the OAuth flow
    // For demo purposes, we'll just simulate a connection with a mock token
    connectMutation.mutate({
      platform,
      accessToken: `mock_token_${platform}_${Date.now()}`
    });
  };

  // Handle disconnect platform
  const handleDisconnectPlatform = (platform: string) => {
    disconnectMutation.mutate(platform);
  };

  // Helper to get platform display name
  const getPlatformName = (platform: string) => {
    const platformMap: Record<string, string> = {
      'strava': 'Strava',
      'fitbit': 'Fitbit',
      'garmin': 'Garmin Connect',
      'apple_health': 'Apple Health',
      'google_fit': 'Google Fit',
      'generic': 'Generic Export'
    };
    return platformMap[platform] || platform;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Format date to relative time
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Get workout type display
  const getWorkoutTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'chest': 'Chest',
      'arms': 'Arms',
      'legs': 'Legs',
      'back': 'Back',
      'shoulders': 'Shoulders',
      'core': 'Core',
      'cardio': 'Cardio',
      'full_body': 'Full Body',
    };
    return typeMap[type] || type;
  };

  // Render loading state
  if (isLoadingWorkouts || isLoadingExports || isLoadingIntegrations) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading export data...</span>
      </div>
    );
  }

  // Render error state
  if (workoutsError || exportsError || integrationsError) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error loading export data</AlertTitle>
          <AlertDescription>
            There was an error loading your workout export data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Workout Exports</h1>
      
      <Tabs defaultValue="workouts" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="export-history">Export History</TabsTrigger>
          <TabsTrigger value="connections">Connected Platforms</TabsTrigger>
        </TabsList>
        
        {/* Workouts Tab */}
        <TabsContent value="workouts">
          <Card>
            <CardHeader>
              <CardTitle>Export Workouts</CardTitle>
              <CardDescription>
                Select the workouts you want to export to your fitness platform
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                  <div className="w-full sm:w-1/2">
                    <label className="text-sm font-medium block mb-2">Export To</label>
                    <Select value={exportPlatform} onValueChange={setExportPlatform}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strava">
                          <div className="flex items-center">
                            {platformIcons.strava}
                            <span className="ml-2">Strava</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="fitbit">
                          <div className="flex items-center">
                            {platformIcons.fitbit}
                            <span className="ml-2">Fitbit</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="garmin">
                          <div className="flex items-center">
                            {platformIcons.garmin}
                            <span className="ml-2">Garmin Connect</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="apple_health">
                          <div className="flex items-center">
                            {platformIcons.apple_health}
                            <span className="ml-2">Apple Health</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="google_fit">
                          <div className="flex items-center">
                            {platformIcons.google_fit}
                            <span className="ml-2">Google Fit</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="generic">
                          <div className="flex items-center">
                            {platformIcons.generic}
                            <span className="ml-2">Generic Export</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-full sm:w-1/2">
                    <label className="text-sm font-medium block mb-2">Format</label>
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Format" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(formatMap).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <h3 className="text-sm font-medium">Select Workouts</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedWorkouts([])}
                      disabled={selectedWorkouts.length === 0}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    {workouts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No workout data found. Check in some workouts first!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {workouts.map((workout: any) => (
                          <div 
                            key={workout.id}
                            className={`
                              p-3 rounded-lg flex items-center justify-between
                              ${selectedWorkouts.includes(workout.id) 
                                ? 'bg-primary/10 border border-primary/30'
                                : 'bg-card border'}
                            `}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox 
                                id={`workout-${workout.id}`}
                                checked={selectedWorkouts.includes(workout.id)}
                                onCheckedChange={() => toggleWorkout(workout.id)}
                              />
                              <div>
                                <div className="font-medium">{getWorkoutTypeDisplay(workout.workoutType)} Workout</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(workout.date)} • {workout.duration} minutes
                                  {workout.partnerId && " • Partner Workout"}
                                </div>
                              </div>
                            </div>
                            {workout.verified && (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                Verified
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => refetchWorkouts()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={selectedWorkouts.length === 0 || exportMutation.isPending}
              >
                {exportMutation.isPending 
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Download className="mr-2 h-4 w-4" />
                }
                Export {selectedWorkouts.length > 0 && `(${selectedWorkouts.length})`}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Export History Tab */}
        <TabsContent value="export-history">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>
                Review your previous workout exports
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-[400px]">
                {exports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No export history found. Export some workouts first!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {exports.map((exportItem: any) => (
                      <Card key={exportItem.id} className="overflow-hidden">
                        <div className={`h-2 ${getStatusColor(exportItem.status)}`} />
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center">
                                <div className="mr-2">
                                  {platformIcons[exportItem.platform as keyof typeof platformIcons] || platformIcons.generic}
                                </div>
                                <h3 className="font-semibold">{getPlatformName(exportItem.platform)}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatMap[exportItem.format as keyof typeof formatMap] || exportItem.format.toUpperCase()}
                              </p>
                            </div>
                            <Badge variant={exportItem.status === 'completed' ? 'default' : 
                                           exportItem.status === 'failed' ? 'destructive' : 'outline'}>
                              {exportItem.status.charAt(0).toUpperCase() + exportItem.status.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="text-sm">
                            <div>Created: {formatDate(exportItem.createdAt)}</div>
                            {exportItem.completedAt && (
                              <div>Completed: {formatDate(exportItem.completedAt)}</div>
                            )}
                            {exportItem.errorMessage && (
                              <div className="text-red-500 mt-1">Error: {exportItem.errorMessage}</div>
                            )}
                          </div>
                          
                          {exportItem.exportUrl && (
                            <div className="mt-3">
                              <Button variant="outline" size="sm" asChild>
                                <a href={exportItem.exportUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Export
                                </a>
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            
            <CardFooter>
              <Button variant="outline" onClick={() => refetchExports()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh History
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Connected Platforms Tab */}
        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle>Connected Platforms</CardTitle>
              <CardDescription>
                Manage your connected fitness tracking platforms
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Strava Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center">
                      {platformIcons.strava}
                      <CardTitle className="ml-2 text-lg">Strava</CardTitle>
                    </div>
                    {integrations.some((i: any) => i.platform === 'strava' && i.connected) ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not Connected</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect with Strava to export your workouts directly to your Strava account.
                    </p>
                  </CardContent>
                  <CardFooter>
                    {integrations.some((i: any) => i.platform === 'strava' && i.connected) ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleDisconnectPlatform('strava')}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending && disconnectMutation.variables === 'strava' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handleConnectPlatform('strava')}
                        disabled={connectMutation.isPending}
                      >
                        {connectMutation.isPending && connectMutation.variables?.platform === 'strava' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        Connect Strava
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                {/* Fitbit Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center">
                      {platformIcons.fitbit}
                      <CardTitle className="ml-2 text-lg">Fitbit</CardTitle>
                    </div>
                    {integrations.some((i: any) => i.platform === 'fitbit' && i.connected) ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not Connected</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect with Fitbit to export your workouts and track them in your Fitbit dashboard.
                    </p>
                  </CardContent>
                  <CardFooter>
                    {integrations.some((i: any) => i.platform === 'fitbit' && i.connected) ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleDisconnectPlatform('fitbit')}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending && disconnectMutation.variables === 'fitbit' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handleConnectPlatform('fitbit')}
                        disabled={connectMutation.isPending}
                      >
                        {connectMutation.isPending && connectMutation.variables?.platform === 'fitbit' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        Connect Fitbit
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                {/* Garmin Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center">
                      {platformIcons.garmin}
                      <CardTitle className="ml-2 text-lg">Garmin Connect</CardTitle>
                    </div>
                    {integrations.some((i: any) => i.platform === 'garmin' && i.connected) ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not Connected</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect with Garmin to export your workouts to your Garmin Connect account.
                    </p>
                  </CardContent>
                  <CardFooter>
                    {integrations.some((i: any) => i.platform === 'garmin' && i.connected) ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleDisconnectPlatform('garmin')}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending && disconnectMutation.variables === 'garmin' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handleConnectPlatform('garmin')}
                        disabled={connectMutation.isPending}
                      >
                        {connectMutation.isPending && connectMutation.variables?.platform === 'garmin' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        Connect Garmin
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                {/* Apple Health Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center">
                      {platformIcons.apple_health}
                      <CardTitle className="ml-2 text-lg">Apple Health</CardTitle>
                    </div>
                    {integrations.some((i: any) => i.platform === 'apple_health' && i.connected) ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not Connected</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect with Apple Health to export your workouts to your Apple Health app.
                    </p>
                  </CardContent>
                  <CardFooter>
                    {integrations.some((i: any) => i.platform === 'apple_health' && i.connected) ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleDisconnectPlatform('apple_health')}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending && disconnectMutation.variables === 'apple_health' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handleConnectPlatform('apple_health')}
                        disabled={connectMutation.isPending}
                      >
                        {connectMutation.isPending && connectMutation.variables?.platform === 'apple_health' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        Connect Apple Health
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                {/* Google Fit Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center">
                      {platformIcons.google_fit}
                      <CardTitle className="ml-2 text-lg">Google Fit</CardTitle>
                    </div>
                    {integrations.some((i: any) => i.platform === 'google_fit' && i.connected) ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not Connected</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect with Google Fit to export your workouts to your Google Fit account.
                    </p>
                  </CardContent>
                  <CardFooter>
                    {integrations.some((i: any) => i.platform === 'google_fit' && i.connected) ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleDisconnectPlatform('google_fit')}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending && disconnectMutation.variables === 'google_fit' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handleConnectPlatform('google_fit')}
                        disabled={connectMutation.isPending}
                      >
                        {connectMutation.isPending && connectMutation.variables?.platform === 'google_fit' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        Connect Google Fit
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button variant="outline" onClick={() => refetchIntegrations()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Connections
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}