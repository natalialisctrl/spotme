import { FC, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Sparkles, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workoutTypes } from "@shared/schema";
import IdentityVerification from "@/components/profile/IdentityVerification";

// Create a standalone profile page component with a completely different approach
const NewProfilePage: FC = () => {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Profile state
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // User data state - completely separate from React Query cache
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  
  // Load initial data directly from API, bypassing React Query
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Make a direct fetch request to get user data
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to load user data");
        }
        
        const data = await response.json();
        setUserData(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          bio: data.bio || "",
          gymName: data.gymName || "",
          gender: data.gender || "",
          experienceLevel: data.experienceLevel || "",
          experienceYears: data.experienceYears || 0
        });
      } catch (error) {
        console.error("Error loading user data:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile data. Please refresh the page.",
          variant: "destructive"
        });
      }
    };
    
    loadUserData();
  }, [toast]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/user', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to refresh data");
      }
      
      const freshData = await response.json();
      
      // Update the local state
      setUserData(freshData);
      
      // Update the form data
      setFormData({
        name: freshData.name || "",
        email: freshData.email || "",
        bio: freshData.bio || "",
        gymName: freshData.gymName || "",
        gender: freshData.gender || "",
        experienceLevel: freshData.experienceLevel || "",
        experienceYears: freshData.experienceYears || 0
      });
      
      // Also update React Query cache for consistency with the rest of the app
      queryClient.setQueryData(["/api/user"], freshData);
      
      toast({
        title: "Profile refreshed",
        description: "Your profile has been refreshed with the latest data."
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (name: string, value: string) => {
    setFormData((prev: Record<string, any>) => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  // Save handler
  const handleSave = async () => {
    setLoading(true);
    try {
      // First, update local state immediately
      const updatedData = { ...userData, ...formData };
      setUserData(updatedData);
      
      // Then send the update to the server
      const response = await fetch(`/api/users/${userData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      
      // Get the response data from the server
      const serverData = await response.json();
      
      // Update local state with server response
      setUserData(serverData);
      
      // Also update React Query cache
      queryClient.setQueryData(["/api/user"], serverData);
      
      // Exit edit mode
      setMode("view");
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      
      // Revert local state and try to refresh
      await handleRefresh();
      
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  // Loading state
  if (!userData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Render profile
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
              <CardDescription>
                Manage your personal information and preferences
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefresh} 
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              {mode === "view" ? (
                <Button onClick={() => setMode("edit")}>Edit Profile</Button>
              ) : (
                <Button onClick={() => setMode("view")} variant="outline">Cancel</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-32 w-32 bg-primary text-white text-4xl">
                <AvatarFallback>{getInitials(userData.name)}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="font-semibold text-xl">{userData.name}</h3>
                <p className="text-sm text-gray-500">{userData.username}</p>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {mode === "edit" ? (
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{userData.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {mode === "edit" ? (
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                    />
                  ) : (
                    <p className="text-gray-900">{userData.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  {mode === "edit" ? (
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => handleSelectChange("gender", value)}
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 capitalize">{userData.gender}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gymName">Gym Name</Label>
                  {mode === "edit" ? (
                    <Input 
                      id="gymName" 
                      name="gymName" 
                      value={formData.gymName} 
                      onChange={handleInputChange} 
                    />
                  ) : (
                    <p className="text-gray-900">{userData.gymName || "Not specified"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  {mode === "edit" ? (
                    <Select 
                      value={formData.experienceLevel} 
                      onValueChange={(value) => handleSelectChange("experienceLevel", value)}
                    >
                      <SelectTrigger id="experienceLevel">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 capitalize">{userData.experienceLevel}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienceYears">Years of Experience</Label>
                  {mode === "edit" ? (
                    <Input 
                      id="experienceYears" 
                      name="experienceYears" 
                      type="number" 
                      min="0"
                      value={formData.experienceYears} 
                      onChange={(e) => handleNumberChange("experienceYears", e.target.value)} 
                    />
                  ) : (
                    <p className="text-gray-900">
                      {userData.experienceYears} {userData.experienceYears === 1 ? 'year' : 'years'}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {mode === "edit" ? (
                  <Textarea 
                    id="bio" 
                    name="bio" 
                    value={formData.bio || ""} 
                    onChange={handleInputChange} 
                    placeholder="Tell others about yourself and your fitness goals"
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-gray-900">{userData.bio || "No bio provided"}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        {mode === "edit" && (
          <CardFooter>
            <Button 
              className="ml-auto" 
              onClick={handleSave} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Identity Verification section */}
      <IdentityVerification user={userData} onVerificationComplete={handleRefresh} />

      {/* AI Profile section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-primary" />
                AI Fitness Profile
              </CardTitle>
              <CardDescription>
                Get AI-generated insights based on your fitness personality
              </CardDescription>
            </div>
            <Button 
              onClick={() => navigate("/profile-setup")}
              variant={userData.aiGeneratedInsights ? "outline" : "default"}
            >
              {userData.aiGeneratedInsights ? "Regenerate Profile" : "Generate AI Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userData.aiGeneratedInsights ? (
            <div className="space-y-4">
              {(() => {
                try {
                  // Parse the insights data
                  let insights;
                  if (typeof userData.aiGeneratedInsights === 'string') {
                    insights = JSON.parse(userData.aiGeneratedInsights);
                  } else {
                    insights = userData.aiGeneratedInsights;
                  }
                  
                  if (!insights || !insights.workoutStyle) {
                    throw new Error("Invalid insights data");
                  }
                  
                  return (
                    <>
                      <div className="space-y-1">
                        <h3 className="text-md font-semibold">Your Workout Style</h3>
                        <p className="text-gray-700">{insights.workoutStyle}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-md font-semibold">Motivation Tips</h3>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {Array.isArray(insights.motivationTips) && insights.motivationTips.map((tip: string, index: number) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-md font-semibold">Your Ideal Gym Partner</h3>
                        <p className="text-gray-700">{insights.partnerPreferences}</p>
                      </div>
                    </>
                  );
                } catch (e) {
                  console.error("Error displaying AI insights:", e);
                  return (
                    <div className="text-center text-gray-500">
                      <p>Your AI profile data needs to be updated. Click "Regenerate Profile" to create a new one.</p>
                    </div>
                  );
                }
              })()}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/50" />
              <p className="mb-2">You haven't generated your AI fitness profile yet.</p>
              <p>Take a quick personality quiz to get personalized workout insights.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workout Preferences section */}
      <Card>
        <CardHeader>
          <CardTitle>Workout Preferences</CardTitle>
          <CardDescription>
            Types of workouts you're interested in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {workoutTypes.map((type) => (
              <Badge key={type} variant="outline" className="capitalize">
                {type.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewProfilePage;