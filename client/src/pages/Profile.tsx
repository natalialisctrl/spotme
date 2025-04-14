import { FC, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workoutTypes } from "@shared/schema";
import SocialVerification from "@/components/profile/SocialVerification";

const Profile: FC = () => {
  const { user, checkAuth } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    gymName: user?.gymName || "",
    gender: user?.gender || "",
    experienceLevel: user?.experienceLevel || "",
    experienceYears: user?.experienceYears || 0
  });

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
      await apiRequest('PATCH', `/api/users/${user.id}`, formData);
      await checkAuth(); // Refresh user data
      
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully."
      });
    } catch (error) {
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
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            ) : (
              <Button onClick={() => setIsEditing(false)} variant="outline">Cancel</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-32 w-32 bg-primary text-white text-4xl">
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="font-semibold text-xl">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.username}</p>
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

      <SocialVerification user={user} onVerificationComplete={checkAuth} />

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

export default Profile;
