import { FC, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Sparkles, RefreshCw, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workoutTypes } from "@shared/schema";
import IdentityVerification from "@/components/profile/IdentityVerification";
import ProfilePictureUpload from "@/components/profile/ProfilePictureUpload";
import { GymVerification } from "@/components/profile/GymVerification";
import { UserRatings } from "@/components/ratings/UserRatings";
import { RatingSummaryBadge } from "@/components/ratings/RatingSummaryBadge";

const Profile: FC = () => {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    gymName: user?.gymName || "",
    gender: user?.gender || "",
    experienceLevel: user?.experienceLevel || "",
    experienceYears: user?.experienceYears || 0
  });
  
  // Refresh user data when the component mounts
  useEffect(() => {
    // Refresh user data when component mounts
    const loadData = async () => {
      console.log("Profile component mounted, refreshing user data");
      await refreshUserData();
    };
    
    loadData();
  }, [refreshUserData]);
  
  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        gymName: user.gymName || "",
        gender: user.gender || "",
        experienceLevel: user.experienceLevel || "",
        experienceYears: user.experienceYears || 0
      });
    }
  }, [user]);
  
  // Function to manually refresh profile data
  const handleRefreshProfile = async () => {
    setIsRefreshing(true);
    try {
      // Force fetch from server by cleaning cache first
      queryClient.removeQueries({ queryKey: ["/api/user"] });
      
      // Wait a moment to ensure any pending updates are complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Now refresh user data
      await refreshUserData();
      
      // Update local form data with refreshed user data
      if (user) {
        setFormData({
          name: user.name || "",
          email: user.email || "",
          bio: user.bio || "",
          gymName: user.gymName || "",
          gender: user.gender || "",
          experienceLevel: user.experienceLevel || "",
          experienceYears: user.experienceYears || 0
        });
      }
      
      toast({
        title: "Profile refreshed",
        description: "Your profile has been refreshed with the latest data.",
      });
    } catch (error) {
      console.error("Error refreshing profile:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh profile data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // SOLUTION 1: Create a new updatedUser object to work with
      const updatedUser = user ? { ...user, ...formData } : null;
      if (!updatedUser) {
        throw new Error("User data not available");
      }
      
      // SOLUTION 2: Create a synchronous update function for visual consistency
      const updateVisualElements = () => {
        // Select all elements that need updating
        const nameDisplayElement = document.querySelector('.text-center h3');
        const nameDetailElement = document.querySelector('label[for="name"] + p');
        const emailElement = document.querySelector('label[for="email"] + p');
        const genderElement = document.querySelector('label[for="gender"] + p');
        const gymNameElement = document.querySelector('label[for="gymName"] + p');
        const experienceLevelElement = document.querySelector('label[for="experienceLevel"] + p');
        const experienceYearsElement = document.querySelector('label[for="experienceYears"] + p');
        const bioElement = document.querySelector('label[for="bio"] + p');
        const avatarElement = document.querySelector('.h-32.w-32 span');
        
        // Update DOM elements for immediate visual feedback
        if (nameDisplayElement) nameDisplayElement.textContent = formData.name;
        if (nameDetailElement) nameDetailElement.textContent = formData.name;
        if (emailElement) emailElement.textContent = formData.email;
        if (genderElement) genderElement.textContent = formData.gender;
        if (gymNameElement) gymNameElement.textContent = formData.gymName || "Not specified";
        if (experienceLevelElement) experienceLevelElement.textContent = formData.experienceLevel;
        if (experienceYearsElement) {
          experienceYearsElement.textContent = `${formData.experienceYears} ${formData.experienceYears === 1 ? 'year' : 'years'}`;
        }
        if (bioElement) bioElement.textContent = formData.bio || "No bio provided";
        if (avatarElement) avatarElement.textContent = getInitials(formData.name);
      };
      
      // SOLUTION 3: Clear React Query cache to force fresh data
      // Remove any existing cache data for the user
      queryClient.removeQueries({ queryKey: ["/api/user"] });
      
      // SOLUTION 4: Update local cache immediately before network request
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      // SOLUTION 5: Update DOM directly for visual consistency
      updateVisualElements();
      
      // SOLUTION 6: Save data to server
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, formData);
      if (!response.ok) {
        throw new Error(`Server update failed with status ${response.status}`);
      }
      
      // SOLUTION 7: Get and use fresh data from server response
      const serverResponse = await response.json();
      
      // SOLUTION 8: Force cache update with server response
      queryClient.setQueryData(["/api/user"], serverResponse);
      
      // SOLUTION 9: Trigger component update with forced refresh
      await refreshUserData();
      
      // SOLUTION 10: Update DOM elements again to ensure consistency with server data
      updateVisualElements();
      
      // Exit edit mode
      setIsEditing(false);
      
      // Notify user of success
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully."
      });
      
      // SOLUTION 11: Force a hard page reload after saving
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error("Profile update error:", error);
      
      // Fallback: Force refresh from server on error
      queryClient.removeQueries({ queryKey: ["/api/user"] });
      await refreshUserData();
      
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

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
                onClick={handleRefreshProfile} 
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <Button onClick={() => setIsEditing(false)} variant="outline">Cancel</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col items-center">
                <Avatar className="h-32 w-32 bg-primary text-white text-4xl">
                  {user.profilePictureUrl ? (
                    <AvatarImage src={user.profilePictureUrl} alt={user.name} />
                  ) : null}
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                
                {isEditing && (
                  <Button
                    size="sm" 
                    variant="outline"
                    className="mt-3 text-sm"
                    onClick={() => navigate("/upload-profile-picture")}
                  >
                    <Camera className="mr-1 h-3 w-3" />
                    Change Picture
                  </Button>
                )}
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-xl">{user.name}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="text-sm text-gray-500">{user.username}</p>
                  <RatingSummaryBadge userId={user.id} size="sm" />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{user.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                    />
                  ) : (
                    <p className="text-gray-900">{user.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  {isEditing ? (
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
                    <p className="text-gray-900 capitalize">{user.gender}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gymName">Gym Name</Label>
                  {isEditing ? (
                    <Input 
                      id="gymName" 
                      name="gymName" 
                      value={formData.gymName} 
                      onChange={handleInputChange} 
                    />
                  ) : (
                    <p className="text-gray-900">{user.gymName || "Not specified"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  {isEditing ? (
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
                    <p className="text-gray-900 capitalize">{user.experienceLevel}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienceYears">Years of Experience</Label>
                  {isEditing ? (
                    <Input 
                      id="experienceYears" 
                      name="experienceYears" 
                      type="number" 
                      min="0"
                      value={formData.experienceYears} 
                      onChange={(e) => handleNumberChange("experienceYears", e.target.value)} 
                    />
                  ) : (
                    <p className="text-gray-900">{user.experienceYears} {user.experienceYears === 1 ? 'year' : 'years'}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea 
                    id="bio" 
                    name="bio" 
                    value={formData.bio || ""} 
                    onChange={handleInputChange} 
                    placeholder="Tell others about yourself and your fitness goals"
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-gray-900">{user.bio || "No bio provided"}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        {isEditing && (
          <CardFooter>
            <Button 
              className="ml-auto" 
              onClick={handleSave} 
              disabled={isSaving}
            >
              {isSaving ? (
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

      <IdentityVerification user={user} onVerificationComplete={refreshUserData} />

      <GymVerification 
        userId={user.id}
        currentGymName={user.gymName}
        currentGymChain={user.gymChain}
        currentGymAddress={user.gymAddress}
        currentGymVerified={user.gymVerified || false}
        onSuccess={refreshUserData}
      />

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
              variant={user.aiGeneratedInsights ? "outline" : "default"}
            >
              {user.aiGeneratedInsights ? "Regenerate Profile" : "Generate AI Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {user.aiGeneratedInsights ? (
            <div className="space-y-4">
              {(() => {
                try {
                  // Log the raw insights data for debugging
                  console.log("Raw AI insights data:", user.aiGeneratedInsights);
                  
                  // Parse the insights data
                  let insights;
                  if (typeof user.aiGeneratedInsights === 'string') {
                    insights = JSON.parse(user.aiGeneratedInsights);
                  } else {
                    insights = user.aiGeneratedInsights;
                  }
                  
                  console.log("Parsed insights:", insights);
                  
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
                  console.error("Error displaying AI insights:", e, user.aiGeneratedInsights);
                  return (
                    <div className="text-center text-gray-500">
                      <p>Your AI profile data needs to be updated. Click "Regenerate Profile" to create a new one.</p>
                      <p className="text-xs mt-2 text-red-400">Error: {String(e)}</p>
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

      {/* Partner Ratings */}
      <UserRatings userId={user.id} userName={user.name} showForm={false} />
    </div>
  );
};

export default Profile;
