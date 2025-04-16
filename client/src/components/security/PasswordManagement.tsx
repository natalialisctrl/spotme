import { useState } from "react";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function PasswordManagement() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  
  // Password change form
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  // Email change form
  const [changeEmailForm, setChangeEmailForm] = useState({
    currentPassword: "",
    newEmail: "",
  });
  
  // Handle change password form
  const handleChangePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setChangePasswordForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle change email form
  const handleChangeEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setChangeEmailForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Submit change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    const { currentPassword, newPassword, confirmPassword } = changePasswordForm;
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setIsSubmitting(false);
      return;
    }
    
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const res = await apiRequest("POST", "/api/user/change-password", {
        currentPassword,
        newPassword,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to change password");
      }
      
      // Reset form
      setChangePasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Submit change email
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    const { currentPassword, newEmail } = changeEmailForm;
    
    // Validate email
    if (!newEmail.includes("@")) {
      setError("Please enter a valid email address");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const res = await apiRequest("POST", "/api/user/change-email", {
        currentPassword,
        newEmail,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to change email");
      }
      
      // Reset form
      setChangeEmailForm({
        currentPassword: "",
        newEmail: "",
      });
      
      toast({
        title: "Email Update Initiated",
        description: "A verification email has been sent to your new email address. Please check your inbox to complete the update.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Change Password</TabsTrigger>
          <TabsTrigger value="email">Update Recovery Email</TabsTrigger>
        </TabsList>
        
        <TabsContent value="password" className="mt-6">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                value={changePasswordForm.currentPassword}
                onChange={handleChangePasswordChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                value={changePasswordForm.newPassword}
                onChange={handleChangePasswordChange}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={changePasswordForm.confirmPassword}
                onChange={handleChangePasswordChange}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || 
                !changePasswordForm.currentPassword || 
                !changePasswordForm.newPassword || 
                !changePasswordForm.confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Update Password
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </TabsContent>
        
        <TabsContent value="email" className="mt-6">
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPasswordEmail">Current Password</Label>
              <Input
                id="currentPasswordEmail"
                name="currentPassword"
                type="password"
                required
                value={changeEmailForm.currentPassword}
                onChange={handleChangeEmailChange}
              />
              <p className="text-xs text-muted-foreground">
                For security, please enter your current password
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Recovery Email</Label>
              <Input
                id="newEmail"
                name="newEmail"
                type="email"
                required
                value={changeEmailForm.newEmail}
                onChange={handleChangeEmailChange}
              />
              <p className="text-xs text-muted-foreground">
                This email will be used for account recovery and security notifications
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || 
                !changeEmailForm.currentPassword || 
                !changeEmailForm.newEmail}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Update Email
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}